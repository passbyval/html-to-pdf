import { useState, type CSSProperties, type PropsWithChildren } from 'react'
import { Box } from './Box'
import { useSentinel } from './hooks/useSentinel'

export const SentinelContainer = ({
  children,
  style
}: PropsWithChildren<{ style?: CSSProperties }>) => {
  const [containerRef, setContainerRef] = useState<HTMLDivElement>()
  const [sentinel, sentinelRef] = useSentinel()

  // useEffect(() => {
  //   console.log('container')
  //   const observer = new IntersectionObserver(
  //     (entries) => {
  //       entries.forEach((entry) => {
  //         const element = document.createElement('hr')

  //         const { left, right, bottom, top } = entry.intersectionRect

  //         element.style.left = left.toString()
  //         // element.style.right = right.toString()
  //         // element.style.bottom = bottom.toString()
  //         element.style.top = top.toString()
  //         element.style.position = 'absolute'
  //         element.style.borderColor = 'red'

  //         containerRef?.appendChild(element)
  //       })
  //     },
  //     {
  //       root: containerRef,
  //       threshold: 0,
  //       rootMargin: '100%',
  //     }
  //   )

  //   if (sentinelRef) {
  //     observer.observe(sentinelRef)
  //   }

  //   return () => {
  //     if (observer) {
  //       observer.disconnect()
  //       if (containerRef) observer.unobserve(containerRef)
  //     }
  //   }
  // }, [containerRef, sentinelRef])

  return (
    <Box style={style} ref={setContainerRef}>
      {children}
      {sentinel}
    </Box>
  )
}
