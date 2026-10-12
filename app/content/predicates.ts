import {
  type AstNode,
  type CodeAnalysis,
  calleeName,
  containsCall,
  hasNode,
  isFunction,
  isIdentifier,
  isLiteral,
  jsxAttributeValue,
  jsxName,
  mentions,
  walk,
} from "@/lib/analysis";
import type { RuntimeCheck, StaticCheck } from "@/types";

export const staticCheck = (
  id: string,
  label: string,
  hint: string,
  test: StaticCheck["test"],
): StaticCheck => ({ kind: "static", id, label, hint, test });

export const runtimeCheck = (
  id: string,
  label: string,
  hint: string,
  file: string,
  scenario: string,
): RuntimeCheck => ({ kind: "runtime", id, label, hint, file, scenario });

/** The function behind `onClick={fn}` / `onClick={() => ...}`. */
export function handlerOf(
  a: CodeAnalysis,
  element: AstNode,
  attribute: string,
  file?: string,
): AstNode | undefined {
  const value = jsxAttributeValue(element, attribute);
  if (!value) return undefined;
  if (isFunction(value)) return value;
  if (value.type === "Identifier") return a.declaredFunction(value.name, file);
  return undefined;
}

/** Is `setter(...)` ever called with a function (`prev => ...`)? */
export const hasFunctionalUpdate = (a: CodeAnalysis, setter: string) =>
  a.calls(setter).some((call) => isFunction(call.arguments[0]));

/** `x + 1`, `x => x + 1`, `x => { return x + 1 }` */
export function addsOne(argument: AstNode | undefined): boolean {
  if (!argument) return false;
  const isPlusOne = (n: AstNode) =>
    n.type === "BinaryExpression" && n.operator === "+" && isLiteral(n.right, 1);
  if (isPlusOne(argument)) return true;
  return isFunction(argument) && hasNode(argument, isPlusOne);
}

export function paramNames(fn: AstNode | undefined): string[] {
  if (!fn) return [];
  const names: string[] = [];
  for (const param of fn.params as AstNode[]) {
    if (param.type === "Identifier") names.push(param.name);
    if (param.type === "ObjectPattern") {
      for (const prop of param.properties as AstNode[]) {
        if (prop.type === "Property" && prop.value?.type === "Identifier") {
          names.push(prop.value.name);
        }
      }
    }
  }
  return names;
}

export const MUTATING_METHODS = [
  "push",
  "pop",
  "splice",
  "shift",
  "unshift",
  "sort",
  "reverse",
];

export const usesMutatingMethod = (a: CodeAnalysis) =>
  MUTATING_METHODS.some((method) => a.hasCall(method));

export const hasConsoleLog = (a: CodeAnalysis, file?: string) =>
  a.has(
    (n) =>
      n.type === "CallExpression" &&
      n.callee.type === "MemberExpression" &&
      isIdentifier(n.callee.object, "console"),
    file,
  );

/**
 * Finds nodes while skipping the subtree of any call to `skipCall`
 * (e.g. ignore what happens inside `useEffect` when checking the JSX).
 */
export function findOutsideCall(
  a: CodeAnalysis,
  skipCall: string,
  predicate: (node: AstNode, parent: AstNode | null) => boolean,
  file?: string,
): AstNode[] {
  const found: AstNode[] = [];
  for (const parsed of a.files) {
    if (!parsed.ast) continue;
    if (file && !parsed.path.replace(/^\/+/, "").endsWith(file.replace(/^\/+/, ""))) {
      continue;
    }
    walk(parsed.ast, (node, parent) => {
      if (node.type === "CallExpression" && calleeName(node) === skipCall) {
        return false;
      }
      if (predicate(node, parent)) found.push(node);
    });
  }
  return found;
}

/** Is `name` used to decide what to render (`if`, `&&`, ternary, `{name}`)? */
export const isRenderedOutsideEffects = (a: CodeAnalysis, name: string) =>
  findOutsideCall(
    a,
    "useEffect",
    (node, parent) =>
      node.type === "Identifier" &&
      node.name === name &&
      !!parent &&
      (parent.type === "IfStatement" ||
        parent.type === "LogicalExpression" ||
        parent.type === "ConditionalExpression" ||
        parent.type === "JSXExpressionContainer"),
  ).length > 0;

export const hasJsxChild = (root: AstNode, name: string) =>
  hasNode(root, (n) => n.type === "JSXElement" && jsxName(n) === name);

export { containsCall, mentions };
