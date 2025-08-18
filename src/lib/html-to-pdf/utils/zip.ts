import { range } from './range'

export function zip<T extends readonly unknown[][]>(
  ...arrays: T
): Array<{ [K in keyof T]: T[K][number] | undefined }> {
  return arrays.length === 0
    ? []
    : range(Math.max(...arrays.map((arr) => arr.length))).map(
        (i) =>
          arrays.map((arr) => arr[i]) as {
            [K in keyof T]: T[K][number] | undefined
          }
      )
}
