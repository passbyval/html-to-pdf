import type { IDocumentProps } from '../Document'

export interface IUseDocumentOptions
  extends Partial<Omit<IDocumentProps, 'ref'>> {
  /**
   * A scaling factor applied to the document to reduce its on-screen size.
   *
   * By default, the document is scaled down from 300 DPI ANSI Letter size
   * using a factor of 3.5 to ensure it fits within typical screen resolutions.
   *
   */
  workspaceScale?: number
  autoScale?: boolean
  autoPaginate?: boolean
}
