import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HelpCircle, Save, ShieldCheck, User as UserIcon } from "lucide-react";
import { z } from "zod";
import { updateUserProfileSchema } from "@shared/schema";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";

const accountFormSchema = updateUserProfileSchema.extend({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  mobileNumber: z
    .string()
    .min(10, "Please enter a valid mobile number")
    .regex(/^[+]?[\d\s()-]+$/, "Invalid mobile number format"),
  tradingViewUsername: z.string().min(2, "TradingView username is required"),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export default function ProfilePage() {
  const { user, isLoading: authLoading, openAuthModal, updateProfile } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [savingProfile, setSavingProfile] = useState(false);

  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      mobileNumber: "",
      tradingViewUsername: "",
    },
  });

  useEffect(() => {
    if (user) {
      accountForm.reset({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        mobileNumber: user.mobileNumber ?? "",
        tradingViewUsername: user.tradingViewUsername ?? "",
      });
    }
  }, [user, accountForm]);

  async function onSubmitProfile(values: AccountFormValues) {
    setSavingProfile(true);

    try {
      await updateProfile(values);
      accountForm.reset(values);

      toast({
        title: "Profile updated",
        description: "Your account details have been saved.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not update your profile. Please try again.";

      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  if (authLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ShieldCheck className="h-7 w-7 text-muted-foreground" />
          </div>

          <h2 className="mt-6 text-2xl font-bold" data-testid="text-login-required">
            Sign in to view your profile
          </h2>

          <p className="mt-2 text-muted-foreground">
            Access and update your account details.
          </p>

          <Button
            className="mt-6"
            size="lg"
            onClick={() => openAuthModal({ onSuccess: () => navigate("/profile") })}
            data-testid="button-profile-signin"
          >
            Sign In
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserIcon className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" data-testid="text-profile-title">
                My Profile
              </h1>
              <p className="mt-1 text-muted-foreground">
                Update your account and TradingView details.
              </p>
            </div>
          </div>
        </div>

        <Card className="border-card-border p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold" data-testid="text-account-heading">
              Account Details
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Username and email cannot be changed.
            </p>
          </div>

          <Form {...accountForm}>
            <form onSubmit={accountForm.handleSubmit(onSubmitProfile)} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={accountForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" data-testid="input-first-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={accountForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" data-testid="input-last-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input value={user.email} readOnly disabled data-testid="input-email-readonly" />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Email is locked after signup.</p>
                </FormItem>

                <FormField
                  control={accountForm.control}
                  name="mobileNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+91 98765 43210" data-testid="input-mobile-number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="my-2" />

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={accountForm.control}
                  name="tradingViewUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TradingView User Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your TradingView handle" data-testid="input-tradingview-username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-wrap items-end justify-between gap-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-left text-sm text-primary underline-offset-4 hover:underline"
                      data-testid="button-tv-username-help"
                    >
                      <HelpCircle className="h-4 w-4" />
                      I don't know my TradingView user name
                    </button>
                  </DialogTrigger>

                  <DialogContent data-testid="dialog-tv-username-help">
                    <DialogHeader>
                      <DialogTitle>How to find your TradingView username</DialogTitle>
                      <DialogDescription>
                        Follow these steps on tradingview.com to copy your exact username.
                      </DialogDescription>
                    </DialogHeader>

                    <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
                      <li>Open <span className="font-medium">tradingview.com</span> and sign in to your account.</li>
                      <li>Click your profile avatar at the top-right corner.</li>
                      <li>Choose <span className="font-medium">Profile</span> from the dropdown.</li>
                      <li>
                        Your username appears just below your display name. It also appears in the URL like{" "}
                        <span className="font-mono text-xs">tradingview.com/u/&lt;username&gt;</span>.
                      </li>
                      <li>Copy that username exactly and paste it into the field.</li>
                    </ol>

                    <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                      Tip: Without the correct username we cannot grant you indicator access on TradingView.
                    </p>
                  </DialogContent>
                </Dialog>

                <Button
                  type="submit"
                  disabled={savingProfile || !accountForm.formState.isDirty}
                  className="bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-60"
                  data-testid="button-save-profile"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {savingProfile ? "Saving..." : "Edit or Save New Change"}
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      </motion.div>
    </div>
  );
}