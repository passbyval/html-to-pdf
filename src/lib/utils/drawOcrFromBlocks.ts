import type jsPDF from 'jspdf'
import type { Line, RecognizeResult } from 'tesseract.js'
import { drawOcrWord } from '../drawOcrWord'

export async function drawOcrFromBlocks({
  doc,
  worker,
  canvas,
  knownFontSize = 12,
  ratio
}: {
  doc: jsPDF
  worker: Tesseract.Worker
  canvas: HTMLCanvasElement | OffscreenCanvas
  knownFontSize: number
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
        const multiplier = knownFontSize / (lineHeight * ratio)
        const fontSize = lineHeight * ratio * multiplier

        drawOcrWord(doc, line as Line, fontSize, ratio)
      }
    }
  }
}
