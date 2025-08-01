import type { ImageOptions } from 'jspdf'

export const getDimensions = <T extends { width: number; height: number }>(
  dimensions: T,
  {
    width: pageWidth,
    height: pageHeight
  }: {
    width: number
    height: number
  }
): Pick<ImageOptions, 'width' | 'height'> & { ratio: number } => {
  const widthRatio = pageWidth / dimensions.width
  const heightRatio = pageHeight / dimensions.height
  const ratio = widthRatio > heightRatio ? heightRatio : widthRatio

  const width = dimensions.width * ratio
  const height = dimensions.height * ratio

  return {
    width,
    height,
    ratio
  }
}
