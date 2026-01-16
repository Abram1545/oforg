import { motion } from "framer-motion";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export default function LoadingSpinner({ size = "md", text }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: { container: "h-8 w-8", dot: "h-2 w-2" },
    md: { container: "h-12 w-12", dot: "h-3 w-3" },
    lg: { container: "h-16 w-16", dot: "h-4 w-4" },
  };

  const { container, dot } = sizeMap[size];

  const dotVariants = {
    animate: (i: number) => ({
      y: [0, -10, 0],
      transition: {
        duration: 1.2,
        repeat: Infinity,
        delay: i * 0.1,
      },
    }),
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`${container} flex items-center justify-center gap-1.5`}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={`${dot} rounded-full bg-accent`}
            variants={dotVariants}
            custom={i}
            animate="animate"
          />
        ))}
      </div>
      {text && (
        <motion.p
          className="text-sm text-muted-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}
