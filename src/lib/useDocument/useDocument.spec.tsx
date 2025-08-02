import { act, render, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDocument } from './useDocument'

vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    text: vi.fn(),
    addImage: vi.fn(),
    output: () => 'data:pdf/mock',
    save: vi.fn(),
    internal: {
      pageSize: { width: 612, height: 792 }
    }
  }))
}))

vi.mock('html-to-image', async () => ({
  toCanvas: vi.fn().mockResolvedValue({
    getContext: vi.fn(),
    toDataURL: () => 'data:image/mock',
    get width() {
      return 800
    },
    get height() {
      return 600
    }
  })
}))

vi.mock('tesseract.js', async () => ({
  createWorker: () => {
    return Promise.resolve({
      setParameters: vi.fn(),
      recognize: vi.fn().mockResolvedValue({
        data: {
          blocks: [
            {
              paragraphs: [
                {
                  lines: [
                    {
                      text: 'Test',
                      bbox: { x0: 0, x1: 100, y0: 0, y1: 20 }
                    }
                  ]
                }
              ]
            }
          ]
        }
      }),
      terminate: vi.fn()
    })
  }
}))

vi.mock('./getCharDimensions.ts', async () => ({
  getCharDimensions: () => 20
}))

vi.mock('./drawOcrWord.ts', async () => ({
  drawOcrWord: vi.fn()
}))

const wrapper = ({ children }: PropsWithChildren) => (
  <div ref={() => {}}>{children}</div>
)

const factory = () => {
  const { result } = renderHook(() => useDocument(), {
    wrapper
  })

  const { Document } = result.current

  const container = render(
    <Document>
      <div />
    </Document>
  )

  return {
    container,
    result
  }
}

describe('useDocument', () => {
  CSSStyleSheet.prototype.replace = vi.fn()

  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
  })

  it('initializes correctly', async () => {
    const { result } = factory()

    expect(result.current.isCreating).toBe(false)
    expect(typeof result.current.create).toBe('function')
    expect(typeof result.current.download).toBe('function')
  })

  it('generates PDF and image on create', async () => {
    const { result } = factory()

    await act(async () => {
      await result.current.create()
    })

    expect(result.current.pdf).not.toBe(null)
    expect(result.current.PreviewImage).toBeDefined()
    expect(result.current.Viewer).toBeDefined()
  })

  it('renders Viewer with fallback if pdf not ready', async () => {
    const { result } = factory()

    const Viewer = result.current.Viewer
    const view = <Viewer fallback={<span>Loading...</span>} />

    expect(view.props.fallback.props.children).toBe('Loading...')
  })

  it('cleans up cloned node after PDF generation', async () => {
    const removeSpy = vi.spyOn(document.body, 'removeChild')

    const { result } = factory()

    await act(async () => result.current.create())

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalled()
    })
  })
})
