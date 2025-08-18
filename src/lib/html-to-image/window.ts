import * as htmlToImage from './'

declare global {
  interface Window {
    htmlToImage: typeof htmlToImage
  }
}

window.htmlToImage = htmlToImage
