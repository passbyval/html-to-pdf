import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform
} from 'framer-motion'
import { useEffect, useState } from 'react'

export function AnimatedPercentage({ percent }: { percent: number }) {
  const [display, setDisplay] = useState(percent)

  const motionValue = useMotionValue(0)

  const rounded = useTransform(motionValue, (latest) => Math.round(latest))
  useMotionValueEvent(rounded, 'change', (v) => {
    setDisplay(v)
  })

  useEffect(() => {
    const controls = animate(motionValue, percent, {
      duration: 1,
      ease: 'easeOut'
    })

    return controls.stop
  }, [percent, motionValue])

  return <motion.div>{display}%</motion.div>
}
