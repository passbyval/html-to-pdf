import { useEffect, useRef, useState } from 'react'

interface Props {
  relativeTo: React.RefObject<HTMLElement | null>
}

export function TextOverlay({ relativeTo }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rects, setRects] = useState<DOMRect[]>([])
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
    top: 0,
    left: 0
  })

  // Get visible text nodes + bounding rects
  useEffect(() => {
    if (!relativeTo.current) return

    const container = relativeTo.current

    function getTextNodes(
      root: Node,
      relativeTo: Element
    ): { rect: DOMRect }[] {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) =>
          n.textContent?.trim()
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT
      })

      const range = document.createRange()
      const nodes: { rect: DOMRect }[] = []

      for (
        let current = walker.nextNode();
        current;
        current = walker.nextNode()
      ) {
        range.selectNodeContents(current)
        const rect = range.getBoundingClientRect()
        const offset = relativeTo.getBoundingClientRect()

        nodes.push({
          rect: new DOMRect(
            rect.x - offset.x,
            rect.y - offset.y,
            rect.width,
            rect.height
          )
        })
      }

      return nodes
    }

    function update() {
      const rect = container.getBoundingClientRect()

      setDimensions({
        width: rect.width,
        height: rect.height,
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX
      })

      const textRects = getTextNodes(container, container)
      setRects(textRects.map((n) => n.rect))
    }

    update()

    const handleScroll = () => requestAnimationFrame(update)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
    }
  }, [relativeTo])

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = 'red'
    ctx.lineWidth = 1

    for (const rect of rects) {
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
    }
  }, [rects, dimensions])

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      style={{
        position: 'absolute',
        top: `${dimensions.top}px`,
        left: `${dimensions.left}px`,
        zIndex: 9999,
        pointerEvents: 'none'
      }}
    />
  )
}
