export const cleanupCanvas = (
  canvas: HTMLCanvasElement | OffscreenCanvas
): void => {
  const ctx = canvas.getContext('2d')

  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
}

export const createCanvas = (width: number, height: number) => {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)

    return {
      canvas,
      cleanup: () => cleanupCanvas(canvas)
    }
  }

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')

    canvas.width = width
    canvas.height = height

    return {
      canvas,
      cleanup: () => cleanupCanvas(canvas)
    }
  }

  throw new Error('Canvas creation not supported in this environment')
}
