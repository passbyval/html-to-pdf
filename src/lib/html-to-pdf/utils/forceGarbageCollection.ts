export const forceGarbageCollection = (): void => {
  if (typeof gc === 'function') {
    gc()
  }
}
