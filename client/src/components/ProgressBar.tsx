import { motion } from "framer-motion";

interface ProgressBarProps {
  progress: number;
  animated?: boolean;
  showLabel?: boolean;
}

export default function ProgressBar({ progress, animated = true, showLabel = true }: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="w-full space-y-2">
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-accent to-accent/70 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{
            duration: animated ? 0.5 : 0,
            ease: "easeOut",
          }}
        />
      </div>
      {showLabel && (
        <motion.p
          className="text-xs text-muted-foreground text-right"
          animate={{ opacity: [0.7, 1] }}
          transition={{ duration: 0.3 }}
        >
          {Math.round(clampedProgress)}%
        </motion.p>
      )}
    </div>
  );
}
