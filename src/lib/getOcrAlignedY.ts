export function getOcrAlignedY(
  bbox: { y0: number; y1: number },
  {
    fontSize,
    workspaceSize,
    ratio
  }: {
    fontSize: number
    baselineFactor?: number
    workspaceSize: number
    ratio: number
  }
): number {
  const y0 = (bbox.y0 * ratio) / workspaceSize
  const y1 = (bbox.y1 * ratio) / workspaceSize
  const centerY = (y0 + y1) / 2

  // Correct for baseline alignment — tweak as needed
  const baselineOffset = fontSize * 0.25

  return centerY + baselineOffset
}
