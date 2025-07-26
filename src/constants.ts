export type IPaperSignifier = 'Letter'

export type IPaperDimensions = [
  /**
   * Width
   */
  number,
  /**
   * Height
   */
  number,
]

export const PAPER_DIMENSIONS: Record<
  Uppercase<IPaperSignifier>,
  IPaperDimensions
> = {
  LETTER: [2551, 3295],
}
