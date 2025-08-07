import { createWorker } from 'tesseract.js'
import { OCR_PARAMS } from '../constants'
import { chain } from '../utils/chain'

export const createTesseractWorker = async () => {
  const [worker] = await chain(
    () => createWorker('eng'),
    (worker) => worker.setParameters(OCR_PARAMS)
  )

  return worker
}
