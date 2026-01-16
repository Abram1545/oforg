import { motion } from "framer-motion";

interface TypingIndicatorProps {
  text?: string;
}

export default function TypingIndicator({ text = "جاري الكتابة..." }: TypingIndicatorProps) {
  const dotVariants = {
    animate: (i: number) => ({
      opacity: [0.4, 1, 0.4],
      transition: {
        duration: 1.2,
        repeat: Infinity,
        delay: i * 0.2,
      },
    }),
  };

  return (
    <div className="chat-message">
      <div className="chat-bubble assistant space-y-2">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-2 w-2 rounded-full bg-foreground/60"
              variants={dotVariants}
              custom={i}
              animate="animate"
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
