/* eslint-disable @typescript-eslint/no-explicit-any -- AST nodes are dynamically shaped */
import { Parser } from "acorn";
import jsx from "acorn-jsx";

const JsxParser = Parser.extend(jsx());

export interface AstNode {
  type: string;
  start: number;
  end: number;
  [key: string]: any;
}

export interface SyntaxIssue {
  file: string;
  message: string;
  line: number;
  column: number;
}

export interface ParsedFile {
  path: string;
  code: string;
  /** null when the file is not JavaScript (e.g. CSS) or failed to parse */
  ast: AstNode | null;
  issue: SyntaxIssue | null;
}

const SCRIPT_FILE = /\.(jsx?|mjs)$/;

export function parseFile(path: string, code: string): ParsedFile {
  if (!SCRIPT_FILE.test(path)) return { path, code, ast: null, issue: null };

  try {
    const ast = JsxParser.parse(code, {
      ecmaVersion: "latest",
      sourceType: "module",
      allowHashBang: true,
    }) as unknown as AstNode;
    return { path, code, ast, issue: null };
  } catch (error) {
    const err = error as Error & { loc?: { line: number; column: number } };
    return {
      path,
      code,
      ast: null,
      issue: {
        file: path,
        message: err.message.replace(/\s*\(\d+:\d+\)$/, ""),
        line: err.loc?.line ?? 0,
        column: err.loc?.column ?? 0,
      },
    };
  }
}

export const isNode = (value: unknown): value is AstNode =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as AstNode).type === "string";

type Visitor = (node: AstNode, parent: AstNode | null) => boolean | void;

/** Depth-first walk. Return `false` from the visitor to skip a subtree. */
export function walk(
  node: AstNode,
  visit: Visitor,
  parent: AstNode | null = null,
): void {
  if (visit(node, parent) === false) return;
  for (const key of Object.keys(node)) {
    if (key === "type" || key === "start" || key === "end") continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const child of value) if (isNode(child)) walk(child, visit, node);
    } else if (isNode(value)) {
      walk(value, visit, node);
    }
  }
}

export function nodesOf(
  root: AstNode,
  predicate: (node: AstNode, parent: AstNode | null) => boolean,
): AstNode[] {
  const found: AstNode[] = [];
  walk(root, (node, parent) => {
    if (predicate(node, parent)) found.push(node);
  });
  return found;
}

export function hasNode(
  root: AstNode,
  predicate: (node: AstNode, parent: AstNode | null) => boolean,
): boolean {
  let found = false;
  walk(root, (node, parent) => {
    if (found) return false;
    if (predicate(node, parent)) {
      found = true;
      return false;
    }
  });
  return found;
}

export const isFunction = (node: AstNode | null | undefined): boolean =>
  !!node &&
  (node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression");

/** `foo(...)` -> "foo", `obj.foo(...)` -> "foo", anything else -> null */
export function calleeName(call: AstNode): string | null {
  const callee = call.callee;
  if (!callee) return null;
  if (callee.type === "Identifier") return callee.name;
  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier"
  ) {
    return callee.property.name;
  }
  return null;
}

export const isCall = (node: AstNode, name: string): boolean =>
  node.type === "CallExpression" && calleeName(node) === name;

export const isIdentifier = (node: AstNode | undefined, name?: string) =>
  !!node && node.type === "Identifier" && (name === undefined || node.name === name);

export const isLiteral = (node: AstNode | undefined, value?: unknown) =>
  !!node && node.type === "Literal" && (value === undefined || node.value === value);

/** Name of a property key (identifier or string literal). */
export function keyName(property: AstNode): string | null {
  const key = property.key;
  if (!key || property.computed) return null;
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal") return String(key.value);
  return null;
}

/** `<Foo>` -> "Foo", `<Foo.Provider>` -> "Foo.Provider" */
export function jsxName(element: AstNode): string {
  const name = element.openingElement?.name;
  if (!name) return "";
  if (name.type === "JSXIdentifier") return name.name;
  if (name.type === "JSXMemberExpression") {
    return `${name.object.name}.${name.property.name}`;
  }
  return "";
}

export function jsxAttribute(
  element: AstNode,
  name: string,
): AstNode | undefined {
  return element.openingElement?.attributes?.find(
    (a: AstNode) => a.type === "JSXAttribute" && a.name?.name === name,
  );
}

/** The expression inside `attr={...}` or the literal of `attr="..."`. */
export function jsxAttributeValue(
  element: AstNode,
  name: string,
): AstNode | undefined {
  const attr = jsxAttribute(element, name);
  if (!attr?.value) return undefined;
  return attr.value.type === "JSXExpressionContainer"
    ? attr.value.expression
    : attr.value;
}
