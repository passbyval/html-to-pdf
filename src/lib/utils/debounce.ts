import { CONFIG } from '../config'

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number = CONFIG.UI.DEBOUNCE_DELAY
): ((...args: Parameters<T>) => void) => {
  const state = { timeoutId: 0 }

  return (...args: Parameters<T>) => {
    clearTimeout(state.timeoutId)

    state.timeoutId = setTimeout(
      () => func(...args),
      delay
    ) as unknown as number
  }
}
