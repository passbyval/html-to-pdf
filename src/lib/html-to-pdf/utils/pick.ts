export function pick<T extends Record<string, any>, K extends keyof T>(
  source: T,
  keys: readonly K[]
): Pick<T, K> {
  return keys.reduce(
    (acc, key) => {
      if (key in source) {
        acc[key] = source[key]
      }
      return acc
    },
    {} as Pick<T, K>
  )
}
