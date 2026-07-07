import { Link, useLocation } from "wouter";
import { Trash2, ArrowLeft, ShoppingCart, ArrowRight, Clock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/components/cart-provider";
import { useAuth } from "@/components/auth-provider";
import { motion, AnimatePresence } from "framer-motion";

const durationOptions = [
  { value: "1", label: "1 Month" },
  { value: "2", label: "2 Months" },
  { value: "3", label: "3 Months" },
  { value: "6", label: "6 Months" },
  { value: "12", label: "12 Months" },
];

export default function CartPage() {
  const { items, removeItem, updateDuration, totalPrice, clearCart } = useCart();
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
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/indicators">
        <Button variant="ghost" size="sm" className="mb-6" data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" /> Continue Shopping
        </Button>
      </Link>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" data-testid="text-cart-title">Your Cart</h1>
            <p className="mt-1 text-muted-foreground">{items.length} indicator{items.length !== 1 ? "s" : ""} selected</p>
          </div>
          <Button variant="outline" size="sm" onClick={clearCart} data-testid="button-clear-cart">
            Clear All
          </Button>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-4" data-testid="cart-items">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div
                  key={item.indicatorId}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="border-card-border p-5" data-testid={`cart-item-${item.indicatorId}`}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/indicator/${item.slug}`} className="text-base font-semibold hover:underline" data-testid={`text-item-name-${item.indicatorId}`}>
                            {item.name}
                          </Link>
                          <Badge
                            variant="outline"
                            className={`text-xs ${item.version !== "indicator" ? "border-primary/40 text-primary" : ""}`}
                            data-testid={`badge-version-${item.indicatorId}`}
                          >
                            {item.version === "strategy" ? "Strategy" : item.version === "both" ? "Indicator + Strategy" : "Indicator"}
                          </Badge>
                          {item.isTrial ? (
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-trial-${item.indicatorId}`}>
                              <Clock className="mr-1 h-3 w-3" /> 15-Day Trial
                            </Badge>
                          ) : parseFloat(item.price) === 0 ? (
                            <Badge variant="secondary" className="text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                              Free
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <Tag className="mr-1 h-3 w-3" /> ₹{Number(item.price).toLocaleString("en-IN")}/mo
                            </Badge>
                          )}
                        </div>

                        {!item.isTrial && parseFloat(item.price) > 0 && (
                          <div className="mt-3 flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">Duration:</span>
                            <Select
                              value={String(item.duration)}
                              onValueChange={(val) => updateDuration(item.indicatorId, parseInt(val))}
                            >
                              <SelectTrigger className="w-36" data-testid={`select-duration-${item.indicatorId}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {durationOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value} data-testid={`option-duration-${opt.value}`}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {!item.isTrial && parseFloat(item.price) === 0 && (
                          <div className="mt-3 flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">Duration:</span>
                            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400" data-testid={`text-lifetime-${item.indicatorId}`}>Lifetime</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {item.isTrial ? (
                            <p className="text-lg font-bold text-primary" data-testid={`text-item-total-${item.indicatorId}`}>₹{Number(item.price).toLocaleString("en-IN")}</p>
                          ) : parseFloat(item.price) === 0 ? (
                            <p className="text-lg font-bold text-emerald-500 dark:text-emerald-400" data-testid={`text-item-total-${item.indicatorId}`}>Free</p>
                          ) : (
                            <>
                              <p className="text-lg font-bold" data-testid={`text-item-total-${item.indicatorId}`}>
                                ₹{(parseFloat(item.price) * item.duration).toLocaleString("en-IN")}
                              </p>
                              {item.duration > 1 && (
                                <p className="text-xs text-muted-foreground">
                                  ₹{Number(item.price).toLocaleString("en-IN")} x {item.duration} months
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.indicatorId)}
                          data-testid={`button-remove-${item.indicatorId}`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            <Link href="/indicators">
              <Button variant="outline" className="w-full mt-4" data-testid="button-add-more">
                <ShoppingCart className="mr-2 h-4 w-4" /> Add More Indicators
              </Button>
            </Link>
          </div>

          <div className="lg:w-80">
            <Card className="sticky top-24 border-card-border p-6" data-testid="cart-summary">
              <h3 className="text-base font-semibold">Order Summary</h3>
              <Separator className="my-4" />

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.indicatorId} className="flex items-center justify-between text-sm gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-muted-foreground truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground/70">
                        {item.version === "strategy" ? "Strategy" : item.version === "both" ? "Indicator + Strategy" : "Indicator"}
                        {!item.isTrial && parseFloat(item.price) > 0 ? ` · ${item.duration}m` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-medium">
                      {item.isTrial ? `₹${Number(item.price).toLocaleString("en-IN")}` : parseFloat(item.price) === 0 ? "Free" : `₹${(parseFloat(item.price) * item.duration).toLocaleString("en-IN")}`}
                    </span>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold" data-testid="text-total-price">₹{totalPrice.toLocaleString("en-IN")}</span>
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
