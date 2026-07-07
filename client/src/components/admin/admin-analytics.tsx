import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  TrendingUp, TrendingDown, Users, UserPlus, Sparkles, IndianRupee,
  Target, Repeat, AlertCircle, BarChart3, Calendar, Crown, Gift, Activity,
  ArrowUpRight, ArrowDownRight, Zap,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface Analytics {
  summary: {
    totalUsers: number; newUsersToday: number; newUsersThisMonth: number; newUsersLastMonth: number;
    userGrowthMoMPct: number;
    totalRevenue: number; revenueThisMonth: number; revenueLastMonth: number;
    revenueLastYearSameMonth: number; revenueThisYear: number; revenueLastYearTotal: number;
    revenueMoMPct: number; revenueYoYPct: number;
    arpu: number; aov: number;
  };
  segmentation: { activePaidUsers: number; activeTrialUsers: number; freeUsers: number; inactiveUsers: number; totalActive: number; };
  conversion: { trialUsersTotal: number; convertedTrialToPaid: number; trialToPaidRate: number; };
  retention: {
    renewedFromLastMonth: number; churnedFromLastMonth: number;
    renewalRate: number; churnRate: number;
    lastMonthPaidUsers: number; thisMonthPaidUsers: number;
    retentionTrend: { month: string; renewed: number; churned: number; retentionRate: number }[];
  };
  projections: {
    avgMonthlyRevenue: number; monthlyGrowthRatePct: number;
    projectedNextMonthRevenue: number; projectedAnnualRevenue: number;
    avgMonthlyNewUsers: number; userGrowthRatePct: number;
    projectedNewUsersNextMonth: number; projectedTotalUsersYearEnd: number;
  };
  charts: {
    dailySignups: { date: string; users: number }[];
    monthlyUsers: { month: string; users: number; cumulative: number }[];
    monthlyRevenue: { month: string; revenue: number; orders: number }[];
  };
  mostUsedIndicators: {
    id: number; name: string; slug: string; tier: string; category: string;
    orders: number; revenue: number; uniqueUsers: number;
  }[];
  orderStatusBreakdown: { pending: number; approved: number; rejected: number; };
}

function formatINR(v: number) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
}

function formatINRFull(v: number) {
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function PercentBadge({ value, invert }: { value: number; invert?: boolean }) {
  const positive = invert ? value < 0 : value > 0;
  const negative = invert ? value > 0 : value < 0;
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
        — 0%
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
      positive ? "text-emerald-600 dark:text-emerald-400" : negative ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
    }`}>
      {value > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

const COLORS = {
  primary: "hsl(217 91% 60%)",
  emerald: "hsl(160 84% 39%)",
  amber: "hsl(38 92% 50%)",
  violet: "hsl(262 83% 58%)",
  red: "hsl(0 84% 60%)",
  muted: "hsl(220 9% 46%)",
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 6,
  fontSize: 12,
};

export function AdminAnalytics() {
  const { data, isLoading } = useQuery<Analytics>({
    queryKey: ["/api/admin/analytics"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  if (isLoading || !data) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const { summary, segmentation, conversion, retention, projections, charts, mostUsedIndicators, orderStatusBreakdown } = data;

  const segmentationData = [
    { name: "Active Paid", value: segmentation.activePaidUsers, color: COLORS.amber },
    { name: "Active Trial", value: segmentation.activeTrialUsers, color: COLORS.violet },
    { name: "Free", value: segmentation.freeUsers, color: COLORS.emerald },
    { name: "Inactive", value: segmentation.inactiveUsers, color: COLORS.muted },
  ].filter((s) => s.value > 0);

  const orderStatusData = [
    { name: "Approved", value: orderStatusBreakdown.approved, color: COLORS.emerald },
    { name: "Pending", value: orderStatusBreakdown.pending, color: COLORS.amber },
    { name: "Rejected", value: orderStatusBreakdown.rejected, color: COLORS.red },
  ].filter((s) => s.value > 0);

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-5 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold tracking-tight sm:text-xl" data-testid="text-analytics-title">
                Analytics
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">Deep insights across acquisition, revenue, retention, and forecasts.</p>
          </div>
          <Badge variant="outline" className="text-xs">
            <Calendar className="mr-1 h-3 w-3" /> Updated live
          </Badge>
        </div>

        {/* HERO KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            icon={Users} label="Total Users" value={summary.totalUsers.toLocaleString("en-IN")}
            sub={<span className="text-xs text-muted-foreground">+{summary.newUsersThisMonth} this month</span>}
            testId="kpi-total-users"
          />
          <KpiCard
            icon={UserPlus} label="New This Month" value={summary.newUsersThisMonth.toLocaleString("en-IN")}
            sub={<><PercentBadge value={summary.userGrowthMoMPct} /> <span className="text-[11px] text-muted-foreground">vs last mo</span></>}
            testId="kpi-new-this-month" tone="violet"
          />
          <KpiCard
            icon={Sparkles} label="New Today" value={summary.newUsersToday.toLocaleString("en-IN")}
            sub={<span className="text-xs text-muted-foreground">{summary.newUsersToday > 0 ? "Active acquisition" : "No signups today"}</span>}
            testId="kpi-new-today" tone="emerald"
          />
          <KpiCard
            icon={IndianRupee} label="Total Revenue" value={formatINR(summary.totalRevenue)}
            sub={<span className="text-xs text-muted-foreground" title={formatINRFull(summary.totalRevenue)}>{formatINRFull(summary.totalRevenue)}</span>}
            testId="kpi-total-revenue" tone="amber"
          />
        </div>

        {/* Revenue comparison row */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <ComparisonCard
            title="Revenue This Month"
            current={formatINRFull(summary.revenueThisMonth)}
            prevLabel="vs Last Month"
            prevValue={formatINRFull(summary.revenueLastMonth)}
            pct={summary.revenueMoMPct}
            testId="comp-mom"
          />
          <ComparisonCard
            title="Revenue This Month"
            current={formatINRFull(summary.revenueThisMonth)}
            prevLabel="vs Same Month Last Year"
            prevValue={formatINRFull(summary.revenueLastYearSameMonth)}
            pct={summary.revenueYoYPct}
            testId="comp-yoy"
          />
          <ComparisonCard
            title="Revenue This Year"
            current={formatINRFull(summary.revenueThisYear)}
            prevLabel="vs Last Year (Total)"
            prevValue={formatINRFull(summary.revenueLastYearTotal)}
            pct={summary.revenueLastYearTotal === 0 ? (summary.revenueThisYear > 0 ? 100 : 0)
              : ((summary.revenueThisYear - summary.revenueLastYearTotal) / summary.revenueLastYearTotal) * 100}
            testId="comp-yty"
          />
        </div>

        {/* Tabs by period */}
        <Tabs defaultValue="growth" className="w-full">
          <TabsList>
            <TabsTrigger value="growth" data-testid="tab-growth">Growth</TabsTrigger>
            <TabsTrigger value="revenue" data-testid="tab-revenue">Revenue</TabsTrigger>
            <TabsTrigger value="retention" data-testid="tab-retention">Retention & Churn</TabsTrigger>
            <TabsTrigger value="forecast" data-testid="tab-forecast">Forecast</TabsTrigger>
          </TabsList>

          {/* Growth */}
          <TabsContent value="growth" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartCard title="Daily Signups (Last 30 days)" testId="chart-daily">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={charts.dailySignups}>
                    <defs>
                      <linearGradient id="gradPrimary" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="users" stroke={COLORS.primary} strokeWidth={2} fill="url(#gradPrimary)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Monthly Signups & Cumulative Users" testId="chart-monthly-users">
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={charts.monthlyUsers}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="users" fill={COLORS.violet} name="New users" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke={COLORS.primary} strokeWidth={2} name="Cumulative" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SegmentCard
                title="User Segmentation"
                data={segmentationData}
                testId="chart-segmentation"
              />
              <Card className="border-card-border p-4 md:col-span-2" data-testid="card-segmentation-stats">
                <h3 className="mb-3 text-sm font-semibold">Active User Breakdown</h3>
                <div className="space-y-3">
                  <SegmentBar label="Active Paid Users" value={segmentation.activePaidUsers} total={summary.totalUsers} icon={Crown} color="bg-amber-500" testId="seg-paid" />
                  <SegmentBar label="Active Trial Users" value={segmentation.activeTrialUsers} total={summary.totalUsers} icon={Zap} color="bg-violet-500" testId="seg-trial" />
                  <SegmentBar label="Free Users" value={segmentation.freeUsers} total={summary.totalUsers} icon={Gift} color="bg-emerald-500" testId="seg-free" />
                  <SegmentBar label="Inactive Users" value={segmentation.inactiveUsers} total={summary.totalUsers} icon={Activity} color="bg-muted-foreground" testId="seg-inactive" />
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Revenue */}
          <TabsContent value="revenue" className="space-y-4">
            <ChartCard title="Monthly Revenue & Order Volume" testId="chart-monthly-revenue">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={charts.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatINR(v)} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => name === "revenue" ? [formatINRFull(value), "Revenue"] : [value, "Orders"]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="revenue" fill={COLORS.amber} name="Revenue" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="orders" stroke={COLORS.primary} strokeWidth={2} name="Orders" dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MiniStat label="ARPU" value={formatINRFull(summary.arpu)} hint="Per paying user" testId="stat-arpu" />
              <MiniStat label="AOV" value={formatINRFull(summary.aov)} hint="Avg order value" testId="stat-aov" />
              <MiniStat label="Orders Approved" value={String(orderStatusBreakdown.approved)} hint="All-time" testId="stat-approved" />
              <MiniStat label="Pending Approval" value={String(orderStatusBreakdown.pending)} hint="Action needed" testId="stat-pending" tone={orderStatusBreakdown.pending > 0 ? "amber" : undefined} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SegmentCard title="Order Status" data={orderStatusData} testId="chart-order-status" />
              <Card className="border-card-border p-4 md:col-span-2" data-testid="card-top-indicators">
                <h3 className="mb-3 text-sm font-semibold">Most Used Indicators</h3>
                {mostUsedIndicators.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No order data yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {mostUsedIndicators.map((ind, i) => {
                      const max = mostUsedIndicators[0].orders;
                      const pct = max === 0 ? 0 : (ind.orders / max) * 100;
                      return (
                        <div key={ind.id} className="flex items-center gap-3" data-testid={`top-ind-${ind.id}`}>
                          <span className="w-5 shrink-0 text-xs font-bold text-muted-foreground">#{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-medium">{ind.name}</span>
                              <span className="shrink-0 text-xs text-muted-foreground">{ind.orders} orders · {ind.uniqueUsers} users · {formatINR(ind.revenue)}</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Retention */}
          <TabsContent value="retention" className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard
                icon={Repeat} label="Renewal Rate" value={`${retention.renewalRate}%`}
                sub={<span className="text-xs text-muted-foreground">{retention.renewedFromLastMonth} of {retention.lastMonthPaidUsers} renewed</span>}
                testId="kpi-renewal" tone="emerald"
              />
              <KpiCard
                icon={AlertCircle} label="Churn Rate" value={`${retention.churnRate}%`}
                sub={<span className="text-xs text-muted-foreground">{retention.churnedFromLastMonth} did not renew</span>}
                testId="kpi-churn" tone={retention.churnRate > 30 ? "red" : "amber"}
              />
              <KpiCard
                icon={Target} label="Trial → Paid" value={`${conversion.trialToPaidRate}%`}
                sub={<span className="text-xs text-muted-foreground">{conversion.convertedTrialToPaid} of {conversion.trialUsersTotal} trials</span>}
                testId="kpi-trial-conv" tone="violet"
              />
              <KpiCard
                icon={Crown} label="Paid This Month" value={String(retention.thisMonthPaidUsers)}
                sub={<span className="text-xs text-muted-foreground">vs {retention.lastMonthPaidUsers} last month</span>}
                testId="kpi-paid-this-month"
              />
            </div>

            <ChartCard title="Renewal vs Churn Trend (Last 5 Months)" testId="chart-retention">
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={retention.retentionTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="renewed" stackId="a" fill={COLORS.emerald} name="Renewed" radius={[0, 0, 0, 0]} />
                  <Bar yAxisId="left" dataKey="churned" stackId="a" fill={COLORS.red} name="Churned" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="retentionRate" stroke={COLORS.primary} strokeWidth={2.5} name="Retention %" dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <Card className="border-card-border p-4">
              <h3 className="mb-3 text-sm font-semibold">Health Indicators</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <HealthBar label="Renewal Health" value={retention.renewalRate} good={70} okay={40} testId="health-renewal" />
                <HealthBar label="Trial Conversion" value={conversion.trialToPaidRate} good={25} okay={10} testId="health-conv" />
                <HealthBar label="User Activation" value={summary.totalUsers === 0 ? 0 : (segmentation.totalActive / summary.totalUsers) * 100} good={60} okay={30} testId="health-activation" />
              </div>
            </Card>
          </TabsContent>

          {/* Forecast */}
          <TabsContent value="forecast" className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Card className="border-card-border p-5" data-testid="forecast-revenue">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
                    <IndianRupee className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Projected Revenue (Next Month)</p>
                    <p className="mt-1 text-2xl font-bold">{formatINRFull(projections.projectedNextMonthRevenue)}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Growth rate:</span>
                      <PercentBadge value={projections.monthlyGrowthRatePct} />
                    </div>
                    <Separator />
                    <div className="mt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg monthly revenue (3mo)</span>
                        <span className="font-medium">{formatINRFull(projections.avgMonthlyRevenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Projected annual revenue</span>
                        <span className="font-bold text-foreground">{formatINRFull(projections.projectedAnnualRevenue)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border-card-border p-5" data-testid="forecast-users">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-violet-500/10">
                    <UserPlus className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Projected New Users (Next Month)</p>
                    <p className="mt-1 text-2xl font-bold">{projections.projectedNewUsersNextMonth.toLocaleString("en-IN")}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Growth rate:</span>
                      <PercentBadge value={projections.userGrowthRatePct} />
                    </div>
                    <Separator />
                    <div className="mt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg new users / month</span>
                        <span className="font-medium">{projections.avgMonthlyNewUsers.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Projected total by year-end</span>
                        <span className="font-bold text-foreground">{projections.projectedTotalUsersYearEnd.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="border-card-border p-5" data-testid="forecast-summary">
              <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Business Outlook
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm">
                <OutlookItem
                  label="Daily Period"
                  metric={`${summary.newUsersToday} new today`}
                  detail={`Avg ${(projections.avgMonthlyNewUsers / 30).toFixed(1)} signups/day`}
                />
                <OutlookItem
                  label="Monthly Period"
                  metric={`${summary.newUsersThisMonth} new users · ${formatINR(summary.revenueThisMonth)} earned`}
                  detail={`Trend: ${summary.userGrowthMoMPct >= 0 ? "+" : ""}${summary.userGrowthMoMPct.toFixed(1)}% users · ${summary.revenueMoMPct >= 0 ? "+" : ""}${summary.revenueMoMPct.toFixed(1)}% revenue`}
                />
                <OutlookItem
                  label="Yearly Period"
                  metric={`${formatINR(summary.revenueThisYear)} this year`}
                  detail={`Last year total: ${formatINR(summary.revenueLastYearTotal)} · Forecast: ${formatINR(projections.projectedAnnualRevenue)}`}
                />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, testId, tone,
}: {
  icon: typeof Users; label: string; value: string;
  sub?: React.ReactNode; testId: string;
  tone?: "emerald" | "amber" | "violet" | "red";
}) {
  const toneClass =
    tone === "emerald" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : tone === "amber" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
    : tone === "violet" ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
    : tone === "red" ? "bg-red-500/10 text-red-600 dark:text-red-400"
    : "bg-primary/10 text-primary";
  return (
    <Card className="border-card-border p-3.5" data-testid={testId}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-bold leading-tight truncate">{value}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">{sub}</div>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

function ComparisonCard({
  title, current, prevLabel, prevValue, pct, testId,
}: { title: string; current: string; prevLabel: string; prevValue: string; pct: number; testId: string }) {
  const positive = pct > 0;
  return (
    <Card className="border-card-border p-4" data-testid={testId}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="mt-1 text-xl font-bold">{current}</p>
      <div className="mt-2 flex items-center justify-between border-t pt-2">
        <span className="text-[11px] text-muted-foreground">{prevLabel}</span>
        <span className="text-xs font-medium">{prevValue}</span>
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-bold ${
          positive ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : pct < 0 ? "bg-red-500/10 text-red-700 dark:text-red-300" : "bg-muted text-muted-foreground"
        }`}>
          {positive ? <TrendingUp className="h-3 w-3" /> : pct < 0 ? <TrendingDown className="h-3 w-3" /> : null}
          {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
        </span>
      </div>
    </Card>
  );
}

function ChartCard({ title, children, testId }: { title: string; children: React.ReactNode; testId: string }) {
  return (
    <Card className="border-card-border p-4" data-testid={testId}>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </Card>
  );
}

function SegmentCard({
  title, data, testId,
}: { title: string; data: { name: string; value: number; color: string }[]; testId: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Card className="border-card-border p-4" data-testid={testId}>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {data.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                  <span>{d.name}</span>
                </div>
                <span className="font-semibold">{d.value} <span className="text-muted-foreground">({total === 0 ? 0 : Math.round((d.value / total) * 100)}%)</span></span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function SegmentBar({
  label, value, total, icon: Icon, color, testId,
}: { label: string; value: number; total: number; icon: typeof Users; color: string; testId: string }) {
  const pct = total === 0 ? 0 : (value / total) * 100;
  return (
    <div data-testid={testId}>
      <div className="mb-1 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{label}</span>
        </div>
        <span className="font-bold">{value} <span className="text-muted-foreground">({pct.toFixed(1)}%)</span></span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniStat({
  label, value, hint, testId, tone,
}: { label: string; value: string; hint?: string; testId: string; tone?: "amber" }) {
  return (
    <Card className={`border-card-border p-3 ${tone === "amber" ? "bg-amber-500/5" : ""}`} data-testid={testId}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-bold">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function HealthBar({
  label, value, good, okay, testId,
}: { label: string; value: number; good: number; okay: number; testId: string }) {
  const status = value >= good ? "good" : value >= okay ? "okay" : "bad";
  const color = status === "good" ? "bg-emerald-500" : status === "okay" ? "bg-amber-500" : "bg-red-500";
  const tag = status === "good" ? "Healthy" : status === "okay" ? "Watch" : "Critical";
  return (
    <div data-testid={testId}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <Badge variant="outline" className={`text-[10px] ${
          status === "good" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          : status === "okay" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
          : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
        }`}>
          {value.toFixed(1)}% · {tag}
        </Badge>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

function OutlookItem({ label, metric, detail }: { label: string; metric: string; detail: string }) {
  return (
    <div className="rounded-md border border-card-border bg-muted/20 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-bold">{metric}</p>
      <p className="text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}

function Separator() {
  return <div className="my-3 h-px bg-border" />;
}
