import type {
  CSSProperties,
  Dispatch,
  PropsWithChildren,
  Ref,
  RefCallback,
  SetStateAction
} from 'react'

export interface IBoxProps extends PropsWithChildren<CSSProperties> {
  style?: CSSProperties
  className?: string
  ref?:
    | Ref<HTMLDivElement>
    | Dispatch<SetStateAction<HTMLDivElement | undefined>>
}

export const Box = ({
  children,
  style,
  className,
  ref,
  ...props
}: IBoxProps) => (
  <div
    ref={ref as RefCallback<HTMLDivElement>}
    className={className}
    style={{ ...props, ...style }}
  >
    {children}
  </div>
)
