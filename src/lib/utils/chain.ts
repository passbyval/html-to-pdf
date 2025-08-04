export async function chain<T1>(fn1: () => Promise<T1>): Promise<[T1]>

export async function chain<T1, T2>(
  fn1: () => Promise<T1>,
  fn2: (arg1: T1) => Promise<T2> | T2
): Promise<[T1, T2]>

export async function chain<T1, T2, T3>(
  fn1: () => Promise<T1>,
  fn2: (arg1: T1) => Promise<T2>,
  fn3: (arg2: T2) => Promise<T3> | T3
): Promise<[T1, T2, T3]>

export async function chain<T1, T2, T3, T4>(
  fn1: () => Promise<T1>,
  fn2: (arg1: T1) => Promise<T2>,
  fn3: (arg2: T2) => Promise<T3>,
  fn4: (arg3: T3) => Promise<T4> | T4
): Promise<[T1, T2, T3, T4]>

export async function chain(...fns: any[]): Promise<any[]> {
  const results = []
  let prev: any = undefined

  for (const [i, fn] of fns.entries()) {
    const result = i === 0 ? fn() : fn(prev)
    prev = result instanceof Promise ? await result : result
    results.push(prev)
  }

  return results
}
