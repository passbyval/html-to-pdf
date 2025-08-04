import type { WorkerParams } from 'tesseract.js'

export const MARGINS = [
  /**
   * One inch.
   */
  'Standard',
  /**
   * Half inch.
   */
  'Thin',
  /**
   *  Zero inches
   */
  'None'
] as const

export type IPaperFormat = 'Letter'
export type IMargin = (typeof MARGINS)[number] | number

/**
 * Common U.S. paper sizes.
 *
 * In pixels. Assumes 300 DPI.
 */
export type IPaperDimensions = [
  /**
   * Width
   */
  number,
  /**
   * Height
   */
  number
]

export const DEFAULT_MARGIN = 300

export const PAPER_DIMENSIONS: Record<
  Uppercase<IPaperFormat>,
  IPaperDimensions
> = {
  LETTER: [2551, 3295]
}

export const TEST_TEXT = `
  ABCDEFGHIJKLMNOPQRSTUVWXYZ
  abcdefghijklmnopqrstuvwxyz
  0123456789
  \`~!@#$%^&*()_+-=[]{}\\|;:'\",<.>/?
`
  .replace(/\s+/g, ' ')
  .trim()

export const OCR_PARAMS: Partial<WorkerParams> = {
  preserve_interword_spaces: '0'
}

export const CANVAS_CONTEXT_OPTIONS = {
  antialias: true,
  desynchronized: true
}
