import { type CSSProperties, type PropsWithChildren } from 'react'
import { getMargin } from '../core'
import type { IMargin } from '../constants'

export interface IPageProps extends PropsWithChildren {
  style?: CSSProperties
  autoPaginate?: boolean
  width: number
  height: number
  workspaceScale: number
  margin?: IMargin
}

export function Page({
  children,
  style,
  autoPaginate = false,
  workspaceScale,
  width,
  height,
  margin = 'Standard'
}: IPageProps) {
  const padding = getMargin(margin, workspaceScale)

  return (
    <div
      data-html-to-pdf-page={autoPaginate}
      className="flex flex-row"
      style={{
        position: 'relative',
        width,
        height,
        overflow: autoPaginate ? undefined : 'hidden',
        overflowY: autoPaginate ? 'scroll' : undefined,
        overflowX: autoPaginate ? 'hidden' : undefined
      }}
    >
      <div
        className="flex flex-col"
        style={{
          width,
          height: autoPaginate ? '100%' : height,
          padding,
          ...style
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default Page
