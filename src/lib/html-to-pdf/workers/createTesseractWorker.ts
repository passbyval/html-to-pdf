import {
  createWorker,
  type WorkerParams,
  type InitOptions,
  PSM,
  OEM
} from 'tesseract.js'
import { DebugLogger, type LogLevel } from '../DebugLogger'

const DATA_CLONE_ERROR_PREFIX = 'DataCloneError'
const TESSDATA_DIR = '/tessdata'

const ensureNewLine = (words: string): string =>
  words.endsWith('\n') ? words : words + '\n'

const getTargetPath = (lang: string): string =>
  `${TESSDATA_DIR}/${lang}.user-words`

export const createTesseractWorker = async (
  customWords: string,
  tessedit_char_whitelist: string,
  lang: string = 'eng',
  debug: LogLevel
) => {
  const startTime = Date.now()
  const logger = DebugLogger.create(debug)

  logger.info('Tesseract worker initialization started', {
    customWordsLength: customWords.length,
    charWhitelistLength: tessedit_char_whitelist.length,
    language: lang
  })

  logger.info('Initializing Tesseract worker', {
    language: lang,
    customWords: `${customWords.split('\n').length} words`,
    charWhitelist: `${tessedit_char_whitelist.length} chars`
  })

  logger.info('Creating Tesseract worker instance')

  const worker = await createWorker()

  const wordsWithNewline = ensureNewLine(customWords)
  const targetPath = getTargetPath(lang)

  logger.info('Preparing file system operations', {
    targetPath,
    wordsCount: wordsWithNewline.split('\n').filter(Boolean).length,
    customWords: wordsWithNewline
  })

  logger.info('Creating tessdata directory')

  try {
    await worker.FS('mkdir', [TESSDATA_DIR])
    logger.info(`Successfully created directory: ${TESSDATA_DIR}`)
  } catch (error) {
    const directoryExistsError =
      (error instanceof Error && error.name === DATA_CLONE_ERROR_PREFIX) ||
      (typeof error === 'string' && error.includes(DATA_CLONE_ERROR_PREFIX))

    if (directoryExistsError) {
      logger.info(`Directory ${TESSDATA_DIR} already exists (expected)`)
    } else {
      logger.error('Unexpected error during directory creation', {
        directory: TESSDATA_DIR,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  logger.info('Writing custom words file')

  try {
    await worker.FS('writeFile', [targetPath, wordsWithNewline])

    logger.info(`Custom words file created: ${targetPath}`, {
      fileSize: `${wordsWithNewline.length} bytes`,
      wordCount: wordsWithNewline.split('\n').filter(Boolean).length
    })
  } catch (error) {
    logger.error('Failed to write custom words file', error)
    throw error
  }

  logger.debug('Reinitializing worker with language model')
  try {
    const settings: Partial<InitOptions> = {
      // load_system_dawg: '1',
      // load_freq_dawg: '0',
      // load_unambig_dawg: '0'
    }

    await worker.reinitialize(lang, OEM.LSTM_ONLY, settings)

    logger.debug(`Worker reinitialized with language: ${lang}`, {
      settings
    })
  } catch (error) {
    logger.error('Failed to reinitialize worker', error)
    throw error
  }

  logger.info('Setting OCR parameters')

  const allParams: Partial<WorkerParams> = {
    preserve_interword_spaces: '0',
    tessedit_char_whitelist,
    user_defined_dpi: '600'
  }

  try {
    await worker.setParameters(allParams)
    logger.debug('OCR parameters configured', allParams)
  } catch (error) {
    logger.error('Failed to set OCR parameters', error)
    throw error
  }

  const initTime = Date.now() - startTime

  logger.info('Tesseract worker initialization complete', {
    initializationTime: initTime,
    language: lang,
    customWordsCount: wordsWithNewline.split('\n').filter(Boolean).length,
    parametersSet: Object.keys(allParams).length
  })

  logger.info('Tesseract worker ready', {
    duration: `${initTime}ms`,
    language: lang,
    customWords: `${wordsWithNewline.split('\n').filter(Boolean).length} loaded`
  })

  return worker
}
