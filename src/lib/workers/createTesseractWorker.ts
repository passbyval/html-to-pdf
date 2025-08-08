import { createWorker } from 'tesseract.js'
import { OCR_PARAMS } from '../constants'
import { chain } from '../utils/chain'

const TESSDATA_DIR = '/tessdata'

const ensureNewLine = (words: string) =>
  words.endsWith('\n') ? words : words + '\n'

const getTargetPath = (lang: string) => `${TESSDATA_DIR}/${lang}.user-words`

export const createTesseractWorker = async (
  customWords: string,
  tessedit_char_whitelist: string,
  lang: string = 'eng'
) => {
  const worker = await createWorker()

  const wordsWithNewline = ensureNewLine(customWords)
  const targetPath = getTargetPath(lang)

  try {
    await worker.FS('mkdir', [TESSDATA_DIR])
  } catch (error) {
    // Directory might already exist or other FS error — this is usually fine
    // The DataCloneError typically means the directory already exists
    if (error instanceof Error && error.name === 'DataCloneError') {
      console.debug(`${TESSDATA_DIR} directory likely already exists.`)
    } else {
      console.debug(
        `${TESSDATA_DIR} directory creation:`,
        error instanceof Error ? error.message : String(error)
      )
    }
  }

  await chain(
    () => worker.FS('writeFile', [targetPath, wordsWithNewline]),
    () =>
      worker.reinitialize(lang, undefined, {
        load_system_dawg: '0',
        load_freq_dawg: '0',
        load_unambig_dawg: '0'
      }),
    () => console.log(`User words file created: ${targetPath}`)
  )

  await worker.setParameters({
    ...OCR_PARAMS,
    tessedit_char_whitelist
  })

  return worker
}
