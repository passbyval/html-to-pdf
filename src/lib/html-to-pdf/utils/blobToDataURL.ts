import { DebugLogger, type LogLevel } from '../DebugLogger'

export async function blobToDataURL(
  blob: Blob,
  debug: LogLevel
): Promise<string> {
  const logger = DebugLogger.create(debug)

  logger.debug('Converting blob to data URL')

  logger.verbose('Blob conversion started', {
    blobSize: `${blob.size / 1024}KB`,
    blobType: blob.type
  })

  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const reader = new FileReader()

    reader.onloadend = () => {
      const conversionTime = Date.now() - startTime

      if (typeof reader.result === 'string') {
        logger.debug('Blob conversion completed', {
          duration: `${conversionTime}ms`
        })

        logger.verbose('Data URL created', {
          originalSize: `${blob.size / 1024}KB`,
          dataUrlLength: reader.result.length,
          conversionTime: `${conversionTime}ms`
        })
        resolve(reader.result)
      } else {
        const error = new Error('Failed to convert Blob to Data URL')
        logger.error('Blob conversion failed', error)
        reject(error)
      }
    }

    reader.onerror = () => {
      logger.error('FileReader error during blob conversion', reader.error)
      reject(reader.error)
    }

    reader.readAsDataURL(blob)
  })
}
