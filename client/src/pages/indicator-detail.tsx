import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import {
  ArrowLeft, ShoppingCart, CheckCircle2, TrendingUp, BarChart3,
  Target, Clock, Zap, Activity, Brain, Crown, Globe,
  LogIn, LogOut as LogOutIcon, Crosshair, ChevronRight,
  Lock, Star, ShieldCheck, Bookmark, Sparkles,
  Cpu, LineChart, AlertTriangle, MonitorSmartphone, BookOpen,
  Settings as SettingsIcon, MessageSquare, HelpCircle, Award,
  Code2, Calendar, User as UserIcon, Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useCart, computeStrategyPrice, computeBothPrice, computeVersionPrice, computeTrialPrice, VERSION_LABELS, type ProductVersion } from "@/components/cart-provider";
import { useAuth } from "@/components/auth-provider";
import { AdminIndicatorActions } from "@/components/admin/admin-indicator-controls";
import { SectionEditButton } from "@/components/admin/section-edit-button";
import { useLocation } from "wouter";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ChartPreview } from "@/components/chart-preview";
import type { Indicator } from "@shared/schema";

const categoryIcons: Record<string, typeof TrendingUp> = {
  "Trend Following": TrendingUp,
  "Momentum": Zap,
  "Volume Analysis": BarChart3,
  "Volatility": Activity,
  "Smart Money": Brain,
  "Support/Resistance": Target,
};

const categoryColors: Record<string, string> = {
  "Trend Following": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "Momentum": "bg-violet-500/15 text-violet-400 border-violet-500/30",
  "Volume Analysis": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "Volatility": "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "Smart Money": "bg-rose-500/15 text-rose-400 border-rose-500/30",
  "Support/Resistance": "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
};

const DURATION_DISCOUNTS: Record<number, number> = {
  1: 0.03,
  3: 0.06,
  6: 0.09,
  9: 0.12,
  12: 0.24,
};

function getDurationDiscount(months: number): number {
  return DURATION_DISCOUNTS[months] ?? 0;
}

function parsePct(s?: string | null): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}
function parseInt2(s?: string | null): number {
  if (!s) return 0;
  const n = parseInt(s.replace(/[^\d]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

function deriveStats(indicator: Indicator) {
  const winRate = parsePct(indicator.winRate);
  const avgReturn = parsePct(indicator.avgReturn);
  const totalTrades = parseInt2(indicator.totalTrades);
  // Prefer admin-configured values; fall back to deterministic derivations.
  const ratingFromDb = indicator.rating ? parseFloat(indicator.rating) : NaN;
  const rating = !isNaN(ratingFromDb) && ratingFromDb > 0
    ? Math.round(ratingFromDb * 10) / 10
    : Math.round((4.5 + Math.min(0.5, winRate / 200)) * 10) / 10;
  const reviews = typeof indicator.reviewCount === "number" && indicator.reviewCount > 0
    ? indicator.reviewCount
    : 80 + (indicator.id * 17) % 220;
  const avgRR = indicator.avgRR && indicator.avgRR.trim()
    ? indicator.avgRR.trim()
    : `1:${(1.5 + Math.min(2.5, winRate / 30)).toFixed(2)}`;
  const profitFactor = indicator.profitFactor && indicator.profitFactor.trim()
    ? indicator.profitFactor.trim()
    : (1.2 + Math.min(1.8, avgReturn)).toFixed(2);
  const bestMarket = indicator.bestMarket && indicator.bestMarket.trim()
    ? indicator.bestMarket.trim()
    : (indicator.markets && indicator.markets[0]) || "Nifty 50";
  return { winRate, avgReturn, totalTrades, rating, reviews, avgRR, profitFactor, bestMarket };
}

function TextBlock({ content }: { content: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
      {content.split("\n").map((p, i) => <p key={i}>{p}</p>)}
    </div>
  );
}

function LockedBlock({ message }: { message: string }) {
  return (
    <Card className="border-dashed bg-muted/30 p-6" data-testid="locked-placeholder">
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">Locked content</p>
        <p className="max-w-md text-xs text-muted-foreground">{message}</p>
      </div>
    </Card>
  );
}

function StatCell({ icon: Icon, label, value, accent }: {
  icon: typeof TrendingUp; label: string; value: string; accent?: string;
}) {
  return (
    <div className="rounded-lg border border-card-border bg-card/50 p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={`mt-1.5 text-xl font-bold tracking-tight ${accent || ""}`}>{value}</div>
    </div>
  );
}

const WATCHLIST_KEY = "pinesignallab.watchlist";

function readWatchlist(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "number") : [];
  } catch {
    return [];
  }
}
function writeWatchlist(ids: number[]) {
  try {
    window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(ids));
  } catch { }
}

export default function IndicatorDetail() {
  const params = useParams<{ slug: string }>();
  const { addItem, addTrial, isInCart, getCartItem, cartVersion, canAddVersion } = useCart();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const [, setLocation] = useLocation();
  const [selectedVersion, setSelectedVersion] = useState<ProductVersion>("indicator");
  const [activeTab, setActiveTab] = useState("overview");
  const [watchlist, setWatchlist] = useState<number[]>(() => readWatchlist());
  const [pricingOpen, setPricingOpen] = useState(false);
  const [dialogVersion, setDialogVersion] = useState<ProductVersion>("indicator");
  const [dialogMonths, setDialogMonths] = useState<number>(1);
  const [dialogIsTrial, setDialogIsTrial] = useState<boolean>(false);
  const pricingDialogRef = useRef<HTMLDivElement | null>(null);
  const pricingScrollRef = useRef<HTMLDivElement | null>(null);

  const { data: indicator, isLoading } = useQuery<Indicator>({
    queryKey: ["/api/indicators", params.slug],
  });

  const { data: access } = useQuery<{ hasAccess: boolean }>({
    queryKey: ["/api/access", indicator?.id],
    enabled: !!indicator?.id,
  });

  useEffect(() => {
    if (!pricingOpen) return;

    const resetScroll = () => {
      pricingDialogRef.current?.scrollTo({ top: 0, behavior: "auto" });
      pricingScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    };

    resetScroll();
    const frame = window.requestAnimationFrame(resetScroll);
    return () => window.cancelAnimationFrame(frame);
  }, [pricingOpen]);

  const hasAccess = access?.hasAccess === true;
  const lockMessage = "Unlocks automatically once your purchase is approved.";
  const canViewProtectedContent = hasAccess || isAdmin;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-8 w-32" />
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <Skeleton className="mb-4 h-12 w-2/3" />
            <Skeleton className="mb-2 h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!indicator) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center">
        <h2 className="text-2xl font-bold">Indicator not found</h2>
        <p className="mt-2 text-muted-foreground">The indicator you're looking for doesn't exist.</p>
        <Link href="/indicators">
          <Button className="mt-6" data-testid="button-back-home">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Indicators
          </Button>
        </Link>
      </div>
    );
  }

  const Icon = categoryIcons[indicator.category] || TrendingUp;
  const categoryClass = categoryColors[indicator.category] || "bg-slate-500/15 text-slate-400 border-slate-500/30";
  const inCart = isInCart(indicator.id);
  const cartItem = getCartItem(indicator.id);
  const isFree = indicator.tier === "free";
  const stats = deriveStats(indicator);

  const indicatorVersionPrice = isFree ? "0" : indicator.price;
  const strategyVersionPrice = computeStrategyPrice(indicator.price);
  const bothVersionPrice = computeBothPrice(indicator.price);

  const handleAddFromDialog = () => {
    if (dialogIsTrial) {
      const result = addTrial({
        indicatorId: indicator.id,
        name: indicator.name,
        slug: indicator.slug,
        price: indicator.price,
        version: dialogVersion,
      });
      if (!result.ok && result.reason === "mixed") {
        toast({
          variant: "destructive",
          title: "Can't mix versions",
          description: `This indicator is already in your cart as ${VERSION_LABELS[result.cartVersion as ProductVersion] || "selected version"}. Remove it from cart first if you want to change the version.`,
        });
        return;
      }
      if (!result.ok && result.reason === "exists") {
        toast({
          variant: "destructive",
          title: "Already in cart",
          description: `${indicator.name} is already in your cart. Remove it from cart first if you want to change the plan or duration.`,
        });
        return;
      }
      window.dispatchEvent(new CustomEvent("cart-item-added"));
      toast({
        title: "Trial added",
        description: `${indicator.name} (${VERSION_LABELS[dialogVersion]}) trial has been added to your cart.`,
      });
      setPricingOpen(false);
      setLocation("/cart");
      return;
    }
    const monthlyPrice = computeVersionPrice(dialogVersion, indicatorVersionPrice);
    const result = addItem({
      indicatorId: indicator.id,
      name: indicator.name,
      slug: indicator.slug,
      price: monthlyPrice,
      version: dialogVersion,
      duration: dialogMonths,
    });
    if (!result.ok && result.reason === "mixed") {
      toast({
        variant: "destructive",
        title: "Can't mix versions",
        description: `This indicator is already in your cart as ${VERSION_LABELS[result.cartVersion as ProductVersion] || "selected version"}. Remove it from cart first if you want to change the version.`,
      });
      return;
    }
    if (!result.ok && result.reason === "exists") {
      toast({
        variant: "destructive",
        title: "Already in cart",
        description: `${indicator.name} is already in your cart. Remove it from cart first if you want to change the plan or duration.`,
      });
      return;
    }
    window.dispatchEvent(new CustomEvent("cart-item-added"));
    toast({
      title: parseFloat(monthlyPrice) === 0 ? "Access added" : "Added to cart",
      description: `${indicator.name} (${VERSION_LABELS[dialogVersion]}) · ${dialogMonths} ${dialogMonths === 1 ? "month" : "months"} added to your cart.`,
    });
    setPricingOpen(false);
    setLocation("/cart");
  };

  const openPricing = () => {
    setDialogVersion(selectedVersion);
    setDialogMonths(1);
    setDialogIsTrial(false);
    setPricingOpen(true);
  };

  const inWatchlist = watchlist.includes(indicator.id);
  const handleWatchlist = () => {
    const next = inWatchlist
      ? watchlist.filter((id) => id !== indicator.id)
      : [...watchlist, indicator.id];
    setWatchlist(next);
    writeWatchlist(next);
    toast({
      title: inWatchlist ? "Removed from watchlist" : "Saved to watchlist",
      description: inWatchlist
        ? `${indicator.name} was removed from your watchlist.`
        : `${indicator.name} was added to your watchlist.`,
    });
  };
  const faqItems = (indicator.faqs && Array.isArray(indicator.faqs) ? indicator.faqs : []).filter(
    (f) => f && typeof f.q === "string" && typeof f.a === "string"
  );

  const settingsBlocks = indicator.recommendedSettings
    ? indicator.recommendedSettings.split("\n").map((b) => {
      const i = b.indexOf(":");
      return i === -1 ? { title: b, detail: "" } : { title: b.slice(0, i).trim(), detail: b.slice(i + 1).trim() };
    })
    : [];

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {isAdmin && (
          <div className="mb-4">
            <AdminIndicatorActions
              indicator={indicator}
              variant="toolbar"
              onDeleted={() => setLocation("/indicators")}
            />
          </div>
        )}
        {/* Breadcrumb */}
        <nav className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="breadcrumb">
          <Link href="/indicators">
            <span className="hover:text-foreground transition-colors cursor-pointer" data-testid="link-breadcrumb-indicators">
              Indicators
            </span>
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{indicator.category}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground/80 truncate">{indicator.name}</span>
        </nav>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {/* HERO */}
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="min-w-0">
              {isAdmin && (
                <div className="mb-3 flex flex-wrap gap-1.5" data-testid="admin-hero-edit-row">
                  <SectionEditButton indicator={indicator} section="hero" label="Edit Hero" />
                  <SectionEditButton indicator={indicator} section="meta" label="Edit Meta" />
                  <SectionEditButton indicator={indicator} section="tags" label="Edit Tags" />
                  <SectionEditButton indicator={indicator} section="rating" label="Edit Rating" />
                  <SectionEditButton indicator={indicator} section="pricing" label="Edit Pricing" />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {indicator.nonRepainting && (
                  <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 gap-1" data-testid="badge-non-repainting">
                    <ShieldCheck className="h-3 w-3" /> Non-Repainting
                  </Badge>
                )}
                <Badge variant="outline" className={categoryClass} data-testid="badge-category">
                  <Icon className="mr-1 h-3 w-3" /> {indicator.category}
                </Badge>
                {isFree ? (
                  <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400" data-testid="badge-tier">
                    Free
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 gap-1" data-testid="badge-tier">
                    <Crown className="h-3 w-3" /> Premium
                  </Badge>
                )}
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl" data-testid="text-indicator-name">
                {indicator.name}
              </h1>
              <p className="mt-3 text-base text-muted-foreground leading-relaxed sm:text-lg" data-testid="text-short-desc">
                {indicator.shortDescription}
              </p>

              {/* Meta row: version / published / developer */}
              {(indicator.versionLabel || indicator.publishedDate || indicator.developer) && (() => {
                const items = [
                  indicator.versionLabel && {
                    key: "version",
                    icon: <Code2 className="h-4 w-4 text-muted-foreground" />,
                    label: indicator.versionLabel,
                  },
                  indicator.publishedDate && {
                    key: "published",
                    icon: <Calendar className="h-4 w-4 text-muted-foreground" />,
                    label: indicator.publishedDate,
                  },
                  indicator.developer && {
                    key: "developer",
                    icon: <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">By</span>,
                    label: indicator.developer,
                  },
                ].filter(Boolean) as { key: string; icon: JSX.Element; label: string }[];
                return (
                  <div
                    className="mt-5 flex items-stretch divide-x divide-card-border rounded-lg border border-card-border bg-card/40"
                    data-testid="meta-row"
                  >
                    {items.map((it) => (
                      <div
                        key={it.key}
                        className="flex flex-1 flex-col items-center justify-center gap-1.5 px-4 py-3.5 text-center"
                        data-testid={`meta-${it.key}`}
                      >
                        <div className="flex h-4 items-center justify-center">{it.icon}</div>
                        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-foreground/80">
                          {it.label}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Tags */}
              {indicator.tags && indicator.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2" data-testid="tags-block">
                  {indicator.tags.map((t, i) => {
                    const palettes = [
                      "border-blue-500/30 bg-blue-500/10 text-blue-400",
                      "border-violet-500/30 bg-violet-500/10 text-violet-400",
                      "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                      "border-amber-500/30 bg-amber-500/10 text-amber-400",
                      "border-rose-500/30 bg-rose-500/10 text-rose-400",
                      "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
                    ];
                    const cls = palettes[i % palettes.length];
                    return (
                      <Badge
                        key={`${t}-${i}`}
                        variant="outline"
                        className={cls}
                        data-testid={`badge-tag-${i}`}
                      >
                        {t}
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Rating */}
              <div className="mt-5 flex items-center gap-3" data-testid="rating-block">
                <div className="flex items-center gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i}
                      className={`h-4 w-4 ${i < Math.round(stats.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold" data-testid="text-rating">{stats.rating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground" data-testid="text-reviews-count">({stats.reviews} Reviews)</span>
              </div>

              {/* CTAs */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {inCart ? (
                  <>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20" data-testid="badge-in-cart-version">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Added: {cartItem ? VERSION_LABELS[cartItem.version] : "Indicator"}
                      {cartItem?.isTrial ? " · Trial" : ""}
                    </Badge>
                    <Link href="/cart">
                      <Button size="lg" data-testid="button-go-to-cart">
                        <ShoppingCart className="mr-2 h-4 w-4" /> Go to Cart
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Button
                    size="lg"
                    onClick={openPricing}
                    className="gap-2"
                    data-testid="button-get-access"
                  >
                    <Sparkles className="h-4 w-4" />
                    {isFree ? "Get Free Access" : "Get Access"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleWatchlist}
                  className={inWatchlist ? "border-primary/50 text-primary" : ""}
                  aria-pressed={inWatchlist}
                  data-testid="button-watchlist"
                >
                  <Bookmark className={`mr-2 h-4 w-4 ${inWatchlist ? "fill-primary" : ""}`} />
                  {inWatchlist ? "Saved to Watchlist" : "Add to Watchlist"}
                </Button>
              </div>
            </div>

            {/* Hero Chart */}
            <ChartPreview
              variant="hero"
              symbol={indicator.tradingViewSymbol || stats.bestMarket}
              seed={indicator.id * 31 + indicator.name.length}
            />
          </div>

          {/* TABS */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-10">
            <div className="border-b border-card-border">
              <TabsList className="h-auto bg-transparent p-0 gap-1 justify-start overflow-x-auto whitespace-nowrap flex-nowrap sm:flex-wrap sm:overflow-visible">
                {[
                  { v: "overview", label: "Overview", icon: BookOpen },
                  { v: "how", label: "Quick Start", icon: Brain },
                  { v: "reviews", label: "Reviews", icon: MessageSquare },
                  { v: "faq", label: "FAQ", icon: HelpCircle },
                ].map(({ v, label, icon: TIcon }) => (
                  <TabsTrigger
                    key={v}
                    value={v}
                    className="gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                    data-testid={`tab-${v}`}
                  >
                    <TIcon className="h-3.5 w-3.5" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* 3-COLUMN LAYOUT */}
            <div className="mt-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-12 space-y-6">
                {/* OVERVIEW */}
                <TabsContent value="overview" className="m-0 space-y-6">
                  <div className="grid gap-6 lg:grid-cols-12">
                    {/* LEFT: About + Key Features */}
                    <Card className="border-card-border p-6 lg:col-span-7">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold" data-testid="text-about-title">About This Indicator</h2>
                        {isAdmin && <SectionEditButton indicator={indicator} section="about" />}
                      </div>
                      <TextBlock content={indicator.description} />
                      <div className="mt-6">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h3 className="text-base font-semibold" data-testid="text-features-title">Key Features</h3>
                          {isAdmin && <SectionEditButton indicator={indicator} section="features" />}
                        </div>
                        <ul className="space-y-2 pl-1" data-testid="features-list">
                          {indicator.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm" data-testid={`feature-${i}`}>
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/70" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Card>

                    {/* RIGHT: Video Tutorial + Compatibility + Markets table */}
                    <div className="space-y-6 lg:col-span-5">
                      {(() => {
                        const url = indicator.videoUrl || "";
                        const imageUrl = indicator.imageUrl || "";
                        const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
                        const hasVideo = Boolean(yt || url);
                        const hasImage = Boolean(imageUrl);
                        return (
                          <Card className="relative border-card-border overflow-hidden p-0" data-testid="card-video-tutorial">
                            {isAdmin && (
                              <div className="absolute right-2 top-2 z-20" data-testid="admin-video-edit">
                                <SectionEditButton indicator={indicator} section="video" label="Edit Video" />
                              </div>
                            )}
                            <div className="relative aspect-video bg-black">
                              {yt ? (
                                <iframe
                                  className="absolute inset-0 h-full w-full"
                                  src={`https://www.youtube.com/embed/${yt[1]}`}
                                  title="Video Tutorial"
                                  loading="lazy"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  data-testid="iframe-video-tutorial"
                                />
                              ) : url ? (
                                <video
                                  controls
                                  className="absolute inset-0 h-full w-full object-cover"
                                  src={url}
                                  data-testid="video-tutorial"
                                />
                              ) : hasImage ? (
                                <img
                                  src={imageUrl}
                                  alt={`${indicator.name} preview`}
                                  className="absolute inset-0 h-full w-full object-cover"
                                  loading="lazy"
                                  data-testid="image-video-cover"
                                />
                              ) : (
                                <>
                                  <div className="absolute left-3 top-3 z-10">
                                    <p className="text-[11px] font-semibold leading-none text-white">Video Tutorial</p>
                                    <p className="mt-1 text-[10px] leading-none text-white/70">Learn how {indicator.name} works and how to use it.</p>
                                  </div>
                                  <div className="absolute inset-0 flex items-center justify-center text-center">
                                    <div>
                                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                                        <Play className="ml-0.5 h-6 w-6 text-white" fill="currentColor" />
                                      </div>
                                      <p className="mt-3 text-sm font-semibold text-white">Coming soon</p>
                                    </div>
                                  </div>
                                </>
                              )}
                              {hasVideo && (
                                <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 backdrop-blur">
                                  <p className="text-[11px] font-semibold leading-none text-white">Video Tutorial</p>
                                  <p className="mt-1 text-[10px] leading-none text-white/70">Learn how {indicator.name} works and how to use it.</p>
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })()}

                      <Card className="border-card-border p-6" data-testid="card-overview-compatibility">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h2 className="text-base font-semibold">Compatibility</h2>
                          {isAdmin && <SectionEditButton indicator={indicator} section="markets" />}
                        </div>
                        <div className="flex items-center justify-between border-b border-card-border pb-3 text-sm">
                          <span className="text-muted-foreground">Platform</span>
                          <span className="font-medium">TradingView</span>
                        </div>

                        <h3 className="mt-4 mb-2 text-sm font-semibold">Supported Markets &amp; Instruments</h3>
                        {indicator.markets && indicator.markets.length > 0 ? (
                          <div className="overflow-hidden rounded-lg border border-card-border" data-testid="table-markets">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                                <tr>
                                  <th className="border-b border-card-border px-3 py-2 text-left font-medium">Script</th>
                                  <th className="border-b border-card-border px-3 py-2 text-left font-medium">Time Frame</th>
                                </tr>
                              </thead>
                              <tbody>
                                {indicator.markets.map((m, i) => (
                                  <tr key={i} className="border-b border-card-border last:border-b-0" data-testid={`row-market-${i}`}>
                                    <td className="px-3 py-2 font-medium">{m}</td>
                                    <td className="px-3 py-2 text-muted-foreground">
                                      {indicator.bestTimeframes && indicator.bestTimeframes.length > 0
                                        ? indicator.bestTimeframes.join(", ")
                                        : "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No supported markets specified.</p>
                        )}
                      </Card>
                    </div>
                  </div>

                  {/* Live Signal Example + stats */}
                  <Card className="border-card-border p-6">
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <h2 className="text-lg font-semibold" data-testid="text-signal-example-title">Live Signal Example</h2>
                      <div className="flex items-center gap-2">
                        {isAdmin && <SectionEditButton indicator={indicator} section="stats" />}
                        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                          Live
                        </Badge>
                      </div>
                    </div>
                    <ChartPreview
                      symbol={indicator.tradingViewSymbol || stats.bestMarket}
                      seed={indicator.id * 97 + 11}
                      variant="signal-example"
                      className="mb-5"
                    />
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                      <StatCell icon={Target} label="Win Rate" value={indicator.winRate || "—"} accent="text-emerald-500" />
                      <StatCell icon={TrendingUp} label="Avg RR" value={stats.avgRR} />
                      <StatCell icon={Activity} label="Total Signals" value={indicator.totalTrades || "—"} />
                      <StatCell icon={Zap} label="Profit Factor" value={stats.profitFactor} accent="text-amber-500" />
                      <StatCell icon={Award} label="Best Market" value={stats.bestMarket} />
                    </div>
                  </Card>
                </TabsContent>

                {/* HOW IT WORKS */}
                <TabsContent value="how" className="m-0 space-y-6">
                  {(indicator.signalLogic || isAdmin) && (
                    <Card className="border-card-border p-6">
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4 text-primary" />
                          <h2 className="text-lg font-semibold">Signal Logic & Methodology</h2>
                        </div>
                        {isAdmin && <SectionEditButton indicator={indicator} section="signalLogic" />}
                      </div>
                      {indicator.signalLogic ? (
                        canViewProtectedContent ? <TextBlock content={indicator.signalLogic} /> : <LockedBlock message={lockMessage} />
                      ) : (
                        <p className="text-sm text-muted-foreground italic" data-testid="signal-logic-empty">
                          No signal logic added yet. Click Edit to add one.
                        </p>
                      )}
                    </Card>
                  )}

                  {(indicator.entryConditions || indicator.exitConditions || isAdmin) && (
                    <div className="space-y-3">
                      {isAdmin && (
                        <div className="flex items-center justify-between gap-2" data-testid="admin-entryexit-bar">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entry & Exit</h3>
                          <SectionEditButton indicator={indicator} section="entryExit" label="Edit Entry/Exit" />
                        </div>
                      )}
                      {canViewProtectedContent ? (
                        (indicator.entryConditions || indicator.exitConditions) ? (
                          <div className="grid gap-4 md:grid-cols-2">
                            {indicator.entryConditions && (
                              <Card className="border-card-border p-6" data-testid="entry-conditions">
                                <div className="mb-3 flex items-center gap-2">
                                  <LogIn className="h-4 w-4 text-emerald-500" />
                                  <h3 className="font-semibold text-emerald-500">Entry Conditions</h3>
                                </div>
                                <TextBlock content={indicator.entryConditions} />
                              </Card>
                            )}
                            {indicator.exitConditions && (
                              <Card className="border-card-border p-6" data-testid="exit-conditions">
                                <div className="mb-3 flex items-center gap-2">
                                  <LogOutIcon className="h-4 w-4 text-rose-500" />
                                  <h3 className="font-semibold text-rose-500">Exit Conditions</h3>
                                </div>
                                <TextBlock content={indicator.exitConditions} />
                              </Card>
                            )}
                          </div>
                        ) : isAdmin ? (
                          <p className="text-sm text-muted-foreground italic" data-testid="entryexit-empty">
                            No entry/exit conditions added yet. Click Edit to add them.
                          </p>
                        ) : null
                      ) : (
                        <LockedBlock message={lockMessage} />
                      )}
                    </div>
                  )}

                  {(indicator.stopLossStrategy || indicator.targetStrategy || isAdmin) && (
                    <div className="space-y-3">
                      {isAdmin && (
                        <div className="flex items-center justify-between gap-2" data-testid="admin-riskmgmt-bar">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Risk Management</h3>
                          <SectionEditButton indicator={indicator} section="riskMgmt" label="Edit Risk Mgmt" />
                        </div>
                      )}
                      {canViewProtectedContent ? (
                        (indicator.stopLossStrategy || indicator.targetStrategy) ? (
                          <div className="grid gap-4 md:grid-cols-2">
                            {indicator.stopLossStrategy && (
                              <Card className="border-card-border p-6" data-testid="stoploss-strategy">
                                <div className="mb-3 flex items-center gap-2">
                                  <Crosshair className="h-4 w-4 text-amber-500" />
                                  <h3 className="font-semibold">Stop-Loss Strategy</h3>
                                </div>
                                <TextBlock content={indicator.stopLossStrategy} />
                              </Card>
                            )}
                            {indicator.targetStrategy && (
                              <Card className="border-card-border p-6" data-testid="target-strategy">
                                <div className="mb-3 flex items-center gap-2">
                                  <Target className="h-4 w-4 text-primary" />
                                  <h3 className="font-semibold">Target Strategy</h3>
                                </div>
                                <TextBlock content={indicator.targetStrategy} />
                              </Card>
                            )}
                          </div>
                        ) : isAdmin ? (
                          <p className="text-sm text-muted-foreground italic" data-testid="riskmgmt-empty">
                            No risk management strategies added yet. Click Edit to add them.
                          </p>
                        ) : null
                      ) : (
                        <div data-testid="risk-management-locked">
                          <div className="mb-3 flex items-center gap-2">
                            <Crosshair className="h-4 w-4 text-amber-500" />
                            <h3 className="font-semibold">Risk Management</h3>
                          </div>
                          <LockedBlock message={lockMessage} />
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* REVIEWS */}
                <TabsContent value="reviews" className="m-0">
                  <Card className="border-card-border p-10" data-testid="reviews-empty">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="flex items-center gap-2" data-testid="reviews-rating-summary">
                        <div className="flex items-center gap-0.5">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <Star
                              key={i}
                              className={`h-5 w-5 ${i < Math.round(stats.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                            />
                          ))}
                        </div>
                        <span className="text-2xl font-bold tracking-tight" data-testid="text-reviews-tab-rating">
                          {stats.rating.toFixed(1)}
                        </span>
                        <span className="text-sm text-muted-foreground" data-testid="text-reviews-tab-count">
                          ({stats.reviews.toLocaleString("en-IN")} Reviews)
                        </span>
                      </div>
                      <div className="mt-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <h2 className="text-lg font-semibold">No reviews yet</h2>
                      <p className="max-w-md text-sm text-muted-foreground">
                        Be the first to review {indicator.name}. Share your experience to help other traders make better decisions.
                      </p>
                      <Button variant="outline" className="mt-2" data-testid="button-write-review">
                        <Star className="mr-2 h-4 w-4" /> Be the First to Review
                      </Button>
                    </div>
                  </Card>
                </TabsContent>

                {/* FAQ */}
                <TabsContent value="faq" className="m-0">
                  <Card className="border-card-border p-6">
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <h2 className="text-lg font-semibold">Frequently Asked Questions</h2>
                      {isAdmin && <SectionEditButton indicator={indicator} section="faqs" />}
                    </div>
                    {faqItems.length > 0 ? (
                      <Accordion type="single" collapsible className="w-full">
                        {faqItems.map((item, i) => (
                          <AccordionItem key={i} value={`item-${i}`} data-testid={`faq-${i}`}>
                            <AccordionTrigger className="text-sm font-medium text-left">{item.q}</AccordionTrigger>
                            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{item.a}</AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-8 text-center" data-testid="faq-empty">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">No FAQs yet</p>
                        <p className="max-w-md text-xs text-muted-foreground">
                          Have a question about {indicator.name}? Reach out to our support team and we'll add it here.
                        </p>
                      </div>
                    )}
                  </Card>
                </TabsContent>
              </div>

            </div>
          </Tabs>
        </motion.div>
      </div>

      {/* Pricing Dialog */}
      <Dialog open={pricingOpen} onOpenChange={setPricingOpen}>
        <DialogContent
          ref={pricingDialogRef}
          className="fixed left-1/2 top-4 flex max-h-[calc(100vh-2rem)] w-[calc(100vw-1rem)] max-w-md -translate-x-1/2 translate-y-0 flex-col overflow-hidden p-0 sm:top-1/2 sm:max-h-[92vh] sm:w-full sm:-translate-y-1/2"
          onOpenAutoFocus={(event) => event.preventDefault()}
          data-testid="dialog-pricing"
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div ref={pricingScrollRef} className="flex-1 overflow-y-auto p-4 pb-4 sm:p-5 sm:pb-4">
              <DialogHeader className="mb-4 flex-col items-start gap-3 space-y-0 pr-10 sm:flex-row sm:items-center sm:justify-between">
                <DialogTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Pricing
                </DialogTitle>
                {!isFree && (
                  <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                    <Label
                      htmlFor="switch-toggle-trial"
                      className="cursor-pointer text-[11px] font-medium text-muted-foreground"
                    >
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {indicator.trialDays || 15}-day trial
                      </span>
                    </Label>
                    <Switch
                      id="switch-toggle-trial"
                      checked={dialogIsTrial}
                      onCheckedChange={(v) => setDialogIsTrial(Boolean(v))}
                      aria-label={`Toggle ${indicator.trialDays || 15}-day trial`}
                      className="h-5 w-9 [&>span]:h-4 [&>span]:w-4 [&>span[data-state=checked]]:translate-x-4"
                      data-testid="switch-toggle-trial"
                    />
                  </div>
                )}
              </DialogHeader>
              <DialogDescription className="sr-only">Select version, duration and add to cart.</DialogDescription>

              {/* Version selector */}
              <RadioGroup
                value={dialogVersion}
                onValueChange={(v) => setDialogVersion(v as ProductVersion)}
                aria-label="Select version"
                className="gap-2"
              >
                {([
                  { key: "indicator" as ProductVersion, label: "Indicator", icon: LineChart, tagline: "Chart signals", price: indicatorVersionPrice, testId: "dialog-version-indicator" },
                  { key: "strategy" as ProductVersion, label: "Strategy", icon: Cpu, tagline: "Auto entries & alerts", price: strategyVersionPrice, testId: "dialog-version-strategy" },
                  { key: "both" as ProductVersion, label: "Indicator + Strategy", icon: Sparkles, tagline: "Both versions bundled", price: bothVersionPrice, testId: "dialog-version-both" },
                ]).map(({ key, label, icon: VIcon, tagline, price, testId }) => {
                  const active = dialogVersion === key;
                  const displayPrice = dialogIsTrial ? computeTrialPrice(key) : price;
                  const isFreePrice = parseFloat(displayPrice) === 0;
                  const inputId = `radio-${testId}`;
                  return (
                    <Label
                      key={key}
                      htmlFor={inputId}
                      className={`block w-full cursor-pointer rounded-lg border p-3 font-normal transition-all hover-elevate ${active ? "border-primary/60 bg-primary/[0.04]" : "border-card-border"
                        }`}
                      data-testid={testId}
                    >
                      <div className="flex items-start justify-between gap-3 sm:items-center">
                        <div className="min-w-0 flex flex-1 items-center gap-2">
                          <VIcon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-none">{label}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">{tagline}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 self-center">
                          <div className="text-right">
                            {isFreePrice ? (
                              <span className="text-sm font-bold text-emerald-500" data-testid={`text-dialog-price-${key}`}>Free</span>
                            ) : (
                              <>
                                <span className="text-sm font-bold tracking-tight" data-testid={`text-dialog-price-${key}`}>
                                  ₹{Number(displayPrice).toLocaleString("en-IN")}
                                </span>
                                <span className="text-[10px] text-muted-foreground">{dialogIsTrial ? "/trial" : "/mo"}</span>
                              </>
                            )}
                          </div>
                          <RadioGroupItem
                            value={key}
                            id={inputId}
                            aria-label={label}
                            data-testid={`input-${testId}`}
                          />
                        </div>
                      </div>
                    </Label>
                  );
                })}
              </RadioGroup>

              {/* Duration selector (hidden when trial) */}
              {!dialogIsTrial && (
                <div className="mt-5" data-testid="duration-selector">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duration</span>
                    <span className="text-sm font-semibold tabular-nums" data-testid="text-dialog-months">
                      {dialogMonths} {dialogMonths === 1 ? "month" : "months"}
                    </span>
                  </div>
                  <Slider
                    min={1}
                    max={12}
                    step={1}
                    value={[dialogMonths]}
                    onValueChange={(v) => setDialogMonths(v[0] ?? 1)}
                    data-testid="slider-dialog-months"
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {[1, 3, 6, 9, 12].map((m) => {
                      const monthly = parseFloat(computeVersionPrice(dialogVersion, indicatorVersionPrice));
                      const original = monthly * m;
                      const discount = getDurationDiscount(m);
                      const discounted = Math.round(original * (1 - discount));
                      const active = dialogMonths === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setDialogMonths(m)}
                          className={`relative flex min-h-[64px] flex-col items-center justify-center rounded-md border px-2 py-2 transition-colors hover-elevate sm:min-h-[72px] ${active
                            ? "border-primary/60 bg-primary/[0.06] text-foreground"
                            : "border-card-border text-muted-foreground"
                            }`}
                          data-testid={`button-dialog-months-${m}`}
                        >
                          {discount > 0 && (
                            <span className="absolute -top-1.5 right-0.5 rounded-sm bg-emerald-500/90 px-1 py-px text-[8px] font-bold leading-none text-white">
                              -{Math.round(discount * 100)}%
                            </span>
                          )}
                          <span className="text-[11px] font-semibold leading-none">{m}M</span>
                          {original > 0 ? (
                            <>
                              {discount > 0 && (
                                <span className="mt-1 text-[9px] leading-none text-muted-foreground line-through tabular-nums">
                                  ₹{original.toLocaleString("en-IN")}
                                </span>
                              )}
                              <span className={`mt-0.5 text-[10px] font-bold leading-none tabular-nums ${active ? "text-primary" : "text-foreground"}`}>
                                ₹{discounted.toLocaleString("en-IN")}
                              </span>
                            </>
                          ) : (
                            <span className="mt-1 text-[10px] font-bold leading-none text-emerald-500">Free</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Final price */}
              <div className="mt-5 rounded-lg border border-card-border bg-muted/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Final Price</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {dialogIsTrial
                        ? `${indicator.trialDays || 15}-day trial · ${VERSION_LABELS[dialogVersion]}`
                        : `${VERSION_LABELS[dialogVersion]} · ${dialogMonths} ${dialogMonths === 1 ? "month" : "months"}`}
                    </p>
                  </div>
                  <div className="text-right">
                    {(() => {
                      const monthly = parseFloat(computeVersionPrice(dialogVersion, indicatorVersionPrice));
                      const original = monthly * dialogMonths;
                      const discount = getDurationDiscount(dialogMonths);
                      const total = dialogIsTrial
                        ? parseFloat(computeTrialPrice(dialogVersion))
                        : Math.round(original * (1 - discount));
                      const savings = !dialogIsTrial && discount > 0 ? original - total : 0;
                      return (
                        <>
                          {savings > 0 && (
                            <p className="text-[11px] leading-none text-muted-foreground line-through tabular-nums" data-testid="text-dialog-original">
                              ₹{Number(original).toLocaleString("en-IN")}
                            </p>
                          )}
                          <p className="mt-0.5 text-2xl font-bold tracking-tight" data-testid="text-dialog-total">
                            {total === 0 ? "Free" : `₹${Number(total).toLocaleString("en-IN")}`}
                          </p>
                          {savings > 0 && (
                            <p className="mt-0.5 text-[10px] font-semibold text-emerald-500 tabular-nums" data-testid="text-dialog-savings">
                              Save ₹{Number(savings).toLocaleString("en-IN")} ({Math.round(discount * 100)}% off)
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {!canAddVersion(dialogVersion) && (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5" data-testid="alert-dialog-mixed">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <p className="text-[11.5px] leading-snug text-amber-600 dark:text-amber-300">
                    This indicator is already in your cart. Remove it from cart first if you want to change the version.
                  </p>
                </div>
              )}

              {!isFree && (
                <div className="mt-5">
                  <Separator className="my-4" />

                  {(() => {
                    const trialPrice = parseFloat(computeTrialPrice(dialogVersion));
                    const trialDays = indicator.trialDays || 15;

                    return (
                      <button
                        type="button"
                        onClick={() => setDialogIsTrial(true)}
                        className="flex w-full flex-col gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-left transition-colors hover-elevate sm:flex-row sm:items-center sm:justify-between"
                        data-testid="banner-trial-offer-inline"
                      >
                        <div className="flex items-start gap-2">
                          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          <div>
                            <p className="text-xs font-semibold text-foreground">{trialDays} Days Trial</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Try {VERSION_LABELS[dialogVersion]} risk-free before you subscribe.
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 text-sm font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {trialPrice === 0 ? "Free" : `₹${Number(trialPrice).toLocaleString("en-IN")}`}
                        </span>
                      </button>
                    );
                  })()}
                </div>
              )}

            </div>
            <div className="sticky bottom-0 shrink-0 border-t border-card-border bg-background p-4">
              {inCart ? (
                <Link href="/cart" className="block w-full">
                  <Button className="h-11 w-full rounded-lg text-sm font-semibold sm:h-12 sm:text-base" size="lg" data-testid="button-dialog-go-cart">
                    <ShoppingCart className="mr-2 h-4 w-4" /> Go to Cart
                  </Button>
                </Link>
              ) : (
                <Button
                  className="h-11 w-full rounded-lg text-sm font-semibold sm:h-12 sm:text-base"
                  size="lg"
                  onClick={handleAddFromDialog}
                  disabled={!canAddVersion(dialogVersion)}
                  data-testid="button-dialog-add-cart"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {dialogIsTrial
                    ? `Start ${indicator.trialDays || 15}-Day Trial`
                    : parseFloat(computeVersionPrice(dialogVersion, indicatorVersionPrice)) === 0
                      ? "Get Free Access"
                      : `Add to Cart · ${VERSION_LABELS[dialogVersion]}`}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
