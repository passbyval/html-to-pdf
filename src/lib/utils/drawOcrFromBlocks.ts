import type jsPDF from 'jspdf'
import type { Line, RecognizeResult } from 'tesseract.js'
import { drawOcrWord } from '../drawOcrWord'

export async function drawOcrFromBlocks({
  doc,
  worker,
  canvas,
  knownFontSize,
  workspaceScale,
  ratio
}: {
  doc: jsPDF
  worker: Tesseract.Worker
  canvas: OffscreenCanvas
  knownFontSize: number
  workspaceScale: number
  ratio: number
}) {
  const {
    data: { blocks = [] }
  }: RecognizeResult = await worker.recognize(canvas, {}, { blocks: true })

  if (!blocks) return

  for (const block of blocks) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        const {
          bbox: { y1, y0 }
        } = line
        const lineHeight = y1 - y0

        // Adjust font size based on OCR-calculated height and known baseline font size
        const multiplier =
          knownFontSize / ((lineHeight * ratio) / workspaceScale)
        const fontSize = (lineHeight * ratio * multiplier) / workspaceScale

        drawOcrWord(doc, line as Line, fontSize, workspaceScale, ratio)
      }
    }
  }
}
