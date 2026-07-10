import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  AlertTriangle,
  LayoutDashboard,
  BarChart3,
  Settings2,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminAnalytics } from "@/components/admin/admin-analytics";
import { AdminEditor } from "@/components/admin/admin-editor";

type AdminTab = "dashboard" | "analytics" | "editor";

const NAV_ITEMS: { id: AdminTab; label: string; icon: typeof LayoutDashboard; description: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Users & order approvals" },
  { id: "analytics", label: "Analytics", icon: BarChart3, description: "Revenue & growth insights" },
  { id: "editor", label: "Editor", icon: Settings2, description: "Indicators & pricing" },
];

const ADMIN_LINK_ITEMS: { href: string; label: string; icon: typeof LayoutDashboard; description: string; testId: string }[] = [
  { href: "/admin/users", label: "All Users", icon: Users, description: "Manage customer accounts", testId: "nav-all-users" },
];

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  if (authLoading) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-2xl font-bold">Sign in required</h2>
        <p className="mt-1 text-muted-foreground">Please sign in to access the admin panel.</p>
        <Button className="mt-6" onClick={() => navigate("/")} data-testid="button-admin-go-home">Go Home</Button>
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6" data-testid="admin-denied">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
        <h2 className="mt-4 text-2xl font-bold">Access denied</h2>
        <p className="mt-1 text-muted-foreground">You don't have permission to view this page.</p>
        <Button className="mt-6" onClick={() => navigate("/dashboard")} data-testid="button-admin-back-dashboard">Back to Dashboard</Button>
      </div>
    );
  }

  const sidebarWidth = collapsed ? 68 : 240;

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full bg-muted/20">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="relative shrink-0 border-r bg-background"
        data-testid="admin-sidebar"
      >
        <div style={{ width: sidebarWidth }} className="flex h-full flex-col">
          <div className={`flex items-center gap-2 border-b px-3 py-3 ${collapsed ? "justify-center" : ""}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="min-w-0"
                >
                  <p className="text-sm font-bold leading-tight">Admin Console</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <nav className="flex-1 space-y-1 p-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover-elevate ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground"
                  } ${collapsed ? "justify-center" : ""}`}
                  data-testid={`nav-${item.id}`}
                  aria-label={item.label}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="min-w-0 flex-1"
                      >
                        <p className="text-sm font-medium leading-tight">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}

            {ADMIN_LINK_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-foreground transition-colors hover-elevate ${collapsed ? "justify-center" : ""}`}
                  data-testid={item.testId}
                  aria-label={item.label}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="min-w-0 flex-1"
                      >
                        <p className="text-sm font-medium leading-tight">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </nav>

          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className={`w-full ${collapsed ? "px-0" : "justify-start"}`}
              data-testid="button-toggle-sidebar"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Collapse
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.aside>

      {/* Main content area */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        {tab === "dashboard" && <AdminDashboard />}
        {tab === "analytics" && <AdminAnalytics />}
        {tab === "editor" && <AdminEditor />}
      </div>
    </div>
  );
}
