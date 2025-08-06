export const times = <T>(n: number, cb: () => T) =>
  new Array(n).fill(0).map(() => cb())
