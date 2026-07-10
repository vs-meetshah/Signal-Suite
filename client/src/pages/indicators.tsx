import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { IndicatorCard } from "@/components/indicator-card";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Indicator } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ShieldCheck, BarChart3, Plug, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import {
  AdminCreateIndicatorButton,
  AdminIndicatorActions,
} from "@/components/admin/admin-indicator-controls";

type CategoryKey = "Scalping" | "Intraday" | "Swing" | "Positional";

const CATEGORY_OPTIONS: { key: CategoryKey; label: string; match: RegExp }[] = [
  { key: "Scalping", label: "Scalping", match: /1 ?min|2 ?min|3 ?min|5 ?min|10 ?min|15 ?min/i },
  { key: "Intraday", label: "Intraday", match: /15 ?min|30 ?min|45 ?min|1 ?hour|2 ?hour/i },
  { key: "Swing", label: "Swing", match: /1 ?hour|2 ?hour|4 ?hour|daily/i },
  { key: "Positional", label: "Positional", match: /daily|weekly|monthly/i },
];

type MarketKey = "nifty" | "forex" | "crypto" | "stocks" | "commodities";

const MARKET_OPTIONS: { key: MarketKey; label: string; match: RegExp }[] = [
  { key: "nifty", label: "NIFTY / BANKNIFTY", match: /nifty|bank ?nifty/i },
  { key: "forex", label: "Forex", match: /usd|jpy|gbp|eur|forex/i },
  { key: "crypto", label: "Crypto", match: /btc|eth|sol|bitcoin|ether|crypto/i },
  { key: "stocks", label: "Stocks", match: /tesla|apple|s&p|nasdaq|dow|nas100|stocks/i },
  { key: "commodities", label: "Commodities", match: /gold|crude|oil|commodit/i },
];

export default function IndicatorsPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const [activeTier, setActiveTier] = useState<"All" | "Free" | "Premium">("All");
  const [activeCategory, setActiveCategory] = useState<"All" | CategoryKey>("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [marketFilters, setMarketFilters] = useState<Set<MarketKey>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [isDesktopFilters, setIsDesktopFilters] = useState(false);

  const { data: indicators, isLoading } = useQuery<Indicator[]>({
    queryKey: ["/api/indicators"],
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncViewport = () => {
      setIsDesktopFilters(mediaQuery.matches);
      setFilterOpen(false);
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  const matchesCategory = (i: Indicator, key: CategoryKey) => {
    const opt = CATEGORY_OPTIONS.find((o) => o.key === key);
    if (!opt) return false;
    return (i.bestTimeframes ?? []).some((t) => opt.match.test(t));
  };

  const filtered = useMemo(() => {
    let list = indicators ?? [];
    if (activeTier !== "All") list = list.filter((i) => i.tier.toLowerCase() === activeTier.toLowerCase());
    if (activeCategory !== "All") list = list.filter((i) => matchesCategory(i, activeCategory));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.shortDescription.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q),
      );
    }
    if (marketFilters.size > 0) {
      list = list.filter((i) => {
        const ms = i.markets ?? [];
        return Array.from(marketFilters).some((key) => {
          const opt = MARKET_OPTIONS.find((o) => o.key === key);
          return opt ? ms.some((m) => opt.match.test(m)) : false;
        });
      });
    }
    const sorted = [...list];
    if (sortBy === "rating") sorted.sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0));
    else if (sortBy === "popular") sorted.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
    else if (sortBy === "price-low") sorted.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortBy === "price-high") sorted.sort((a, b) => Number(b.price) - Number(a.price));
    else sorted.sort((a, b) => b.id - a.id);
    return sorted;
  }, [indicators, activeTier, activeCategory, search, marketFilters, sortBy]);

  const toggleMarket = (key: MarketKey) => {
    const next = new Set(marketFilters);
    if (next.has(key)) next.delete(key); else next.add(key);
    setMarketFilters(next);
  };
  const resetFilters = () => {
    setActiveTier("All");
    setActiveCategory("All");
    setSearch("");
    setMarketFilters(new Set());
    setSortBy("newest");
  };
  const activeFilterCount =
    (activeCategory !== "All" ? 1 : 0) + marketFilters.size + (search.trim() ? 1 : 0);

  const trustBadges = [
    { Icon: ShieldCheck, title: "Non-Repainting", subtitle: "100% reliable signals" },
    { Icon: BarChart3, title: "Proven Results", subtitle: "Backtested performance" },
    { Icon: Plug, title: "Easy to Use", subtitle: "Plug & play on TradingView" },
  ];

  const filterPanel = (showHeader = true) => (
    <>
      {showHeader && (
        <div className="flex justify-end border-b px-4 py-3">
          <button
            onClick={resetFilters}
            className="text-xs font-medium text-primary hover:underline"
            data-testid="button-reset-filters"
          >
            Reset
          </button>
        </div>
      )}
      <div className="max-h-[min(70vh,420px)] space-y-5 overflow-y-auto px-4 py-4">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Category
          </h4>
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              size="sm"
              variant={activeCategory === "All" ? "default" : "outline"}
              onClick={() => setActiveCategory("All")}
              className="h-8 justify-start"
              data-testid="filter-cat-all"
            >
              All
            </Button>
            {CATEGORY_OPTIONS.map((c) => (
              <Button
                key={c.key}
                size="sm"
                variant={activeCategory === c.key ? "default" : "outline"}
                onClick={() => setActiveCategory(c.key)}
                className="h-8 justify-start"
                data-testid={`filter-cat-${c.key.toLowerCase()}`}
              >
                {c.label}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Markets
          </h4>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={marketFilters.size === 0}
                onCheckedChange={() => setMarketFilters(new Set())}
                data-testid="filter-market-all"
              />
              <span>All Markets</span>
            </label>
            {MARKET_OPTIONS.map((m) => (
              <label key={m.key} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={marketFilters.has(m.key)}
                  onCheckedChange={() => toggleMarket(m.key)}
                  data-testid={`filter-market-${m.key}`}
                />
                <span>{m.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" data-testid="text-indicators-title">
              Our Trading Indicators
            </h1>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Powerful, non-repainting TradingView indicators built for precision, confluence and consistent results.
            </p>
            {isAdmin && (
              <div className="mt-4">
                <AdminCreateIndicatorButton label="Add New Indicator" />
              </div>
            )}
          </div>
          <Card className="grid w-full gap-4 border-card-border bg-card/60 px-5 py-4 backdrop-blur sm:grid-cols-3 lg:w-auto">
            {trustBadges.map(({ Icon, title, subtitle }) => (
              <div
                key={title}
                className="flex min-w-0 items-center gap-3"
                data-testid={`trust-${title.toLowerCase().replace(/\s/g, "-")}`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="text-[11px] text-muted-foreground">{subtitle}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>

        <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap gap-2" data-testid="tier-tabs">
            {(["All", "Free", "Premium"] as const).map((name) => (
              <Button
                key={name}
                size="sm"
                variant={activeTier === name ? "default" : "outline"}
                onClick={() => setActiveTier(name)}
                className="rounded-full"
                data-testid={`tab-tier-${name.toLowerCase()}`}
              >
                {name}
              </Button>
            ))}
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] xl:flex xl:w-auto xl:flex-wrap xl:items-center xl:justify-end">
            <div className="relative col-span-2 min-w-0 sm:col-span-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search indicators..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full pl-8 sm:min-w-[260px] xl:w-[260px]"
                data-testid="input-search"
              />
            </div>
            {isDesktopFilters ? (
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative h-9 w-full justify-center px-3 sm:w-auto"
                    data-testid="button-open-filters"
                    aria-label="Filters"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="ml-1.5">Filters</span>
                    {activeFilterCount > 0 && (
                      <span
                        className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
                        data-testid="text-filter-count"
                      >
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  side="bottom"
                  sideOffset={8}
                  avoidCollisions={false}
                  className="z-[90] w-[18rem] overflow-hidden p-0"
                  data-testid="popover-filters"
                >
                  {filterPanel()}
                </PopoverContent>
              </Popover>
            ) : (
              <Drawer open={filterOpen} onOpenChange={setFilterOpen}>
                <DrawerTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative h-9 w-full justify-center px-3"
                    data-testid="button-open-filters-mobile"
                    aria-label="Filters"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="ml-1.5">Filters</span>
                    {activeFilterCount > 0 && (
                      <span
                        className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
                        data-testid="text-filter-count-mobile"
                      >
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[85vh]">
                  <DrawerHeader className="border-b px-4 py-3 text-left">
                    <DrawerTitle className="sr-only">Filters</DrawerTitle>
                    <div className="flex justify-end">
                      <button
                        onClick={resetFilters}
                        className="text-xs font-medium text-primary hover:underline"
                        data-testid="button-reset-filters-mobile"
                      >
                        Reset
                      </button>
                    </div>
                  </DrawerHeader>
                  {filterPanel(false)}
                </DrawerContent>
              </Drawer>
            )}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 w-full sm:w-[150px]" data-testid="select-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-md border border-card-border p-5">
                <Skeleton className="mb-4 h-32 w-full rounded-md" />
                <Skeleton className="mb-2 h-5 w-2/3" />
                <Skeleton className="mb-4 h-4 w-full" />
                <Skeleton className="h-8 w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            data-testid="indicators-grid"
          >
            {filtered.map((indicator) => (
              <IndicatorCard
                key={indicator.id}
                indicator={indicator}
                adminOverlay={isAdmin ? <AdminIndicatorActions indicator={indicator} /> : undefined}
              />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-20 text-center text-muted-foreground">
                No indicators match your filters.
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
