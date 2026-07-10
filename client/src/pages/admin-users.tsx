import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/components/auth-provider";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import {
  ArrowLeft,
  Search,
  Users,
  Mail,
  Phone,
  TrendingUp,
  CreditCard,
  Receipt,
  IndianRupee,
  CalendarDays,
  ShieldCheck,
  AlertTriangle,
  Eye,
} from "lucide-react";

interface AdminOrderItem {
  id: number;
  orderId: number;
  indicatorId: number;
  duration: number;
  price: string;
  isTrial: boolean | null;
  version: string | null;
  indicatorName: string;
  indicatorSlug: string;
  indicatorTier: string;
  daysRemaining: number | null;
  accessStatus: "pending" | "active" | "expired" | "rejected";
}

interface AdminOrder {
  id: number;
  userId: number;
  status: string;
  totalAmount: string;
  rejectionReason: string | null;
  createdAt: string;
  approvedAt: string | null;

  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  paymentStatus: string | null;
  paidAt: string | null;

  items: AdminOrderItem[];
}

interface AdminUser {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  mobileNumber: string;
  tradingViewUsername: string;
  isAdmin: boolean | null;
  createdAt: string;
  orders: AdminOrder[];
  hasActivePlan: boolean;
  planType: "paid" | "trial" | "free" | "none";
  daysRemaining: number | null;
  totalOrders: number;
  totalSpent: number;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function getLatestOrder(user: AdminUser): AdminOrder | null {
  if (!user.orders || user.orders.length === 0) return null;

  return [...user.orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
}

function statusClass(status: string) {
  if (status === "approved") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }

  if (status === "rejected") {
    return "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400";
  }

  return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400";
}

function paymentClass(status: string | null) {
  if (status === "paid") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }

  if (status === "failed") {
    return "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400";
  }

  return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400";
}

function planClass(planType: AdminUser["planType"]) {
  if (planType === "paid") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  }

  if (planType === "trial") {
    return "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-400";
  }

  if (planType === "free") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }

  return "border-border bg-muted text-muted-foreground";
}

export default function AdminUsersPage() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!authUser?.isAdmin,
  });

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    const list = users ?? [];

    if (!q) return list;

    return list.filter((u) => {
      const latestOrder = getLatestOrder(u);

      return [
        u.firstName,
        u.lastName,
        u.username,
        u.email,
        u.mobileNumber,
        u.tradingViewUsername,
        String(u.id),
        latestOrder?.id ? String(latestOrder.id) : "",
        latestOrder?.razorpayOrderId || "",
        latestOrder?.razorpayPaymentId || "",
        latestOrder?.paymentStatus || "",
        latestOrder?.status || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [users, search]);

  const totalUsers = users?.length ?? 0;
  const paidUsers = users?.filter((u) => u.planType === "paid").length ?? 0;
  const trialUsers = users?.filter((u) => u.planType === "trial").length ?? 0;
  const activeUsers = users?.filter((u) => u.hasActivePlan).length ?? 0;

  if (authLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <Skeleton className="mb-4 h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-2xl font-bold">Sign in required</h2>
        <p className="mt-1 text-muted-foreground">
          Please sign in to access admin users.
        </p>
        <Button className="mt-6" onClick={() => navigate("/")}>
          Go Home
        </Button>
      </div>
    );
  }

  if (!authUser.isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
        <h2 className="mt-4 text-2xl font-bold">Access denied</h2>
        <p className="mt-1 text-muted-foreground">
          You don't have permission to view this page.
        </p>
        <Button className="mt-6" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">

            <div>
              <h1 className="text-2xl font-bold tracking-tight">All Users</h1>
              <p className="text-sm text-muted-foreground">
                Full user list with orders, payment status, and Razorpay details.
              </p>
            </div>
          </div>
        </div>

        <Card className="mb-4 border-card-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, mobile, TradingView, order id, Razorpay id..."
              className="pl-9"
              data-testid="input-admin-users-search"
            />
          </div>
        </Card>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card className="border-dashed p-10 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">No users found</p>
            <p className="text-sm text-muted-foreground">
              Try another search term.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((u) => {
              const latestOrder = getLatestOrder(u);
              const latestItems = latestOrder?.items ?? [];
              const fullName = `${u.firstName} ${u.lastName}`;
              const initials = `${u.firstName?.charAt(0) || ""}${u.lastName?.charAt(0) || ""}`.toUpperCase();

              return (
                <Card
                  key={u.id}
                  className="overflow-hidden border-card-border"
                  data-testid={`admin-user-card-${u.id}`}
                >
                  <div className="grid gap-4 p-4 lg:grid-cols-[1.2fr_1fr_1.2fr_auto] lg:items-start">
                    <div className="flex min-w-0 gap-3">
                      <Avatar className="h-11 w-11 shrink-0">
                        <AvatarFallback className="bg-primary/10 font-bold text-primary">
                          {initials || "U"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{fullName}</p>
                          {u.isAdmin && (
                            <Badge variant="outline" className="text-[10px]">
                              Admin
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${planClass(u.planType)}`}
                          >
                            {u.planType.toUpperCase()}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          @{u.username} · User #{u.id}
                        </p>

                        <div className="mt-2 space-y-1 text-xs">
                          <InfoLine icon={Mail} value={u.email || "—"} />
                          <InfoLine icon={Phone} value={u.mobileNumber || "—"} />
                          <InfoLine
                            icon={TrendingUp}
                            value={u.tradingViewUsername || "No TradingView username"}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-xs">
                      <p className="mb-1 font-semibold">Plan Summary</p>
                      <div className="space-y-1 text-muted-foreground">
                        <p>Total orders: {u.totalOrders}</p>
                        <p>Total spent: {formatINR(u.totalSpent)}</p>
                        <p>Joined: {formatShortDate(u.createdAt)}</p>
                        <p>
                          Active:{" "}
                          <span className={u.hasActivePlan ? "text-emerald-600" : "text-muted-foreground"}>
                            {u.hasActivePlan ? "Yes" : "No"}
                          </span>
                          {u.daysRemaining !== null && u.hasActivePlan
                            ? ` · ${u.daysRemaining}d left`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs">
                      <p className="mb-1 font-semibold">Latest Order / Payment</p>

                      {!latestOrder ? (
                        <p className="text-muted-foreground">No order yet</p>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${statusClass(latestOrder.status)}`}
                            >
                              Order: {latestOrder.status.toUpperCase()}
                            </Badge>

                            <Badge
                              variant="outline"
                              className={`text-[10px] ${paymentClass(latestOrder.paymentStatus)}`}
                            >
                              Payment: {(latestOrder.paymentStatus || "pending").toUpperCase()}
                            </Badge>
                          </div>

                          <p>
                            Order #{latestOrder.id} ·{" "}
                            {formatINR(parseFloat(latestOrder.totalAmount) || 0)}
                          </p>

                          <p className="text-muted-foreground">
                            Created: {formatDate(latestOrder.createdAt)}
                          </p>

                          <p className="text-muted-foreground">
                            Paid At: {formatDate(latestOrder.paidAt)}
                          </p>

                          <p className="break-all font-mono">
                            Payment ID: {latestOrder.razorpayPaymentId || "—"}
                          </p>

                          <p className="break-all font-mono">
                            Order ID: {latestOrder.razorpayOrderId || "—"}
                          </p>

                          {latestItems.length > 0 && (
                            <div className="pt-1">
                              <p className="font-medium">Items:</p>
                              <p className="line-clamp-2 text-muted-foreground">
                                {latestItems
                                  .map((item) => item.indicatorName)
                                  .join(", ")}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex lg:justify-end">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/users/${u.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Full
                        </Link>
                      </Button>
                    </div>
                  </div>
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
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Users;
}) {
  return (
    <Card className="border-card-border p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-lg font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function InfoLine({
  icon: Icon,
  value,
}: {
  icon: typeof Mail;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="break-all text-muted-foreground">{value}</span>
    </div>
  );
}