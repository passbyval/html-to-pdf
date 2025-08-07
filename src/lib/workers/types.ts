import type { IUseDocumentOptions } from '../useDocument/types'

export interface PdfWorkerOptions
  extends Pick<IUseDocumentOptions, 'autoPaginate' | 'workspaceScale'> {
  width: number
  height: number
  margin: number
  bitmap: ImageBitmap
  ocrBitmap: ImageBitmap
  pageHeight: number
  customWords: string
}

export interface PdfWorkerInput {
  options: Required<PdfWorkerOptions>
  action?: 'terminate'
}

export const Progress = {
  Pending: 'progress',
  Done: 'done',
  Error: 'error'
} as const

export interface PdfWorkerOutput {
  type: (typeof Progress)[keyof typeof Progress]
  pdfBuffer?: ArrayBuffer
  pageNumber?: number
  totalPages?: number
  message?: string
  progress?: number
  durationMs?: number
  eta?: number
  totalEstimatedTime?: number
}
