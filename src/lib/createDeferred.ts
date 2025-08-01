export type IPromiseParams = Parameters<
  ConstructorParameters<PromiseConstructor>[0]
>
export type IResolve<T> = (...p: T[]) => void
export type IReject<T> = (...p: T[]) => void

export interface IDeferred<T> {
  promise: Promise<T>
  resolve: IResolve<T>
  reject: IReject<T>
}

export const createDeferred = <T>() => {
  const deferredRef = {} as IDeferred<T>

  const deferred = new Promise((resolve: IResolve<T>, reject: IReject<T>) => {
    deferredRef.resolve = resolve
    deferredRef.reject = reject
  }) as IDeferred<T>['promise']

  deferredRef.promise = deferred

  return deferredRef
}
