// =================
// =SAT Expressions=
// =================

export type SATBool = {kind: 'bool'; value: boolean};
export type SATVar = {kind: 'var'; name: string};
export type SATNot = {kind: 'not'; expr: SATExpr};
export type SATAnd = {kind: 'and'; children: SATExpr[]};
export type SATOr = {kind: 'or'; children: SATExpr[]};
export type SATImplies = {kind: 'implies'; left: SATExpr; right: SATExpr};
export type SATEquivalent = {kind: 'equivalent'; left: SATExpr; right: SATExpr};

export type SATExpr = SATBool | SATVar | SATNot | SATAnd | SATOr | SATImplies | SATEquivalent;

export type NarySATExpr = SATAnd | SATOr;
export type BinarySATExpr = SATImplies | SATEquivalent;

export type CNFAllowedExpr = SATBool | SATVar | SATNot | NarySATExpr;
export type CNFExpr = SATAnd & {children: CNFAllowedExpr[]};

export const satBool = (value: boolean): SATBool => {
  return {kind: 'bool', value};
};
export const satVar = (name: string): SATVar => {
  return {kind: 'var', name};
};
export const satNot = (expr: SATExpr): SATNot => {
  return {kind: 'not', expr};
};
export const satAnd = (...children: SATExpr[]): SATAnd => {
  return {kind: 'and', children};
};
export const satOr = (...children: SATExpr[]): SATOr => {
  return {kind: 'or', children};
};
export const satImplies = (left: SATExpr, right: SATExpr): SATImplies => {
  return {kind: 'implies', left, right};
};
export const satEquivalent = (left: SATExpr, right: SATExpr): SATEquivalent => {
  return {kind: 'equivalent', left, right};
};

// ===================================
// =Travers and Fold Expressions Tree=
// ===================================

export const UNROLL_STATE = 'unroll';
export const PROCESS_STATE = 'process';

type UnrollState = typeof UNROLL_STATE;
type ProcessState = typeof PROCESS_STATE;

export type ProcessVisitStackItem =
  | {expr: SATExpr; state: UnrollState}
  | {expr: SATExpr; state: ProcessState; startIndex: number};

type LeafKind = 'bool' | 'var';
type UnaryKind = 'not';
type BinaryKind = 'and' | 'or' | 'implies' | 'equivalent';

export type UnrollHandlers<T> = {
  [K in SATExpr['kind']]: (
    expr: Extract<SATExpr, {kind: K}>,
    startIndex: number
  ) => UnrollHandlerReturnType<T>;
};

export type UnrollHandlerReturnType<T> =
  | {
      stackItems: ProcessVisitStackItem[];
    }
  | {
      result: T;
    };

type AssemblyFn<T = SATExpr> = (parts: T[]) => T;

type AssemblyExprHandlers<Result> = {
  [K in BinaryKind | UnaryKind | LeafKind]: AssemblyFn<Result>;
};

const invokeUnrollHandler = <T>(
  expr: SATExpr,
  startIndex: number,
  unrollHandlers: UnrollHandlers<T>
) => {
  switch (expr.kind) {
    case 'bool':
      return unrollHandlers.bool(expr, startIndex);
    case 'var':
      return unrollHandlers.var(expr, startIndex);
    case 'not':
      return unrollHandlers.not(expr, startIndex);
    case 'and':
      return unrollHandlers.and(expr, startIndex);
    case 'or':
      return unrollHandlers.or(expr, startIndex);
    case 'implies':
      return unrollHandlers.implies(expr, startIndex);
    case 'equivalent':
      return unrollHandlers.equivalent(expr, startIndex);
  }
};

export const traversExpressionsTree = <T>({
  expr,
  unrollHandlers,
  assemblyHandlers,
}: {
  expr: SATExpr;
  unrollHandlers: UnrollHandlers<T>;
  assemblyHandlers: AssemblyExprHandlers<T>;
}): T => {
  const stack: ProcessVisitStackItem[] = [{expr, state: UNROLL_STATE}];
  const result: T[] = [];

  while (stack.length > 0) {
    const current = stack.pop()!;

    switch (current.state) {
      case UNROLL_STATE: {
        const unrollResult = invokeUnrollHandler(current.expr, result.length, unrollHandlers);

        if ('stackItems' in unrollResult) {
          stack.push(...unrollResult.stackItems);
        } else {
          result.push(unrollResult.result);
        }
        break;
      }
      case PROCESS_STATE: {
        const start = current.startIndex;
        const end = result.length;
        const parts = result.slice(start, end);
        const handler = assemblyHandlers[current.expr.kind];
        const combined = handler(parts);
        result.splice(start, end - start, combined);
        break;
      }
    }
  }

  const final = result.pop();

  if (result.length > 0) {
    throw new Error('Expected empty stack');
  }

  if (final === undefined) {
    throw new Error('Expected final result');
  }

  return final;
};

//  ===================================
//  =Fold and Transform Shared Helpers=
//  ===================================

export const assertAssemblyExpKind =
  (exprHandler: (parts: SATExpr[]) => SATExpr): ((parts: SATExpr[]) => SATExpr) =>
  (): SATExpr => {
    throw new Error(`${exprHandler.name} unexpected kind`, {
      cause: {kind: exprHandler.name},
    });
  };

export const assertUnrollExpKind =
  <T extends SATExpr>(
    exprHandler: (expr: T, startIndex: number) => UnrollHandlerReturnType<SATExpr>
  ): ((expr: T, startIndex: number) => UnrollHandlerReturnType<SATExpr>) =>
  expr => {
    throw new Error(`${exprHandler.name} unexpected kind`, {
      cause: {kind: expr.kind},
    });
  };

export const assemblyLeaf: AssemblyFn = parts => parts[0];
export const assemblyNot: AssemblyFn = parts => satNot(parts[0]);
export const assemblyAnd: AssemblyFn = parts => satAnd(...parts);
export const assemblyOr: AssemblyFn = parts => satOr(...parts);
export const assemblyImplies: AssemblyFn = parts => satImplies(parts[0], parts[1]);
export const assemblyEquivalent: AssemblyFn = parts => satEquivalent(parts[0], parts[1]);

export type UnrollExpressionFn<T extends SATExpr = SATExpr> = (
  expr: T,
  startIndex: number
) => {stackItems: ProcessVisitStackItem[]};

export const unrollUnary: UnrollExpressionFn<SATNot> = (expr, startIndex) => {
  return {
    stackItems: [
      {expr, state: PROCESS_STATE, startIndex},
      {expr: expr.expr, state: UNROLL_STATE},
    ],
  };
};

export const unrollNary: UnrollExpressionFn<NarySATExpr> = (newInner, startIndex) => {
  return {
    stackItems: [
      {expr: newInner, state: PROCESS_STATE, startIndex},
      ...newInner.children
        .map((child): ProcessVisitStackItem => {
          return {
            expr: child,
            state: UNROLL_STATE,
          };
        })
        .reverse(),
    ],
  };
};

export const unrollBinary: UnrollExpressionFn<BinarySATExpr> = (expr, startIndex) => {
  return {
    stackItems: [
      {expr, state: PROCESS_STATE, startIndex},
      {expr: expr.right, state: UNROLL_STATE},
      {expr: expr.left, state: UNROLL_STATE},
    ],
  };
};

export const identityResult = <T>(result: T): {result: T} => {
  return {result};
};

//  =============
//  =SAT Solving=
//  =============

export const evalCNF = (expr: CNFExpr, assignment: Record<string, boolean>) =>
  traversExpressionsTree({
    expr,
    unrollHandlers: {
      not: unrollUnary,
      and: unrollNary,
      or: unrollNary,
      implies: unrollBinary,
      equivalent: unrollBinary,
      bool: ({value}) => {
        return {result: value};
      },
      var: (expr: SATVar) => {
        if (expr.name in assignment) {
          return {result: assignment[expr.name]};
        }
        throw new Error(`Variable ${expr.name} has no assigned value.`);
      },
    },
    assemblyHandlers: {
      bool: (parts: boolean[]) => parts[0],
      var: (parts: boolean[]) => parts[0],
      not: parts => !parts[0],
      and: parts => parts.every(Boolean),
      or: parts => parts.some(Boolean),
      implies: parts => !parts[0] || parts[1],
      equivalent: parts => parts[0] === parts[1],
    },
  });

export const collectVars = (expr: SATExpr, vars: Set<string> = new Set()): string[] => {
  const stack = [expr];

  while (stack.length > 0) {
    const current = stack.pop()!;

    switch (current.kind) {
      case 'bool':
        break;
      case 'var':
        vars.add(current.name);
        break;
      case 'not':
        stack.push(current.expr);
        break;
      case 'and':
      case 'or':
        stack.push(...current.children);
        break;
      case 'implies':
      case 'equivalent':
        stack.push(current.left, current.right);
        break;
    }
  }

  return Array.from(vars).reverse();
};

export const solve = (formula: CNFExpr): Record<string, boolean> | null => {
  const varSet = new Set<string>();
  collectVars(formula, varSet);
  const vars = Array.from(varSet);

  const n = vars.length;
  // total number of assignments: 2^n
  // TODO: implement a more efficient solver
  const total = 1 << n;
  for (let mask = 0; mask < total; mask++) {
    const assignment: Record<string, boolean> = {};
    for (let i = 0; i < n; i++) {
      assignment[vars[i]] = Boolean(mask & (1 << i));
    }
    if (evalCNF(formula, assignment)) {
      return assignment;
    }
  }

  return null;
};
