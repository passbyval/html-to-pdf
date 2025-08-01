import { Box, type IBoxProps } from '@/lib/Box'

import type { PropsWithChildren } from 'react'

export const Flex = ({
  children,
  style,
  className,
  ...props
}: PropsWithChildren<IBoxProps>) => (
  <Box
    className={className}
    style={{
      ...props,
      ...style,
      display: 'flex'
    }}
  >
    {children}
  </Box>
)
