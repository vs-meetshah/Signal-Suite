import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2, XCircle, Clock, Mail, Phone, TrendingUp, Calendar, CreditCard,
  Package, User as UserIcon, ExternalLink, ChevronsRight, Users, X, ShieldCheck,
  Inbox, Download, Eye, ChevronDown, ChevronUp, Hourglass, AlertCircle, MoreHorizontal,
  Receipt, IndianRupee, CalendarDays, CalendarClock,
} from "lucide-react";

interface AdminOrderItem {
  id: number; orderId: number; indicatorId: number; duration: number; price: string;
  isTrial: boolean | null; version: string | null;
  indicatorName: string; indicatorSlug: string; indicatorTier: string;
  daysRemaining: number | null;
  accessStatus: "pending" | "active" | "expired" | "rejected";
}

interface AdminOrder {
  id: number; userId: number; status: string; totalAmount: string;
  rejectionReason: string | null; createdAt: string; approvedAt: string | null;

  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  paymentStatus: string | null;
  paidAt: string | null;

  items: AdminOrderItem[];
}

interface AdminUser {
  id: number; firstName: string; lastName: string; username: string; email: string;
  mobileNumber: string; tradingViewUsername: string; isAdmin: boolean | null; createdAt: string;
  orders: AdminOrder[]; hasActivePlan: boolean;
  planType: "paid" | "trial" | "free" | "none";
  daysRemaining: number | null; totalOrders: number; totalSpent: number;
}

const planBadge: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  trial: { label: "Trial", className: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
  free: { label: "Free", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  none: { label: "None", className: "bg-muted text-muted-foreground border-border" },
};

const orderStatusBadge: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2; label: string }> = {
  pending: { variant: "secondary", icon: Clock, label: "Pending" },
  approved: { variant: "default", icon: CheckCircle2, label: "Approved" },
  rejected: { variant: "destructive", icon: XCircle, label: "Rejected" },
};

const APP_TIME_ZONE = "Asia/Kolkata";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    timeZone: APP_TIME_ZONE, year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function formatShortDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { timeZone: APP_TIME_ZONE, year: "2-digit", month: "short", day: "numeric" });
}
function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
function isToday(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(d.getTime())) return false;
  const now = new Date();
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return dateKey.format(d) === dateKey.format(now);
}
function calculateEndDate(createdAt: string, durationMonths: number, isTrial: boolean | null): Date {
  const d = new Date(createdAt);
  if (isTrial) {
    d.setDate(d.getDate() + 15);
  } else {
    d.setMonth(d.getMonth() + Math.max(0, durationMonths));
  }
  return d;
}

function getApprovalRequestDate(order: AdminOrder): string {
  return order.paidAt || order.createdAt;
}

interface TodayRequest {
  user: AdminUser;
  order: AdminOrder;
}

function buildTodayRequests(users: AdminUser[] | undefined): TodayRequest[] {
  if (!users) return [];

  const out: TodayRequest[] = [];

  for (const user of users) {
    for (const order of user.orders) {
      if (order.status !== "pending") continue;

      // Show every pending order, even if admin missed it yesterday/earlier.
      out.push({ user, order });
    }
  }

  out.sort((a, b) => new Date(getApprovalRequestDate(b.order)).getTime() - new Date(getApprovalRequestDate(a.order)).getTime());

  return out;
}

function sanitizeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  // Mitigate CSV formula injection: prefix any value whose first non-whitespace
  // char is a formula trigger with a single quote so spreadsheets treat it as text.
  const trimmed = raw.replace(/^\s+/, "");
  if (/^[=+\-@\t\r]/.test(trimmed)) return "'" + raw;
  return raw;
}

function csvEscape(value: unknown): string {
  const s = sanitizeCsvCell(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function versionLabel(version: string | null): string {
  if (version === "strategy") return "Strategy";
  if (version === "both") return "Indicator + Strategy";
  return "Indicator";
}

function summarizePlan(items: AdminOrderItem[]): { label: string; mixed: boolean } {
  if (items.length === 0) return { label: "—", mixed: false };
  const first = items[0];
  const allSame = items.every(
    (it) => Boolean(it.isTrial) === Boolean(first.isTrial) && it.duration === first.duration
  );
  if (allSame) {
    return {
      label: first.isTrial ? "15-Day Trial" : `${first.duration} Month Plan`,
      mixed: false,
    };
  }
  return { label: `Mixed (${items.length} items)`, mixed: true };
}

function downloadTodayRequestsCSV(requests: TodayRequest[]) {
  const headers = [
    "S.No", "User Name", "User ID", "Mobile", "Email",
    "TradingView Username", "Order ID", "Order Date & Time",
    "Indicators", "Plan Summary", "Order Total (INR)", "Earliest Subscription Ends",
  ];
  const rows = requests.map((r, idx) => {
    const summary = summarizePlan(r.order.items);
    const indicatorList = r.order.items
      .map((it) => `${it.indicatorName} (${versionLabel(it.version)}, ${it.isTrial ? "Trial" : `${it.duration}mo`})`)
      .join(" | ");
    const earliestEnd = r.order.items.length > 0
      ? r.order.items
        .map((it) => calculateEndDate(getApprovalRequestDate(r.order), it.duration, it.isTrial).getTime())
        .reduce((a, b) => Math.min(a, b))
      : null;
    return [
      idx + 1,
      `${r.user.firstName} ${r.user.lastName}`,
      r.user.id,
      r.user.mobileNumber,
      r.user.email,
      r.user.tradingViewUsername,
      r.order.id,
      new Date(getApprovalRequestDate(r.order)).toLocaleString("en-IN", { timeZone: APP_TIME_ZONE }),
      indicatorList || "(no items)",
      summary.label,
      Number.isFinite(parseFloat(r.order.totalAmount)) ? parseFloat(r.order.totalAmount) : 0,
      earliestEnd !== null ? new Date(earliestEnd).toLocaleDateString("en-IN") : "—",
    ];
  });
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const today = new Date();
  const fname = `pine-signal-lab-today-requests-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}.csv`;
  const a = document.createElement("a");
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AdminDashboard() {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [rejectOrder, setRejectOrder] = useState<{ id: number; userName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [expandedTodayItem, setExpandedTodayItem] = useState<number | null>(null);

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const approveMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest("POST", `/api/admin/orders/${orderId}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      toast({ title: "Order approved", description: "User access has been granted." });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Failed to approve", description: e.message }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/admin/orders/${orderId}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      setRejectOrder(null);
      setRejectReason("");
      toast({ title: "Order rejected", description: "The user will see your reason on their dashboard." });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Failed to reject", description: e.message }),
  });

  const selectedUser = useMemo(
    () => users?.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const totalUsers = users?.length || 0;
  const activeUsers = users?.filter((u) => u.hasActivePlan).length || 0;
  const pendingOrdersCount = users?.reduce((sum, u) => sum + u.orders.filter((o) => o.status === "pending").length, 0) || 0;
  const totalRevenue = users?.reduce((sum, u) => sum + u.totalSpent, 0) || 0;

  const todayRequests = useMemo(() => buildTodayRequests(users), [users]);
  const todayDateLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const handleQuickView = (userId: number) => {
    setSelectedUserId(userId);
    setPanelOpen(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto" data-testid="container-admin-dashboard">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight sm:text-xl" data-testid="text-dashboard-title">
              Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">Manage users, orders, and access requests</p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin/users">
              <Users className="mr-2 h-4 w-4" />
              All Users
            </Link>
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard icon={Users} label="Total Users" value={String(totalUsers)} testId="stat-total-users" />
          <StatCard icon={TrendingUp} label="Active Plans" value={String(activeUsers)} testId="stat-active-users" tone="emerald" />
          <StatCard icon={Clock} label="Pending Orders" value={String(pendingOrdersCount)} testId="stat-pending-orders" tone="amber" />
          <StatCard icon={CreditCard} label="Approved Revenue" value={formatINR(totalRevenue)} testId="stat-revenue" />
        </div>
      </div>

      {/* Pending Approval Requests */}
      <TodayRequestsPanel
        requests={todayRequests}
        dateLabel={todayDateLabel}
        loading={isLoading}
        expandedOrderId={expandedTodayItem}
        onToggleExpanded={(id) => setExpandedTodayItem((cur) => (cur === id ? null : id))}
        onApprove={(orderId) => approveMutation.mutate(orderId)}
        onReject={(orderId, userName) => {
          setRejectOrder({ id: orderId, userName });
          setRejectReason("");
        }}
        onQuickView={handleQuickView}
        approving={approveMutation.isPending}
        approvingId={approveMutation.variables ?? null}
      />

      {/* Detail panel — opens from the right when "View" is clicked on a request */}
      <Sheet open={panelOpen && !!selectedUser} onOpenChange={setPanelOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-[460px] p-0 sm:max-w-[460px]"
          data-testid="detail-panel"
        >
          <div className="flex h-full flex-col">
            <SheetHeader className="space-y-0 border-b px-4 py-3 text-left">
              <div className="flex items-center gap-2 min-w-0">
                <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <SheetTitle className="text-sm font-semibold truncate">
                  {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : "User Details"}
                </SheetTitle>
              </div>
              <SheetDescription className="sr-only">
                Selected user details, recent orders, and pending requests
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1">
              {selectedUser && (
                <UserDetailContent
                  user={selectedUser}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onReject={(orderId) => {
                    setRejectOrder({ id: orderId, userName: `${selectedUser.firstName} ${selectedUser.lastName}` });
                    setRejectReason("");
                  }}
                  approving={approveMutation.isPending}
                />
              )}
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!rejectOrder} onOpenChange={(open) => { if (!open) { setRejectOrder(null); setRejectReason(""); } }}>
        <DialogContent data-testid="dialog-reject">
          <DialogHeader>
            <DialogTitle>Reject Order #{rejectOrder?.id}</DialogTitle>
            <DialogDescription>
              {rejectOrder ? `This reason will be visible to ${rejectOrder.userName} on their dashboard.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="reject-reason-input" className="text-sm font-medium">Rejection reason</label>
            <Textarea id="reject-reason-input" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Payment not received, invalid TradingView username, etc." rows={4}
              data-testid="input-reject-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectOrder(null); setRejectReason(""); }} data-testid="button-cancel-reject">
              Cancel
            </Button>
            <Button variant="destructive"
              onClick={() => {
                if (rejectOrder && rejectReason.trim().length >= 3) {
                  rejectMutation.mutate({ orderId: rejectOrder.id, reason: rejectReason.trim() });
                }
              }}
              disabled={rejectReason.trim().length < 3 || rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              <XCircle className="mr-1.5 h-4 w-4" /> Reject Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserDetailContent({
  user, onApprove, onReject, approving,
}: { user: AdminUser; onApprove: (orderId: number) => void; onReject: (orderId: number) => void; approving: boolean; }) {
  const plan = planBadge[user.planType];
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary/10 text-primary text-base font-bold">
            {user.firstName.charAt(0).toUpperCase()}{user.lastName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-base font-bold truncate">{user.firstName} {user.lastName}</h3>
            {user.isAdmin && (
              <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20 text-primary">
                <ShieldCheck className="mr-1 h-3 w-3" /> Admin
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">@{user.username} · ID #{user.id}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge variant="outline" className={`text-[10px] ${plan.className}`}>{plan.label} Plan</Badge>
            {user.hasActivePlan && user.daysRemaining !== null && user.daysRemaining > 0 && (
              <Badge variant="outline" className="text-[10px]">{user.daysRemaining}d left</Badge>
            )}
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contact & Identity</h4>
        <div className="grid grid-cols-1 gap-2">
          <DetailRow icon={Mail} label="Email" value={user.email} testId={`detail-email-${user.id}`} />
          <DetailRow icon={Phone} label="Mobile" value={user.mobileNumber} testId={`detail-mobile-${user.id}`} />
          <DetailRow icon={TrendingUp} label="TradingView" value={user.tradingViewUsername} mono testId={`detail-tv-${user.id}`} />
          <DetailRow icon={Calendar} label="Joined" value={formatDate(user.createdAt)} testId={`detail-joined-${user.id}`} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="border-card-border p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Orders</p>
          <p className="mt-0.5 text-lg font-bold" data-testid={`detail-total-orders-${user.id}`}>{user.totalOrders}</p>
        </Card>
        <Card className="border-card-border p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Spent</p>
          <p className="mt-0.5 text-lg font-bold" data-testid={`detail-total-spent-${user.id}`}>{formatINR(user.totalSpent)}</p>
        </Card>
      </div>

      <Separator />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Orders</h4>
          <span className="text-[10px] text-muted-foreground">{user.orders.length} total</span>
        </div>

        {user.orders.length === 0 ? (
          <Card className="border-card-border p-6 text-center" data-testid={`detail-no-orders-${user.id}`}>
            <Package className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-xs text-muted-foreground">No orders yet</p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {user.orders.map((order) => {
              const meta = orderStatusBadge[order.status] || orderStatusBadge.pending;
              const StatusIcon = meta.icon;
              return (
                <Card key={order.id} className="border-card-border overflow-hidden" data-testid={`detail-order-${order.id}`}>
                  <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold" data-testid={`detail-order-id-${order.id}`}>#{order.id}</span>
                      <Badge variant={meta.variant} className="text-[10px] h-4 px-1.5" data-testid={`detail-order-status-${order.id}`}>
                        <StatusIcon className="mr-0.5 h-2.5 w-2.5" /> {meta.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{formatShortDate(order.createdAt)}</span>
                    </div>
                    <span className="text-xs font-bold shrink-0" data-testid={`detail-order-total-${order.id}`}>
                      {formatINR(parseFloat(order.totalAmount))}
                    </span>
                  </div>

                  <div className="border-b bg-emerald-500/5 px-3 py-2" data-testid={`detail-payment-${order.id}`}>
                    <div className="grid grid-cols-1 gap-1 text-[10px] sm:grid-cols-2">
                      <div>
                        <span className="text-muted-foreground">Payment:</span>{" "}
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {order.paymentStatus === "paid" ? "Paid" : order.paymentStatus || "Pending"}
                        </span>
                      </div>

                      <div>
                        <span className="text-muted-foreground">Paid At:</span>{" "}
                        <span>{formatDate(order.paidAt)}</span>
                      </div>

                      {order.razorpayPaymentId && (
                        <div className="sm:col-span-2">
                          <span className="text-muted-foreground">Razorpay Payment ID:</span>{" "}
                          <span className="font-mono break-all">{order.razorpayPaymentId}</span>
                        </div>
                      )}

                      {order.razorpayOrderId && (
                        <div className="sm:col-span-2">
                          <span className="text-muted-foreground">Razorpay Order ID:</span>{" "}
                          <span className="font-mono break-all">{order.razorpayOrderId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {order.status === "rejected" && order.rejectionReason && (
                    <div className="border-b bg-red-500/5 px-3 py-2" data-testid={`detail-rejection-${order.id}`}>
                      <div className="flex items-start gap-1.5">
                        <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-600 dark:text-red-400" />
                        <p className="text-[11px] text-foreground"><span className="font-semibold text-red-600 dark:text-red-400">Reason:</span> {order.rejectionReason}</p>
                      </div>
                    </div>
                  )}

                  <div className="divide-y">
                    {order.items.map((item) => (
                      <div key={item.id} className="px-3 py-2" data-testid={`detail-order-item-${item.id}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <Link href={`/indicator/${item.indicatorSlug}`} className="text-xs font-semibold hover:underline">
                              {item.indicatorName}
                              <ExternalLink className="ml-1 inline h-2.5 w-2.5 opacity-60" />
                            </Link>
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                                {versionLabel(item.version)}
                              </Badge>
                              {item.isTrial && (
                                <Badge variant="outline" className="text-[9px] h-3.5 px-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20">
                                  Trial
                                </Badge>
                              )}
                              <Badge variant="outline" className={`text-[9px] h-3.5 px-1 ${item.indicatorTier === "free" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"}`}>
                                {item.indicatorTier === "free" ? "Free" : "Premium"}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {item.isTrial ? "15d trial" : `${item.duration}mo`}
                              </span>
                              {item.daysRemaining !== null && item.accessStatus === "active" && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                  · {item.daysRemaining}d left
                                </span>
                              )}
                              {item.accessStatus === "expired" && (
                                <span className="text-[10px] text-red-600 dark:text-red-400">· Expired</span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-medium shrink-0">{formatINR(parseFloat(item.price))}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.status === "pending" && (
                    <div className="flex items-center gap-1.5 border-t bg-muted/20 px-3 py-2">
                      <Button size="sm" className="h-7 flex-1 text-xs"
                        onClick={() => onApprove(order.id)} disabled={approving}
                        data-testid={`button-approve-${order.id}`}>
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 flex-1 text-xs"
                        onClick={() => onReject(order.id)} data-testid={`button-reject-${order.id}`}>
                        <X className="mr-1 h-3 w-3" /> Reject
                      </Button>
                    </div>
                  )}

                  {order.approvedAt && order.status === "approved" && (
                    <div className="border-t bg-emerald-500/5 px-3 py-1.5">
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="mr-1 inline h-2.5 w-2.5" />
                        Approved {formatDate(order.approvedAt)}
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, testId, tone,
}: { icon: typeof UserIcon; label: string; value: string; testId: string; tone?: "emerald" | "amber" }) {
  const toneClass = tone === "emerald"
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : tone === "amber"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : "bg-primary/10 text-primary";
  return (
    <Card className="border-card-border p-2.5" data-testid={testId}>
      <div className="flex items-center gap-2.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold leading-tight truncate">{value}</p>
          <p className="text-[10px] text-muted-foreground truncate">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function DetailRow({
  icon: Icon, label, value, testId, mono,
}: { icon: typeof UserIcon; label: string; value: string; testId?: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2" data-testid={testId}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium break-all ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

function TodayRequestsPanel({
  requests, dateLabel, loading, expandedOrderId, onToggleExpanded,
  onApprove, onReject, onQuickView, approving, approvingId,
}: {
  requests: TodayRequest[];
  dateLabel: string;
  loading: boolean;
  expandedOrderId: number | null;
  onToggleExpanded: (orderId: number) => void;
  onApprove: (orderId: number) => void;
  onReject: (orderId: number, userName: string) => void;
  onQuickView: (userId: number) => void;
  approving: boolean;
  approvingId: number | null;
}) {
  const count = requests.length;
  const totalValue = requests.reduce((sum, r) => sum + (parseFloat(r.order.totalAmount) || 0), 0);

  return (
    <section
      className="border-b bg-gradient-to-br from-amber-500/[0.04] via-background to-background px-4 py-4 sm:px-6"
      data-testid="section-today-requests"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Inbox className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold tracking-tight sm:text-lg" data-testid="text-today-title">
                Pending Approval Requests
              </h2>
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 text-[11px]"
                data-testid="badge-today-count"
              >
                {count} {count === 1 ? "request" : "requests"}
              </Badge>
              {count > 0 && (
                <Badge variant="outline" className="text-[11px]" data-testid="badge-today-value">
                  {formatINR(totalValue)} potential revenue
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground" data-testid="text-today-date">
              {dateLabel}
            </p>
          </div>
        </div>

        <Button
          onClick={() => downloadTodayRequestsCSV(requests)}
          disabled={count === 0}
          className="h-9 gap-2 bg-emerald-600 text-white hover:bg-emerald-600/90 dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-500/90"
          data-testid="button-download-today-csv"
        >
          <Download className="h-4 w-4" />
          Download Pending Order List
        </Button>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : count === 0 ? (
          <Card
            className="flex flex-col items-center justify-center border-dashed border-card-border py-10 text-center"
            data-testid="empty-today-requests"
          >
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <p className="mt-3 text-sm font-medium">No new requests today</p>
            <p className="mt-1 text-xs text-muted-foreground">
              You're all caught up. Paid orders waiting for approval will appear here.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {(() => {
              const cards: JSX.Element[] = [];
              let runningItemNumber = 0;
              requests.forEach((r) => {
                const orderId = r.order.id;
                const items = r.order.items;
                const itemCount = items.length;
                const isExpanded = expandedOrderId === orderId;
                const isApprovingRow = approving && approvingId === orderId;
                const orderTotal = parseFloat(r.order.totalAmount) || 0;
                const requestDate = getApprovalRequestDate(r.order);
                const orderCreated = new Date(requestDate);
                const orderDateStr = orderCreated.toLocaleDateString("en-IN", { timeZone: APP_TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric" });
                const orderTimeStr = orderCreated.toLocaleTimeString("en-IN", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: true });
                const fullName = `${r.user.firstName} ${r.user.lastName}`;
                const initials = `${r.user.firstName.charAt(0).toUpperCase()}${r.user.lastName.charAt(0).toUpperCase()}`;

                cards.push(
                  <Card
                    key={orderId}
                    className="overflow-hidden border-card-border border-l-4 border-l-cyan-500"
                    data-testid={`order-card-${orderId}`}
                  >
                    {/* Order header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-gradient-to-r from-cyan-500/10 to-blue-500/5 px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-bold" data-testid={`order-id-${orderId}`}>
                            Order #{orderId}
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-xs bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20"
                          data-testid={`order-status-${orderId}`}
                        >
                          <Hourglass className="mr-1 h-3 w-3" />
                          Pending
                        </Badge>
                        {!isToday(requestDate) && (
                          <Badge
                            variant="outline"
                            className="text-xs border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            data-testid={`order-overdue-${orderId}`}
                          >
                            Missed earlier
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground" data-testid={`order-date-${orderId}`}>
                          <CalendarDays className="h-3.5 w-3.5" />
                          {orderDateStr} · {orderTimeStr}
                        </span>
                        <span className="flex items-center font-bold text-foreground" data-testid={`order-total-${orderId}`}>
                          <IndianRupee className="h-3.5 w-3.5" />
                          {orderTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>

                    {/* User info strip */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-5 py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-semibold truncate" data-testid={`text-today-name-${orderId}`}>
                              {fullName}
                            </span>
                            {r.user.isAdmin && <ShieldCheck className="h-3 w-3 shrink-0 text-primary" />}
                            <span className="text-[10px] text-muted-foreground">@{r.user.username} · #{r.user.id}</span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1" data-testid={`text-today-mobile-${orderId}`}>
                              <Phone className="h-2.5 w-2.5" />
                              {r.user.mobileNumber || "—"}
                            </span>
                            <span className="flex items-center gap-1" data-testid={`text-today-tv-${orderId}`}>
                              <TrendingUp className="h-2.5 w-2.5" />
                              {r.user.tradingViewUsername}
                            </span>
                            <span className="flex items-center gap-1 truncate max-w-[220px]">
                              <Mail className="h-2.5 w-2.5" />
                              <span className="truncate">{r.user.email}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 px-2 text-xs"
                          onClick={() => onToggleExpanded(orderId)}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? `Hide quick view for order #${orderId}` : `Show quick view for order #${orderId}`}
                          data-testid={`button-today-quickview-${orderId}`}
                        >
                          <Eye className="h-3 w-3" />
                          Quick view
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2 text-xs"
                          onClick={() => onQuickView(r.user.id)}
                          data-testid={`button-today-details-${orderId}`}
                        >
                          <UserIcon className="h-3 w-3" />
                          View user
                        </Button>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="divide-y">
                      {itemCount === 0 ? (
                        <div
                          className="flex items-center gap-1.5 px-5 py-4 text-xs text-amber-700 dark:text-amber-400"
                          data-testid={`text-today-noitems-${orderId}`}
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                          No items in this order
                        </div>
                      ) : (
                        items.map((item, itemIdx) => {
                          runningItemNumber += 1;
                          const planLabel = item.isTrial ? "15-Day Trial" : `${item.duration} Month Plan`;
                          const itemPrice = parseFloat(item.price) || 0;
                          const rowTestKey = `${orderId}-${item.id}`;

                          return (
                            <div
                              key={item.id}
                              className="grid items-center gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                              data-testid={`row-today-${rowTestKey}`}
                            >
                              {/* indicator */}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-bold text-muted-foreground">{runningItemNumber}.</span>
                                  <Link
                                    href={`/indicator/${item.indicatorSlug}`}
                                    className="text-sm font-semibold hover:underline truncate text-cyan-700 dark:text-cyan-400"
                                    data-testid={`link-today-indicator-${item.id}`}
                                  >
                                    {item.indicatorName}
                                  </Link>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-1">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] uppercase tracking-wide ${item.version === "strategy"
                                      ? "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                      : "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                      }`}
                                  >
                                    {versionLabel(item.version)}
                                  </Badge>
                                  {item.isTrial && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] uppercase tracking-wide border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                    >
                                      Trial
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* plan + paid */}
                              <div className="space-y-0.5">
                                <p className="text-sm font-semibold text-foreground" data-testid={`text-today-plan-${rowTestKey}`}>
                                  {planLabel}
                                </p>
                                <p
                                  className="flex items-center text-xs text-muted-foreground"
                                  data-testid={`text-today-price-${rowTestKey}`}
                                >
                                  Paid <IndianRupee className="ml-1 h-3 w-3" />
                                  {itemPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                                </p>
                              </div>

                              {/* dates */}
                              <div className="space-y-0.5 text-xs">
                                <p className="flex items-center gap-1 text-muted-foreground">
                                  <CalendarDays className="h-3 w-3" />
                                  <span className="font-medium text-foreground">Buying:</span>
                                  <span data-testid={`text-today-date-${rowTestKey}`}>{orderDateStr}</span>
                                </p>
                                <p className="flex items-center gap-1 text-muted-foreground">
                                  <CalendarClock className="h-3 w-3" />
                                  <span className="font-medium text-foreground">Start:</span>
                                  <span data-testid={`text-today-start-${rowTestKey}`}>On approval</span>
                                </p>
                              </div>

                              {/* status */}
                              <div className="flex flex-col items-start gap-1">
                                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                                  <Hourglass className="h-3 w-3" /> Under Process
                                </span>
                                <span className="text-[10px] text-cyan-700 dark:text-cyan-400">Within 24 hours</span>
                              </div>

                              {/* action */}
                              <div className="flex justify-start lg:justify-end">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 gap-1 px-2 text-xs"
                                      disabled={isApprovingRow}
                                      data-testid={`button-today-actions-${rowTestKey}`}
                                      aria-label={`Actions for order #${orderId}`}
                                    >
                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                      Action
                                      <ChevronDown className="h-3 w-3 opacity-60" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuLabel className="text-[11px]">Order #{orderId}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onSelect={() => onApprove(orderId)}
                                      disabled={isApprovingRow}
                                      className="text-emerald-700 focus:text-emerald-700 dark:text-emerald-400 dark:focus:text-emerald-400"
                                      data-testid={`button-today-grant-${rowTestKey}`}
                                    >
                                      <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                                      Grant Order
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={() => onReject(orderId, fullName)}
                                      className="text-rose-700 focus:text-rose-700 dark:text-rose-400 dark:focus:text-rose-400"
                                      data-testid={`button-today-reject-${rowTestKey}`}
                                    >
                                      <X className="mr-2 h-3.5 w-3.5" />
                                      Reject Order
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={() => onToggleExpanded(orderId)}
                                      data-testid={`button-today-hold-${rowTestKey}`}
                                    >
                                      <Hourglass className="mr-2 h-3.5 w-3.5" />
                                      Hold
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Multi-item notice */}
                    {itemCount > 1 && (
                      <div
                        className="border-t bg-amber-500/5 px-5 py-2 text-[11px] text-amber-700 dark:text-amber-400"
                        data-testid={`text-today-multi-${orderId}`}
                      >
                        Action above will Grant or Reject all {itemCount} items in this order together.
                      </div>
                    )}

                    {/* Expanded quick view */}
                    {isExpanded && (
                      <div
                        className="grid gap-3 border-t border-cyan-500/15 bg-cyan-500/[0.04] px-5 py-4 sm:grid-cols-2 lg:grid-cols-4"
                        data-testid={`row-today-expanded-${orderId}`}
                      >
                        <QuickInfo icon={Mail} label="Email" value={r.user.email} testId={`quick-email-${orderId}`} />
                        <QuickInfo icon={Phone} label="Mobile" value={r.user.mobileNumber || "—"} testId={`quick-mobile-${orderId}`} />
                        <QuickInfo icon={Calendar} label="Joined" value={formatShortDate(r.user.createdAt)} testId={`quick-joined-${orderId}`} />
                        <QuickInfo icon={CreditCard} label="Lifetime Spent" value={formatINR(r.user.totalSpent)} testId={`quick-spent-${orderId}`} />
                        <QuickInfo icon={Package} label="Order ID" value={`#${orderId}`} mono testId={`quick-orderid-${orderId}`} />
                        <QuickInfo
                          icon={Clock}
                          label="Order Total"
                          value={formatINR(orderTotal)}
                          testId={`quick-ordertotal-${orderId}`}
                        />
                        <QuickInfo
                          icon={Inbox}
                          label="Items in Order"
                          value={String(itemCount)}
                          testId={`quick-itemcount-${orderId}`}
                        />
                        <QuickInfo
                          icon={AlertCircle}
                          label="Other Pending"
                          value={String(
                            r.user.orders.filter((o) => o.status === "pending" && o.id !== orderId).length
                          )}
                          testId={`quick-otherpending-${orderId}`}
                        />
                        {itemCount > 0 && (
                          <div className="sm:col-span-2 lg:col-span-4">
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Item-level subscription dates (if approved now)
                            </p>
                            <div className="flex flex-col gap-1">
                              {items.map((it) => {
                                const itEnd = calculateEndDate(new Date().toISOString(), it.duration, it.isTrial);
                                return (
                                  <div
                                    key={it.id}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background px-2 py-1.5 text-xs"
                                    data-testid={`detail-orderitem-${it.id}`}
                                  >
                                    <span className="font-medium">{it.indicatorName}</span>
                                    <span className="text-muted-foreground">
                                      {it.isTrial ? "15-Day Trial" : `${it.duration} Month Plan`} · ends{" "}
                                      <span className="font-medium text-foreground">
                                        {itEnd.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                      </span>{" "}
                                      · {formatINR(parseFloat(it.price) || 0)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              });
              return cards;
            })()}
          </div>
        )}
      </div>
    </section>
  );
}

function QuickInfo({
  icon: Icon, label, value, testId, mono,
}: { icon: typeof UserIcon; label: string; value: string; testId?: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2" data-testid={testId}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-xs font-medium break-all ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
