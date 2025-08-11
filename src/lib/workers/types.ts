import type { OCRSettings } from '../config'
import type { LogLevel } from '../DebugLogger'

export interface OCRBlock {
  readonly text: string
  readonly confidence: number
  readonly bbox: Readonly<{ x0: number; y0: number; x1: number; y1: number }>
  readonly fontSize?: number
  readonly fontFamily?: string
}

export interface OCRResult {
  readonly text: string
  readonly blocks: readonly OCRBlock[]
  readonly averageConfidence: number
  readonly lowConfidenceWords: number
  readonly processingTime: number
  readonly totalWords: number
}

export interface ProcessingMetrics {
  readonly stage: string
  readonly progress: number
  readonly eta: number
  readonly processingTime: number
  readonly memoryUsage?: number
  readonly ocrAccuracy?: number
  readonly timestamp: number
}

export interface GenerationResult {
  readonly success: boolean
  readonly pdfBuffer?: ArrayBuffer
  readonly error?: string
  readonly metadata: Readonly<{
    totalPages: number
    processingTime: number
    ocrAccuracy: number
  }>
}

export interface PdfWorkerInput {
  readonly options: Readonly<{
    width: number
    height: number
    margin: number
    bitmap: ImageBitmap
    ocrBitmap: ImageBitmap
    pageHeight: number
    workspaceScale: number
    customWords: string
    debug: LogLevel
    charWhiteList: string
    autoPaginate: boolean
    ocrSettings?: OCRSettings
  }>
}

export interface PdfWorkerOutput {
  readonly type: Progress
  readonly pageNumber?: number
  readonly totalPages?: number
  readonly progress?: number
  readonly durationMs?: number
  readonly eta?: number
  readonly totalEstimatedTime?: number
  readonly pdfBuffer?: ArrayBuffer
  readonly message?: string
  readonly stage?: string
  readonly stageDescription?: string
  readonly metrics?: ProcessingMetrics
  readonly timestamp: number
}

export interface ProcessingOptions {
  readonly confidenceThreshold: number
  readonly pageSegMode: string
  readonly engineMode: string
  readonly batchSize: number
}

export enum Progress {
  Pending = 'PENDING',
  Done = 'DONE',
  Error = 'ERROR'
}

export interface IDownloadOptions {
  readonly type?: 'direct' | 'window'
  readonly filename?: string
}
