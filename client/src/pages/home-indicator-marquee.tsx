import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IndicatorCard } from "@/components/indicator-card";
import { useInView } from "framer-motion";
import type { Indicator } from "@shared/schema";

export default function IndicatorMarquee() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, {
    once: true,
    margin: "500px 0px",
  });

  const { data: indicators, isLoading } = useQuery<Indicator[]>({
    queryKey: ["/api/indicators"],
    enabled: inView,
  });

  const items = (indicators ?? []).slice(0, 12);
  // Duplicate the list so the keyframe -50% translation produces a
  // perfectly seamless infinite scroll.
  const track = items.length > 0 ? [...items, ...items] : [];
  // Slow the animation down as the catalog grows so the visible speed
  // stays consistent regardless of how many cards are in the row.
  const durationSeconds = Math.max(35, items.length * 6);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden border-t border-white/5 bg-gradient-to-b from-zinc-950 via-zinc-950 to-black py-16 sm:py-20"
      data-testid="section-indicator-marquee"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="pointer-events-none absolute -top-32 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <Badge variant="secondary" className="mb-3 border-primary/20 bg-primary/10 text-primary" data-testid="badge-marquee">
              Featured
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl" data-testid="text-marquee-title">
              Our Premium Indicators
            </h2>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">
              A live look at what's trending in the Pine Signal Lab catalog. Hover to pause.
            </p>
          </div>
          <Link href="/indicators">
            <Button variant="ghost" className="hidden text-primary hover:text-primary sm:inline-flex" data-testid="link-marquee-view-all">
              View All Indicators <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-zinc-950 to-transparent sm:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-black to-transparent sm:w-24" />

        {isLoading && (
          <div className="flex gap-5 overflow-hidden px-6 sm:px-10" data-testid="marquee-skeleton">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-72 w-[300px] shrink-0 animate-pulse rounded-lg border border-white/5 bg-white/[0.02] sm:w-[320px]"
              />
            ))}
          </div>
        )}

        {!isLoading && track.length > 0 && (
          <div className="marquee-pause-on-hover overflow-hidden">
            <div
              className="animate-marquee-x flex w-max"
              style={{ ["--marquee-duration" as string]: `${durationSeconds}s` }}
              data-testid="marquee-track"
            >
              {track.map((ind, i) => {
                const isClone = i >= items.length;
                return (
                  <div
                    key={`${ind.id}-${i}`}
                    className="w-[300px] shrink-0 pr-5 sm:w-[320px]"
                    aria-hidden={isClone || undefined}
                    {...(isClone ? { inert: "" as unknown as boolean } : {})}
                  >
                    <IndicatorCard indicator={ind} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isLoading && track.length === 0 && (
          <div className="px-6 text-center text-sm text-zinc-500 sm:px-10" data-testid="marquee-empty">
            No indicators available yet.
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-center sm:hidden">
        <Link href="/indicators">
          <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10" data-testid="link-marquee-view-all-mobile">
            View All Indicators <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}