import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/components/auth-provider";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LayoutDashboard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Timer,
  TrendingUp,
  Bookmark,
  Star,
  MessageCircle,
  User as UserIcon,
  ShoppingBag,
  Radio,
  Save,
  HelpCircle,
  Calendar,
  Download,
  Infinity as InfinityIcon,
  Hourglass,
  AlertTriangle,
  LifeBuoy,
  RefreshCcw,
  Receipt,
  CalendarDays,
  CalendarClock,
  IndianRupee,
} from "lucide-react";
import { motion } from "framer-motion";
import { z } from "zod";
import { updateUserProfileSchema, type Indicator } from "@shared/schema";

const SUPPORT_WHATSAPP_NUMBER = "918920167711";
const PENDING_SUPPORT_THRESHOLD_MS = 24 * 60 * 60 * 1000;

function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

const WATCHLIST_KEY = "pinesignallab.watchlist";
type DashView = "active" | "pending" | "orders" | "saved";
type DashSection = "account" | "myOrders" | "signals";
const getVersionLabel = (version?: string | null) => {
  if (version === "strategy") return "Strategy";
  if (version === "both") return "Indicator + Strategy";
  return "Indicator";
};

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

function DashboardStatCard({
  label,
  value,
  description,
  icon: Icon,
  tone,
  active,
  testId,
  onClick,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: typeof TrendingUp;
  tone: "emerald" | "amber" | "blue" | "violet";
  active: boolean;
  testId: string;
  onClick: () => void;
}) {
  const toneClasses = {
    emerald: {
      icon: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
      glow: "from-emerald-500/12",
      activeBorder: "border-emerald-500/50 ring-emerald-500/20",
    },
    amber: {
      icon: "bg-amber-500/10 text-amber-600 ring-amber-500/20",
      glow: "from-amber-500/12",
      activeBorder: "border-amber-500/50 ring-amber-500/20",
    },
    blue: {
      icon: "bg-blue-500/10 text-blue-600 ring-blue-500/20",
      glow: "from-blue-500/12",
      activeBorder: "border-blue-500/50 ring-blue-500/20",
    },
    violet: {
      icon: "bg-violet-500/10 text-violet-600 ring-violet-500/20",
      glow: "from-violet-500/12",
      activeBorder: "border-violet-500/50 ring-violet-500/20",
    },
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={testId}
      className={
        active
          ? `group relative overflow-hidden rounded-2xl border bg-card p-5 text-left shadow-sm ring-2 transition-all hover:-translate-y-0.5 hover:shadow-md ${toneClasses.activeBorder}`
          : "group relative overflow-hidden rounded-2xl border border-card-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
      }
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${toneClasses.glow} via-transparent to-transparent opacity-80`}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {value}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {description}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 transition-transform group-hover:scale-105 ${toneClasses.icon}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
}

interface DashboardOrderItem {
  id: number;
  orderId: number;
  indicatorId: number;
  duration: number;
  price: string;
  isTrial: boolean | null;
  version: string | null;
  indicatorName: string;
  indicatorSlug: string;
  indicatorCategory: string;
  daysRemaining: number | null;
  accessStatus: "pending" | "active" | "expired" | "rejected";
}

interface DashboardOrder {
  id: number;
  userId: number;
  status: string;
  totalAmount: string;
  rejectionReason: string | null;
  createdAt: string;
  approvedAt: string | null;
  items: DashboardOrderItem[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
  pending: { label: "Pending Approval", variant: "secondary", icon: Clock },
  approved: { label: "Approved", variant: "default", icon: CheckCircle2 },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
};

function getAccessBadge(status: string) {
  if (status === "active") return { label: "Active", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
  if (status === "expired") return { label: "Expired", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" };
  if (status === "rejected") return { label: "Rejected", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" };
  return { label: "Pending", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
}

const sectionNav: { key: DashSection; label: string; description: string; Icon: typeof UserIcon; testId: string }[] = [
  { key: "account", label: "My Account", description: "Profile & details", Icon: UserIcon, testId: "nav-account" },
  { key: "myOrders", label: "My Orders", description: "Subscriptions & history", Icon: ShoppingBag, testId: "nav-my-orders" },
  { key: "signals", label: "Live Signals", description: "Real-time alerts", Icon: Radio, testId: "nav-live-signals" },
];

const accountFormSchema = updateUserProfileSchema.extend({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  mobileNumber: z
    .string()
    .min(10, "Please enter a valid mobile number")
    .regex(/^[+]?[\d\s()-]+$/, "Invalid mobile number format"),
  tradingViewUsername: z.string().min(2, "TradingView username is required"),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export default function Dashboard() {
  const { user, isLoading: authLoading, openAuthModal, updateProfile } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: orders, isLoading } = useQuery<DashboardOrder[]>({
    queryKey: ["/api/dashboard"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
    refetchOnMount: "always",
  });

  const { data: allIndicators } = useQuery<Indicator[]>({
    queryKey: ["/api/indicators"],
    enabled: !!user,
  });

  const [section, setSection] = useState<DashSection>("myOrders");
  const [view, setView] = useState<DashView>("active");
  const [watchlistIds, setWatchlistIds] = useState<number[]>(() => readWatchlistIds());
  const [savingProfile, setSavingProfile] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const sync = () => setWatchlistIds(readWatchlistIds());
    window.addEventListener("storage", sync);
    window.addEventListener("watchlist-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("watchlist-updated", sync);
    };
  }, []);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, 30 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      mobileNumber: "",
      tradingViewUsername: "",
    },
  });

  useEffect(() => {
    if (user) {
      accountForm.reset({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        mobileNumber: user.mobileNumber ?? "",
        tradingViewUsername: user.tradingViewUsername ?? "",
      });
    }
  }, [user, accountForm]);

  if (authLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ShieldCheck className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="mt-6 text-2xl font-bold" data-testid="text-login-required">Sign in to view your dashboard</h2>
          <p className="mt-2 text-muted-foreground">
            Access your orders, indicator subscriptions, and account details.
          </p>
          <Button
            className="mt-6"
            size="lg"
            onClick={() => openAuthModal({ onSuccess: () => navigate("/dashboard") })}
            data-testid="button-dashboard-signin"
          >
            Sign In
          </Button>
        </motion.div>
      </div>
    );
  }

  const allItems = orders?.flatMap((o) => o.items.map((item) => ({ ...item, orderStatus: o.status, orderId: o.id, orderCreatedAt: o.createdAt, orderApprovedAt: o.approvedAt, orderRejectionReason: o.rejectionReason }))) || [];
  const activeIndicators = allItems.filter((i) => i.accessStatus === "active");
  const pendingItems = allItems.filter((i) => i.accessStatus === "pending" || i.accessStatus === "rejected");
  const totalOrders = orders?.length || 0;
  const totalSpent = orders?.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0) || 0;
  const savedIndicators = (allIndicators || []).filter((ind) => watchlistIds.includes(ind.id));

  const stats: {
    key: DashView;
    label: string;
    count: number;
    description: string;
    Icon: typeof TrendingUp;
    tone: "emerald" | "amber" | "blue" | "violet";
    testId: string;
  }[] = [
      {
        key: "active",
        label: "Active Indicators",
        count: activeIndicators.length,
        description: "Ready to use now",
        Icon: TrendingUp,
        tone: "emerald",
        testId: "stat-active-indicators",
      },
      {
        key: "pending",
        label: "Pending Requests",
        count: pendingItems.length,
        description: "Waiting for approval",
        Icon: Timer,
        tone: "amber",
        testId: "stat-pending-requests",
      },
      {
        key: "orders",
        label: "Total Orders",
        count: totalOrders,
        description: `Total spent ₹${totalSpent.toLocaleString("en-IN")}`,
        Icon: Package,
        tone: "blue",
        testId: "stat-total-orders",
      },
      {
        key: "saved",
        label: "Saved Indicators",
        count: savedIndicators.length,
        description: "Bookmarked tools",
        Icon: Bookmark,
        tone: "violet",
        testId: "stat-saved-indicators",
      },
    ];

  async function onSubmitProfile(values: AccountFormValues) {
    setSavingProfile(true);
    try {
      await updateProfile(values);
      accountForm.reset(values);
      toast({ title: "Profile updated", description: "Your account details have been saved." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not update your profile. Please try again.";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back, {user.firstName}. Track your indicator access, approvals, and subscriptions.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold" data-testid="text-orders-heading">
              My Orders
            </h2>
          </div>

          <div className="min-w-0">
            <section data-testid="section-my-orders">
              <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((s) => (
                  <DashboardStatCard
                    key={s.key}
                    label={s.label}
                    value={s.count}
                    description={s.description}
                    icon={s.Icon}
                    tone={s.tone}
                    active={view === s.key}
                    testId={s.testId}
                    onClick={() => setView(s.key)}
                  />
                ))}
              </div>

              {view === "active" && (
                <div className="mb-2">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <h2 className="text-lg font-semibold" data-testid="text-active-heading">Active Indicators</h2>
                    {activeIndicators.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {activeIndicators.length} live subscription{activeIndicators.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {activeIndicators.length === 0 ? (
                    <Card className="border-card-border p-8 text-center" data-testid="empty-active">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <TrendingUp className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="mt-4 text-base font-medium">No active indicators yet</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Once your order is approved, your indicators will appear here.</p>
                      <Link href="/indicators">
                        <Button className="mt-4" size="sm" data-testid="button-active-browse">
                          Browse Indicators <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {activeIndicators.map((item, idx) => {
                        const isLifetime = item.daysRemaining === null;
                        const totalDays = item.isTrial ? 15 : item.duration * 30;
                        const daysLeft = item.daysRemaining ?? 0;
                        const pct = totalDays > 0 ? Math.min(1, Math.max(0, daysLeft / totalDays)) : 0;
                        const radius = 34;
                        const circumference = 2 * Math.PI * radius;
                        const dashOffset = circumference * (1 - pct);
                        const startedDate = new Date(item.orderApprovedAt ?? item.orderCreatedAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        });

                        let ringStops: [string, string] = ["#10b981", "#06b6d4"];
                        let textColor = "text-emerald-600 dark:text-emerald-400";
                        let glow = "shadow-[0_0_24px_rgba(16,185,129,0.25)]";
                        let nameAccent = "text-foreground";
                        if (!isLifetime) {
                          if (pct <= 0.25) {
                            ringStops = ["#f43f5e", "#fb923c"];
                            textColor = "text-rose-600 dark:text-rose-400";
                            glow = "shadow-[0_0_24px_rgba(244,63,94,0.3)]";
                            nameAccent = "text-rose-600 dark:text-rose-400";
                          } else if (pct <= 0.5) {
                            ringStops = ["#f59e0b", "#f97316"];
                            textColor = "text-amber-600 dark:text-amber-400";
                            glow = "shadow-[0_0_24px_rgba(245,158,11,0.25)]";
                            nameAccent = "text-amber-700 dark:text-amber-400";
                          }
                        }
                        const gradientId = `dl-grad-${item.id}`;
                        const guideUrl = buildWhatsAppUrl(`Hi Pine Signal Lab team, please share the how-to-use guide PDF for "${item.indicatorName}".`);

                        return (
                          <Card
                            key={`active-${item.id}`}
                            className="overflow-hidden border-card-border p-0 transition-all hover-elevate"
                            data-testid={`active-indicator-${item.id}`}
                          >
                            <div className="grid items-center gap-4 p-4 sm:gap-6 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-bold text-muted-foreground">{idx + 1}.</span>
                                  <Link
                                    href={`/indicator/${item.indicatorSlug}`}
                                    className={`text-base font-semibold ${nameAccent} hover:underline truncate`}
                                    data-testid={`link-indicator-${item.id}`}
                                  >
                                    {item.indicatorName}
                                  </Link>
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] uppercase tracking-wide ${item.version === "strategy"
                                      ? "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                      : "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                      }`}
                                  >
                                    {getVersionLabel(item.version)}
                                  </Badge>
                                  <span className="font-medium text-foreground">
                                    {item.isTrial ? "15-Day Trial" : `${item.duration} Month Plan`}
                                  </span>
                                </div>
                                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  Started {startedDate}
                                </p>
                              </div>

                              <div className="flex justify-start lg:justify-center">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm">
                                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                                  Active
                                </span>
                              </div>

                              <div className="flex items-center justify-start lg:justify-center">
                                {isLifetime ? (
                                  <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-white shadow-[0_0_24px_rgba(16,185,129,0.3)]">
                                    <InfinityIcon className="h-7 w-7" />
                                    <span className="text-[10px] font-semibold">Lifetime</span>
                                  </div>
                                ) : (
                                  <div className={`relative flex h-24 w-24 items-center justify-center rounded-full ${glow}`}>
                                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
                                      <defs>
                                        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                                          <stop offset="0%" stopColor={ringStops[0]} />
                                          <stop offset="100%" stopColor={ringStops[1]} />
                                        </linearGradient>
                                      </defs>
                                      <circle
                                        cx="48"
                                        cy="48"
                                        r={radius}
                                        fill="none"
                                        className="stroke-muted/40"
                                        strokeWidth="6"
                                      />
                                      <circle
                                        cx="48"
                                        cy="48"
                                        r={radius}
                                        fill="none"
                                        stroke={`url(#${gradientId})`}
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={dashOffset}
                                      />
                                    </svg>
                                    <div className="z-10 flex flex-col items-center leading-none">
                                      <span
                                        className={`text-2xl font-extrabold ${textColor}`}
                                        data-testid={`days-remaining-${item.id}`}
                                      >
                                        {daysLeft}
                                      </span>
                                      <span className="mt-0.5 max-w-[68px] whitespace-nowrap text-center text-[9px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                                        days left
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex lg:justify-end">
                                <a
                                  href={guideUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex w-full lg:w-auto"
                                  data-testid={`button-download-guide-${item.id}`}
                                >
                                  <Button
                                    type="button"
                                    className="w-full gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700 lg:w-auto"
                                  >
                                    <Download className="h-4 w-4" />
                                    Download How-to Guide
                                  </Button>
                                </a>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {view === "pending" && (
                <div className="mb-2">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <h2 className="text-lg font-semibold" data-testid="text-pending-heading">Pending Requests</h2>
                    {pendingItems.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {pendingItems.length} request{pendingItems.length !== 1 ? "s" : ""} need your attention
                      </span>
                    )}
                  </div>
                  {pendingItems.length === 0 ? (
                    <Card className="border-card-border p-8 text-center" data-testid="empty-pending">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Timer className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="mt-4 text-base font-medium">No pending requests</h3>
                      <p className="mt-1 text-sm text-muted-foreground">All your access requests have been processed.</p>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {pendingItems.map((item, idx) => {
                        const isRejected = item.accessStatus === "rejected";
                        const createdAt = new Date(item.orderCreatedAt);
                        const createdMs = createdAt.getTime();
                        const hasValidDate = Number.isFinite(createdMs);
                        const ageMs = hasValidDate ? now - createdMs : 0;
                        const slaMs = PENDING_SUPPORT_THRESHOLD_MS;
                        const msLeft = Math.max(0, slaMs - ageMs);
                        const hoursLeft = Math.floor(msLeft / (60 * 60 * 1000));
                        const minutesLeft = Math.floor((msLeft % (60 * 60 * 1000)) / (60 * 1000));
                        const isOverdue = !isRejected && ageMs > slaMs;
                        const unlockBy = new Date(createdAt.getTime() + slaMs);
                        const unlockDateStr = unlockBy.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
                        const unlockTimeStr = unlockBy.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
                        const buyingDateStr = createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });

                        const supportMessage = isRejected
                          ? `Hi Pine Signal Lab team, my order #${item.orderId} for "${item.indicatorName}" was rejected${item.orderRejectionReason ? ` ("${item.orderRejectionReason}")` : ""}. Please help me resolve this.`
                          : `Hi Pine Signal Lab team, my order #${item.orderId} for "${item.indicatorName}" is still under process. Could you please prioritize the approval?`;
                        const supportUrl = buildWhatsAppUrl(supportMessage);

                        const rejectionText = item.orderRejectionReason
                          ? `We regret to inform you that your request has been rejected. ${item.orderRejectionReason} Please connect with Quick Support at the earliest to resolve this issue.`
                          : "We regret to inform you that your request has been rejected. Please connect with Quick Support at the earliest to resolve this issue.";
                        const processingText = isOverdue
                          ? "Your request is taking longer than usual. Our team has been notified — please tap Quick Support so we can prioritize and grant access immediately."
                          : "Your request is currently under process. You will receive access to your purchase within 24 hours from the time of purchase. The validity of the indicator will begin from the time access is granted.";

                        return (
                          <Card
                            key={`pending-${item.id}`}
                            className={`overflow-hidden border-card-border p-0 transition-all hover-elevate ${isRejected
                              ? "border-l-4 border-l-rose-500"
                              : isOverdue
                                ? "border-l-4 border-l-amber-500"
                                : "border-l-4 border-l-cyan-500"
                              }`}
                            data-testid={`pending-item-${item.id}`}
                          >
                            <div className="grid items-stretch gap-4 p-4 sm:gap-5 sm:p-5 lg:grid-cols-[minmax(0,1.1fr)_auto_minmax(0,1.4fr)_auto]">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-bold text-muted-foreground">{idx + 1}.</span>
                                  <Link
                                    href={`/indicator/${item.indicatorSlug}`}
                                    className={`text-base font-semibold hover:underline truncate ${isRejected
                                      ? "text-rose-600 dark:text-rose-400"
                                      : isOverdue
                                        ? "text-amber-700 dark:text-amber-400"
                                        : "text-cyan-700 dark:text-cyan-300"
                                      }`}
                                    data-testid={`link-pending-${item.id}`}
                                  >
                                    {item.indicatorName}
                                  </Link>
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] uppercase tracking-wide ${item.version === "strategy"
                                      ? "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                      : "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                      }`}
                                  >
                                    {getVersionLabel(item.version)}
                                  </Badge>
                                  <span className="font-medium text-foreground">
                                    {item.isTrial ? "15-Day Trial" : `${item.duration} Month Plan`}
                                  </span>
                                </div>
                                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground" data-testid={`text-buying-date-${item.id}`}>
                                  <Calendar className="h-3 w-3" />
                                  Buying date: {buyingDateStr}
                                </p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  Order #{item.orderId}
                                </p>
                              </div>

                              <div className="flex flex-col items-start gap-1.5 lg:items-center lg:justify-center">
                                {isRejected ? (
                                  <>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm" data-testid={`pill-status-${item.id}`}>
                                      <AlertTriangle className="h-3.5 w-3.5" />
                                      Rejected
                                    </span>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                      Rejected on {buyingDateStr}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm" data-testid={`pill-status-${item.id}`}>
                                      <Hourglass className="h-3.5 w-3.5 animate-pulse" />
                                      Under Process
                                    </span>
                                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${isOverdue ? "text-amber-600 dark:text-amber-400" : "text-cyan-700 dark:text-cyan-400"}`}>
                                      {isOverdue
                                        ? "Action needed"
                                        : hoursLeft >= 1
                                          ? `Within ${hoursLeft} hour${hoursLeft !== 1 ? "s" : ""}`
                                          : `Within ${Math.max(1, minutesLeft)} min`}
                                    </span>
                                  </>
                                )}
                              </div>

                              <div className={`rounded-lg border p-3 text-sm leading-relaxed ${isRejected
                                ? "border-rose-500/20 bg-rose-500/5 text-foreground"
                                : isOverdue
                                  ? "border-amber-500/20 bg-amber-500/5 text-foreground"
                                  : "border-cyan-500/20 bg-cyan-500/5 text-foreground"
                                }`}>
                                <p data-testid={`text-status-message-${item.id}`}>
                                  {isRejected ? rejectionText : processingText}
                                </p>
                              </div>

                              <div className="flex flex-col items-stretch justify-between gap-2 rounded-lg border border-card-border bg-muted/30 p-3 text-center lg:min-w-[180px]">
                                {isRejected || isOverdue ? (
                                  <>
                                    <div className="space-y-0.5">
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        {isRejected ? "Need Help?" : "Quick Support"}
                                      </p>
                                      <p className="text-xs text-muted-foreground leading-snug">
                                        Our team will resolve this in minutes.
                                      </p>
                                    </div>
                                    <a
                                      href={supportUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      data-testid={`button-pending-support-${item.id}`}
                                    >
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="w-full gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
                                      >
                                        <LifeBuoy className="h-3.5 w-3.5" />
                                        Connect Quick Support
                                      </Button>
                                    </a>
                                  </>
                                ) : (
                                  <>
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Unlock In
                                      </p>
                                      <p className="mt-0.5 text-xl font-extrabold leading-none text-cyan-700 dark:text-cyan-400" data-testid={`text-unlock-countdown-${item.id}`}>
                                        {hoursLeft}h {minutesLeft}m
                                      </p>
                                    </div>
                                    <div className="space-y-0.5 border-t border-card-border pt-1.5">
                                      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Estimated Unlock
                                      </p>
                                      <p className="text-[11px] font-medium text-foreground leading-tight" data-testid={`text-unlock-time-${item.id}`}>
                                        {unlockDateStr}
                                        <br />
                                        {unlockTimeStr}
                                      </p>
                                    </div>
                                    <a
                                      href={supportUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] font-medium text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400"
                                      data-testid={`link-pending-support-${item.id}`}
                                    >
                                      Need help?
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {view === "saved" && (
                <div className="mb-2">
                  <h2 className="text-lg font-semibold mb-4" data-testid="text-saved-heading">Saved Indicators</h2>
                  {savedIndicators.length === 0 ? (
                    <Card className="border-card-border p-8 text-center" data-testid="empty-saved">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Bookmark className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="mt-4 text-base font-medium">No saved indicators yet</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Tap the bookmark on any indicator card to save it for later.
                      </p>
                      <Link href="/indicators">
                        <Button className="mt-4" size="sm" data-testid="button-saved-browse">
                          Browse Indicators <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </Card>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {savedIndicators.map((ind) => (
                        <Card key={`saved-${ind.id}`} className="border-card-border p-4" data-testid={`saved-indicator-${ind.id}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <Link href={`/indicator/${ind.slug}`} className="font-medium hover:underline truncate" data-testid={`link-saved-${ind.id}`}>
                                  {ind.name}
                                </Link>
                                <Badge variant="outline" className={`shrink-0 text-[10px] capitalize ${ind.tier === "free" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"}`}>
                                  {ind.tier}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{ind.description}</p>
                              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {ind.rating}
                                </span>
                                <span>·</span>
                                <span>{ind.category}</span>
                              </div>
                            </div>
                            <Link href={`/indicator/${ind.slug}`}>
                              <Button variant="outline" size="sm" data-testid={`button-saved-view-${ind.id}`}>
                                View <ArrowRight className="ml-1 h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {view === "orders" && (
                <div>
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <h2 className="text-lg font-semibold" data-testid="text-orders-heading">Order History</h2>
                    {orders && orders.length > 0 && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Receipt className="h-3.5 w-3.5" />
                        {orders.length} order{orders.length !== 1 ? "s" : ""} · ₹{totalSpent.toLocaleString("en-IN", { maximumFractionDigits: 0 })} lifetime spend
                      </span>
                    )}
                  </div>

                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-32" />
                      <Skeleton className="h-32" />
                    </div>
                  ) : !orders || orders.length === 0 ? (
                    <Card className="border-card-border p-8 text-center" data-testid="empty-orders">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="mt-4 text-base font-medium">No orders yet</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Browse our indicators and place your first order.
                      </p>
                      <Link href="/indicators">
                        <Button className="mt-4" size="sm" data-testid="button-browse-indicators">
                          Browse Indicators <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order, orderIdx) => {
                        const config = statusConfig[order.status] || statusConfig.pending;
                        const StatusIcon = config.icon;
                        const orderCreated = new Date(order.createdAt);
                        const orderDateStr = orderCreated.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
                        const orderTimeStr = orderCreated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
                        const isStalePending = order.status === "pending" && now - orderCreated.getTime() > PENDING_SUPPORT_THRESHOLD_MS;

                        let headerAccent = "from-muted/40 to-muted/20";
                        let headerBorder = "border-l-card-border";
                        if (order.status === "approved") {
                          headerAccent = "from-emerald-500/10 to-cyan-500/5";
                          headerBorder = "border-l-emerald-500";
                        } else if (order.status === "rejected") {
                          headerAccent = "from-rose-500/10 to-orange-500/5";
                          headerBorder = "border-l-rose-500";
                        } else if (order.status === "pending") {
                          headerAccent = isStalePending ? "from-amber-500/10 to-orange-500/5" : "from-cyan-500/10 to-blue-500/5";
                          headerBorder = isStalePending ? "border-l-amber-500" : "border-l-cyan-500";
                        }

                        return (
                          <Card
                            key={order.id}
                            className={`overflow-hidden border-card-border border-l-4 ${headerBorder}`}
                            data-testid={`order-${order.id}`}
                          >
                            <div className={`flex flex-wrap items-center justify-between gap-3 border-b bg-gradient-to-r ${headerAccent} px-5 py-3`}>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                  <Receipt className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-bold" data-testid={`order-id-${order.id}`}>
                                    Order #{order.id}
                                  </span>
                                </div>
                                <Badge variant={config.variant} className="text-xs" data-testid={`order-status-${order.id}`}>
                                  <StatusIcon className="mr-1 h-3 w-3" />
                                  {config.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1 text-muted-foreground" data-testid={`order-date-${order.id}`}>
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  {orderDateStr} · {orderTimeStr}
                                </span>
                                <span className="flex items-center font-bold text-foreground" data-testid={`order-total-${order.id}`}>
                                  <IndianRupee className="h-3.5 w-3.5" />
                                  {parseFloat(order.totalAmount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                </span>
                              </div>
                            </div>

                            {order.status === "rejected" && (
                              <div className="border-b border-rose-500/20 bg-rose-500/5 px-5 py-3" data-testid={`rejection-reason-${order.id}`}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="flex items-start gap-2 min-w-0">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                                        {order.rejectionReason ? "Reason for rejection" : "Order rejected"}
                                      </p>
                                      {order.rejectionReason && (
                                        <p className="mt-0.5 text-sm text-foreground">{order.rejectionReason}</p>
                                      )}
                                    </div>
                                  </div>
                                  <a
                                    href={buildWhatsAppUrl(`Hi Pine Signal Lab team, my order #${order.id} was rejected. Could you help me understand why and how to proceed?`)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-testid={`button-rejected-support-${order.id}`}
                                  >
                                    <Button size="sm" className="h-7 gap-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700">
                                      <LifeBuoy className="h-3.5 w-3.5" /> Quick Support
                                    </Button>
                                  </a>
                                </div>
                              </div>
                            )}

                            {isStalePending && (
                              <div className="border-b border-amber-500/20 bg-amber-500/5 px-5 py-3" data-testid={`pending-stale-${order.id}`}>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex items-start gap-2">
                                    <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                    <p className="text-xs text-amber-700 dark:text-amber-300">
                                      Pending for over 24 hours. Reach out and we'll prioritize it.
                                    </p>
                                  </div>
                                  <a
                                    href={buildWhatsAppUrl(`Hi Pine Signal Lab team, my order #${order.id} has been pending for over 24 hours. Please help.`)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-testid={`button-order-pending-support-${order.id}`}
                                  >
                                    <Button size="sm" className="h-7 gap-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700">
                                      <LifeBuoy className="h-3.5 w-3.5" /> Quick Support
                                    </Button>
                                  </a>
                                </div>
                              </div>
                            )}

                            <div className="divide-y">
                              {order.items.map((item, itemIdx) => {
                                const isLifetime = item.daysRemaining === null && item.accessStatus === "active";
                                const startDate = order.approvedAt ? new Date(order.approvedAt) : null;
                                const startDateStr = startDate
                                  ? startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
                                  : "—";
                                const planLabel = item.isTrial ? "15-Day Trial" : `${item.duration} Month Plan`;
                                const itemPrice = parseFloat(item.price) || 0;
                                const itemNumber = orderIdx === 0 && itemIdx === 0
                                  ? itemIdx + 1
                                  : orders.slice(0, orderIdx).reduce((acc, o) => acc + o.items.length, 0) + itemIdx + 1;

                                let nameColor = "text-foreground";
                                if (item.accessStatus === "active") nameColor = "text-emerald-700 dark:text-emerald-400";
                                else if (item.accessStatus === "rejected") nameColor = "text-rose-600 dark:text-rose-400";
                                else if (item.accessStatus === "expired") nameColor = "text-muted-foreground";
                                else if (item.accessStatus === "pending") nameColor = "text-cyan-700 dark:text-cyan-400";

                                return (
                                  <div
                                    key={item.id}
                                    className="grid items-center gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                                    data-testid={`order-item-${item.id}`}
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-bold text-muted-foreground">{itemNumber}.</span>
                                        <Link
                                          href={`/indicator/${item.indicatorSlug}`}
                                          className={`text-sm font-semibold hover:underline truncate ${nameColor}`}
                                          data-testid={`link-order-item-${item.id}`}
                                        >
                                          {item.indicatorName}
                                        </Link>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={`mt-1 text-[10px] uppercase tracking-wide ${item.version === "strategy"
                                          ? "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                          : "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                          }`}
                                      >
                                        {getVersionLabel(item.version)}
                                      </Badge>
                                    </div>

                                    <div className="space-y-0.5">
                                      <p className="text-sm font-semibold text-foreground" data-testid={`text-plan-${item.id}`}>
                                        {planLabel}
                                      </p>
                                      <p className="flex items-center text-xs text-muted-foreground" data-testid={`text-paid-${item.id}`}>
                                        Paid <IndianRupee className="ml-1 h-3 w-3" />
                                        {itemPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                      </p>
                                    </div>

                                    <div className="space-y-0.5 text-xs">
                                      <p className="flex items-center gap-1 text-muted-foreground">
                                        <CalendarDays className="h-3 w-3" />
                                        <span className="font-medium text-foreground">Buying:</span>
                                        <span data-testid={`text-buying-${item.id}`}>{orderDateStr}</span>
                                      </p>
                                      <p className="flex items-center gap-1 text-muted-foreground">
                                        <CalendarClock className="h-3 w-3" />
                                        <span className="font-medium text-foreground">Start:</span>
                                        <span data-testid={`text-start-${item.id}`}>{startDateStr}</span>
                                      </p>
                                    </div>

                                    <div className="flex flex-col items-start gap-1">
                                      {item.accessStatus === "active" ? (
                                        isLifetime ? (
                                          <>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                                              <InfinityIcon className="h-3 w-3" /> Lifetime
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">Never expires</span>
                                          </>
                                        ) : (
                                          <>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                                              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Active
                                            </span>
                                            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400" data-testid={`text-days-left-${item.id}`}>
                                              {item.daysRemaining} day{item.daysRemaining !== 1 ? "s" : ""} left
                                            </span>
                                          </>
                                        )
                                      ) : item.accessStatus === "expired" ? (
                                        <>
                                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                            <XCircle className="h-3 w-3" /> Expired
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">Renew to continue</span>
                                        </>
                                      ) : item.accessStatus === "rejected" ? (
                                        <>
                                          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                                            <AlertTriangle className="h-3 w-3" /> Rejected
                                          </span>
                                          <span className="text-[10px] text-rose-600 dark:text-rose-400">Action needed</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                                            <Hourglass className="h-3 w-3" /> Under Process
                                          </span>
                                          <span className="text-[10px] text-cyan-700 dark:text-cyan-400">Within 24 hours</span>
                                        </>
                                      )}
                                    </div>

                                    <div className="flex justify-start lg:justify-end">
                                      {item.accessStatus === "expired" ? (
                                        <Link href={`/indicator/${item.indicatorSlug}`} data-testid={`button-renew-${item.id}`}>
                                          <Button size="sm" className="gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700">
                                            <RefreshCcw className="h-3.5 w-3.5" /> Renew
                                          </Button>
                                        </Link>
                                      ) : item.accessStatus === "active" ? (
                                        <Link href={`/indicator/${item.indicatorSlug}`} data-testid={`button-view-${item.id}`}>
                                          <Button size="sm" variant="outline" className="gap-1.5">
                                            View <ArrowRight className="h-3.5 w-3.5" />
                                          </Button>
                                        </Link>
                                      ) : (
                                        <Link href={`/indicator/${item.indicatorSlug}`} data-testid={`button-details-${item.id}`}>
                                          <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground">
                                            Details <ArrowRight className="h-3.5 w-3.5" />
                                          </Button>
                                        </Link>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
