import { Link, useLocation } from "wouter";
import { ArrowLeft, CheckCircle2, User, Mail, Phone, AtSign, Monitor, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import type { InsertUser } from "@shared/schema";
import { computeCartItemTotal, getDurationDiscount, useCart } from "@/components/cart-provider";
import { useAuth } from "@/components/auth-provider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
declare global {
  interface Window {
    Razorpay?: any;
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const { items, totalPrice, clearCart } = useCart();
  const { user, signupOrLogin, openAuthModal } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [orderComplete, setOrderComplete] = useState(false);
  const [completedFreeOrder, setCompletedFreeOrder] = useState(false);
  const [isEditing, setIsEditing] = useState(!user);

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      username: user?.username || "",
      email: user?.email || "",
      mobileNumber: user?.mobileNumber || "",
      tradingViewUsername: user?.tradingViewUsername || "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        mobileNumber: user.mobileNumber,
        tradingViewUsername: user.tradingViewUsername,
      });
      setIsEditing(false);
    }
  }, [user, form]);

  const submitMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      if (!user) {
        await signupOrLogin(data);
      } else if (isEditing) {
        await apiRequest("POST", "/api/auth/update", {
          firstName: data.firstName,
          lastName: data.lastName,
          mobileNumber: data.mobileNumber,
          tradingViewUsername: data.tradingViewUsername,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }

      const orderData = {
        totalAmount: totalPrice.toFixed(2),
        items: items.map((item) => ({
          indicatorId: item.indicatorId,
          duration: item.duration,
          isTrial: item.isTrial,
          version: item.version,
        })),
      };

      if (totalPrice <= 0) {
        await apiRequest("POST", "/api/orders", { items: orderData.items });
        return { free: true };
      }

      const createRes = await apiRequest("POST", "/api/razorpay/create-order", orderData);
      const razorpayOrder = await createRes.json();

      await loadRazorpayScript();
      if (!window.Razorpay) {
        throw new Error("Razorpay checkout script not loaded");
      }

      await new Promise<void>((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: razorpayOrder.keyId,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: "Pine Signal Lab",
          description: "Trading indicator access",
          order_id: razorpayOrder.razorpayOrderId,
          prefill: {
            name: `${data.firstName} ${data.lastName}`,
            email: data.email,
            contact: data.mobileNumber,
          },
          theme: {
            color: "#2563eb",
          },
          handler: async (response: any) => {
            try {
              await apiRequest("POST", "/api/razorpay/verify-payment", {
                ...response,
                items: orderData.items,
              });

              resolve();
            } catch (error) {
              reject(error);
            }
          },
          modal: {
            ondismiss: () => {
              reject(new Error("Payment cancelled"));
            },
          },
        });

        razorpay.open();
      });

      return { free: false };
    },
    onSuccess: async (result) => {
      clearCart();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] }),
      ]);
      setCompletedFreeOrder(result.free);
      setOrderComplete(true);
      toast({
        title: result.free ? "Request submitted" : "Payment successful",
        description: result.free
          ? "Your free indicator request has been submitted for approval."
          : "Your order has been submitted for approval.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (items.length === 0 && !orderComplete) {
    navigate("/cart");
    return null;
  }

  if (orderComplete) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-6 text-2xl font-bold" data-testid="text-order-complete">
            {completedFreeOrder ? "Request Submitted" : "Payment Successful"}
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            {completedFreeOrder
              ? "Your free indicator request has been submitted for admin approval. You'll get access once it is approved."
              : "Your payment has been received. Your order is now submitted for approval. You'll get indicator access within 24 hours after approval."}
          </p>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            Check your order status in <Link href="/dashboard" className="font-medium text-primary hover:underline">Profile → Dashboard</Link>, and feel free to contact Help/Support desk directly from there if you face any issues.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard">
              <Button size="lg" data-testid="button-go-dashboard">
                Go to Dashboard
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="lg" data-testid="button-back-home">
                Back to Home
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const originalTotal = items.reduce((sum, item) => {
    if (item.isTrial) return sum + Number(item.price || 0);
    return sum + (Number(item.price || 0) * item.duration);
  }, 0);

  const totalSavings = Math.max(0, originalTotal - totalPrice);

  const formFields = [
    { name: "firstName" as const, label: "First Name", placeholder: "John", icon: User, type: "text" },
    { name: "lastName" as const, label: "Last Name", placeholder: "Doe", icon: User, type: "text" },
    { name: "username" as const, label: "Username", placeholder: "johndoe", icon: AtSign, type: "text" },
    { name: "email" as const, label: "Email Address", placeholder: "john@example.com", icon: Mail, type: "email" },
    { name: "mobileNumber" as const, label: "Mobile Number", placeholder: "+1 234 567 8901", icon: Phone, type: "tel" },
    { name: "tradingViewUsername" as const, label: "TradingView Username", placeholder: "Your TradingView handle", icon: Monitor, type: "text" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/cart">
        <Button variant="ghost" size="sm" className="mb-6" data-testid="button-back-cart">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Cart
        </Button>
      </Link>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" data-testid="text-checkout-title">
          Complete Your Order
        </h1>
        <p className="mt-2 text-muted-foreground">
          {user
            ? "Review your details below and place your order."
            : "Fill in your details below to get access to your selected indicators."}
        </p>

        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          <div className="flex-1">
            <Card className="border-card-border p-6 sm:p-8" data-testid="registration-form">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Your Information</h2>
                {user && !isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    data-testid="button-edit-details"
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                  </Button>
                )}
              </div>

              {user && !isEditing ? (
                <div className="space-y-4" data-testid="user-details-display">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {formFields.map((field) => (
                      <div
                        key={field.name}
                        className={`rounded-md border bg-muted/50 px-4 py-3 ${field.name === "email" || field.name === "tradingViewUsername" ? "sm:col-span-2" : ""}`}
                      >
                        <p className="text-xs text-muted-foreground mb-0.5">{field.label}</p>
                        <p className="text-sm font-medium" data-testid={`text-detail-${field.name}`}>
                          {user[field.name as keyof typeof user] as string}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-6" />

                  <Button
                    size="lg"
                    className="w-full"
                    disabled={submitMutation.isPending}
                    onClick={() => submitMutation.mutate(form.getValues())}
                    data-testid="button-submit-order"
                  >
                    {submitMutation.isPending ? "Submitting..." : "Place Order"}
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => submitMutation.mutate(data))} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      {formFields.map((field) => (
                        <FormField
                          key={field.name}
                          control={form.control}
                          name={field.name}
                          render={({ field: fieldProps }) => (
                            <FormItem className={field.name === "email" || field.name === "tradingViewUsername" ? "sm:col-span-2" : ""}>
                              <FormLabel>{field.label}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <field.icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <Input
                                    {...fieldProps}
                                    type={field.type}
                                    placeholder={field.placeholder}
                                    disabled={!!user && (field.name === "username" || field.name === "email")}
                                    className="pl-10"
                                    data-testid={`input-${field.name}`}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>

                    <Separator className="my-6" />

                    <div className="flex gap-3">
                      {user && isEditing && (
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          className="flex-1"
                          onClick={() => {
                            setIsEditing(false);
                            form.reset({
                              firstName: user.firstName,
                              lastName: user.lastName,
                              username: user.username,
                              email: user.email,
                              mobileNumber: user.mobileNumber,
                              tradingViewUsername: user.tradingViewUsername,
                            });
                          }}
                          data-testid="button-cancel-edit"
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        type="submit"
                        size="lg"
                        className="flex-1"
                        disabled={submitMutation.isPending}
                        data-testid="button-submit-order"
                      >
                        {submitMutation.isPending ? "Submitting..." : user ? "Update & Place Order" : "Submit Order"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </Card>
          </div>

          <div className="lg:w-80">
            <Card className="sticky top-24 border-card-border p-6" data-testid="order-summary">
              <h3 className="text-base font-semibold">Order Summary</h3>
              <Separator className="my-4" />

              <div className="space-y-4">
                {items.map((item) => {
                  const monthlyPrice = Number(item.price || 0);
                  const original = item.isTrial ? monthlyPrice : monthlyPrice * item.duration;
                  const finalPrice = computeCartItemTotal(item);
                  const itemSavings = Math.max(0, original - finalPrice);
                  const discount = item.isTrial ? 0 : getDurationDiscount(item.duration);

                  return (
                    <div key={item.indicatorId} className="flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <span className="block truncate font-medium">{item.name}</span>
                          {item.isTrial ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">15-day trial</p>
                          ) : (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {item.duration} month{item.duration !== 1 ? "s" : ""} x ₹
                              {monthlyPrice.toLocaleString("en-IN")}/mo
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 text-right">
                          {itemSavings > 0 && (
                            <p className="text-xs text-muted-foreground line-through">
                              ₹{original.toLocaleString("en-IN")}
                            </p>
                          )}
                          <p className="font-semibold">₹{finalPrice.toLocaleString("en-IN")}</p>
                        </div>
                      </div>

                      {itemSavings > 0 && (
                        <div className="flex items-center justify-between rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-400">
                          <span>{Math.round(discount * 100)}% discount applied</span>
                          <span className="font-semibold">
                            You save ₹{itemSavings.toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                {totalSavings > 0 && (
                  <>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Original total</span>
                      <span className="line-through">
                        ₹{originalTotal.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-emerald-700 dark:text-emerald-400">
                      <span>You save</span>
                      <span className="font-semibold">
                        ₹{totalSavings.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold" data-testid="text-checkout-total">
                    ₹{totalPrice.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
