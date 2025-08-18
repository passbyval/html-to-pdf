export function range(n: number, start = 0): number[] {
  return [...Array(n).keys()].map((i) => i + start)
}
