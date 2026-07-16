import { useEffect, useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, AtSign, Monitor, Loader2, AlertCircle, LockKeyhole, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { authSignupSchema } from "@shared/schema";
import type { AuthSignupInput, User as AuthUser } from "@shared/schema";
import { useAuth, type AuthMode } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";

export function AuthModal() {
  const {
    isAuthModalOpen,
    authModalMode,
    closeAuthModal,
    authModalOnSuccess,
    login,
    signup,
    openAuthModal,
  } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [notice, setNotice] = useState<{ title: string; description: string } | null>(null);
  const mode: AuthMode = authModalMode;

  const signupForm = useForm<AuthSignupInput>({
    resolver: zodResolver(authSignupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      mobileNumber: "",
      tradingViewUsername: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!isAuthModalOpen) {
      setLoginEmail("");
      setLoginPassword("");
      setShowLoginPassword(false);
      setShowSignupPassword(false);
      setShowSignupConfirmPassword(false);
      setNotice(null);
      signupForm.reset();
    }
  }, [isAuthModalOpen, signupForm]);

  const getErrorMessage = (error: unknown, fallback: string) => {
    const rawMessage = error instanceof Error ? error.message : "";
    const jsonStart = rawMessage.indexOf("{");

    if (jsonStart >= 0) {
      try {
        const parsed = JSON.parse(rawMessage.slice(jsonStart));
        if (parsed?.message) return parsed.message;
      } catch {
        // Fall back to the plain message below.
      }
    }

    return rawMessage.replace(/^\d+:\s*/, "") || fallback;
  };

  const finishSuccess = (authenticatedUser: AuthUser) => {
    closeAuthModal();
    if (authModalOnSuccess) {
      authModalOnSuccess();
      return;
    }

    navigate(authenticatedUser.isAdmin ? "/admin" : "/dashboard");
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = loginEmail.trim();
    if (!email || !loginPassword) {
      setNotice({
        title: "Email and password required",
        description: "Enter your email and password to log in.",
      });
      return;
    }

    setIsSubmitting(true);
    setNotice(null);
    try {
      const result = await login(email, loginPassword);
      toast({
        title: "Welcome back!",
        description: `Logged in as ${result.user.firstName} ${result.user.lastName}`,
      });
      finishSuccess(result.user);
    } catch (error: any) {
      setNotice({
        title: "Login failed",
        description: getErrorMessage(error, "No account found. Please sign up first."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (data: AuthSignupInput) => {
    setIsSubmitting(true);
    setNotice(null);
    try {
      const result = await signup(data);
      toast({
        title: "Account created",
        description: "Your account has been created successfully.",
      });
      finishSuccess(result.user);
    } catch (error: any) {
      const description = getErrorMessage(error, "Something went wrong");

      if (description.toLowerCase().includes("already exists")) {
        setLoginEmail(data.email);
        switchMode("login");
        setNotice({
          title: "Account already exists",
          description: "This email is already registered. We switched you to login. Please enter your password to continue.",
        });
        return;
      }

      setNotice({ title: "Signup failed", description });
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    setNotice(null);
    openAuthModal({ mode: nextMode, onSuccess: authModalOnSuccess ?? undefined });
  };

  const formFields = [
    { name: "firstName" as const, label: "First Name", placeholder: "Rahul", icon: User, type: "text" },
    { name: "lastName" as const, label: "Last Name", placeholder: "Sharma", icon: User, type: "text" },
    { name: "email" as const, label: "Email Address", placeholder: "rahul.sharma@gmail.com", icon: Mail, type: "email" },
    { name: "mobileNumber" as const, label: "Mobile Number", placeholder: "+91 98765 43210", icon: Phone, type: "tel" },
    { name: "username" as const, label: "User Name", placeholder: "rahultrades", icon: AtSign, type: "text" },
    { name: "tradingViewUsername" as const, label: "TradingView Username", placeholder: "rahul_sharma_trades", icon: Monitor, type: "text" },
    { name: "password" as const, label: "Password", placeholder: "Minimum 8 characters", icon: LockKeyhole, type: "password" },
    { name: "confirmPassword" as const, label: "Confirm Password", placeholder: "Re-enter password", icon: LockKeyhole, type: "password" },
  ];

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={(open) => !open && closeAuthModal()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto" data-testid="auth-modal">
        <DialogHeader>
          <DialogTitle className="text-xl" data-testid="text-auth-title">
            {mode === "login" ? "Log in to your account" : "Create your account"}
          </DialogTitle>
          <DialogDescription>
            {mode === "login"
              ? "Enter your registered email and password."
              : "Fill in your details once to start using Pine Signal Lab."}
          </DialogDescription>
        </DialogHeader>

        {notice && (
          <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">{notice.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed opacity-90">{notice.description}</p>
            </div>
          </div>
        )}

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Email Address
              </label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="john@example.com"
                  className="pl-10"
                  autoComplete="email"
                  data-testid="input-login-email"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Password
              </label>
              <div className="relative mt-2">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showLoginPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                  autoComplete="current-password"
                  data-testid="input-login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:text-primary"
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                  data-testid="button-toggle-login-password"
                >
                  {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting} data-testid="button-auth-submit">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Log In"
              )}
            </Button>

            <Separator />

            <p className="text-center text-sm text-muted-foreground">
              New here?{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => switchMode("signup")}
                data-testid="button-switch-signup"
              >
                Create an account
              </button>
            </p>
          </form>
        ) : (
          <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {formFields.map((field) => (
                  <FormField
                    key={field.name}
                    control={signupForm.control}
                    name={field.name}
                    render={({ field: fieldProps }) => (
                      <FormItem>
                        <FormLabel>{field.label}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <field.icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              {...fieldProps}
                              type={
                                field.name === "password"
                                  ? showSignupPassword ? "text" : "password"
                                  : field.name === "confirmPassword"
                                    ? showSignupConfirmPassword ? "text" : "password"
                                    : field.type
                              }
                              placeholder={field.placeholder}
                              className={field.type === "password" ? "pl-10 pr-10" : "pl-10"}
                              data-testid={`input-auth-${field.name}`}
                            />
                            {field.type === "password" && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (field.name === "password") {
                                    setShowSignupPassword((value) => !value);
                                  } else {
                                    setShowSignupConfirmPassword((value) => !value);
                                  }
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:text-primary"
                                aria-label={
                                  field.name === "password"
                                    ? showSignupPassword ? "Hide password" : "Show password"
                                    : showSignupConfirmPassword ? "Hide confirm password" : "Show confirm password"
                                }
                                data-testid={`button-toggle-auth-${field.name}`}
                              >
                                {(field.name === "password" ? showSignupPassword : showSignupConfirmPassword) ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>

              <Separator />

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting} data-testid="button-auth-submit">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Sign Up"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => switchMode("login")}
                  data-testid="button-switch-login"
                >
                  Log in
                </button>
              </p>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
