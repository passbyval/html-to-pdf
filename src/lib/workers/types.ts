import type { IUseDocumentOptions } from '../useDocument/types'

export interface PdfWorkerOptions
  extends Pick<
    IUseDocumentOptions,
    'workspaceScale' | 'autoScale' | 'autoPaginate'
  > {
  knownFontSize: number
  width: number
  height: number
}

export interface PdfWorkerInput {
  bitmaps: (readonly [ImageBitmap, ImageBitmap])[]
  options: Required<PdfWorkerOptions>
  action?: 'terminate'
}

export interface PdfWorkerOutput {
  type: 'progress' | 'done' | 'error'
  pdfBuffer?: ArrayBuffer
  pageIndex?: number
  totalPages?: number
  message?: string
}
