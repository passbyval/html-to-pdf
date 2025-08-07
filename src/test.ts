import { useEffect } from 'react'
import { css } from './lib/utils/css'

export const useUpdateLogo = () => {
  useEffect(() => {
    document.querySelectorAll('[data-ocr]')?.forEach((node, index) => {
      if (node instanceof HTMLElement) {
        const value = node.getAttribute('data-ocr')

        if (!value) return

        if (value === 'false') {
          node.style.opacity = '0'
        } else {
          const sheet = new CSSStyleSheet()

          const className = `pdfize-ocr-helper-node-${index}`

          const rect = node.getBoundingClientRect()
          console.log(rect)

          const y = parseFloat(node.getAttribute('data-ocr-y') ?? '')
          const { height, width, left, top } = getComputedStyle(node)

          const style = getComputedStyle(node)

          const fontSize = Math.max(
            ...[style.fontSize, style.height].map(parseFloat)
          )

          console.log({
            fontSize,
            fs: style.fontSize,
            h: style.height
          })

          sheet.replaceSync(
            css`
              .${className} {
                position: absolute;
                font-size: ${fontSize}px;
                left: ${left + y};
                top: ${top};
                min-height: ${height};
                min-width: ${width};
              }
            `.replace(/[\s\n]*/gm, '')
          )

          document.adoptedStyleSheets = [
            ...Array.from(document.adoptedStyleSheets ?? []),
            sheet
          ]

          const div = document.createElement('div')

          div.classList.add(className)
          div.innerHTML = value

          node.replaceWith(div)
        }
      }
    })
  }, [])
}
