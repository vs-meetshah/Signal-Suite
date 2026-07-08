import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Check, ShoppingCart, Star, Bookmark, Flame, Sparkles, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import type { Indicator } from "@shared/schema";

const WATCHLIST_KEY = "pinesignallab.watchlist";

function readWatchlistIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

export function IndicatorCard({
  indicator,
  adminOverlay,
}: {
  indicator: Indicator;
  adminOverlay?: React.ReactNode;
}) {
  const { isInCart, getCartItem, canAddVersion } = useCart();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const inCart = isInCart(indicator.id);
  const cartItem = getCartItem(indicator.id);
  const isFree = indicator.tier === "free";
  const [justAdded, setJustAdded] = useState(false);
  const blockedByMix = !canAddVersion("indicator");
  const [watchlist, setWatchlist] = useState<number[]>(() => readWatchlistIds());
  const inWatchlist = watchlist.includes(indicator.id);
  const handleCardClick = () => {
    navigate(`/indicator/${indicator.slug}`);
  };

  const stopCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const sync = () => setWatchlist(readWatchlistIds());
    window.addEventListener("storage", sync);
    window.addEventListener("watchlist-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("watchlist-updated", sync);
    };
  }, []);

  const handleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = inWatchlist
      ? watchlist.filter((id) => id !== indicator.id)
      : [...watchlist, indicator.id];
    setWatchlist(next);
    try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next)); } catch { }
    window.dispatchEvent(new Event("watchlist-updated"));
    toast({
      title: inWatchlist ? "Removed from watchlist" : "Saved to watchlist",
      description: inWatchlist
        ? `${indicator.name} was removed from your watchlist.`
        : `${indicator.name} was added to your watchlist.`,
    });
  };

  const triggerAddAnimation = () => {
    setJustAdded(true);
    window.dispatchEvent(new CustomEvent("cart-item-added"));
    setTimeout(() => setJustAdded(false), 1500);
  };

  const ratingNum = indicator.rating ? Number(indicator.rating) : 0;
  const reviewNum = indicator.reviewCount ?? 0;
  let cornerBadge:
    | { label: string; cls: string; Icon: typeof Flame }
    | null = null;
  if (ratingNum >= 4.8) cornerBadge = { label: "Trending", cls: "bg-blue-600", Icon: TrendingUp };
  else if (reviewNum >= 80) cornerBadge = { label: "Popular", cls: "bg-emerald-600", Icon: Flame };
  else if (indicator.id % 5 === 0) cornerBadge = { label: "New", cls: "bg-orange-500", Icon: Sparkles };

  const tfHint = (() => {
    const tfs = indicator.bestTimeframes ?? [];
    if (tfs.some((t) => /1 ?min|5 ?min|15 ?min/i.test(t))) return "Scalping";
    if (tfs.some((t) => /30 ?min|1 ?hour|2 ?hour/i.test(t))) return "Intraday";
    return "Swing";
  })();
  const marketHints = (() => {
    const ms = indicator.markets ?? [];
    const out: string[] = [];
    if (ms.some((m) => /nifty|bank ?nifty/i.test(m))) out.push("NIFTY");
    if (ms.some((m) => /usd|jpy|gbp|forex|eur/i.test(m))) out.push("Forex");
    if (ms.some((m) => /btc|eth|sol|bitcoin|crypto/i.test(m))) out.push("Crypto");
    if (ms.some((m) => /tesla|apple|s&p|nasdaq|dow|nas100|stocks/i.test(m))) out.push("Stocks");
    if (ms.some((m) => /gold|crude|oil|commodit/i.test(m))) out.push("Commodities");
    return out;
  })();
  const tagPills = [tfHint, ...marketHints].slice(0, 4);
  const CornerIcon = cornerBadge?.Icon;

  return (
    <motion.div
      animate={justAdded ? { scale: [1, 1.03, 0.98, 1] } : {}}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <Card
        role="link"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        }}
        className={`group relative flex h-full cursor-pointer flex-col overflow-hidden transition-all duration-300 hover-elevate ${inCart ? "border-primary/40 bg-primary/[0.03]" : "border-card-border"
          }`}
        data-testid={`card-indicator-${indicator.id}`}
      >
        {adminOverlay}
        <AnimatePresence>
          {justAdded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/90 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"
              >
                <Check className="h-7 w-7 text-primary" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-3 text-sm font-semibold"
              >
                Added to Cart
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-1 flex-col p-0">
          <div className="relative h-40 overflow-hidden rounded-t-lg border-b border-card-border bg-gradient-to-br from-muted/40 to-muted/10 dark:from-slate-900/60 dark:to-slate-900/20">
            <svg
              aria-hidden="true"
              viewBox="0 0 320 160"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
            >
              <defs>
                <linearGradient id={`chart-fill-${indicator.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </linearGradient>
                <pattern id={`chart-grid-${indicator.id}`} width="32" height="24" patternUnits="userSpaceOnUse">
                  <path d="M32 0 L0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.4" opacity="0.35" />
                </pattern>
              </defs>
              <rect width="320" height="160" fill={`url(#chart-grid-${indicator.id})`} className="text-muted-foreground/40" />
              {Array.from({ length: 28 }).map((_, i) => {
                const x = 8 + i * 11;
                const seed = (indicator.id * 13 + i * 7) % 100;
                const up = seed % 2 === 0;
                const mid = 80 + ((seed * 0.5) - 25);
                const half = 6 + (seed % 14);
                const bodyH = 4 + (seed % 16);
                const top = mid - half;
                const bottom = mid + half;
                const bodyTop = up ? mid - bodyH / 2 : mid - bodyH / 2;
                const color = up ? "hsl(142 71% 45%)" : "hsl(0 72% 55%)";
                return (
                  <g key={i}>
                    <line x1={x} y1={top} x2={x} y2={bottom} stroke={color} strokeWidth="0.8" />
                    <rect x={x - 3} y={bodyTop} width="6" height={bodyH} fill={color} opacity="0.85" />
                  </g>
                );
              })}
              <path
                d={`M0,${100 + (indicator.id % 10)} Q40,${70 + (indicator.id % 15)} 80,${85 - (indicator.id % 12)} T160,${60 + (indicator.id % 20)} T240,${75 - (indicator.id % 18)} T320,${55 + (indicator.id % 14)} L320,160 L0,160 Z`}
                fill={`url(#chart-fill-${indicator.id})`}
                opacity="0.6"
              />
              <path
                d={`M0,${100 + (indicator.id % 10)} Q40,${70 + (indicator.id % 15)} 80,${85 - (indicator.id % 12)} T160,${60 + (indicator.id % 20)} T240,${75 - (indicator.id % 18)} T320,${55 + (indicator.id % 14)}`}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {cornerBadge && CornerIcon && (
              <div
                className={`absolute right-0 top-3 rounded-l-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md ${cornerBadge.cls}`}
                data-testid={`badge-corner-${indicator.id}`}
              >
                <span className="inline-flex items-center gap-1">
                  <CornerIcon className="h-3 w-3" />
                  {cornerBadge.label}
                </span>
              </div>
            )}
            {isFree && (
              <div className="absolute left-3 top-3 rounded-md bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm">
                Free
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-3 p-4">
            <div className="flex min-h-[44px] items-start justify-between gap-2">
              <h3 className="line-clamp-2 text-base font-semibold leading-tight tracking-tight" data-testid={`text-indicator-name-${indicator.id}`}>
                {indicator.name}
              </h3>
              <Badge
                variant="secondary"
                className="shrink-0 border-primary/20 bg-primary/10 text-[10px] font-medium uppercase tracking-wide text-primary"
                data-testid={`badge-category-${indicator.id}`}
              >
                {indicator.category}
              </Badge>
            </div>

            <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
              {indicator.shortDescription}
            </p>

            {tagPills.length > 0 && (
              <div className="flex min-h-[24px] flex-wrap gap-1.5 overflow-hidden" data-testid={`tags-${indicator.id}`}>
                {tagPills.map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-auto pt-1">
              {inCart && !justAdded && (
                <div className="mb-2 flex items-center gap-2" data-testid={`text-in-cart-${indicator.id}`}>
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="text-xs font-medium text-primary">
                    {cartItem?.version === "strategy" ? "Strategy" : cartItem?.version === "both" ? "Indicator + Strategy" : "Indicator"}
                    {cartItem?.isTrial ? " · Trial" : ""} — Added to Cart
                  </span>
                </div>
              )}
              {!inCart && blockedByMix && (
                <p className="mb-2 text-[10.5px] leading-tight text-amber-600 dark:text-amber-400" data-testid={`text-mix-warn-${indicator.id}`}>
                  Cart has Strategies — open this indicator to switch versions.
                </p>
              )}
              <div className="flex min-h-[32px] items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs" data-testid={`rating-${indicator.id}`}>
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-semibold tabular-nums">
                    {indicator.rating ? Number(indicator.rating).toFixed(1) : "—"}
                  </span>
                  <span className="text-muted-foreground">
                    ({indicator.reviewCount ?? 0})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {inCart ? (
                    <Link href="/cart" onClick={stopCardClick}>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-primary" data-testid={`button-go-cart-${indicator.id}`}>
                        <ShoppingCart className="mr-1 h-3.5 w-3.5" /> Go to Cart
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/indicator/${indicator.slug}`} onClick={stopCardClick}>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-primary" data-testid={`button-view-${indicator.id}`}>
                        View Details <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${inWatchlist ? "text-primary" : "text-muted-foreground"}`}
                    onClick={handleWatchlist}
                    aria-pressed={inWatchlist}
                    aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                    data-testid={`button-watchlist-${indicator.id}`}
                  >
                    <Bookmark className={`h-4 w-4 ${inWatchlist ? "fill-primary" : ""}`} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
