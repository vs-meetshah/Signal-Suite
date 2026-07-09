import { Link, useLocation } from "wouter";
import { Trash2, ArrowLeft, ShoppingCart, ArrowRight, Clock, Tag, CalendarDays, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { computeCartItemTotal, getDurationDiscount, useCart } from "@/components/cart-provider";
import { useAuth } from "@/components/auth-provider";
import { motion, AnimatePresence } from "framer-motion";

const getVersionLabel = (version?: string | null) => {
  if (version === "strategy") return "Strategy";
  if (version === "both") return "Indicator + Strategy";
  return "Indicator";
};

const getDurationLabel = (duration?: number | null, isTrial?: boolean | null, price?: string | null) => {
  if (isTrial) return "15-Day Trial";
  if (parseFloat(price || "0") === 0) return "Lifetime";
  if (!duration) return "Not selected";
  return duration === 1 ? "1 Month" : `${duration} Months`;
};

const formatPrice = (value: number) => {
  if (value === 0) return "Free";
  return `₹${Number(value).toLocaleString("en-IN")}`;
};

const formatDiscount = (discount: number) => `${Math.round(discount * 100)}% off`;

export default function CartPage() {
  const { items, removeItem, totalPrice, clearCart } = useCart();
  const { user, openAuthModal } = useAuth();
  const [, navigate] = useLocation();

  const handleProceed = () => {
    if (user) {
      navigate("/checkout");
    } else {
      openAuthModal({
        onSuccess: () => navigate("/checkout"),
      });
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ShoppingCart className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="mt-6 text-2xl font-bold" data-testid="text-empty-cart">Your cart is empty</h2>
          <p className="mt-2 text-muted-foreground">Browse our collection of indicators and add them to your cart.</p>
          <Link href="/indicators">
            <Button className="mt-6" data-testid="button-browse">
              <ArrowLeft className="mr-2 h-4 w-4" /> Browse Indicators
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/indicators">
        <Button variant="ghost" size="sm" className="mb-6" data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" /> Continue Shopping
        </Button>
      </Link>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" data-testid="text-cart-title">
              Your Cart
            </h1>
            <p className="mt-1 text-muted-foreground">
              Review your selected access before checkout
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={clearCart} data-testid="button-clear-cart">
            Clear All
          </Button>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-4" data-testid="cart-items">
            <AnimatePresence mode="popLayout">
              {items.map((item) => {
                const itemTotal = computeCartItemTotal(item);
                const isFree = !item.isTrial && parseFloat(item.price) === 0;
                const monthlyPrice = parseFloat(item.price) || 0;
                const originalTotal = monthlyPrice * item.duration;
                const discount = !item.isTrial && !isFree ? getDurationDiscount(item.duration) : 0;
                const savings = discount > 0 ? Math.max(0, originalTotal - itemTotal) : 0;

                return (
                  <motion.div
                    key={item.indicatorId}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="overflow-hidden border-card-border p-5" data-testid={`cart-item-${item.indicatorId}`}>
                      <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/indicator/${item.slug}`}
                                className="text-lg font-semibold hover:underline"
                                data-testid={`text-item-name-${item.indicatorId}`}
                              >
                                {item.name}
                              </Link>

                              <Badge
                                variant="outline"
                                className={`text-xs ${item.version !== "indicator" ? "border-primary/40 text-primary" : ""}`}
                                data-testid={`badge-version-${item.indicatorId}`}
                              >
                                {getVersionLabel(item.version)}
                              </Badge>

                              {item.isTrial ? (
                                <Badge variant="secondary" className="text-xs" data-testid={`badge-trial-${item.indicatorId}`}>
                                  <Clock className="mr-1 h-3 w-3" /> 15-Day Trial
                                </Badge>
                              ) : isFree ? (
                                <Badge variant="secondary" className="border-emerald-500/20 bg-emerald-500/15 text-xs text-emerald-600 dark:text-emerald-400">
                                  Free
                                </Badge>
                              ) : (
                                <>
                                  <Badge variant="outline" className="text-xs">
                                    <Tag className="mr-1 h-3 w-3" /> ₹{Number(item.price).toLocaleString("en-IN")}/mo
                                  </Badge>
                                  {discount > 0 && (
                                    <Badge className="border-emerald-500/20 bg-emerald-500/15 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400">
                                      {formatDiscount(discount)}
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>

                            <p className="mt-1 text-sm text-muted-foreground">
                              To change plan or duration, remove this item and add it again.
                            </p>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.indicatorId)}
                            data-testid={`button-remove-${item.indicatorId}`}
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>

                        <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-3">
                          <div>
                            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              <PackageCheck className="h-3.5 w-3.5" />
                              Product
                            </p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                              {getVersionLabel(item.version)}
                            </p>
                          </div>

                          <div>
                            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              <CalendarDays className="h-3.5 w-3.5" />
                              Duration
                            </p>
                            <p className="mt-1 text-sm font-semibold text-foreground" data-testid={`text-duration-${item.indicatorId}`}>
                              {getDurationLabel(item.duration, item.isTrial, item.price)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Amount
                            </p>
                            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              <p
                                className={`text-sm font-semibold ${
                                  isFree ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                                }`}
                                data-testid={`text-item-total-${item.indicatorId}`}
                              >
                                {formatPrice(itemTotal)}
                              </p>
                              {!item.isTrial && !isFree && discount > 0 && (
                                <p className="text-xs text-muted-foreground line-through">
                                  {formatPrice(originalTotal)}
                                </p>
                              )}
                            </div>

                            {!item.isTrial && !isFree && (
                              <>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  ₹{Number(item.price).toLocaleString("en-IN")} x {item.duration} month{item.duration > 1 ? "s" : ""}
                                </p>
                                {discount > 0 && savings > 0 && (
                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium">
                                    <span className="inline-flex items-center rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1.5 font-semibold text-emerald-700 shadow-sm shadow-emerald-500/10 dark:border-emerald-500/30 dark:bg-emerald-500/12 dark:text-emerald-400">
                                      You save {formatPrice(savings)}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <Link href="/indicators">
              <Button variant="outline" className="mt-4 w-full" data-testid="button-add-more">
                <ShoppingCart className="mr-2 h-4 w-4" /> Add More Indicators
              </Button>
            </Link>
          </div>

          <div className="lg:w-80">
            <Card className="sticky top-24 border-card-border p-6" data-testid="cart-summary">
              <h3 className="text-base font-semibold">Order Summary</h3>
              <Separator className="my-4" />

              <div className="space-y-3">
                {items.map((item) => {
                  const itemTotal = computeCartItemTotal(item);

                  return (
                    <div key={item.indicatorId} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {getVersionLabel(item.version)} · {getDurationLabel(item.duration, item.isTrial, item.price)}
                        </p>
                      </div>

                      <span className="shrink-0 font-semibold">
                        {formatPrice(itemTotal)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <Separator className="my-4" />

              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold" data-testid="text-total-price">
                  {formatPrice(totalPrice)}
                </span>
              </div>

              <Button className="mt-6 w-full" size="lg" onClick={handleProceed} data-testid="button-proceed">
                Proceed <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
