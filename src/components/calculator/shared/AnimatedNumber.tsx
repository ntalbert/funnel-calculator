import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';

interface Props {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({ value, format, duration = 0.4, className }: Props) {
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (latest) => format(latest));
  const ref = useRef<HTMLSpanElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      // On first render, snap to the value without animation
      motionValue.set(value);
      isFirstRender.current = false;
      return;
    }

    const controls = animate(motionValue, value, {
      duration,
      ease: 'easeOut',
    });

    return () => controls.stop();
  }, [value, duration, motionValue]);

  // Subscribe to the display motion value and render it
  useEffect(() => {
    const unsubscribe = display.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = latest;
      }
    });
    return unsubscribe;
  }, [display]);

  return (
    <motion.span ref={ref} className={className}>
      {format(motionValue.get())}
    </motion.span>
  );
}
