import jsPDF from 'jspdf'
import { createWorker } from 'tesseract.js'
import { OCR_PARAMS } from '../constants'
import { blobToDataURL } from '../utils/blobToDataURL'
import { chain } from '../utils/chain'
import { drawOcrFromBlocks } from '../utils/drawOcrFromBlocks'
import { getDimensions } from '../utils/getDimensions'
import { getPaginatedCanvases } from '../utils/getPaginatedCanvases'
import { transferBitmapToCanvas } from '../utils/transferBitmapToCanvas'

import { type PdfWorkerInput, type PdfWorkerOutput, Progress } from './types'

const workerPromise = (async () => {
  const [worker] = await chain(
    () => createWorker('eng'),
    (worker) => worker.setParameters(OCR_PARAMS)
  )

  return worker
})()

self.onmessage = async ({ data }: MessageEvent<PdfWorkerInput>) => {
  const { action, options } = data

  if (action === 'terminate') {
    return chain(
      async () => await workerPromise,
      (worker) => worker.terminate()
    )
  }

  const {
    width,
    bitmap,
    ocrBitmap,
    height,
    autoPaginate,
    knownFontSize,
    workspaceScale
  } = options

  const doc = new jsPDF('p', 'px', [width, height], true)
  const totalHeight = height * workspaceScale

  const [canvas] = transferBitmapToCanvas(bitmap)
  const [ocrCanvas] = transferBitmapToCanvas(ocrBitmap)

  const cropped = await getPaginatedCanvases(canvas, ocrCanvas, totalHeight)
  const withPagination = autoPaginate ? cropped : [cropped[0]]

  const durations: number[] = []

  for await (const [index, [canvas, ocrCanvas]] of withPagination.entries()) {
    const start = performance.now()
    const page = index === 0 ? doc : doc.addPage()

    const [, imageData] = await chain(
      () => canvas.convertToBlob({ type: 'image/jpeg', quality: 1 }),
      blobToDataURL
    )

    const { width, height } = doc.internal.pageSize
    const { ratio } = getDimensions(canvas, { width, height })

    await drawOcrFromBlocks({
      doc: page,
      canvas: ocrCanvas,
      ratio,
      knownFontSize,
      worker: await workerPromise
    })

    page.addImage({
      imageData,
      format: 'JPEG',
      x: 0,
      y: 0,
      width,
      height
    })

    const end = performance.now()
    const durationMs = end - start

    durations.push(durationMs)

    const pageNumber = index + 1
    const averageMs = durations.reduce((a, b) => a + b, 0) / durations.length
    const totalPages = withPagination.length
    const pagesRemaining = totalPages - pageNumber

    const message: PdfWorkerOutput = {
      type: Progress.Pending,
      pageNumber,
      totalPages,
      progress: pageNumber / totalPages,
      durationMs,
      eta: averageMs * pagesRemaining,
      totalEstimatedTime: averageMs * totalPages
    }

    postMessage(message)
  }

  const buffer = doc.output('arraybuffer')

  const result: PdfWorkerOutput = {
    type: Progress.Done,
    pdfBuffer: buffer
  }

  postMessage(result, [buffer])
}
