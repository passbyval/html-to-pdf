import { useEffect, useRef } from 'react'

type AsyncEffectCallback = () => Promise<void | (() => void)>

export function useAsyncEffect(
  effect: AsyncEffectCallback,
  deps: React.DependencyList
) {
  const cleanupRef = useRef<(() => void) | void>(void 0)

  useEffect(() => {
    let isMounted = true

    const runEffect = async () => {
      const cleanup = await effect()

      if (isMounted) {
        cleanupRef.current = cleanup
      }
    }

    runEffect()

    return () => {
      isMounted = false
      if (typeof cleanupRef.current === 'function') {
        cleanupRef.current()
      }
    }
  }, deps)
}
