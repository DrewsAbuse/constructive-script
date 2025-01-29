//Array Utils
import {expectType} from 'tsd';
import type {AllFalse, And, False, Not, Or, Proof, True} from './base.ts';
import {instanceOfAny, logicFalse, logicTrue} from '../instances.ts';

export type Length<T extends any[]> = T['length'];

export type ExactlyOne<T extends any[]> = T extends [infer H, ...infer R]
  ? Or<And<H, AllFalse<R>>, And<Not<H>, ExactlyOne<R>>>
  : False;
expectType<ExactlyOne<[True, False, False]>>(logicTrue);
expectType<ExactlyOne<[True, True, False]>>(logicFalse);

export type BuildTuple<N extends number, T extends any[] = []> =
  // Spread-pushing `any` into tuple `T` while `N` is not equal to `T`'s length
  Length<T> extends N ? T : BuildTuple<N, [...T, any]>;
expectType<BuildTuple<3>>([instanceOfAny, instanceOfAny, instanceOfAny]);
expectType<BuildTuple<1>>([instanceOfAny]);

export type GreaterOrEqThan<A extends number, B extends number> =
  // If BuildTuple<A> can be decomposed into BuildTuple<B> followed by any number of additional elements (...infer _)
  BuildTuple<A> extends [...BuildTuple<B>, ...infer _] ? True : False;
expectType<GreaterOrEqThan<10, 2>>(logicTrue);
expectType<GreaterOrEqThan<2, 10>>(logicFalse);
expectType<GreaterOrEqThan<1, 1>>(logicTrue);

export type GreaterThan<A extends number, B extends number> = A extends B
  ? False
  : BuildTuple<A> extends [...BuildTuple<B>, ...infer _]
    ? True
    : False;
expectType<GreaterThan<10, 2>>(logicTrue);
expectType<GreaterThan<2, 10>>(logicFalse);
expectType<GreaterThan<1, 1>>(logicFalse);

export type CountTrues<T extends any[], Acc extends any[] = []> = T extends [
  infer Head,
  ...infer Tail,
]
  ? Head extends True
    ? CountTrues<Tail, [...Acc, any]>
    : CountTrues<Tail, Acc>
  : Length<Acc>;

export type Double<N extends number> =
  BuildTuple<N> extends infer T ? (T extends any[] ? Length<[...T, ...T]> : never) : never;

export type Majority<T extends any[]> =
  GreaterThan<Double<CountTrues<T>>, T['length']> extends True ? True : False;
expectType<Majority<[True, True, True, False, False]>>(logicTrue);
expectType<Majority<[True, True, False, False, False]>>(logicFalse);
type TieVote = [True, True, False, False];
expectType<Proof<Majority<TieVote>>>('Invalid'); // 2/4 = 50%
expectType<Proof<Majority<[True]>>>('Valid'); // 1/1
expectType<Proof<Majority<never[]>>>('Invalid'); // 0/0
