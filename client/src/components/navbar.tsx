import { Link, useLocation } from "wouter";
import { ShoppingCart, TrendingUp, Menu, X, LogOut, LayoutDashboard, ShieldCheck, User as UserIcon } from "lucide-react";
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
    <nav className="sticky top-0 z-[100] border-b bg-background/80 backdrop-blur-xl" data-testid="navbar">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5" data-testid="link-home">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
              <TrendingUp className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Pine Signal Lab</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={
                    isActiveNav(location, link.href)
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                  aria-current={isActiveNav(location, link.href) ? "page" : undefined}
                  data-testid={`link-nav-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            {!hideCartIcon && (
              <Link href="/cart">
                <motion.div animate={cartControls}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative mr-1 min-h-11 min-w-11 rounded-full"
                    aria-label={`Cart${itemCount > 0 ? ` with ${itemCount} item${itemCount === 1 ? "" : "s"}` : ""}`}
                    data-testid="button-cart"
                  >
                    <ShoppingCart className="h-4 w-4" aria-hidden="true" />

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
                className="hidden md:inline-flex"
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
  className="min-h-11 min-w-11 rounded-full"
  aria-label="Open user menu"
  data-testid="button-user-menu"
>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium" data-testid="text-user-name">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid="text-user-email">
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

                  <Link href="/dashboard">
                    <DropdownMenuItem data-testid="link-dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                  </Link>
                  {user.isAdmin && (
                    <Link href="/admin">
                      <DropdownMenuItem data-testid="link-admin">
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Admin Panel
                      </DropdownMenuItem>
                    </Link>
                  )}
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
  className="min-h-11 min-w-11 md:hidden"
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
        <div className="border-t px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={
                    isActiveNav(location, link.href)
                      ? "w-full justify-start bg-primary/10 text-primary"
                      : "w-full justify-start text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                  aria-current={isActiveNav(location, link.href) ? "page" : undefined}
                  data-testid={`link-mobile-${link.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
            {!isLoading && !user && (
              <Button
                size="sm"
                className="w-full justify-start"
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
                  <Link href="/admin" onClick={() => setMobileOpen(false)}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      data-testid="link-mobile-admin"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" /> Admin Panel
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  data-testid="button-mobile-logout"
                >
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
