import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles, Target, ShieldCheck, TrendingUp, Users, Zap, BarChart3, Award } from "lucide-react";

const STATS = [
  { value: "10K+", label: "Active Traders" },
  { value: "50+", label: "Indicators Built" },
  { value: "24/7", label: "Support" },
  { value: "100%", label: "Non-Repainting" },
];

const VALUES = [
  {
    Icon: Target,
    title: "Precision First",
    body: "Every indicator is rigorously backtested across multiple markets and timeframes before it ever ships.",
  },
  {
    Icon: ShieldCheck,
    title: "No Repainting",
    body: "Our scripts plot signals only on confirmed candles — what you see in the past is exactly what you'd have seen live.",
  },
  {
    Icon: Zap,
    title: "Plug & Play",
    body: "Built natively for TradingView. Add your username, get invite-only access in hours, and start trading the same day.",
  },
  {
    Icon: Users,
    title: "Trader-Led",
    body: "Designed by full-time traders for traders. Every feature exists because we needed it on our own charts first.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> About Pine Signal Lab
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl" data-testid="text-about-title">
            Built by traders. For traders who care about edge.
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Pine Signal Lab is a curated marketplace of premium TradingView indicators and strategies, engineered for
            Indian and global markets. We obsess over signal quality, transparency and clean charting — so you can
            focus on execution, not noise.
          </p>
        </div>

        <Card className="mb-12 grid grid-cols-2 gap-4 border-card-border p-6 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center" data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, "-")}`}>
              <div className="text-2xl font-bold text-primary sm:text-3xl">{s.value}</div>
              <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </Card>

        <div className="mb-12 grid gap-6 lg:grid-cols-2">
          <Card className="border-card-border p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold">Our mission</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Make institutional-grade analytics accessible to every retail trader. We turn complex market structure,
              order flow and momentum logic into clean, actionable signals you can trust on your own setup.
            </p>
          </Card>
          <Card className="border-card-border p-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold">How we build</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Every indicator goes through three stages: research and prototyping, multi-market backtesting, and a
              private live-trading phase. Only the ones that hold up across regimes make it to Pine Signal Lab.
            </p>
          </Card>
        </div>

        <div className="mb-12">
          <h2 className="mb-6 text-2xl font-semibold">What we stand for</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {VALUES.map(({ Icon, title, body }) => (
              <Card key={title} className="flex items-start gap-4 border-card-border p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{title}</div>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Card className="flex flex-col items-start gap-4 border-card-border bg-primary/5 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Ready to upgrade your charts?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse our indicators and strategies — start with a free trial on any premium tool.
              </p>
            </div>
          </div>
          <Link href="/indicators">
            <Button size="lg" data-testid="button-about-cta">Explore Indicators</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
