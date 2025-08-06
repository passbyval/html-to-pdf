export function transferBitmapToCanvas(
  bitmap: ImageBitmap,
  width = bitmap.width,
  height = bitmap.height
) {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('bitmaprenderer') ?? canvas.getContext('2d')

  if (ctx instanceof ImageBitmapRenderingContext) {
    ctx?.transferFromImageBitmap(bitmap)
  } else {
    ctx?.drawImage(bitmap, 0, 0)
  }

  return [canvas, ctx] as const
}
