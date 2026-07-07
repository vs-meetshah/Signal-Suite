import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, AtSign, Monitor, Loader2, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import type { InsertUser } from "@shared/schema";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, authModalOnSuccess, signupOrLogin } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [emailChecked, setEmailChecked] = useState("");

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      mobileNumber: "",
      tradingViewUsername: "",
    },
  });

  useEffect(() => {
    if (!isAuthModalOpen) {
      form.reset();
      setIsReturningUser(false);
      setEmailChecked("");
    }
  }, [isAuthModalOpen, form]);

  const handleEmailBlur = async () => {
    const email = form.getValues("email");
    if (!email || email === emailChecked) return;

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValid) return;

    try {
      const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`, {
        credentials: "include",
      });
      const data = await res.json();
      setEmailChecked(email);

      if (data.exists && data.user) {
        setIsReturningUser(true);
        form.setValue("firstName", data.user.firstName);
        form.setValue("lastName", data.user.lastName);
        form.setValue("username", data.user.username);
        form.setValue("mobileNumber", data.user.mobileNumber);
        form.setValue("tradingViewUsername", data.user.tradingViewUsername);
      } else {
        setIsReturningUser(false);
      }
    } catch {
      // ignore
    }
  };

  const onSubmit = async (data: InsertUser) => {
    setIsSubmitting(true);
    try {
      const result = await signupOrLogin(data);
      toast({
        title: result.isNewUser ? "Account created" : "Welcome back!",
        description: result.isNewUser
          ? "Your account has been created successfully."
          : `Logged in as ${result.user.firstName} ${result.user.lastName}`,
      });
      closeAuthModal();
      authModalOnSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formFields = [
    { name: "firstName" as const, label: "First Name", placeholder: "John", icon: User, type: "text" },
    { name: "lastName" as const, label: "Last Name", placeholder: "Doe", icon: User, type: "text" },
    { name: "username" as const, label: "Username", placeholder: "johndoe", icon: AtSign, type: "text" },
    { name: "email" as const, label: "Email Address", placeholder: "john@example.com", icon: Mail, type: "email" },
    { name: "mobileNumber" as const, label: "Mobile Number", placeholder: "+1 234 567 8901", icon: Phone, type: "tel" },
    { name: "tradingViewUsername" as const, label: "TradingView Username", placeholder: "Your TradingView handle", icon: Monitor, type: "text" },
  ];

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={(open) => !open && closeAuthModal()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="auth-modal">
        <DialogHeader>
          <DialogTitle className="text-xl" data-testid="text-auth-title">
            {isReturningUser ? "Welcome Back!" : "Create Your Account"}
          </DialogTitle>
          <DialogDescription>
            {isReturningUser
              ? "We found your account. Confirm your details to continue."
              : "Enter your details to get started with Pine Signal Lab."}
          </DialogDescription>
        </DialogHeader>

        {isReturningUser && (
          <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Account found! Your details have been auto-filled.</span>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
                            onBlur={(e) => {
                              fieldProps.onBlur();
                              if (field.name === "email") handleEmailBlur();
                            }}
                            data-testid={`input-auth-${field.name}`}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <Separator />

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
              data-testid="button-auth-submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isReturningUser ? "Logging in..." : "Creating account..."}
                </>
              ) : isReturningUser ? (
                "Log In"
              ) : (
                "Sign Up"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
