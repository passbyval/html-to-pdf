export async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert Blob to Data URL'))
      }
    }

    reader.onerror = () => reject(reader.error)

    reader.readAsDataURL(blob)
  })
}
