import { Box } from '@/lib/components/Box'
import { type PropsWithChildren, type Ref } from 'react'
import type { IPaperFormat } from '../constants'
import { DocumentContext } from './DocumentContext'

export interface IDocumentProps {
  format?: IPaperFormat
  margin?: number
  ref?: Ref<HTMLDivElement>
  width: number
  height: number
}

export function Document({
  children,
  margin: padding,
  width,
  height,
  ref
}: PropsWithChildren<IDocumentProps>) {
  return (
    <DocumentContext
      value={{
        margin: padding
      }}
    >
      <Box
        style={{
          backgroundColor: 'white',
          width,
          height,
          padding,
          overflowY: 'scroll',
          overflowX: 'hidden'
        }}
        ref={ref}
      >
        {children}
      </Box>
    </DocumentContext>
  )
}

export default Document
