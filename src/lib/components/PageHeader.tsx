import {
  type PropsWithChildren,
  type ElementType,
  type CSSProperties
} from 'react'
import { getMargin } from '../core'
import type { IMargin } from '../constants'

interface IPageHeaderProps extends PropsWithChildren {
  as?: ElementType
  style?: CSSProperties
  className?: string
  margin: IMargin
  workspaceScale: number
}

export const PageHeader = ({
  as: Tag = 'div',
  children,
  style,
  className,
  margin = 'Standard',
  workspaceScale,
  ...props
}: IPageHeaderProps) => {
  const padding = getMargin(margin, workspaceScale)
  const negativeMargin = -(padding / 2)

  return (
    <Tag data-pdfize-header {...props}>
      <div
        className={className}
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
