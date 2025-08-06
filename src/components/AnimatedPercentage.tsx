import { times } from '@/utils/times'
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type BezierDefinition,
  type ValueAnimationTransition
} from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

export function AnimatedPercentage({ percent }: { percent: number }) {
  const [display, setDisplay] = useState(percent)

  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (latest) => Math.round(latest))

  const previous = useRef(percent)

  useMotionValueEvent(rounded, 'change', (v) => {
    setDisplay(v)
  })

  useEffect(() => {
    const transition: ValueAnimationTransition = {
      duration: 1,
      ease: times(4, () => Math.round(Math.random()))
    }

    const shouldAnimate = percent > previous.current

    if (shouldAnimate) {
      const controls = animate(motionValue, percent, transition)
      previous.current = percent
      return controls.stop
    } else {
      motionValue.set(percent)
      previous.current = percent
    }
  }, [percent, motionValue])

  return <motion.div>{display}%</motion.div>
}
