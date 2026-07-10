import { Link, useLocation } from "wouter";
import {
  ShoppingCart,
  TrendingUp,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  User as UserIcon,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCart } from "@/components/cart-provider";
import { useAuth } from "@/components/auth-provider";
import { useState, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";

const isActiveNav = (location: string, href: string) => {
  if (href === "/") return location === "/";
  if (href === "/indicators") {
    return location === "/indicators" || location.startsWith("/indicator/");
  }
  return location === href || location.startsWith(`${href}/`);
};

export function Navbar() {
  const { itemCount } = useCart();
  const { user, isLoading, openAuthModal, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const cartControls = useAnimation();
  const hideCartIcon = !!user?.isAdmin;

  useEffect(() => {
    const handleCartAdded = () => {
      cartControls.start({
        scale: [1, 1.35, 0.9, 1.15, 1],
        rotate: [0, -10, 10, -5, 0],
        transition: { duration: 0.5, ease: "easeInOut" },
      });
    };

    window.addEventListener("cart-item-added", handleCartAdded);
    return () => window.removeEventListener("cart-item-added", handleCartAdded);
  }, [cartControls]);

  const navLinks = [
    ...(!user ? [{ href: "/", label: "Home" }] : []),
    ...(user?.isAdmin
      ? [{ href: "/admin", label: "Admin Panel" }]
      : user
        ? [{ href: "/dashboard", label: "Dashboard" }]
        : []),
    { href: "/indicators", label: "Indicators & Strategies" },
    { href: "/support", label: "Help & Support" },
    { href: "/about", label: "About" },
  ];

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "";

  return (
    <nav
      className="sticky top-0 z-[100] border-b border-border/60 bg-background/95 shadow-[0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl"
      data-testid="navbar"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="group flex items-center gap-3"
            data-testid="link-home"
          >
            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
              <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
              <TrendingUp
                className="relative h-5 w-5 text-white"
                aria-hidden="true"
              />
            </div>

            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight">
                  Pine Signal Lab
                </span>
                {user?.isAdmin && (
                  <Badge
                    variant="outline"
                    className="hidden border-blue-500/20 bg-blue-500/10 px-1.5 py-0 text-[10px] font-semibold text-blue-600 sm:inline-flex"
                  >
                    Admin
                  </Badge>
                )}
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            {navLinks.map((link) => {
              const active = isActiveNav(location, link.href);

              return (
                <Link key={link.href} href={link.href}>
                  <span
                    className={
                      active
                        ? "relative inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold tracking-[-0.01em] text-foreground"
                        : "relative inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold tracking-[-0.01em] text-muted-foreground/90 transition-colors hover:bg-muted/60 hover:text-foreground"
                    }
                    aria-current={active ? "page" : undefined}
                    data-testid={`link-nav-${link.label.toLowerCase()}`}
                  >
                    {active && link.href === "/admin" && (
                      <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-blue-500" />
                    )}

                    {link.label}

                    {active && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary" />
                    )}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <ThemeToggle />
            </div>

            {!hideCartIcon && (
              <Link href="/cart">
                <motion.div animate={cartControls}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={`Cart${itemCount > 0
                      ? ` with ${itemCount} item${itemCount === 1 ? "" : "s"}`
                      : ""
                      }`}
                    data-testid="button-cart"
                  >
                    <ShoppingCart className="h-[18px] w-[18px]" aria-hidden="true" />

                    {itemCount > 0 && (
                      <span
                        className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground shadow-sm ring-2 ring-background"
                        data-testid="badge-cart-count"
                      >
                        {itemCount > 9 ? "9+" : itemCount}
                      </span>
                    )}
                  </Button>
                </motion.div>
              </Link>
            )}

            {!isLoading && !user && (
              <Button
                variant="default"
                size="sm"
                className="hidden rounded-full px-5 md:inline-flex"
                onClick={() => openAuthModal()}
                data-testid="button-signup"
              >
                Sign Up
              </Button>
            )}

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg p-0 hover:bg-muted"
                    aria-label="Open user menu"
                    data-testid="button-user-menu"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-xs font-semibold text-white shadow-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-2">
                    <p
                      className="text-sm font-semibold"
                      data-testid="text-user-name"
                    >
                      {user.firstName} {user.lastName}
                    </p>
                    <p
                      className="truncate text-xs text-muted-foreground"
                      data-testid="text-user-email"
                    >
                      {user.email}
                    </p>
                  </div>

                  <DropdownMenuSeparator />

                  <Link href="/profile">
                    <DropdownMenuItem data-testid="link-profile">
                      <UserIcon className="mr-2 h-4 w-4" />
                      My Profile
                    </DropdownMenuItem>
                  </Link>

                  {!user.isAdmin && (
                    <Link href="/dashboard">
                      <DropdownMenuItem data-testid="link-dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Dashboard
                      </DropdownMenuItem>
                    </Link>
                  )}

                  {user.isAdmin && (
                    <>
                      <Link href="/admin">
                        <DropdownMenuItem data-testid="link-admin">
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Admin Panel
                        </DropdownMenuItem>
                      </Link>

                      <Link href="/admin/users">
                        <DropdownMenuItem data-testid="link-admin-users">
                          <UserIcon className="mr-2 h-4 w-4" />
                          All Users
                        </DropdownMenuItem>
                      </Link>
                    </>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => logout()}
                    data-testid="button-logout"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11 rounded-full border border-border/70 bg-muted/30 md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileOpen}
              data-testid="button-mobile-menu"
            >
              {mobileOpen ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Menu className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const active = isActiveNav(location, link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className={
                      active
                        ? "w-full justify-start rounded-xl bg-primary/10 text-primary"
                        : "w-full justify-start rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                    }
                    aria-current={active ? "page" : undefined}
                    data-testid={`link-mobile-${link.label
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")}`}
                  >
                    {link.label}
                  </Button>
                </Link>
              );
            })}

            {!isLoading && !user && (
              <Button
                size="sm"
                className="mt-2 w-full justify-start rounded-xl"
                onClick={() => {
                  setMobileOpen(false);
                  openAuthModal();
                }}
                data-testid="button-mobile-signup"
              >
                Sign Up
              </Button>
            )}

            {user && (
              <>
                {user.isAdmin && (
                  <Link href="/admin/users" onClick={() => setMobileOpen(false)}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start rounded-xl"
                      data-testid="link-mobile-admin-users"
                    >
                      <UserIcon className="mr-2 h-4 w-4" />
                      All Users
                    </Button>
                  </Link>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start rounded-xl text-muted-foreground"
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  data-testid="button-mobile-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
