import { useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import {
  ArrowLeft,
  Mail,
  Phone,
  TrendingUp,
  User as UserIcon,
  ShieldCheck,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  Receipt,
  IndianRupee,
  CalendarDays,
  ExternalLink,
  AlertTriangle,
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

function versionLabel(version: string | null): string {
  if (version === "strategy") return "Strategy";
  if (version === "both") return "Indicator + Strategy";
  return "Indicator";
}

function planBadgeClass(planType: AdminUser["planType"]) {
  if (planType === "paid") return "bg-amber-500/10 text-amber-700 border-amber-500/20";
  if (planType === "trial") return "bg-violet-500/10 text-violet-700 border-violet-500/20";
  if (planType === "free") return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
  return "bg-muted text-muted-foreground border-border";
}

function statusBadgeClass(status: string) {
  if (status === "approved") return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
  if (status === "rejected") return "bg-red-500/10 text-red-700 border-red-500/20";
  return "bg-amber-500/10 text-amber-700 border-amber-500/20";
}

function paymentBadgeClass(status: string | null) {
  if (status === "paid") return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
  if (status === "failed") return "bg-red-500/10 text-red-700 border-red-500/20";
  return "bg-amber-500/10 text-amber-700 border-amber-500/20";
}

export default function AdminUserDetailsPage() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/admin/users/:id");
  const userId = Number(params?.id);

  const { toast } = useToast();
  const [rejectOrder, setRejectOrder] = useState<{ id: number; userName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!authUser?.isAdmin,
  });

  const selectedUser = useMemo(() => {
    return users?.find((u) => u.id === userId) ?? null;
  }, [users, userId]);

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
    onError: (e: Error) => {
      toast({ variant: "destructive", title: "Failed to approve", description: e.message });
    },
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
    onError: (e: Error) => {
      toast({ variant: "destructive", title: "Failed to reject", description: e.message });
    },
  });

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
        <p className="mt-1 text-muted-foreground">Please sign in to access admin user details.</p>
        <Button className="mt-6" onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  if (!authUser.isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
        <h2 className="mt-4 text-2xl font-bold">Access denied</h2>
        <p className="mt-1 text-muted-foreground">You don't have permission to view this page.</p>
        <Button className="mt-6" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="mb-4 h-10 w-64" />
        <Skeleton className="mb-4 h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!selectedUser) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <UserIcon className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-2xl font-bold">User not found</h2>
        <p className="mt-1 text-muted-foreground">This admin user record does not exist.</p>
        <Button className="mt-6" onClick={() => navigate("/admin")}>
          Back to Admin
        </Button>
      </div>
    );
  }

  const fullName = `${selectedUser.firstName} ${selectedUser.lastName}`;
  const initials = `${selectedUser.firstName.charAt(0)}${selectedUser.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Link>
          </Button>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={planBadgeClass(selectedUser.planType)}>
              {selectedUser.planType.toUpperCase()} PLAN
            </Badge>
            {selectedUser.hasActivePlan && selectedUser.daysRemaining !== null && (
              <Badge variant="outline">
                {selectedUser.daysRemaining} days remaining
              </Badge>
            )}
          </div>
        </div>

        <Card className="mb-5 border-card-border p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold">{fullName}</h1>
                  {selectedUser.isAdmin && (
                    <Badge variant="outline" className="bg-primary/5 text-primary">
                      <ShieldCheck className="mr-1 h-3 w-3" />
                      Admin
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  @{selectedUser.username} · User ID #{selectedUser.id}
                </p>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <InfoLine icon={Mail} label="Email" value={selectedUser.email} />
                  <InfoLine icon={Phone} label="Mobile" value={selectedUser.mobileNumber || "—"} />
                  <InfoLine icon={TrendingUp} label="TradingView" value={selectedUser.tradingViewUsername || "—"} />
                  <InfoLine icon={CalendarDays} label="Joined" value={formatShortDate(selectedUser.createdAt)} />
                  <InfoLine icon={Package} label="Total Orders" value={String(selectedUser.totalOrders)} />
                  <InfoLine icon={IndianRupee} label="Total Spent" value={formatINR(selectedUser.totalSpent)} />
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">Orders & Payment Details</h2>
            <p className="text-xs text-muted-foreground">
              Shows payment status, Razorpay IDs, purchased indicators, and access status.
            </p>
          </div>
          <Badge variant="outline">{selectedUser.orders.length} orders</Badge>
        </div>

        {selectedUser.orders.length === 0 ? (
          <Card className="border-dashed p-10 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No orders yet</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {selectedUser.orders.map((order) => {
              const total = parseFloat(order.totalAmount) || 0;

              return (
                <Card key={order.id} className="overflow-hidden border-card-border">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      <span className="font-bold">Order #{order.id}</span>
                      <Badge variant="outline" className={statusBadgeClass(order.status)}>
                        {order.status.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className={paymentBadgeClass(order.paymentStatus)}>
                        Payment: {(order.paymentStatus || "pending").toUpperCase()}
                      </Badge>
                    </div>

                    <div className="text-right">
                      <p className="font-bold">{formatINR(total)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 border-b bg-muted/20 px-4 py-3 text-xs md:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground">Razorpay Payment ID</p>
                      <p className="break-all font-mono font-semibold">
                        {order.razorpayPaymentId || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Razorpay Order ID</p>
                      <p className="break-all font-mono font-semibold">
                        {order.razorpayOrderId || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Paid At</p>
                      <p className="font-semibold">{formatDate(order.paidAt)}</p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Approved At</p>
                      <p className="font-semibold">{formatDate(order.approvedAt)}</p>
                    </div>
                  </div>

                  {order.status === "rejected" && order.rejectionReason && (
                    <div className="border-b bg-red-500/5 px-4 py-3 text-sm">
                      <span className="font-semibold text-red-600">Reject Reason:</span>{" "}
                      {order.rejectionReason}
                    </div>
                  )}

                  <div className="divide-y">
                    {order.items.length === 0 ? (
                      <div className="px-4 py-5 text-sm text-muted-foreground">
                        No items in this order.
                      </div>
                    ) : (
                      order.items.map((item) => (
                        <div key={item.id} className="grid gap-3 px-4 py-3 text-sm lg:grid-cols-[1.5fr_1fr_1fr_auto] lg:items-center">
                          <div className="min-w-0">
                            <Link
                              href={`/indicator/${item.indicatorSlug}`}
                              className="font-semibold text-primary hover:underline"
                            >
                              {item.indicatorName}
                              <ExternalLink className="ml-1 inline h-3 w-3" />
                            </Link>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-[10px]">
                                {versionLabel(item.version)}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {item.isTrial ? "15-Day Trial" : `${item.duration} Month`}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {item.indicatorTier}
                              </Badge>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">Access</p>
                            <p className="font-semibold capitalize">
                              {item.accessStatus}
                              {item.daysRemaining !== null && item.accessStatus === "active"
                                ? ` · ${item.daysRemaining}d left`
                                : ""}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">Price</p>
                            <p className="font-semibold">{formatINR(parseFloat(item.price) || 0)}</p>
                          </div>

                          <div className="lg:text-right">
                            <p className="text-xs text-muted-foreground">Item ID</p>
                            <p className="font-mono text-xs">#{item.id}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {order.status === "pending" && (
                    <div className="flex flex-wrap gap-2 border-t bg-muted/20 px-4 py-3">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(order.id)}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        Approve Order
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setRejectOrder({ id: order.id, userName: fullName });
                          setRejectReason("");
                        }}
                      >
                        <XCircle className="mr-1.5 h-4 w-4" />
                        Reject Order
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={!!rejectOrder}
        onOpenChange={(open) => {
          if (!open) {
            setRejectOrder(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Order #{rejectOrder?.id}</DialogTitle>
            <DialogDescription>
              {rejectOrder ? `This reason will be visible to ${rejectOrder.userName} on their dashboard.` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor="reject-reason-input" className="text-sm font-medium">
              Rejection reason
            </label>
            <Textarea
              id="reject-reason-input"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Payment not received, invalid TradingView username, etc."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectOrder(null);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              disabled={rejectReason.trim().length < 3 || rejectMutation.isPending}
              onClick={() => {
                if (rejectOrder && rejectReason.trim().length >= 3) {
                  rejectMutation.mutate({
                    orderId: rejectOrder.id,
                    reason: rejectReason.trim(),
                  });
                }
              }}
            >
              Reject Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="break-all font-medium">{value}</p>
      </div>
    </div>
  );
}