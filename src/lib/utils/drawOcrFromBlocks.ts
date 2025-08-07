import type jsPDF from 'jspdf'
import type { RecognizeResult } from 'tesseract.js'
import { drawOcrWord } from '../utils/drawOcrWord'

export async function drawOcrFromBlocks({
  doc,
  worker,
  canvas,
  ratio
}: {
  doc: jsPDF
  worker: Tesseract.Worker
  canvas: HTMLCanvasElement | OffscreenCanvas
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
        const fontSize = lineHeight * ratio

        console.log(fontSize, lineHeight, line.text)

        drawOcrWord(doc, line, fontSize, ratio)
      }
    }
  }
}
