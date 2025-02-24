import type {SATExpr} from './index.ts';
import {identityResult, unrollBinary, unrollNary, unrollUnary} from './index.ts';
import {traversExpressionsTree} from './index.ts';

const assemblyBoolToLogicString = (parts: string[]): string => {
  if (parts.length !== 1) {
    throw new Error('Expected one part for bool');
  }

  return parts[0];
};
const assemblyVarToLogicString = (parts: string[]): string => {
  if (parts.length !== 1) {
    throw new Error('Expected one part for var');
  }

  return parts[0];
};
const assemblyNotToLogicString = (parts: string[]): string => {
  if (parts.length !== 1) {
    throw new Error('Expected one part for not');
  }

  return `¬${parts[0]}`;
};
const assemblyAndToLogicString = (parts: string[]): string => `(${parts.join(' ∧ ')})`;
const assemblyOrToLogicString = (parts: string[]): string => `(${parts.join(' ∨ ')})`;
const assemblyImpliesToLogicString = (parts: string[]): string => {
  if (parts.length !== 2) {
    throw new Error('Expected two parts for implies');
  }

  return `(${parts[0]} ⇒ ${parts[1]})`;
};
const assemblyEquivalentToLogicString = (parts: string[]): string => {
  if (parts.length !== 2) {
    throw new Error('Expected two parts for equivalent');
  }

  return `(${parts[0]} ⇔ ${parts[1]})`;
};

export const exprToLogicString = (expr: SATExpr): string =>
  traversExpressionsTree({
    expr,
    unrollHandlers: {
      and: unrollNary,
      or: unrollNary,
      implies: unrollBinary,
      equivalent: unrollBinary,
      not: unrollUnary,
      bool: expr => identityResult(expr.value.toString()),
      var: expr => identityResult(expr.name),
    },
    assemblyHandlers: {
      bool: assemblyBoolToLogicString,
      var: assemblyVarToLogicString,
      not: assemblyNotToLogicString,
      and: assemblyAndToLogicString,
      or: assemblyOrToLogicString,
      implies: assemblyImpliesToLogicString,
      equivalent: assemblyEquivalentToLogicString,
    },
  });
