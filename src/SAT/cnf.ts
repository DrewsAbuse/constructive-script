import type {
  CNFExpr,
  NarySATExpr,
  ProcessVisitStackItem,
  SATExpr,
  SATImplies,
  SATNot,
  SATOr,
  UnrollExpressionFn,
  UnrollHandlerReturnType,
} from './index.ts';
import {abusePipe} from '../utils/pipe.ts';
import {unrollUnary} from './index.ts';
import {
  assemblyAnd,
  assemblyEquivalent,
  assemblyImplies,
  assemblyLeaf,
  assemblyNot,
  assemblyOr,
  assertAssemblyExpKind,
  assertUnrollExpKind,
  satAnd,
  satBool,
  satImplies,
  satNot,
  satOr,
  unrollBinary,
} from './index.ts';
import {
  PROCESS_STATE,
  UNROLL_STATE,
  identityResult,
  traversExpressionsTree,
  unrollNary,
} from './index.ts';

//  ========================
//  =Eliminate Implications=
//  ========================

const eliminateImplies: UnrollExpressionFn<SATImplies> = (expr: SATImplies, startIndex: number) => {
  const leftChild = satNot(expr.left);
  const {right} = expr;

  const or = satOr(leftChild, right);

  return {
    stackItems: [
      {expr: or, state: PROCESS_STATE, startIndex},
      {expr: right, state: UNROLL_STATE},
      {expr: leftChild, state: UNROLL_STATE},
    ],
  };
};

export const eliminateImplications = (expr: SATExpr): SATExpr =>
  traversExpressionsTree({
    expr,
    unrollHandlers: {
      bool: identityResult,
      var: identityResult,
      not: unrollUnary,
      and: unrollNary,
      or: unrollNary,
      implies: eliminateImplies,
      equivalent: (expr, startIndex) => {
        const leftImplies = satImplies(expr.left, expr.right);
        const rightImplies = satImplies(expr.right, expr.left);

        const and = satAnd(leftImplies, rightImplies);

        return {
          stackItems: [
            {expr: and, state: PROCESS_STATE, startIndex},
            {expr: rightImplies, state: UNROLL_STATE},
            {expr: leftImplies, state: UNROLL_STATE},
          ],
        };
      },
    },
    assemblyHandlers: {
      bool: assemblyLeaf,
      var: assemblyLeaf,
      not: assemblyNot,
      and: assemblyAnd,
      or: assemblyOr,
      implies: (parts: SATExpr[]): SATExpr => satOr(parts[0], parts[1]),
      equivalent: (parts: SATExpr[]): SATExpr => satAnd(parts[0], parts[1]),
    },
  });

//  ========================
//  =Push Negation Handlers=
//  ========================

type PushNegationHandler = (inner: NarySATExpr) => NarySATExpr & {children: SATNot[]};
const pushNaryNegation: PushNegationHandler = inner => {
  return {
    kind: inner.kind === 'or' ? 'and' : 'or',
    children: inner.children.map(child => satNot(child)),
  };
};

const unrollNegation = (expr: SATNot, startIndex: number): UnrollHandlerReturnType<SATExpr> => {
  const inner = expr.expr;
  switch (inner.kind) {
    case 'bool':
      return {result: satBool(!inner.value)};
    case 'var':
      return {result: expr};
    case 'not':
      return {stackItems: [{expr: inner.expr, state: UNROLL_STATE}]};
    case 'or':
    case 'and':
      return unrollNary(pushNaryNegation(inner), startIndex);
    default:
      return {stackItems: [{expr: inner, state: UNROLL_STATE}]};
  }
};

export const pushNegations = (expr: SATExpr): SATExpr =>
  traversExpressionsTree({
    expr,
    unrollHandlers: {
      bool: identityResult,
      var: identityResult,
      and: unrollNary,
      or: unrollNary,
      not: unrollNegation,
      implies: assertUnrollExpKind(unrollBinary),
      equivalent: assertUnrollExpKind(unrollBinary),
    },
    assemblyHandlers: {
      bool: assemblyLeaf,
      var: assemblyLeaf,
      not: assemblyNot,
      and: assemblyAnd,
      or: assemblyOr,
      implies: assertAssemblyExpKind(assemblyImplies),
      equivalent: assertAssemblyExpKind(assemblyEquivalent),
    },
  });

//  =====================================
//  =SAT Simplify Distribute Or Over And=
//  =====================================

const distributeOr = (orExpr: SATOr, startIndex: number): {stackItems: ProcessVisitStackItem[]} => {
  const flatChildren = orExpr.children.reduce<SATExpr[]>(
    (acc, child) => (child.kind === 'or' ? acc.concat(child.children) : acc.concat(child)),
    []
  );

  for (let i = 0; i < flatChildren.length; i++) {
    const childrenExpr = flatChildren[i];

    if (childrenExpr.kind === 'and') {
      const rest = flatChildren.filter((_, index) => index !== i);
      const distributed = childrenExpr.children.map(child => satOr(child, ...rest));

      return unrollNary(satAnd(...distributed), startIndex);
    }
  }

  return unrollNary(satOr(...flatChildren), startIndex);
};

export const distributeOrOverAnd = (expr: SATExpr): CNFExpr =>
  traversExpressionsTree({
    expr,
    unrollHandlers: {
      bool: identityResult,
      var: identityResult,
      and: unrollNary,
      or: distributeOr,
      not: unrollNegation,
      implies: assertUnrollExpKind(unrollBinary),
      equivalent: assertUnrollExpKind(unrollBinary),
    },
    assemblyHandlers: {
      bool: assemblyLeaf,
      var: assemblyLeaf,
      and: assemblyAnd,
      or: assemblyOr,
      not: assemblyNot,
      implies: assertAssemblyExpKind(assemblyImplies),
      equivalent: assertAssemblyExpKind(assemblyEquivalent),
    },
  }) as CNFExpr;

const CNF_TRANSFORM_ORDER = [eliminateImplications, pushNegations, distributeOrOverAnd] as const;
export const toCNF = (expr: SATExpr): CNFExpr => abusePipe(expr, ...CNF_TRANSFORM_ORDER);
