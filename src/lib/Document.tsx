import { Box } from '@/lib/Box'
import { type PropsWithChildren, type Ref } from 'react'
import type { PaperFormat } from './constants'
import { type Margin } from './constants'
import { SentinelContainer } from './SentinelContainer'

export interface IDocumentProps {
  format?: PaperFormat
  margin?: Margin
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
    <SentinelContainer
      style={{
        backgroundColor: 'white',
        width,
        height,
        padding,
        overflowY: 'scroll',
        overflowX: 'hidden'
      }}
    >
      <Box ref={ref}>{children}</Box>
    </SentinelContainer>
  )
}

export default Document
