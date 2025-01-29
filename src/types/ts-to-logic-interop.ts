import type {False, True, TypeScriptTrue} from './theory/base.ts';

export type MapTSBoolIntoLogicType<
  Arr extends (boolean | unknown)[],
  Acc extends any[] = [],
> = Arr extends [infer Head, ...infer Tail]
  ? MapTSBoolIntoLogicType<Tail, AppendLogicType<Head, Acc>>
  : Acc;

export type AppendLogicType<Head, Acc extends any[]> = [
  ...Acc,
  Head extends TypeScriptTrue ? True : False,
];

export type AssertLogicToType<Value extends True | False, T> = Value extends True ? T : never;
