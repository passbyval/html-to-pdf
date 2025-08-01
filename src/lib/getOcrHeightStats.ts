import { type IDocumentProps } from './Document'

export const TEST_TEXT = `
  AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz
  0123456789
  . , ; : ! ? - – — _ ( ) [ ] { }
  $ € £ ¥ ₩ ₽ ₹ ¢
  á é í ó ú ñ ü ø å ß æ œ
  Α Β Γ Δ Ε Ζ Η Θ Ι Κ Λ Μ Ν Ξ Ο Π Ρ Σ Τ Υ Φ Χ Ψ Ω
  а б в г д е ё ж з и й к л м н о п р с т у ф х ц ч ш щ ъ ы ь э ю я
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
      .split(/\s+/)
      .map((w) => w.trim())
      .filter(Boolean)
  )

  const ocrHeights: number[] = []
  const matchedWords: string[] = []

  for (const block of blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        for (const word of line.words) {
          if (testWords.has(word.text)) {
            const height = word.bbox.y1 - word.bbox.y0
            ocrHeights.push(height)
            matchedWords.push(word.text)
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
    matchedWords
  }
}
