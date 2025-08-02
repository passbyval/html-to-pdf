type FirstFn<T> = () => Promise<T>
type NextFn<Input, Output> = (arg: Input) => Promise<Output>

type ChainFns = [FirstFn<any>, ...Array<NextFn<any, any>>]

type ChainResults<Fns extends ChainFns> = Fns extends [
  FirstFn<infer First>,
  ...infer Rest
]
  ? Rest extends NextFn<any, any>[]
    ? _ChainResults<First, Rest, [First]>
    : never
  : never

type _ChainResults<
  Prev,
  Fns extends NextFn<any, any>[],
  Acc extends any[]
> = Fns extends [NextFn<Prev, infer Next>, ...infer Tail]
  ? Tail extends NextFn<any, any>[]
    ? _ChainResults<Next, Tail, [...Acc, Next]>
    : never
  : Acc

export async function chain<Fns extends ChainFns>(
  ...fns: Fns
): Promise<ChainResults<Fns>> {
  const [first, ...rest] = fns

  const firstResult = await first()
  const initial = Promise.resolve<[unknown, unknown[]]>([
    firstResult,
    [firstResult]
  ])

  const [, allResults] = await rest.reduce(async (accPromise, fn) => {
    const [prevValue, results] = await accPromise
    const nextValue = await fn(prevValue)
    return [nextValue, [...results, nextValue]] as [unknown, unknown[]]
  }, initial)

  return allResults as ChainResults<Fns>
}
