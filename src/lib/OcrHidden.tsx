import type { PropsWithChildren } from 'react'

export const OcrHidden = ({ children }: PropsWithChildren) => (
  <div data-ocr="false">{children}</div>
)
