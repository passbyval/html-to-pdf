import type { PropsWithChildren } from 'react'
import { Box } from './Box'

export const Page = ({ children }: PropsWithChildren) => {
  return <Box data-pdfize-page>{children}</Box>
}
