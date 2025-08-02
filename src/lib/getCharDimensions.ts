import { TEST_TEXT } from './constants'

export const getCharDimensions = (node: HTMLElement) => {
  const testDiv = document.createElement('div')
  const className = 'ocr-test'

  testDiv.classList.add(className)

  node.innerHTML = TEST_TEXT
  testDiv.style.display = 'flex'
  testDiv.style.flexDirection = 'row'
  testDiv.style.gap = '30px'
  testDiv.style.flexWrap = 'wrap'

  node.prepend(testDiv)
  document.body.appendChild(node)

  const style = getComputedStyle(node.querySelector(`.${className}`)!)
  const fontSize = parseFloat(style.fontSize)

  return fontSize
}
