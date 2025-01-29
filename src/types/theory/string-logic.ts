import {expectType} from 'tsd';
import type {And, False, Not, Or, True} from './base.ts';
import {logicFalse, logicTrue} from '../instances.ts';

type InferTrueType<S> = S extends 'True' ? True : False;
type InferTrueString<S> = S extends True ? 'True' : 'False';

type EE<S> = S extends `${infer A} ∧ ${infer B}`
  ? And<InferTrueType<A>, InferTrueType<B>>
  : S extends `${infer A} ∨ ${infer B}`
    ? Or<InferTrueType<A>, InferTrueType<B>>
    : S extends `¬${infer A}`
      ? Not<InferTrueType<A>>
      : S extends `(${infer A})`
        ? InferTrueType<A>
        : InferTrueType<S>;

type EES<S> = InferTrueString<EE<S>>;

expectType<EE<'True ∧ False'>>(logicFalse);
expectType<EE<'True ∨ False'>>(logicTrue);
expectType<EE<'¬True'>>(logicFalse);
expectType<EE<'(True)'>>(logicTrue);
expectType<EE<'False'>>(logicFalse);

expectType<EES<'True ∧ False'>>('False');
expectType<EES<'True ∨ False'>>('True');
expectType<EES<'¬True'>>('False');
expectType<EES<'(True)'>>('True');
expectType<EES<'False'>>('False');

type ComplexExprText = EE<`True ∧ ${EES<`False ∨ True`>}`>;
expectType<ComplexExprText>(logicTrue);
