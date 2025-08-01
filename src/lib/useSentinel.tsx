import { useState, type RefCallback } from 'react'

export const useSentinel = () => {
  const [ref, setRef] = useState<HTMLDivElement>()

  return [<div ref={setRef as RefCallback<HTMLDivElement>} />, ref] as const
}
