export const getDimensions = <T extends { width: number; height: number }>(
  dimensions: T,
  {
    width: pageWidth,
    height: pageHeight
  }: {
    width: number
    height: number
  },
  scaleFactor = 1
) => {
  const scaledWidth = dimensions.width / scaleFactor
  const scaledHeight = dimensions.height / scaleFactor

  const inputAspect = scaledWidth / scaledHeight
  const pageAspect = pageWidth / pageHeight

  if (inputAspect > pageAspect) {
    return {
      width: pageWidth,
      height: pageWidth / inputAspect,
      ratio: pageWidth / scaledWidth
    }
  }

  return {
    width: pageHeight * inputAspect,
    height: pageHeight,
    ratio: pageHeight / scaledHeight
  }
}
