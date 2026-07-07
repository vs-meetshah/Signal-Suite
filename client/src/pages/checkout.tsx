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
import { useCart } from "@/components/cart-provider";
import { useAuth } from "@/components/auth-provider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function Checkout() {
  const { items, totalPrice, clearCart } = useCart();
  const { user, signupOrLogin, openAuthModal } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [orderComplete, setOrderComplete] = useState(false);
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
        await apiRequest("POST", "/api/auth/update", data);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }

      const orderData = {
        totalAmount: totalPrice.toFixed(2),
        items: items.map((item) => ({
          indicatorId: item.indicatorId,
          duration: item.duration,
          price: item.isTrial ? "0" : (parseFloat(item.price) * item.duration).toFixed(2),
          isTrial: item.isTrial,
        })),
      };

      await apiRequest("POST", "/api/orders", orderData);
    },
    onSuccess: () => {
      clearCart();
      setOrderComplete(true);
      toast({ title: "Order submitted", description: "Your order has been placed successfully." });
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
          <h2 className="mt-6 text-2xl font-bold" data-testid="text-order-complete">Order Submitted</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Your order has been received. You will receive a confirmation email with instructions to access your indicators on TradingView. You'll get indicator access within 24 hours.
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

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.indicatorId} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate mr-2 font-medium">{item.name}</span>
                      <span className="shrink-0">
                        {item.isTrial ? (
                          <span className="text-sm font-medium">₹{Number(item.price).toLocaleString("en-IN")}</span>
                        ) : (
                          `₹${(parseFloat(item.price) * item.duration).toLocaleString("en-IN")}`
                        )}
                      </span>
                    </div>
                    {item.isTrial ? (
                      <p className="text-xs text-muted-foreground">15-day trial</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {item.duration} month{item.duration !== 1 ? "s" : ""} x ₹{Number(item.price).toLocaleString("en-IN")}/mo
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold" data-testid="text-checkout-total">₹{totalPrice.toLocaleString("en-IN")}</span>
              </div>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
