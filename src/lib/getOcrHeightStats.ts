import { type IDocumentProps } from './Document'

export const TEST_TEXT = `
  ABCDEFGHIJKLMNOPQRSTUVWXYZ
  abcdefghijklmnopqrstuvwxyz
  0123456789
  \`~!@#$%^&*()_+-=[]{}\\|;:'\",<.>/?
`
  .replace(/\s+/g, ' ')
  .trim()

export interface IUseDocumentOptions
  extends Partial<Omit<IDocumentProps, 'ref'>> {
  workspaceSize?: number
  autoScale?: boolean
}

type GetOcrHeightStatsParams = {
  canvas: HTMLCanvasElement
  testText: string
  worker: Tesseract.Worker
}

export const getOcrHeightStats = async ({
  canvas,
  testText,
  worker
}: GetOcrHeightStatsParams) => {
  const {
    data: { blocks = [] }
  } = await worker.recognize(
    canvas,
    {},
    {
      blocks: true
    }
  )

  const testWords = new Set(
    testText
      .split('')
      .map((w) => w.trim())
      .filter(Boolean)
  )

  const ocrHeights: number[] = []
  const ocrWidths: number[] = []

  const charHeights: Record<string, number> = {}
  const charWidths: Record<string, number> = {}

  for (const block of blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        for (const word of line.words) {
          if (testWords.has(word.text)) {
            const height = word.bbox.y1 - word.bbox.y0
            const width = word.bbox.x1 - word.bbox.x0

            ocrHeights.push(height)
            ocrWidths.push(width)

            charHeights[word.text] = height
            charWidths[word.text] = width
          }
        }
      }
    }
  }

  if (ocrHeights.length === 0) {
    throw new Error('No OCR words matched the test text.')
  }

  const average = ocrHeights.reduce((sum, h) => sum + h, 0) / ocrHeights.length
  const min = Math.min(...ocrHeights)
  const max = Math.max(...ocrHeights)

  return {
    average,
    min,
    max,
    count: ocrHeights.length,
    charHeights,
    charWidths
  }
}
