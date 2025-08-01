import type { PropsWithChildren } from 'react'

export const Header = ({ children }: PropsWithChildren) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 35 }}>
    {children}
  </div>
)
