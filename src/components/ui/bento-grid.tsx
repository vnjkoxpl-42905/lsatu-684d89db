import { ReactNode } from "react";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const BentoGrid = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-3 gap-3",
        className,
      )}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
}: {
  name: string;
  className: string;
  background: ReactNode;
  Icon: any;
  description: string;
  href: string;
  cta: string;
}) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl",
      "bg-neutral-900/70 backdrop-blur-xl border border-white/[0.06]",
      "transform-gpu transition-all duration-200",
      "hover:border-white/[0.12] hover:shadow-[0_0_30px_-10px_rgba(255,255,255,0.04)]",
      className,
    )}
  >
    {/* Top edge highlight */}
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent z-10" />
    <div>{background}</div>
    <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-10">
      <Icon className="h-10 w-10 origin-left transform-gpu text-neutral-500 transition-all duration-300 ease-in-out group-hover:scale-75 stroke-[1.5]" />
      <h3 className="text-lg font-semibold text-white mt-1">
        {name}
      </h3>
      <p className="max-w-lg text-sm text-neutral-500 leading-relaxed">{description}</p>
    </div>
    <div
      className={cn(
        "pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100",
      )}
    >
      <Button variant="ghost" asChild size="sm" className="pointer-events-auto text-neutral-300 hover:text-white hover:bg-white/[0.06]">
        <a href={href}>
          {cta}
          <ArrowRightIcon className="ml-2 h-4 w-4" />
        </a>
      </Button>
    </div>
    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-white/[0.02]" />
  </div>
);

export { BentoCard, BentoGrid };
