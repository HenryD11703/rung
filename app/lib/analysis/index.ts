import {
  type AstNode,
  type ParsedFile,
  type SyntaxIssue,
  calleeName,
  hasNode,
  isCall,
  isFunction,
  jsxName,
  nodesOf,
  parseFile,
} from "./ast";

export * from "./ast";

export interface StateHook {
  state: string;
  setter: string;
  init: AstNode | undefined;
  node: AstNode;
}

const normalize = (path: string) => path.replace(/^\/+/, "");

/**
 * Read-only view over the student's files that answers the questions the
 * exercise checks ask ("is `useMemo` called?", "does the key use the id?"…).
 * Everything here is deterministic and runs without any network call.
 */
export class CodeAnalysis {
  private constructor(readonly files: ParsedFile[]) {}

  static from(files: Record<string, string>): CodeAnalysis {
    return new CodeAnalysis(
      Object.entries(files).map(([path, code]) => parseFile(path, code)),
    );
  }

  get issues(): SyntaxIssue[] {
    return this.files.flatMap((f) => (f.issue ? [f.issue] : []));
  }

  /** Parsed files, optionally narrowed to one file (matched by path suffix). */
  private scope(file?: string): ParsedFile[] {
    const parsed = this.files.filter((f) => f.ast);
    if (!file) return parsed;
    const wanted = normalize(file);
    return parsed.filter((f) => {
      const path = normalize(f.path);
      return path === wanted || path.endsWith(`/${wanted}`);
    });
  }

  hasFile(file: string): boolean {
    return this.scope(file).length > 0;
  }

  find(
    predicate: (node: AstNode, parent: AstNode | null) => boolean,
    file?: string,
  ): AstNode[] {
    return this.scope(file).flatMap((f) => nodesOf(f.ast!, predicate));
  }

  has(
    predicate: (node: AstNode, parent: AstNode | null) => boolean,
    file?: string,
  ): boolean {
    return this.scope(file).some((f) => hasNode(f.ast!, predicate));
  }

  /** `name(...)` and `anything.name(...)` */
  calls(name: string, file?: string): AstNode[] {
    return this.find((n) => isCall(n, name), file);
  }

  hasCall(name: string, file?: string): boolean {
    return this.has((n) => isCall(n, name), file);
  }

  /** `React.useState(...)`-style calls through a namespace object. */
  usesNamespaceCall(namespace: string, name: string, file?: string): boolean {
    return this.has(
      (n) =>
        n.type === "CallExpression" &&
        calleeName(n) === name &&
        n.callee.type === "MemberExpression" &&
        n.callee.object.type === "Identifier" &&
        n.callee.object.name === namespace,
      file,
    );
  }

  hasNamedImport(source: string, name: string, file?: string): boolean {
    return this.has(
      (n) =>
        n.type === "ImportDeclaration" &&
        n.source.value === source &&
        n.specifiers.some(
          (s: AstNode) =>
            s.type === "ImportSpecifier" && s.imported?.name === name,
        ),
      file,
    );
  }

  /** `const [x, setX] = useState(init)` */
  stateHooks(file?: string): StateHook[] {
    return this.find(
      (n) =>
        n.type === "VariableDeclarator" &&
        n.id.type === "ArrayPattern" &&
        n.init?.type === "CallExpression" &&
        calleeName(n.init) === "useState",
      file,
    ).map((node) => ({
      state: node.id.elements[0]?.name ?? "",
      setter: node.id.elements[1]?.name ?? "",
      init: node.init.arguments[0],
      node,
    }));
  }

  /**
   * A function declared by name: `function Foo() {}`, `const Foo = () => {}`
   * or `const Foo = memo(() => {})` / `useCallback(() => {})`.
   */
  declaredFunction(name: string, file?: string): AstNode | undefined {
    for (const f of this.scope(file)) {
      const hit = nodesOf(
        f.ast!,
        (n) =>
          (n.type === "FunctionDeclaration" && n.id?.name === name) ||
          (n.type === "VariableDeclarator" &&
            n.id.type === "Identifier" &&
            n.id.name === name &&
            !!n.init),
      )[0];
      if (!hit) continue;
      if (hit.type === "FunctionDeclaration") return hit;
      return unwrapFunction(hit.init);
    }
    return undefined;
  }

  /** JSX elements by tag name (`"ListItem"`, `"ThemeContext.Provider"`). */
  jsx(name: string, file?: string): AstNode[] {
    return this.find((n) => n.type === "JSXElement" && jsxName(n) === name, file);
  }

  /** Every JSX element, regardless of name. */
  allJsx(file?: string): AstNode[] {
    return this.find((n) => n.type === "JSXElement", file);
  }

  /** Top-level source text with no JSX or imports: the pure logic of a file. */
  pureDeclarations(file: string): string | null {
    const parsed = this.scope(file)[0];
    if (!parsed?.ast) return null;

    const chunks: string[] = [];
    for (const statement of parsed.ast.body as AstNode[]) {
      const declaration =
        statement.type === "ExportNamedDeclaration" && statement.declaration
          ? statement.declaration
          : statement;
      const isDeclaration =
        declaration.type === "VariableDeclaration" ||
        declaration.type === "FunctionDeclaration" ||
        declaration.type === "ClassDeclaration";
      if (!isDeclaration) continue;
      const usesJsx = hasNode(
        declaration,
        (n) => n.type === "JSXElement" || n.type === "JSXFragment",
      );
      if (usesJsx) continue;
      chunks.push(parsed.code.slice(declaration.start, declaration.end));
    }
    return chunks.join("\n");
  }
}

function unwrapFunction(node: AstNode | undefined): AstNode | undefined {
  if (!node) return undefined;
  if (isFunction(node)) return node;
  if (node.type === "CallExpression") {
    return node.arguments.map(unwrapFunction).find(Boolean);
  }
  return undefined;
}

/** Does `root` contain a call to the given function/hook? */
export const containsCall = (root: AstNode, name: string): boolean =>
  hasNode(root, (n) => isCall(n, name));

/** Does `root` mention an identifier with this name? */
export const mentions = (root: AstNode, name: string): boolean =>
  hasNode(root, (n) => n.type === "Identifier" && n.name === name);

/** Resolve `const x = {...}`-style indirection to the object literal. */
export function resolveObject(
  analysis: CodeAnalysis,
  expression: AstNode | undefined,
): AstNode | undefined {
  if (!expression) return undefined;
  if (expression.type === "ObjectExpression") return expression;
  if (expression.type === "Identifier") {
    const declarator = analysis.find(
      (n) =>
        n.type === "VariableDeclarator" &&
        n.id.type === "Identifier" &&
        n.id.name === expression.name,
    )[0];
    return declarator?.init?.type === "ObjectExpression"
      ? declarator.init
      : undefined;
  }
  return undefined;
}
