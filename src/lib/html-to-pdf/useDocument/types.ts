import type { IDocumentProps } from '../components/Document'

export interface IOcrSettings {
  confidenceThreshold: number
}

export interface IUseDocumentOptions
  extends Partial<Omit<IDocumentProps, 'ref'>> {
  /**
   * A scaling factor applied to the document to reduce its on-screen size.
   *
   * By default, the document is scaled down from 300 DPI ANSI Letter size
   * using a factor of 3.5 so it fits within typical screen resolutions.
   *
   * Higher default resolutions ensures that the final PDF is crisp.
   *
   */
  workspaceScale?: number
  autoPaginate?: boolean
  debug?: boolean
  ocrSettings?: Partial<IOcrSettings>
}

/**
 * Cleanup function. Revokes URL to the PDF.
 */
export type ICleanupFunction = () => void

export type IDownload = (options?: {
  type: 'direct' | 'newtab'
}) => ICleanupFunction
