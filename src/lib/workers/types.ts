import type { IDocumentProps } from '../Document'
import type { IUseDocumentOptions } from '../useDocument/types'

export interface WorkerOptions
  extends Pick<
      IUseDocumentOptions,
      'workspaceScale' | 'autoScale' | 'autoPaginate'
    >,
    Pick<IDocumentProps, 'width' | 'height'> {
  knownFontSize: number
}

export interface WorkerInput {
  bitmaps: [ImageBitmap, ImageBitmap][]
  options: Required<WorkerOptions>
}

export interface WorkerOutput {
  pdfBlob: Blob
}
