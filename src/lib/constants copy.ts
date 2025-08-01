export type PPI = number

export const UNIT = [
  /**
   * Inches (in).
   */
  'in',
  /**
   * Millimeters (mm).
   */
  'mm'
] as const

export const MARGINS = [
  /**
   * One inch.
   */
  'Normal',
  /**
   * Half inch.
   */
  'Narrow',
  /**
   *  Zero inches
   */
  'None'
] as const

/**
 * North American
 */
export const ANSI_PAPER_FORMATS = [
  'Letter',
  'Legal',
  'Tabloid',
  'Ledger',
  'Junior Legal',
  'Half Letter',
  'Government Letter',
  'Government Legal',
  'ANSI A',
  'ANSI B',
  'ANSI C',
  'ANSI D',
  'ANSI E',
  'Arch A',
  'Arch B',
  'Arch C',
  'Arch D',
  'Arch E',
  'Arch E1',
  'Arch E2',
  'Arch E3'
] as const

export const ISO_PAPER_FORMATS = [
  '4A0',
  '2A0',
  'A0',
  'A1',
  'A2',
  'A3',
  'A4',
  'A5',
  'A6',
  'A7',
  'A8',
  'A9',
  'A10'
] as const

export type Unit = (typeof UNIT)[number]
export type AnsiFormat = (typeof ANSI_PAPER_FORMATS)[number]
export type IsoFormat = (typeof ISO_PAPER_FORMATS)[number]
export type PaperFormat = AnsiFormat | IsoFormat
export type Margin = (typeof MARGINS)[number] | number

/**
 * Common U.S. paper sizes.
 *
 * In pixels. Assumes 300 DPI.
 */
export type IPaperDimensions = Record<
  Unit,
  [
    /**
     * Width
     */
    number,
    /**
     * Height
     */
    number
  ]
>

export const DEFAULT_MARGIN = 1

export const ANSI_PAPER_DIMENSIONS: Record<
  Uppercase<AnsiFormat>,
  IPaperDimensions
> = {
  LETTER: {
    in: [216, 279],
    mm: [8.5, 11]
  },
  LEGAL: {
    in: [216, 356],
    mm: [8.5, 14]
  },
  TABLOID: {
    in: [279, 432],
    mm: [11, 17]
  },
  LEDGER: {
    in: [432, 279],
    mm: [17, 11]
  },
  'JUNIOR LEGAL': {
    in: [127, 203],
    mm: [5, 8]
  },
  'HALF LETTER': {
    in: [140, 216],
    mm: [5.5, 8.5]
  },
  'GOVERNMENT LETTER': {
    in: [203, 267],
    mm: [8, 10.5]
  },
  'GOVERNMENT LEGAL': {
    in: [216, 330],
    mm: [8.5, 13]
  },
  'ANSI A': {
    in: [216, 279],
    mm: [8.5, 11]
  },
  'ANSI B': {
    in: [279, 432],
    mm: [11, 17]
  },
  'ANSI C': {
    in: [432, 559],
    mm: [17, 22]
  },
  'ANSI D': {
    in: [559, 864],
    mm: [22, 34]
  },
  'ANSI E': {
    in: [864, 1118],
    mm: [34, 44]
  },
  'ARCH A': {
    in: [229, 305],
    mm: [9, 12]
  },
  'ARCH B': {
    in: [305, 457],
    mm: [12, 18]
  },
  'ARCH C': {
    in: [457, 610],
    mm: [18, 24]
  },
  'ARCH D': {
    in: [610, 914],
    mm: [24, 36]
  },
  'ARCH E': {
    in: [914, 1219],
    mm: [36, 48]
  },
  'ARCH E1': {
    in: [762, 1067],
    mm: [30, 42]
  },
  'ARCH E2': {
    in: [660, 965],
    mm: [26, 38]
  },
  'ARCH E3': {
    in: [686, 991],
    mm: [27, 39]
  }
}

export const ISO_PAPER_DIMENSIONS: Record<
  Uppercase<IsoFormat>,
  IPaperDimensions
> = {
  '4A0': {
    mm: [1682, 2378],
    in: [66.2, 93.6]
  },
  '2A0': {
    mm: [1189, 1682],
    in: [46.8, 66.2]
  },
  A0: {
    mm: [841, 1189],
    in: [33.1, 46.8]
  },
  A1: {
    mm: [594, 841],
    in: [23.4, 33.1]
  },
  A2: {
    mm: [420, 594],
    in: [16.5, 23.4]
  },
  A3: {
    mm: [297, 420],
    in: [11.7, 16.5]
  },
  A4: {
    mm: [210, 297],
    in: [8.3, 11.7]
  },
  A5: {
    mm: [148, 210],
    in: [5.8, 8.3]
  },
  A6: {
    mm: [105, 148],
    in: [4.1, 5.8]
  },
  A7: {
    mm: [74, 105],
    in: [2.9, 4.1]
  },
  A8: {
    mm: [52, 74],
    in: [2.0, 2.9]
  },
  A9: {
    mm: [37, 52],
    in: [1.5, 2.0]
  },
  A10: {
    mm: [26, 37],
    in: [1.0, 1.5]
  }
}

export const PAPER_DIMENSIONS: Record<
  Uppercase<IsoFormat | AnsiFormat>,
  IPaperDimensions
> = {
  ...ANSI_PAPER_DIMENSIONS,
  ...ISO_PAPER_DIMENSIONS
}
