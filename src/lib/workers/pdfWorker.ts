import jsPDF, { type ImageFormat } from 'jspdf'
import { blobToDataURL } from '../utils/blobToDataURL'
import { chain } from '../utils/chain'
import { drawOcrFromBlocks } from '../utils/drawOcrFromBlocks'
import { getDimensions } from '../utils/getDimensions'
import { getPaginatedCanvases } from '../utils/getPaginatedCanvases'
import { transferBitmapToCanvas } from '../utils/transferBitmapToCanvas'
import { createTesseractWorker } from './createTesseractWorker'

import { type PdfWorkerInput, type PdfWorkerOutput, Progress } from './types'

const imageFormat: ImageFormat = 'JPEG'

const CONVERT_TO_BLOB_OPTIONS = {
  type: `image/${imageFormat.toLowerCase()}`,
  quality: 1
}

self.onmessage = async ({ data }: MessageEvent<PdfWorkerInput>) => {
  const { options } = data

  const {
    width,
    height,
    margin,
    bitmap,
    ocrBitmap,
    autoPaginate,
    pageHeight,
    workspaceScale,
    customWords
  } = options

  const workerPromise = createTesseractWorker(customWords)
  const doc = new jsPDF('p', 'px', [width, height], true)

  const [canvas] = transferBitmapToCanvas(bitmap)
  const [ocrCanvas] = transferBitmapToCanvas(ocrBitmap)

  console.log({ customWords })

  const cropped = await getPaginatedCanvases(
    canvas,
    ocrCanvas,
    pageHeight,
    margin * workspaceScale,
    customWords
  )

  const withPagination = autoPaginate ? cropped : [cropped[0]]

  const durations: number[] = []

  for await (const [index, [canvas, ocrCanvas]] of withPagination.entries()) {
    const start = performance.now()
    const page = index === 0 ? doc : doc.addPage()

    const [, imageData] = await chain(
      () => canvas.convertToBlob(CONVERT_TO_BLOB_OPTIONS),
      blobToDataURL
    )

    const { width, height } = doc.internal.pageSize
    const { ratio } = getDimensions(canvas, { width, height })

    await drawOcrFromBlocks({
      doc: page,
      canvas: ocrCanvas,
      ratio,
      worker: await workerPromise
    })

    page.addImage({
      imageData,
      format: imageFormat,
      x: 0,
      y: 0,
      width,
      height
    })

    page.setTextColor('#999')

    page.text(
      `${page.getCurrentPageInfo().pageNumber}`,
      width - margin / 2,
      height - margin / 2,
      {
        align: 'center',
        baseline: 'middle'
      }
    )

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
