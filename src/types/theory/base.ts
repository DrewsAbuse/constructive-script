import {expectType} from 'tsd';
import type {TrueSymbol} from '../instances.ts';
import type {FalseSymbol} from '../instances.ts';
import {instanceOfNever, logicFalse, logicTrue} from '../instances.ts';

/**
 * TypeScript True
 * @example
 * const instance = true;
 * type TypeScriptTrue = typeof instance;  // true
 */
export type TypeScriptTrue = true;

/**
 * Represents logical truth (⊤)
 * @example
 * type ValidProof = Proof<True>  // "Valid"
 */
export type True = {readonly _logic: typeof TrueSymbol};

/**
 * Represents logical falsehood (⊥)
 * @example
 * type InvalidProof = Proof<False>  // "Invalid"
 */
export type False = {readonly _logic: typeof FalseSymbol};

/**
 * Validates a logical proposition's truth
 * @template T - Proposition type to validate
 * @returns "Valid" if T is True, "Invalid" otherwise
 */
export type Proof<T> = T extends True ? 'Valid' : 'Invalid';

/**
 * Creates a contradiction from a truth value
 * @template T - Input truth value
 * @returns False if T is True, never otherwise
 */
export type Contradiction<T> = T extends True ? False : never;

/**
 * Logical negation (¬)
 * @template T - Proposition to negate
 */
export type Not<T> = T extends True ? False : True;

/**
 * Logical conjunction (∧)
 * @template A - First proposition
 * @template B - Second proposition
 */
export type And<A, B> = A extends True ? (B extends True ? True : False) : False;

/**
 * Logical disjunction (∨)
 * @template A - First proposition
 * @template B - Second proposition
 */
export type Or<A, B> = A extends True ? True : B extends True ? True : False;

/**
 * Logical implication (⇒)
 * @template A - Antecedent proposition
 * @template B - Consequent proposition
 */
export type Implies<A, B> = Or<Not<A>, B>;

/**
 * Logical equivalence (⇔)
 * @template A - First proposition
 * @template B - Second proposition
 */
export type Equiv<A, B> = And<Implies<A, B>, Implies<B, A>>;

/**
 * Universal quantification for tuples
 * @template T - Tuple of propositions
 */
export type AllTrue<T extends readonly any[]> = T extends [infer Head, ...infer Tail]
  ? And<Head, AllTrue<Tail>>
  : True;

/**
 * Existential quantification for tuples
 * @template T - Tuple of propositions
 */
export type AnyTrue<T extends readonly any[]> = T extends [infer Head, ...infer Tail]
  ? Or<Head, AnyTrue<Tail>>
  : False;

/**
 * Exclusive disjunction (⊕)
 * @template A - First proposition
 * @template B - Second proposition
 */
export type XOR<A, B> = And<Or<A, B>, Not<And<A, B>>>;

/**
 * Logical alternative denial (↑)
 * @template A - First proposition
 * @template B - Second proposition
 */
export type NAND<A, B> = Not<And<A, B>>;

/**
 * Joint denial (↓)
 * @template A - First proposition
 * @template B - Second proposition
 */
export type NOR<A, B> = Not<Or<A, B>>;

/**
 * Checks if type A is assignable to type B
 * @template A - First type to check
 * @template B - Second type to check
 * @returns True if A is assignable to B, False otherwise
 */
export type Is<A, B> = A extends B ? True : False;

/**
 * Conditional type selector
 * @template Cond - Condition proposition
 * @template Then - Type if true
 * @template Else - Type if false
 */
export type If<Cond, Then, Else> = Cond extends True ? Then : Else;

/**
 * Universal negation quantification for tuples
 * @template T - Tuple of propositions
 */
export type AllFalse<T extends readonly any[]> = T extends [infer Head, ...infer Tail]
  ? And<Not<Head>, AllFalse<Tail>>
  : True;

// ======================
// Verification Tests
// ======================

// Base type verification
expectType<Proof<True>>('Valid');
expectType<Proof<False>>('Invalid');

// Contradiction checks
expectType<Contradiction<True>>(logicFalse);
expectType<Contradiction<False>>(instanceOfNever);

// Basic logical operations
expectType<Not<True>>(logicFalse);
expectType<Not<False>>(logicTrue);

expectType<And<True, False>>(logicFalse);
expectType<And<True, True>>(logicTrue);

expectType<Or<True, False>>(logicTrue);
expectType<Or<False, False>>(logicFalse);

// Implication truth table
expectType<Implies<True, False>>(logicFalse);
expectType<Implies<True, True>>(logicTrue);
expectType<Implies<False, True>>(logicTrue);
expectType<Implies<False, False>>(logicTrue);

// Equivalence checks
expectType<Equiv<True, False>>(logicFalse);
expectType<Equiv<True, True>>(logicTrue);

// Quantifiers
expectType<AllTrue<[True, True, True]>>(logicTrue);
expectType<AllTrue<[True, False, True]>>(logicFalse);

expectType<AnyTrue<[True, False, False]>>(logicTrue);
expectType<AnyTrue<[False, False, False]>>(logicFalse);

// Derived operations
expectType<XOR<True, False>>(logicTrue);
expectType<XOR<True, True>>(logicFalse);

expectType<NAND<True, False>>(logicTrue);
expectType<NAND<True, True>>(logicFalse);

expectType<NOR<True, False>>(logicFalse);
expectType<NOR<True, True>>(logicFalse);

// Conditional selection
expectType<If<True, True, False>>(logicTrue);
expectType<If<False, True, False>>(logicFalse);

// Universal negation
expectType<AllFalse<[False, False, False]>>(logicTrue);
expectType<AllFalse<[True, False, False]>>(logicFalse);

// ======================
// Algebraic Properties
// ======================

/**
 * Checks if E is the identity element for logical conjunction (∧)
 * @template E - Element to test
 */
type IsAndIdentity<E> = And<Equiv<And<E, True>, True>, Equiv<And<E, False>, False>>;

/**
 * Checks if E is the identity element for logical disjunction (∨)
 * @template E - Element to test
 */
type IsOrIdentity<E> = Equiv<Or<E, False>, False>;

/**
 * Checks if conjunction is associative for given propositions
 * @template A - First proposition
 * @template B - Second proposition
 * @template C - Third proposition
 */
type IsAndAssociative<A, B, C> = Equiv<And<And<A, B>, C>, And<A, And<B, C>>>;

/**
 * Checks if disjunction is associative for given propositions
 * @template A - First proposition
 * @template B - Second proposition
 * @template C - Third proposition
 */
type IsOrAssociative<A, B, C> = Equiv<Or<Or<A, B>, C>, Or<A, Or<B, C>>>;

/**
 * Checks if conjunction is commutative for given propositions
 * @template A - First proposition
 * @template B - Second proposition
 */
type IsAndCommutative<A, B> = Equiv<And<A, B>, And<B, A>>;

/**
 * Checks if disjunction is commutative for given propositions
 * @template A - First proposition
 * @template B - Second proposition
 */
type IsOrCommutative<A, B> = Equiv<Or<A, B>, Or<B, A>>;

/**
 * Checks if proposition has an inverse under conjunction
 * @template A - Proposition to check
 */
type HasInverseForAnd<A> = A extends True ? True : False;

/**
 * Checks if proposition has an inverse under disjunction
 * @template A - Proposition to check
 */
type HasInverseForOr<A> = A extends False ? True : False;

// ======================
// Verification Tests
// ======================

// Identity property checks
expectType<IsAndIdentity<True>>(logicTrue);
expectType<IsAndIdentity<False>>(logicFalse);
expectType<IsOrIdentity<False>>(logicTrue);
expectType<IsOrIdentity<True>>(logicFalse);

// Associativity checks
expectType<IsAndAssociative<True, True, True>>(logicTrue);
expectType<IsAndAssociative<True, False, True>>(logicTrue);
expectType<IsOrAssociative<False, False, False>>(logicTrue);
expectType<IsOrAssociative<True, False, True>>(logicTrue);

// Commutativity checks
expectType<IsAndCommutative<True, False>>(logicTrue);
expectType<IsAndCommutative<True, True>>(logicTrue);
expectType<IsOrCommutative<False, True>>(logicTrue);
expectType<IsOrCommutative<False, False>>(logicTrue);

// Inverse checks
expectType<HasInverseForAnd<True>>(logicTrue);
expectType<HasInverseForAnd<False>>(logicFalse);
expectType<HasInverseForOr<False>>(logicTrue);
expectType<HasInverseForOr<True>>(logicFalse);
