import type jsPDF from 'jspdf'

type BoundingBox = {
  x0: number
  x1: number
  y0: number
  y1: number
}

type DrawOcrWordOptions = {
  spacing?: 'ocr' | 'jsPDF'
  baselineFactor?: number // override if needed
}

export function drawOcrWord(
  doc: jsPDF,
  text: string,
  bbox: BoundingBox,
  fontSize: number,
  workspaceSize: number,
  ratio: number,
  options: DrawOcrWordOptions = {}
) {
  const { spacing = 'ocr', baselineFactor = 0.25 } = options

  const xStart = (bbox.x0 * ratio) / workspaceSize
  const y0 = (bbox.y0 * ratio) / workspaceSize
  const y1 = (bbox.y1 * ratio) / workspaceSize
  const centerY = (y0 + y1) / 2
  const y = centerY + fontSize * baselineFactor

  let cursorX = xStart

  doc.setFontSize(fontSize)

  for (const char of text) {
    doc.text(char, cursorX, y)

    const advance =
      spacing === 'jsPDF'
        ? doc.getTextWidth(char)
        : (((bbox.x1 - bbox.x0) / text.length) * ratio) / workspaceSize

    cursorX += advance
  }
}
