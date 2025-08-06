import {
  type PropsWithChildren,
  type ElementType,
  type CSSProperties,
  cloneElement
} from 'react'
import { useDocumentContext } from './DocumentContext'

interface IDocumentHeaderProps extends PropsWithChildren {
  as?: ElementType
  style?: CSSProperties
}

export const DocumentHeader = ({
  as: Tag = 'div',
  children,
  style,
  ...props
}: IDocumentHeaderProps) => {
  const { margin = 0 } = useDocumentContext()

  const negativeMargin = -(margin / 2)

  return (
    <Tag data-pdfize-header {...props}>
      <div
        style={{
          marginTop: negativeMargin,
          marginLeft: negativeMargin,
          ...style
        }}
      >
        {children}
      </div>
    </Tag>
  )
}
