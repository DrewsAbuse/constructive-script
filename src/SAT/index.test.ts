import {describe, it} from 'node:test';
import {deepEqual, equal} from 'node:assert';
import type {SATExpr} from './index.ts';
import {abusePipe} from '../utils/pipe.ts';
import {solve} from './index.ts';
import {satAnd, satBool, satEquivalent, satImplies, satNot, satOr, satVar} from './index.ts';
import {exprToLogicString} from './to-string.ts';
import {toCNF} from './cnf.ts';

const removeSpaces = (str: string): string => str.replace(/\s/g, '');

const deepEqualLogicExpr = (cnf: SATExpr, expected: string): void =>
  equal(abusePipe(cnf, exprToLogicString, removeSpaces), removeSpaces(expected), 'CNF mismatch');

const testCases = [
  {
    name: 'Simple implication: p → q',
    expr: satImplies(satVar('p'), satVar('q')),
    expectedCNF: '(¬p ∨ q)',
    expectedSatisfy: {p: false, q: false},
  },
  {
    name: 'Biconditional: p ↔ q',
    expr: satEquivalent(satVar('p'), satVar('q')),
    expectedCNF: '((¬p ∨ q) ∧ (¬q ∨ p))',
    expectedSatisfy: {p: false, q: false},
  },
  {
    name: 'Negated conjunction: ¬(p ∧ (q ∨ r))',
    expr: satNot(satAnd(satVar('p'), satOr(satVar('q'), satVar('r')))),
    expectedCNF: '((¬q ∨ ¬p) ∧ (¬r ∨ ¬p))',
    expectedSatisfy: {
      p: false,
      q: false,
      r: false,
    },
  },
  {
    name: 'Disjunction with conjunction: p ∨ (q ∧ r)',
    expr: satOr(satVar('p'), satAnd(satVar('q'), satVar('r'))),
    expectedCNF: '((q ∨ p) ∧ (r ∨ p))',
    expectedSatisfy: {p: true, q: false, r: false},
  },
  {
    name: 'Nested implication: ((p → (q ∧ (r ∨ s))) → t)',
    expr: satImplies(
      satImplies(satVar('p'), satAnd(satVar('q'), satOr(satVar('r'), satVar('s')))),
      satVar('t')
    ),
    expectedCNF: '((p ∨ t) ∧ ((¬r ∨ ¬q ∨ t) ∧ (¬s ∨ ¬q ∨ t)))',
    expectedSatisfy: {
      p: false,
      q: false,
      r: false,
      s: false,
      t: true,
    },
  },
  {
    name: 'Negated compound formula: ¬((p → q) ∧ (r ↔ s))',
    expr: satNot(
      satAnd(satImplies(satVar('p'), satVar('q')), satEquivalent(satVar('r'), satVar('s')))
    ),
    expectedCNF: `
      (
        (
          (
            (s ∨ r ∨ p) ∧ (¬r ∨ r ∨ p)
          ) ∧ (
            (s ∨ ¬s ∨ p) ∧ (¬r ∨ ¬s ∨ p)
          )
        ) ∧ (
          (
            (s ∨ r ∨ ¬q) ∧ (¬r ∨ r ∨ ¬q)
          ) ∧ (
            (s ∨ ¬s ∨ ¬q) ∧ (¬r ∨ ¬s ∨ ¬q)
          )
        )
      )`,
    expectedSatisfy: {
      p: false,
      q: false,
      r: false,
      s: true,
    },
  },
  {
    name: 'Conjunction with disjunction containing implication: (p ∨ q) ∧ (r ∨ (s → t))',
    expr: satAnd(
      satOr(satVar('p'), satVar('q')),
      satOr(satVar('r'), satImplies(satVar('s'), satVar('t')))
    ),
    expectedCNF: '((p ∨ q) ∧ (r ∨ ¬s ∨ t))',
    expectedSatisfy: {
      p: false,
      q: true,
      r: false,
      s: false,
      t: false,
    },
  },
  {
    name: 'Complex disjunction with conjunction: p ∨ (q ∧ (r ∨ (s ∧ t)))',
    expr: satOr(
      satVar('p'),
      satAnd(satVar('q'), satOr(satVar('r'), satAnd(satVar('s'), satVar('t'))))
    ),
    expectedCNF: '((q ∨ p) ∧ ((s ∨ r ∨ p) ∧ (t ∨ r ∨ p)))',
    expectedSatisfy: {
      p: true,
      q: false,
      r: false,
      s: false,
      t: false,
    },
  },
  {
    name: 'Disjunction with conjunction: (p ∧ q) ∨ (r ∧ s)',
    expr: satOr(satAnd(satVar('p'), satVar('q')), satAnd(satVar('r'), satVar('s'))),
    expectedCNF: '(((r ∨ p) ∧ (s ∨ p)) ∧ ((r ∨ q) ∧ (s ∨ q)))',
    expectedSatisfy: {p: false, q: false, r: true, s: true},
  },
  {
    name: 'Biconditional with disjunction: p ↔ (q ∨ r)',
    expr: satEquivalent(satVar('p'), satOr(satVar('q'), satVar('r'))),
    expectedCNF: '((¬p ∨ q ∨ r) ∧ ((¬q ∨ p) ∧ (¬r ∨ p)))',
    expectedSatisfy: {p: false, q: false, r: false},
  },
  {
    name: 'Conjunction with implication containing conjunction and equivalence: ((p ∨ q) → (r ∧ s)) ∧ (t ↔ u)',
    expr: satAnd(
      satImplies(satOr(satVar('p'), satVar('q')), satAnd(satVar('r'), satVar('s'))),
      satEquivalent(satVar('t'), satVar('u'))
    ),
    expectedCNF: '((((r ∨ ¬p) ∧ (s ∨ ¬p)) ∧ ((r ∨ ¬q) ∧ (s ∨ ¬q))) ∧ ((¬t ∨ u) ∧ (¬u ∨ t)))',
    expectedSatisfy: {
      p: false,
      q: false,
      r: false,
      s: false,
      t: false,
      u: false,
    },
  },
  {
    name: 'Deeply nested implications: ((p → q) → r) → s',
    expr: satImplies(satImplies(satImplies(satVar('p'), satVar('q')), satVar('r')), satVar('s')),
    expectedCNF: '((¬p ∨ q ∨ s) ∧ (¬r ∨ s))',
    expectedSatisfy: {
      p: false,
      q: false,
      r: false,
      s: false,
    },
  },
  {
    name: 'Double negated disjunction with conjunction: ¬(¬(p ∨ (q ∧ ¬r)))',
    expr: satNot(satNot(satOr(satVar('p'), satAnd(satVar('q'), satNot(satVar('r')))))),
    expectedCNF: '((q ∨ p) ∧ (¬r ∨ p))',
    expectedSatisfy: {p: true, q: false, r: false},
  },
  {
    name: 'Disjunction with conjunction containing boolean constants: true ∨ (p ∧ false)',
    expr: satOr(satBool(true), satAnd(satVar('p'), satBool(false))),
    expectedCNF: '((p ∨ true) ∧ (false ∨ true))',
    expectedSatisfy: {p: false},
  },
];

describe('CNF Conversion Examples', () => {
  for (const testCase of testCases) {
    it(testCase.name, () => {
      const cnf = toCNF(testCase.expr);
      deepEqualLogicExpr(cnf, testCase.expectedCNF);
    });
  }
});

describe('Solve SAT', () => {
  for (const testCase of testCases) {
    it(testCase.name, () => {
      const cnf = solve(toCNF(testCase.expr));
      deepEqual(cnf, testCase.expectedSatisfy);
    });
  }
});
