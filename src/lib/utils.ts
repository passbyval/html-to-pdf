import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const times = <T>(n: number, cb: () => T) =>
  new Array(n).fill(0).map(() => cb())
