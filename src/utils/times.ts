type BuildTuple<T, N extends number, R extends T[] = []> = R['length'] extends N
  ? R
  : BuildTuple<T, N, [...R, T]>

export function times<T, N extends number = number>(
  n: N,
  cb: () => T
): BuildTuple<T, N> {
  return Array.from({ length: n }, cb) as BuildTuple<T, N>
}
