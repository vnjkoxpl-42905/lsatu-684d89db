import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/bootcamps/main-conclusion/lib/cn";

export function ConclusionTypeCard({
  title,
  definition,
  example,
  weakness,
  question,
  colorClass,
}: {
  title: string;
  definition: string;
  example: string;
  weakness: string;
  question: string;
  colorClass: string;
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <motion.button
      className={cn(
        "relative h-64 w-full cursor-pointer rounded-[14px] border p-6 text-left transition-all duration-300",
        "bg-[#1A1E2B] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]",
        colorClass
      )}
      onClick={() => setIsFlipped(!isFlipped)}
      whileHover={{ y: -4 }}
      layout
    >
      <AnimatePresence mode="wait">
        {!isFlipped ? (
          <motion.div
            key="front"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-full flex-col"
          >
            <h3 className="font-serif text-[20px] font-medium text-[#F1F5F9]">{title}</h3>
            <p className="mt-4 text-[14px] text-[#CBD5E1] leading-relaxed line-clamp-4">{definition}</p>
            <p className="mt-auto pt-4 text-[13px] italic text-[#94A3B8] line-clamp-2">"{example}"</p>
          </motion.div>
        ) : (
          <motion.div
            key="back"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-full flex-col justify-center"
          >
            <p className="text-[14px] text-[#CBD5E1] leading-relaxed"><strong>Weakness:</strong> {weakness}</p>
            <p className="mt-4 text-[15px] font-semibold text-[#E8D08B]">{question}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
