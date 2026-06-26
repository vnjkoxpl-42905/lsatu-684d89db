import * as React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Scroll-revealed feature rows with looping product videos.
 *
 * Motion ported from lexprep.ai's feature sections: each child renders at
 * { opacity: 0, y: 14, blur(10px) } and animates to rest on scroll-into-view,
 * staggered heading -> blurb -> media. Easing is their cubic-bezier(0.4,0,0.2,1).
 * Rows alternate sides on md+. Honors prefers-reduced-motion.
 *
 * See vault: wiki/synthesis/lexprep-scroll-reveal-teardown.md
 */

export type FeatureItem = {
  title: string;
  blurb: string;
  /** Path under /public, e.g. "/features/ai-drill.mp4". */
  src: string;
  /** Optional poster shown before the video paints. */
  poster?: string;
  /** Flip the row so media sits on the left (md+). */
  reverse?: boolean;
};

const EASE = [0.4, 0, 0.2, 1] as const;

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.18, delayChildren: 0.1 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: EASE },
  },
};

function FeatureRow({ title, blurb, src, poster, reverse }: FeatureItem) {
  const reduceMotion = useReducedMotion();

  // With reduced motion, render static (no blur/rise/stagger).
  const useVariants = reduceMotion ? undefined : { container, rise };

  return (
    <motion.article
      className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24 md:py-32 lg:px-8"
      variants={useVariants?.container}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "visible"}
      viewport={{ once: true, amount: 0.35 }}
    >
      <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-5 md:gap-12">
        {/* Copy */}
        <div className={cn("md:col-span-2 order-1", reverse && "md:order-2")}>
          <div className="flex flex-col justify-center gap-3 sm:gap-4">
            <motion.h2
              variants={useVariants?.rise}
              className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl"
            >
              {title}
            </motion.h2>
            <motion.p
              variants={useVariants?.rise}
              className="text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg"
            >
              {blurb}
            </motion.p>
          </div>
        </div>

        {/* Media */}
        <motion.div
          variants={useVariants?.rise}
          className={cn("md:col-span-3 order-2", reverse && "md:order-1")}
        >
          <figure className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-white/10 bg-neutral-900">
            <video
              src={src}
              poster={poster}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
              className="h-full w-full object-cover"
              // translateZ(0) forces GPU compositing so the loop stays smooth.
              style={{ transform: "translateZ(0)", backfaceVisibility: "hidden" }}
            />
          </figure>
        </motion.div>
      </div>
    </motion.article>
  );
}

export function FeatureShowcase({
  items,
  className,
}: {
  items: FeatureItem[];
  className?: string;
}) {
  return (
    <section className={cn("w-full", className)}>
      {items.map((item, i) => (
        <FeatureRow key={item.title} {...item} reverse={item.reverse ?? i % 2 === 1} />
      ))}
    </section>
  );
}

export default FeatureShowcase;
