import { DebugLogger } from '../DebugLogger'
import { css } from '../utils/css'

export const processOCRReplacements = (
  clonedNode: HTMLElement,
  {
    logger,
    attribute = 'data-ocr'
  }: { logger: DebugLogger; attribute?: string }
) => {
  logger.debug('Processing OCR replacements')

  return Array.from(clonedNode.querySelectorAll(`[${attribute}]`)).reduce<
    readonly string[]
  >((acc, node) => {
    const value = node.getAttribute(attribute)

    if (!(node instanceof HTMLElement) || !value) return acc

    if (value === 'false') {
      node.style.opacity = '0'
      return acc
    }

    const { height, width } = node.getBoundingClientRect()

    const [x, y] = ([`${attribute}-x`, `${attribute}-y`] as const).map(
      (attr) => parseFloat(node.getAttribute(attr) ?? '') || 0
    )

    const style = getComputedStyle(node)
    const fontSize = Math.max(height, parseFloat(style.fontSize), 32)

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

    const svgText = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'text'
    )

    const offsetWidth = width - x

    svg.style.cssText = css`
      display: inline-block;
      position: relative;
      margin-top: ${y}px;
      margin-left: ${x}px;
      width: ${offsetWidth}px;
      height: ${height}px;
    `

    svg.appendChild(svgText)
    svgText.innerHTML = value

    svgText.style.cssText = css`
      background: #fff;
      color: #000;
      font-family: Consolas, 'Courier New', monospace;
      font-weight: 600;
      text-rendering: geometricPrecision;
      -webkit-font-smoothing: none;
      font-smooth: never;
      border: 1px solid ${fontSize > 25 ? 'black' : 'transparent'};
      text-shadow: none;
    `

    Array.from(node.attributes).forEach((attr) => {
      if (attr.name.startsWith('data-')) {
        const clonedAttr = attr.cloneNode(true)
        if (clonedAttr instanceof Attr) {
          svg.setAttributeNode(clonedAttr)
        }
      }
    })

    node.replaceWith(svg)

    const bbox = svgText.getBBox()

    svg.setAttribute(
      'viewBox',
      [bbox.x, bbox.y, bbox.width, bbox.height].join(' ')
    )

    logger.verbose('OCR replacement processed', {
      value,
      fontSize: fontSize,
      dimensions: `${width}x${height}`
    })

    return acc.includes(value) ? acc : Object.freeze([...acc, value])
  }, [])
}
