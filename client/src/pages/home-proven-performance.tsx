import { useEffect, useRef } from "react";
import { motion, useInView, animate } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";


const equityCurve = [
  { month: "Jan", value: -2000 },
  { month: "Feb", value: 1200 },
  { month: "Mar", value: 3400 },
  { month: "Apr", value: 4800 },
  { month: "May", value: 6500 },
  { month: "Jun", value: 8200 },
  { month: "Jul", value: 10800 },
  { month: "Aug", value: 13100 },
  { month: "Sep", value: 15400 },
  { month: "Oct", value: 19200 },
  { month: "Nov", value: 22600 },
];

const performanceStats: {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  tone: "positive" | "negative" | "neutral";
}[] = [
    { label: "Monthly Return", value: 18.47, prefix: "+", suffix: "%", decimals: 2, tone: "positive" },
    { label: "Max Drawdown", value: -6.21, suffix: "%", decimals: 2, tone: "negative" },
    { label: "Total Trades", value: 124, decimals: 0, tone: "neutral" },
    { label: "Win Rate", value: 78.23, suffix: "%", decimals: 2, tone: "neutral" },
    { label: "Profit Factor", value: 2.34, decimals: 2, tone: "neutral" },
    { label: "Sharpe Ratio", value: 1.82, decimals: 2, tone: "neutral" },
  ];

const recentTrades = [
  { time: "15 May, 10:32 AM", asset: "NIFTY 50", type: "BUY", result: 1.85, rr: "1:2.1" },
  { time: "15 May, 10:28 AM", asset: "BANKNIFTY", type: "SELL", result: 2.35, rr: "1:2.8" },
  { time: "15 May, 10:21 AM", asset: "RELIANCE", type: "BUY", result: 1.32, rr: "1:1.9" },
  { time: "15 May, 10:15 AM", asset: "BTCUSDT", type: "SELL", result: 2.62, rr: "1:2.6" },
  { time: "15 May, 09:58 AM", asset: "NIFTY 50", type: "BUY", result: -0.45, rr: "1:1.2" },
];

function AnimatedNumber({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1.4,
  inView,
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  inView: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!inView || !ref.current) return;
    const node = ref.current;
    const controls = animate(0, to, {
      duration,
      ease: "easeOut",
      onUpdate(latest) {
        const sign = latest < 0 ? "-" : prefix;
        node.textContent = `${sign}${Math.abs(latest).toFixed(decimals)}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, to, decimals, prefix, suffix, duration]);

  const initial = `${to < 0 ? "-" : prefix}${Math.abs(0).toFixed(decimals)}${suffix}`;
  return <span ref={ref}>{initial}</span>;
}

function EquityChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="rounded-md border border-white/10 bg-zinc-900/90 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur">
      <div className="text-[10px] uppercase tracking-wider text-zinc-400">Equity</div>
      <div className="font-semibold text-emerald-300">
        {v >= 0 ? "+" : "-"}₹{Math.abs(v).toLocaleString("en-IN")}
      </div>
    </div>
  );
}

export default function ProvenPerformance() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden border-t border-white/5 bg-gradient-to-b from-black via-zinc-950 to-black py-14 sm:py-16"
      data-testid="section-proven-performance"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
      <div className="pointer-events-none absolute -top-20 right-1/4 h-56 w-[32rem] rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <Badge variant="secondary" className="mb-3 border-emerald-400/20 bg-emerald-500/10 text-emerald-300" data-testid="badge-proven-performance">
              Proven Performance
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl" data-testid="text-proven-performance-title">
              Numbers that speak for themselves.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-zinc-400 sm:text-base">
              Live equity curve, transparent statistics and recent trades from our flagship strategy.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12"
        >
          <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4 sm:p-5 lg:col-span-5" data-testid="card-equity-curve">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Equity Curve</h3>
                <p className="text-[11px] text-zinc-500">Cumulative PnL over time</p>
              </div>
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                All Time
              </span>
            </div>

            <div className="relative mt-4 h-48 sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityCurve} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v / 1000}K`}
                    width={36}
                  />
                  <Tooltip cursor={{ stroke: "rgba(255,255,255,0.1)" }} content={<EquityChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(217 91% 65%)"
                    strokeWidth={2}
                    fill="url(#equityFill)"
                    isAnimationActive
                    animationDuration={1400}
                  />
                </AreaChart>
              </ResponsiveContainer>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 1.2 }}
                className="pointer-events-none absolute right-3 top-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs backdrop-blur"
              >
                <div className="text-[10px] uppercase tracking-wider text-emerald-300/80">Total Return</div>
                <div className="font-semibold text-emerald-300">+18.47%</div>
              </motion.div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4 sm:p-5 lg:col-span-3" data-testid="card-stats-grid">
            {performanceStats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.06 }}
                className="rounded-lg border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-white/15 hover:bg-white/[0.05]"
                data-testid={`stat-${s.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              >
                <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  {s.label}
                </div>
                <div
                  className={`mt-1.5 text-lg font-bold tabular-nums ${s.tone === "positive"
                    ? "text-emerald-300"
                    : s.tone === "negative"
                      ? "text-rose-400"
                      : "text-white"
                    }`}
                >
                  <AnimatedNumber
                    to={s.value}
                    prefix={s.prefix}
                    suffix={s.suffix}
                    decimals={s.decimals}
                    inView={inView}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4 sm:p-5 lg:col-span-4" data-testid="card-recent-trades">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Recent Trades</h3>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                Live
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-zinc-500">
                    <th className="pb-2 pr-3 font-medium">Date</th>
                    <th className="pb-2 pr-3 font-medium">Asset</th>
                    <th className="pb-2 pr-3 font-medium">Type</th>
                    <th className="pb-2 pr-3 font-medium">Result</th>
                    <th className="pb-2 font-medium">RR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentTrades.map((t, i) => (
                    <motion.tr
                      key={`${t.asset}-${i}`}
                      initial={{ opacity: 0, x: 8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-80px" }}
                      transition={{ duration: 0.35, delay: 0.2 + i * 0.05 }}
                      className="text-zinc-300"
                      data-testid={`row-trade-${i}`}
                    >
                      <td className="whitespace-nowrap py-2.5 pr-3 text-zinc-400">{t.time}</td>
                      <td className="py-2.5 pr-3 font-medium text-white">{t.asset}</td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${t.type === "BUY"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-rose-500/15 text-rose-300"
                            }`}
                        >
                          {t.type}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 pr-3 font-semibold tabular-nums ${t.result >= 0 ? "text-emerald-300" : "text-rose-400"
                          }`}
                      >
                        {t.result >= 0 ? "+" : ""}
                        {t.result.toFixed(2)}%
                      </td>
                      <td className="py-2.5 text-zinc-400 tabular-nums">{t.rr}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <Link
                href="/indicators"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
                data-testid="link-view-all-trades"
              >
                View All Trades <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
