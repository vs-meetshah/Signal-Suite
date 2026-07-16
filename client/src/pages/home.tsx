import { ArrowRight, Shield, Zap, BarChart3, ChevronRight, Activity, Droplets, Target, BellRing, Check, Clock, Sparkles, Rocket, TrendingUp, Send, Star, Quote, ShieldCheck, Crosshair, Layers, MousePointer2, Feather } from "lucide-react";
import { SiFacebook, SiX, SiYoutube, SiWhatsapp, SiTelegram, SiInstagram } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { motion, useInView, animate } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Indicator } from "@shared/schema";
import { lazy, ReactNode, Suspense, useEffect, useRef, useState } from "react";
import supportWomanImg from "@assets/generated_images/footer_support_woman.png";
const IndicatorMarquee = lazy(() => import("@/pages/home-indicator-marquee"));

const ProvenPerformance = lazy(() => import("@/pages/home-proven-performance"));

const socialLinks = [
  { name: "Facebook", href: "https://facebook.com", icon: SiFacebook, bg: "bg-[#1877F2]" },
  { name: "Twitter", href: "https://x.com", icon: SiX, bg: "bg-black" },
  { name: "YouTube", href: "https://youtube.com", icon: SiYoutube, bg: "bg-[#FF0000]" },
  { name: "WhatsApp", href: "https://wa.me/918920167711", icon: SiWhatsapp, bg: "bg-[#25D366]" },
  { name: "Telegram", href: "https://t.me/pinesignallab", icon: SiTelegram, bg: "bg-[#229ED9]" },
  { name: "Instagram", href: "https://instagram.com", icon: SiInstagram, bg: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]" },
];

const keyFeatures = [
  {
    icon: Crosshair,
    title: "Non-Repainting",
    description: "100% non-repainting signals you can trust on closed candles.",
    iconClass: "text-sky-300",
    ringClass: "ring-sky-400/30",
    glowClass: "from-sky-500/20 to-sky-500/0",
  },
  {
    icon: Target,
    title: "High Accuracy",
    description: "Backtested across 5+ years of multi-asset, multi-regime data.",
    iconClass: "text-emerald-300",
    ringClass: "ring-emerald-400/30",
    glowClass: "from-emerald-500/20 to-emerald-500/0",
  },
  {
    icon: Layers,
    title: "Multi-Timeframe",
    description: "Works seamlessly on every timeframe from 1m scalps to weekly swings.",
    iconClass: "text-zinc-200",
    ringClass: "ring-zinc-400/25",
    glowClass: "from-zinc-400/15 to-zinc-400/0",
  },
  {
    icon: BellRing,
    title: "Real-Time Alerts",
    description: "Get notified on every high-probability setup the moment it triggers.",
    iconClass: "text-pink-300",
    ringClass: "ring-pink-400/30",
    glowClass: "from-pink-500/20 to-pink-500/0",
  },
  {
    icon: MousePointer2,
    title: "Easy to Use",
    description: "Plug and play directly on TradingView in under two minutes.",
    iconClass: "text-blue-300",
    ringClass: "ring-blue-400/30",
    glowClass: "from-blue-500/20 to-blue-500/0",
  },
  {
    icon: Feather,
    title: "Lightweight",
    description: "Optimized code keeps your charts fast with zero lag or stutter.",
    iconClass: "text-indigo-300",
    ringClass: "ring-indigo-400/30",
    glowClass: "from-indigo-500/20 to-indigo-500/0",
  },
];

function LazyHomeSection({
  children,
  minHeight = 480,
}: {
  children: ReactNode;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, {
    once: true,
    margin: "600px 0px",
  });

  return (
    <div ref={ref} style={!inView ? { minHeight } : undefined}>
      {inView ? children : null}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="max-w-3xl">
            <Badge
              variant="secondary"
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
              data-testid="badge-hero"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Premium TradingView Indicators
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" data-testid="text-hero-title">
              Elevate Your
              <span className="text-primary"> Trading Edge</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed" data-testid="text-hero-subtitle">
              Access institutional-grade TradingView indicators designed by professional traders.
              Backtested, optimized, and ready to deploy on your charts.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/indicators">
                <Button size="lg" data-testid="button-explore">
                  Explore Indicators <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" size="lg" data-testid="button-learn-more">
                  Learn More
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <LazyHomeSection minHeight={520}>
        <KeyFeatures />
      </LazyHomeSection>

      <LazyHomeSection minHeight={720}>
        <SystemFramework />
      </LazyHomeSection>

      <LazyHomeSection minHeight={620}>
        <Suspense fallback={<div className="min-h-[620px]" />}>
          <IndicatorMarquee />
        </Suspense>
      </LazyHomeSection>

      <LazyHomeSection minHeight={620}>
        <Suspense fallback={<div className="min-h-[620px]" />}>
          <ProvenPerformance />
        </Suspense>
      </LazyHomeSection>

      <LazyHomeSection minHeight={560}>
        <Testimonials />
      </LazyHomeSection>

      <LazyHomeSection minHeight={720}>
        <PricingPlans />
      </LazyHomeSection>

      <section className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-lg border bg-card p-8 sm:p-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" data-testid="text-cta-title">
              Ready to Transform Your Trading?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Start with a free trial on any indicator. No credit card required.
              See the results on your own charts before committing.
            </p>
            <div className="mt-8">
              <Link href="/indicators">
                <Button size="lg" data-testid="button-get-started">
                  Get Started <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-black border-t border-white/5" data-testid="section-connect">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="absolute -top-32 right-1/3 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 shadow-2xl"
          >
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-1/2 opacity-25"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1.2px)",
                backgroundSize: "14px 14px",
                maskImage:
                  "linear-gradient(to right, black 30%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to right, black 30%, transparent 100%)",
              }}
            />
            <div className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />

            <div className="relative grid grid-cols-1 items-end gap-6 md:grid-cols-2 md:items-center md:gap-0">
              <div className="relative flex items-end justify-center md:justify-start md:pl-6 lg:pl-12">
                <img
                  src={supportWomanImg}
                  alt="Pine Signal Lab community support representative"
                  loading="lazy"
                  decoding="async"
                  width={448}
                  height={448}
                  className="h-72 w-auto object-contain object-bottom drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)] sm:h-80 md:h-96 lg:h-[28rem]"
                  data-testid="img-connect-support"
                />
              </div>

              <div className="relative px-6 pb-10 pt-2 md:px-10 md:py-12 lg:pr-16">
                <h2
                  className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
                  data-testid="text-connect-title"
                >
                  Or connect with us on<span className="text-primary">/.</span>
                </h2>
                <p
                  className="mt-3 max-w-md text-base text-zinc-400"
                  data-testid="text-connect-subtitle"
                >
                  Join thousands of traders in the Pine Signal Lab community. Get started today!
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3" data-testid="list-social">
                  {socialLinks.map((s) => (
                    <a
                      key={s.name}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.name}
                      title={s.name}
                      className={`group inline-flex h-11 w-11 items-center justify-center rounded-md ${s.bg} text-white shadow-lg shadow-black/30 transition-transform hover:scale-110 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900`}
                      data-testid={`link-social-${s.name.toLowerCase()}`}
                    >
                      <s.icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}



const frameworkSteps = [
  {
    icon: Activity,
    title: "Market Structure",
    description: "Identify trend and key structure in market",
    accent: "from-sky-500/30 to-blue-600/10",
    ring: "ring-sky-400/40",
    iconColor: "text-sky-300",
    glow: "shadow-[0_0_40px_-10px_rgba(56,189,248,0.55)]",
    topLineColor: "rgba(56,189,248,0.65)",
  },
  {
    icon: Droplets,
    title: "Liquidity Sweep",
    description: "Detect liquidity grab and stop hunts",
    accent: "from-violet-500/30 to-fuchsia-600/10",
    ring: "ring-violet-400/40",
    iconColor: "text-violet-300",
    glow: "shadow-[0_0_40px_-10px_rgba(167,139,250,0.55)]",
    topLineColor: "rgba(167,139,250,0.65)",
  },
  {
    icon: Target,
    title: "Confirmation",
    description: "Multi-factor confirmation for high probability",
    accent: "from-amber-500/30 to-orange-600/10",
    ring: "ring-amber-400/40",
    iconColor: "text-amber-300",
    glow: "shadow-[0_0_40px_-10px_rgba(251,191,36,0.55)]",
    topLineColor: "rgba(251,191,36,0.65)",
  },
  {
    icon: BellRing,
    title: "Signal Generated",
    description: "High probability signal with entry, SL, targets",
    accent: "from-emerald-500/30 to-green-600/10",
    ring: "ring-emerald-400/40",
    iconColor: "text-emerald-300",
    glow: "shadow-[0_0_40px_-10px_rgba(52,211,153,0.55)]",
    topLineColor: "rgba(52,211,153,0.65)",
  },
];

function SystemFramework() {
  return (
    <section
      className="relative overflow-hidden border-t border-white/5 bg-gradient-to-b from-black via-zinc-950 to-zinc-950 py-20 sm:py-24"
      data-testid="section-framework"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <Badge variant="secondary" className="mb-3 border-primary/20 bg-primary/10 text-primary" data-testid="badge-framework">
            How It Works
          </Badge>
          <h2
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
            data-testid="text-framework-title"
          >
            Our System Framework
          </h2>
          <p className="mt-3 text-base text-zinc-400">
            A disciplined four-stage process behind every Pine Signal Lab signal — from raw market structure to a high-probability trade plan.
          </p>
        </motion.div>

        <div className="relative mt-14">
          <motion.div
            aria-hidden
            initial={{ scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.1, ease: "easeOut", delay: 0.1 }}
            className="pointer-events-none absolute left-6 right-6 top-9 hidden h-px origin-left bg-gradient-to-r from-sky-400/0 via-white/30 to-emerald-400/0 lg:block"
          />

          <ol className="relative grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {frameworkSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.li
                  key={step.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, delay: 0.15 + i * 0.12, ease: "easeOut" }}
                  className="relative"
                  data-testid={`framework-step-${i}`}
                >
                  <div className="group relative h-full rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.05]">
                    <div
                      className="absolute inset-x-6 -top-px h-px opacity-70"
                      style={{
                        backgroundImage: `linear-gradient(to right, transparent, ${step.topLineColor}, transparent)`,
                      }}
                    />

                    <div className="mb-5 flex items-center gap-3">
                      <div className={`relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${step.accent} ring-1 ${step.ring} ${step.glow} transition-transform duration-300 group-hover:scale-105`}>
                        <Icon className={`h-6 w-6 ${step.iconColor}`} strokeWidth={2.2} />
                        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-zinc-900 text-[10px] font-semibold text-zinc-300">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-white" data-testid={`text-framework-step-title-${i}`}>
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400" data-testid={`text-framework-step-desc-${i}`}>
                      {step.description}
                    </p>

                    <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{
                      background:
                        "radial-gradient(60% 60% at 50% 0%, rgba(255,255,255,0.06), transparent 60%)",
                    }} />
                  </div>

                  {i < frameworkSteps.length - 1 && (
                    <div
                      aria-hidden
                      className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 translate-x-1/2 lg:flex"
                    >
                      <motion.div
                        initial={{ opacity: 0, x: -6 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.5, delay: 0.4 + i * 0.12 }}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-zinc-900/80 text-zinc-300 backdrop-blur"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </motion.div>
                    </div>
                  )}

                  {i < frameworkSteps.length - 1 && (
                    <div aria-hidden className="flex justify-center pt-4 sm:hidden">
                      <ArrowRight className="h-5 w-5 rotate-90 text-zinc-500" />
                    </div>
                  )}
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

const pricingPlans = [
  {
    name: "Starter",
    price: 999,
    description: "Get started with a single premium tool.",
    features: [
      { icon: Check, label: "1 Premium Indicator" },
      { icon: Check, label: "Access to Live Signals" },
      { icon: Check, label: "Basic Support" },
      { icon: Clock, label: "Cancel Anytime" },
    ],
    popular: false,
    cta: "Start Now",
  },
  {
    name: "Pro",
    price: 2499,
    description: "Everything serious traders need, day in and day out.",
    features: [
      { icon: Check, label: "All Premium Indicators" },
      { icon: Check, label: "Real-time Signals" },
      { icon: Check, label: "Priority Support" },
      { icon: Check, label: "Cancel Anytime" },
    ],
    popular: true,
    cta: "Start Now",
  },
  {
    name: "Elite",
    price: 4999,
    description: "White-glove access for funded and full-time traders.",
    features: [
      { icon: Check, label: "All Pro Features" },
      { icon: Check, label: "Private Telegram Channel" },
      { icon: Check, label: "Advanced Analytics" },
      { icon: Check, label: "1-on-1 Support" },
    ],
    popular: false,
    cta: "Start Now",
  },
];

function PricingPlans() {
  return (
    <section
      className="relative overflow-hidden border-t border-white/5 bg-gradient-to-b from-zinc-950 via-zinc-950 to-black py-20 sm:py-24"
      data-testid="section-pricing"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 25%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 25%, transparent 75%)",
        }}
      />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-[44rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <Badge variant="secondary" className="mb-3 border-primary/20 bg-primary/10 text-primary" data-testid="badge-pricing">
            Pricing
          </Badge>
          <h2
            className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
            data-testid="text-pricing-title"
          >
            Choose Your Plan
          </h2>
          <p className="mt-3 text-base text-zinc-400">
            Simple, transparent pricing. Upgrade, downgrade, or cancel any time — no questions asked.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 items-stretch gap-6 md:grid-cols-3 md:gap-5 lg:gap-6">
          {pricingPlans.map((plan, i) => {
            const isPopular = plan.popular;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: 0.12 + i * 0.12, ease: "easeOut" }}
                className={`relative ${isPopular ? "md:-my-3 md:scale-[1.03]" : ""}`}
                data-testid={`pricing-card-${plan.name.toLowerCase()}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2">
                    <div className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-zinc-950 px-3 py-1 text-xs font-semibold text-primary shadow-[0_0_24px_-4px_hsl(var(--primary)/0.55)]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Most Popular
                    </div>
                  </div>
                )}

                <div
                  className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border p-7 transition-all duration-300 ${isPopular
                    ? "border-primary/50 bg-gradient-to-b from-primary/[0.08] via-zinc-900 to-zinc-950 shadow-[0_0_60px_-15px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_80px_-15px_hsl(var(--primary)/0.65)]"
                    : "border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.05]"
                    }`}
                >
                  <div
                    className={`pointer-events-none absolute inset-x-7 -top-px h-px ${isPopular
                      ? "bg-gradient-to-r from-transparent via-primary to-transparent opacity-80"
                      : "bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50"
                      }`}
                  />

                  <div className="mb-5">
                    <h3
                      className={`text-xl font-semibold ${isPopular ? "text-primary" : "text-white"}`}
                      data-testid={`text-plan-name-${plan.name.toLowerCase()}`}
                    >
                      {plan.name}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-400">{plan.description}</p>
                  </div>

                  <div className="mb-6 flex items-baseline gap-1">
                    <span
                      className="text-5xl font-bold tracking-tight text-white"
                      data-testid={`text-plan-price-${plan.name.toLowerCase()}`}
                    >
                      <span className="text-3xl align-top mr-0.5 text-zinc-300">₹</span>
                      {plan.price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-sm font-medium text-zinc-400">/month</span>
                  </div>

                  <ul className="mb-8 space-y-3">
                    {plan.features.map((f, fi) => {
                      const FIcon = f.icon;
                      return (
                        <li
                          key={f.label}
                          className="flex items-start gap-3 text-sm text-zinc-200"
                          data-testid={`feature-${plan.name.toLowerCase()}-${fi}`}
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isPopular
                              ? "bg-primary/15 text-primary"
                              : "bg-white/5 text-zinc-300"
                              }`}
                          >
                            <FIcon className="h-3.5 w-3.5" strokeWidth={2.6} />
                          </span>
                          <span>{f.label}</span>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-auto">
                    <Button
                      asChild
                      size="lg"
                      className={`w-full ${isPopular
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30"
                        : "bg-white/5 text-white hover:bg-white/10 border border-white/15"
                        }`}
                      data-testid={`button-plan-${plan.name.toLowerCase()}`}
                    >
                      <Link href="/indicators" aria-label={`${plan.cta} with the ${plan.name} plan`}>
                        {plan.cta}
                      </Link>
                    </Button>
                  </div>

                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background:
                        "radial-gradient(60% 50% at 50% 0%, rgba(255,255,255,0.06), transparent 60%)",
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-zinc-500">
          All prices in INR. Taxes may apply. Cancel anytime from your account.
        </p>
      </div>
    </section>
  );
}

const footerColumns = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Contact", href: "/support" },
      { label: "Careers", href: "/about#careers" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/support" },
      { label: "Blog", href: "/about#blog" },
      { label: "Help Center", href: "/support" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/support#privacy" },
      { label: "Terms of Service", href: "/support#terms" },
      { label: "Refund Policy", href: "/support#refund" },
    ],
  },
];

const footerSocials = [
  { name: "Twitter", href: "https://x.com", icon: SiX },
  { name: "YouTube", href: "https://youtube.com", icon: SiYoutube },
  { name: "Telegram", href: "https://t.me/pinesignallab", icon: SiTelegram },
  { name: "Instagram", href: "https://instagram.com", icon: SiInstagram },
];

function SiteFooter() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    toast({
      title: "You're on the list",
      description: "We'll send the next Pine Signal Lab update straight to your inbox.",
    });
    window.setTimeout(() => {
      setEmail("");
      setSubmitting(false);
    }, 400);
  };

  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-black" id="footer" data-testid="site-footer">
      <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-[#0b1638] via-[#0c1e4d] to-[#1a1554] shadow-[0_20px_80px_-30px_rgba(56,99,255,0.55)]"
          data-testid="banner-cta-final"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 1.2px)",
              backgroundSize: "18px 18px",
              maskImage:
                "linear-gradient(to right, black 35%, transparent 95%)",
              WebkitMaskImage:
                "linear-gradient(to right, black 35%, transparent 95%)",
            }}
          />
          <div className="pointer-events-none absolute -bottom-24 right-1/3 h-72 w-72 rounded-full bg-primary/40 blur-3xl" />
          <div className="pointer-events-none absolute -top-20 -left-10 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />

          <div className="relative grid grid-cols-1 items-center gap-6 px-6 py-8 sm:px-10 sm:py-10 md:grid-cols-[auto_1fr_auto] md:gap-10">
            <motion.div
              aria-hidden
              initial={{ y: 0, rotate: -12 }}
              animate={{ y: [-4, 6, -4], rotate: -12 }}
              transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
              className="relative flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-400/40 via-primary/40 to-fuchsia-500/40 blur-xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/[0.02] shadow-inner sm:h-20 sm:w-20">
                <Rocket className="h-8 w-8 -rotate-12 text-white drop-shadow-[0_4px_12px_rgba(255,255,255,0.4)] sm:h-10 sm:w-10" />
                <span className="absolute -bottom-1 left-1/2 h-3 w-1 -translate-x-1/2 rounded-full bg-orange-400 blur-[2px]" />
              </div>
            </motion.div>

            <div className="text-center md:text-left">
              <h2
                className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl"
                data-testid="text-final-cta-title"
              >
                Stop Guessing. Start Executing.
              </h2>
              <p className="mt-2 text-sm text-zinc-300 sm:text-base">
                Join thousands of profitable traders who trust our indicators.
              </p>
            </div>

            <div className="flex justify-center md:justify-end">
              <Button
                asChild
                size="lg"
                className="bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90"
                data-testid="button-final-cta"
              >
                <Link href="/indicators" aria-label="Unlock all Pine Signal Lab indicators">
                  Unlock All Indicators <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="grid grid-cols-1 gap-10 pt-14 pb-10 sm:grid-cols-2 lg:grid-cols-12"
        >
          <div className="lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2" data-testid="link-footer-brand">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
                <TrendingUp className="h-4 w-4 text-primary" />
              </span>
              <span className="text-lg font-bold text-white">Pine Signal Lab</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
              Premium TradingView indicators for serious traders. Built with precision, tested for performance.
            </p>
            <div className="mt-5 flex items-center gap-3" data-testid="list-footer-social">
              {footerSocials.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  title={s.name}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-300 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  data-testid={`link-footer-social-${s.name.toLowerCase()}`}
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:col-span-2 sm:grid-cols-3 lg:col-span-5 lg:grid-cols-3 lg:gap-6 lg:pl-4">
            {footerColumns.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-semibold text-white">{col.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-sm text-zinc-400 transition-colors hover:text-primary"
                        data-testid={`link-footer-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="lg:col-span-3">
            <h3 className="text-sm font-semibold text-white">Stay Updated</h3>
            <p className="mt-4 text-sm text-zinc-400">
              Get the latest updates and market insights.
            </p>
            <form
              onSubmit={handleSubscribe}
              noValidate
              className="mt-4 flex w-full items-stretch gap-2"
              data-testid="form-newsletter"
            >
              <Input
                type="text"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                aria-label="Email address"
                className="h-10 flex-1 border-white/10 bg-white/5 text-sm text-white placeholder:text-zinc-500 focus-visible:border-primary/60 focus-visible:ring-primary/40"
                data-testid="input-newsletter-email"
              />
              <Button
                type="submit"
                disabled={submitting}
                className="h-10 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="button-newsletter-subscribe"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5 animate-pulse" />
                    Sending
                  </span>
                ) : (
                  "Subscribe"
                )}
              </Button>
            </form>
          </div>
        </motion.div>

        <div className="border-t border-white/10 py-6">
          <div className="flex flex-col items-center justify-between gap-3 text-xs text-zinc-500 sm:flex-row">
            <p data-testid="text-footer-copyright">
              © {year} Pine Signal Lab. All rights reserved.
            </p>
            <p className="text-center sm:text-right" data-testid="text-footer-disclaimer">
              Trading involves risk. Past performance is not indicative of future results.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

const testimonials = [
  {
    name: "Rahul K.",
    initials: "RK",
    role: "Full Time Trader",
    rating: 5,
    quote: "These indicators have completely changed the way I trade. Consistent results and solid risk management.",
    pnl: "+₹2,45,300",
    accent: "from-amber-400/30 to-amber-600/10",
  },
  {
    name: "Ankit S.",
    initials: "AS",
    role: "Swing Trader",
    rating: 5,
    quote: "Finally found indicators that actually work in all market conditions. Highly recommended!",
    pnl: "+₹1,78,450",
    accent: "from-indigo-400/30 to-indigo-600/10",
  },
  {
    name: "Meera T.",
    initials: "MT",
    role: "Option Trader",
    rating: 5,
    quote: "The accuracy and timing of signals are exceptional. Worth every penny!",
    pnl: "+₹3,12,800",
    accent: "from-emerald-400/30 to-emerald-600/10",
  },
  {
    name: "Karan V.",
    initials: "KV",
    role: "Crypto Trader",
    rating: 5,
    quote: "Backtest results matched live performance. Rare to see this level of transparency in the space.",
    pnl: "+₹4,02,100",
    accent: "from-cyan-400/30 to-cyan-600/10",
  },
  {
    name: "Priya N.",
    initials: "PN",
    role: "Day Trader",
    rating: 5,
    quote: "The risk management rules baked into these tools have saved my account more than once.",
    pnl: "+₹1,52,900",
    accent: "from-rose-400/30 to-rose-600/10",
  },
  {
    name: "Sahil R.",
    initials: "SR",
    role: "Index Trader",
    rating: 5,
    quote: "Clear entries, clear exits, no noise. Exactly what a serious trader needs.",
    pnl: "+₹2,87,650",
    accent: "from-violet-400/30 to-violet-600/10",
  },
];

type Testimonial = (typeof testimonials)[number];

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06] sm:w-[340px]">
      <Quote aria-hidden className="mb-3 h-4 w-4 text-primary/60" />
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${t.accent} ring-1 ring-white/15`}>
          <span className="text-sm font-semibold text-white">{t.initials}</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white" data-testid={`text-testimonial-name-${t.initials.toLowerCase()}`}>
            {t.name}
          </p>
          <p className="truncate text-xs text-zinc-400">{t.role}</p>
        </div>
        <div className="ml-auto flex items-center gap-0.5">
          {Array.from({ length: t.rating }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          ))}
        </div>
      </div>
      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-zinc-300">
        {t.quote}
      </p>
    </div>
  );
}

function TestimonialRow({
  items,
  reverse,
  durationSeconds,
  testId,
}: {
  items: Testimonial[];
  reverse?: boolean;
  durationSeconds: number;
  testId: string;
}) {
  const track = [...items, ...items];
  return (
    <div className="marquee-pause-on-hover -mt-1 overflow-hidden pt-1">
      <div
        className={`flex w-max gap-4 ${reverse ? "animate-marquee-x-reverse" : "animate-marquee-x"}`}
        style={{ ["--marquee-duration" as string]: `${durationSeconds}s` }}
        data-testid={testId}
      >
        {track.map((t, i) => {
          const isClone = i >= items.length;
          return (
            <div
              key={`${t.initials}-${i}`}
              className="pr-1"
              aria-hidden={isClone || undefined}
              {...(isClone ? { inert: "" as unknown as boolean } : {})}
            >
              <TestimonialCard t={t} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Testimonials() {
  const rowA = testimonials.slice(0, Math.ceil(testimonials.length / 2));
  const rowB = testimonials.slice(Math.ceil(testimonials.length / 2));

  return (
    <section
      className="relative overflow-hidden border-t border-white/5 bg-gradient-to-b from-zinc-950 via-black to-zinc-950 py-14 sm:py-16"
      data-testid="section-testimonials"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="pointer-events-none absolute -top-20 left-1/2 h-56 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center"
        >
          <Badge variant="secondary" className="mb-3 border-primary/20 bg-primary/10 text-primary" data-testid="badge-testimonials">
            Loved by traders
          </Badge>
          <h2
            className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
            data-testid="text-testimonials-title"
          >
            Real Traders. Real Results.
          </h2>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            A glimpse into what Pine Signal Lab members say after putting our indicators on their charts.
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="relative mt-10"
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-zinc-950 to-transparent sm:w-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-zinc-950 to-transparent sm:w-20" />

        <TestimonialRow items={rowA} durationSeconds={48} testId="testimonials-row-a" />
        <div className="h-4" />
        <TestimonialRow items={rowB} reverse durationSeconds={56} testId="testimonials-row-b" />
      </motion.div>

      <div className="relative mx-auto mt-8 flex items-center justify-center gap-2" aria-hidden data-testid="testimonials-indicators">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 rounded-full bg-primary/70"
            initial={{ width: 6, opacity: 0.5 }}
            animate={{ width: [6, 22, 6], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
          />
        ))}
      </div>
    </section>
  );
}

function KeyFeatures() {
  return (
    <section
      id="features"
      className="relative overflow-hidden border-t border-white/5 bg-gradient-to-b from-black via-zinc-950 to-black py-14 sm:py-16"
      data-testid="section-key-features"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="pointer-events-none absolute -top-24 left-1/3 h-56 w-[32rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl"
        >
          <Badge
            variant="secondary"
            className="mb-3 border-primary/20 bg-primary/10 text-primary"
            data-testid="badge-key-features"
          >
            Key Features
          </Badge>
          <h2
            className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
            data-testid="text-key-features-title"
          >
            Built for traders who demand precision.
          </h2>
          <p className="mt-2 text-sm text-zinc-400 sm:text-base">
            Why traders love Pine Signal Lab indicators.
          </p>
        </motion.div>

        <motion.ul
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
          }}
          className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {keyFeatures.map((f) => (
            <motion.li
              key={f.title}
              variants={{
                hidden: { opacity: 0, y: 16 },
                show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
              }}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
              data-testid={`card-feature-${f.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              <div
                className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${f.glowClass} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100`}
                aria-hidden
              />

              <div
                className={`relative flex h-11 w-11 items-center justify-center rounded-full bg-white/5 ring-1 ${f.ringClass} transition-transform duration-300 group-hover:scale-105`}
              >
                <f.icon className={`h-5 w-5 ${f.iconClass}`} aria-hidden />
              </div>

              <h3 className="mt-4 text-base font-semibold text-white">
                {f.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                {f.description}
              </p>

              <div className="mt-5 h-px w-full bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-60" />
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
