import { type ReactNode, Children } from 'react';
import { motion } from 'motion/react';

interface Props {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}

const containerVariants = (staggerDelay: number) => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: staggerDelay,
    },
  },
});

const childVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export function StaggerContainer({ children, staggerDelay = 0.05, className }: Props) {
  return (
    <motion.div
      className={className}
      variants={containerVariants(staggerDelay)}
      initial="hidden"
      animate="visible"
    >
      {Children.map(children, (child) => {
        if (!child) return null;
        return (
          <motion.div
            variants={childVariants}
            transition={{ duration: 0.3 }}
          >
            {child}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
