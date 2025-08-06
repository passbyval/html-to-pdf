import { Box } from '@/lib/components/Box'
import { type PropsWithChildren, type Ref } from 'react'
import type { IPaperFormat } from '../constants'
import { type IMargin } from '../constants'

export interface IDocumentProps {
  format?: IPaperFormat
  margin?: IMargin
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
  )
}

export default Document
