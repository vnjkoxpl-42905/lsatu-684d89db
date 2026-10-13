import { Carousel } from '@ark-ui/react/carousel';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CardCarouselProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey: (item: T, index: number) => string;
  /** Slides shown per page on desktop. Mobile is always 1, tablet is min(2, slidesPerPage). */
  slidesPerPage?: number;
  className?: string;
  /** Optional fixed slide height — applies to each slide cell, useful when cards vary slightly. */
  slideClassName?: string;
}

export function CardCarousel<T>({
  items,
  renderItem,
  getKey,
  slidesPerPage = 3,
  className,
  slideClassName,
}: CardCarouselProps<T>) {
  const count = items.length;
  // Use the smallest slidesPerPage so Ark doesn't error when items < desktop spp.
  // We achieve responsive layout via CSS (basis), while Ark tracks paging by desktop spp.
  const effectiveSpp = Math.min(slidesPerPage, Math.max(count, 1));
  const showControls = count > effectiveSpp;

  const basis =
    slidesPerPage >= 3
      ? 'basis-full sm:basis-1/2 lg:basis-1/3'
      : slidesPerPage === 2
      ? 'basis-full sm:basis-1/2'
      : 'basis-full';

  return (
    <Carousel.Root
      defaultPage={0}
      slideCount={count}
      slidesPerPage={effectiveSpp}
      slidesPerMove={1}
      className={cn('flex flex-col gap-3', className)}
    >
      <Carousel.ItemGroup className="-mx-2 flex overflow-hidden">
        {items.map((item, index) => (
          <Carousel.Item
            key={getKey(item, index)}
            index={index}
            className={cn('shrink-0 px-2', basis, slideClassName)}
          >
            {renderItem(item, index)}
          </Carousel.Item>
        ))}
      </Carousel.ItemGroup>

      {showControls && (
        <Carousel.Control className="flex items-center justify-between gap-3">
          <Carousel.PrevTrigger
            aria-label="Previous"
            className="inline-flex h-8 w-8 items-center justify-center border border-black/15 bg-white/60 text-black/70 transition hover:border-black/35 hover:text-black disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </Carousel.PrevTrigger>

          <Carousel.IndicatorGroup className="flex items-center gap-1.5">
            {Array.from({ length: Math.max(1, count - effectiveSpp + 1) }).map((_, i) => (
              <Carousel.Indicator
                key={i}
                index={i}
                aria-label={`Go to slide ${i + 1}`}
                className="h-1.5 w-1.5 rounded-full bg-black/20 transition-colors data-[current]:bg-amber-600"
              />
            ))}
          </Carousel.IndicatorGroup>

          <Carousel.NextTrigger
            aria-label="Next"
            className="inline-flex h-8 w-8 items-center justify-center border border-black/15 bg-white/60 text-black/70 transition hover:border-black/35 hover:text-black disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </Carousel.NextTrigger>
        </Carousel.Control>
      )}
    </Carousel.Root>
  );
}

export default CardCarousel;
