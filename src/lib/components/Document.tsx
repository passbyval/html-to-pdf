import { type PropsWithChildren, type Ref } from 'react'

export interface IDocumentProps {
  ref?: Ref<HTMLDivElement>
}

export function Document({ children, ref }: PropsWithChildren<IDocumentProps>) {
  return (
    <div
      data-html-to-pdf-document
      style={{
        position: 'relative',
        backgroundColor: 'white',
        display: 'flex'
      }}
      ref={ref}
    >
      {children}
    </div>
  )
}

export default Document
