import type jsPDF from 'jspdf'
import type { RecognizeResult, Worker } from 'tesseract.js'
import { drawOcrWord } from '../utils/drawOcrWord'
import type { IOcrSettings } from '../useDocument/types'

export async function drawOcrFromBlocks({
  doc,
  worker,
  canvas,
  ratio,
  ocrSettings
}: {
  doc: jsPDF
  worker: Worker
  canvas: HTMLCanvasElement | OffscreenCanvas
  ratio: number
  ocrSettings: Partial<IOcrSettings>
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

        console.log(fontSize, lineHeight, line.text, {
          confidence: line.confidence
        })

        if (line.confidence <= (ocrSettings.confidenceThreshold ?? 30)) continue

        drawOcrWord(doc, line, fontSize, ratio)
      }
    }
  }
}
