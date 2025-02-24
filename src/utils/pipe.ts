import {expectType} from 'tsd';
import type {AllTrue, False, If, True} from '../types/theory/base.ts';
import {logicTrue} from '../types/instances.ts';

type AnyFn = (...args: any[]) => any;

type ArgAndReturn<F extends AnyFn | unknown> = F extends (arg: infer A) => infer R ? [A, R] : never;

type FormFnListCreate2DListWithArgThenReturn<
  Fns extends (AnyFn | unknown)[],
  Acc extends any[] = [],
> = Fns extends [infer Head, ...infer Tail]
  ? FormFnListCreate2DListWithArgThenReturn<Tail, [...Acc, ArgAndReturn<Head>]>
  : Acc;

type VerifyIsSecondEqToFirstFromOtherChunks<
  T extends (ArgAndReturn<AnyFn> | unknown)[],
  Acc extends any[] = [],
> = T extends [infer Head, ...infer Tail]
  ? Head extends [infer _, infer CurrentReturn]
    ? Tail extends [infer Next, ...infer _]
      ? Next extends [infer NextArgs, infer _]
        ? CurrentReturn extends NextArgs
          ? VerifyIsSecondEqToFirstFromOtherChunks<Tail, [...Acc, True]>
          : VerifyIsSecondEqToFirstFromOtherChunks<Tail, [...Acc, False]>
        : Acc
      : Acc
    : Acc
  : Acc;

type GetArgumentForFirstFn<Fns extends AnyFn[]> = Parameters<Fns[0]>[0];

// ==================
// =Type-Level Tests=
// ==================
const boolInstance: boolean = true;
const numInstance: number = 1;
const strInstance: string = '';

type Fns = [
  (s: false) => number,
  (x: number) => string[],
  (x: string[]) => string,
  (x: string) => boolean,
  (x: boolean) => true,
];

type ExtractTest = FormFnListCreate2DListWithArgThenReturn<Fns>;

expectType<ExtractTest>([
  [false, numInstance],
  [numInstance, [strInstance]],
  [[strInstance], strInstance],
  [strInstance, boolInstance],
  [boolInstance, true],
]);

type VerifyTest = VerifyIsSecondEqToFirstFromOtherChunks<ExtractTest>;
expectType<VerifyTest>([logicTrue, logicTrue, logicTrue, logicTrue]);

type VerifyFnsFirstArg = GetArgumentForFirstFn<Fns>;
expectType<VerifyFnsFirstArg>(false);

// ================
// =Implementation=
// ================

export const pipe = <
  Fns extends AnyFn[],
  Output extends AnyFn,
  ArgToReturn2DArray extends VerifyIsSecondEqToFirstFromOtherChunks<
    FormFnListCreate2DListWithArgThenReturn<[...Fns, Output]>
  >,
  IsPipeCorrect extends AllTrue<ArgToReturn2DArray>,
  Input extends If<IsPipeCorrect, GetArgumentForFirstFn<Fns>, never>,
>(
  {
    input,
    output,
  }: {
    input: Input;
    output: Output;
  },
  ...fns: Fns
) => {
  fns.push(output);

  return fns.reduce((acc, fn) => fn(acc), input) as ReturnType<Output>;
};

const add1 = (x: number) => x + 1;
const add2 = (x: number) => x + 2;
const add3 = (x: number) => x + 3;

const result = pipe({input: 1, output: add3}, add1, add2);
expectType<typeof result>(6);

const numToStr = (x: number) => x.toString();
const strToNum = (x: string) => parseInt(x, 10);
const numToBool = (x: number) => x > 0;
const boolToFn = (x: boolean) => (x ? numToStr : strToNum);

const result2 = pipe({input: 1, output: boolToFn}, numToStr, strToNum, numToBool);
expectType<typeof result2>((x: number) => x.toString());
expectType<typeof result2>((x: string) => parseInt(x, 10));

export const abusePipe = <
  Fns extends AnyFn[],
  Output extends AnyFn,
  ArgToReturn2DArray extends VerifyIsSecondEqToFirstFromOtherChunks<
    FormFnListCreate2DListWithArgThenReturn<[...Fns, Output]>
  >,
  IsPipeCorrect extends AllTrue<ArgToReturn2DArray>,
  Input extends If<IsPipeCorrect, GetArgumentForFirstFn<Fns>, never>,
>(
  input: Input,
  ...fns: [...Fns, Output]
): ReturnType<Output> => fns.reduce((acc, fn) => fn(acc), input);

const result4 = abusePipe(1, add1, add2, add3);
expectType<typeof result4>(6);

const result5 = abusePipe(1, numToStr, strToNum, numToBool, boolToFn);
expectType<typeof result5>((x: number) => x.toString());
expectType<typeof result5>((x: string) => parseInt(x, 10));

const result6 = abusePipe(1, add1, add2, add3, numToStr);
expectType<typeof result6>('6');

export const abusePipeArr = <
  Fns extends AnyFn[],
  Output extends AnyFn,
  ArgToReturn2DArray extends VerifyIsSecondEqToFirstFromOtherChunks<
    FormFnListCreate2DListWithArgThenReturn<[...Fns, Output]>
  >,
  IsPipeCorrect extends AllTrue<ArgToReturn2DArray>,
  Input extends If<IsPipeCorrect, GetArgumentForFirstFn<Fns>, never>,
>(
  input: Input,
  fns: readonly [...Fns, Output]
): ReturnType<Output> => fns.reduce((acc, fn) => fn(acc), input);

const fns1 = [add1, add2, add3] as const;

const result7 = abusePipeArr(1, fns1);
expectType<typeof result7>(6);

const fns2 = [numToStr, strToNum, numToBool, boolToFn] as const;

const result8 = abusePipeArr(1, fns2);
expectType<typeof result8>((x: number) => x.toString());

export const abusePipeClj =
  <
    Fns extends AnyFn[],
    Output extends AnyFn,
    ArgToReturn2DArray extends VerifyIsSecondEqToFirstFromOtherChunks<
      FormFnListCreate2DListWithArgThenReturn<[...Fns, Output]>
    >,
    IsPipeCorrect extends AllTrue<ArgToReturn2DArray>,
    Input extends If<IsPipeCorrect, GetArgumentForFirstFn<Fns>, never>,
  >(
    ...fns: [...Fns, Output]
  ): ((input: Input) => ReturnType<Output>) =>
  (input: Input) =>
    fns.reduce((acc, fn) => fn(acc), input);

const result9 = abusePipeClj(add1, add2, add3)(1);
expectType<typeof result9>(6);

const someNum = 1;

const result10 = abusePipeClj(numToStr, strToNum, numToBool, boolToFn)(someNum);
expectType<typeof result10>((x: number) => x.toString());

console.log({
  result,
  result2,
  result4,
  result5,
  result6,
  result7,
  result8,
  result9,
  result10,
});
