import { Suspense, lazy } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/components/cart-provider";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { Navbar } from "@/components/navbar";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
const AdminUsersPage = lazy(() => import("@/pages/admin-users"));
const AuthModal = lazy(() => import("@/components/auth-modal").then((m) => ({ default: m.AuthModal })));
const ProfilePage = lazy(() => import("@/pages/profile"));
const IndicatorsPage = lazy(() => import("@/pages/indicators"));
const IndicatorDetail = lazy(() => import("@/pages/indicator-detail"));
const CartPage = lazy(() => import("@/pages/cart"));
const Checkout = lazy(() => import("@/pages/checkout"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const AdminPage = lazy(() => import("@/pages/admin"));
const SupportPage = lazy(() => import("@/pages/support"));
const AboutPage = lazy(() => import("@/pages/about"));
const AdminUserDetailsPage = lazy(() => import("@/pages/admin-user-details"));
function PageLoader() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center px-4">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
        role="status"
        aria-label="Loading page"
      />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/indicators" component={IndicatorsPage} />
        <Route path="/indicator/:slug" component={IndicatorDetail} />
        <Route path="/cart" component={CartPage} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/admin/users" component={AdminUsersPage} />
        <Route path="/admin/users/:id" component={AdminUserDetailsPage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/support" component={SupportPage} />
        <Route path="/about" component={AboutPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AppShell() {
  const { user } = useAuth();

  return (
    <CartProvider userId={user?.id ?? null}>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main id="main-content">
          <Router />
        </main>
      </div>
      <Suspense fallback={null}>
        <AuthModal />
      </Suspense>
      <Toaster />
    </CartProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
