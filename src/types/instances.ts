import type {False, True} from './theory/base.ts';

export const TrueSymbol = Symbol('True');
export const FalseSymbol = Symbol('False');

export const logicTrue: True = {_logic: TrueSymbol};
export const logicFalse: False = {_logic: FalseSymbol};
export const instanceOfAny: any = {};
export const instanceOfNever: never = instanceOfAny as never;
