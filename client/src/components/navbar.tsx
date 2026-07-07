import { Link, useLocation } from "wouter";
import { ShoppingCart, TrendingUp, Menu, X, LogOut, LayoutDashboard, ShieldCheck } from "lucide-react";
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

export function Navbar() {
  const { itemCount } = useCart();
  const { user, isLoading, openAuthModal, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const cartControls = useAnimation();

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
    { href: "/", label: "Home" },
    ...(user ? [{ href: "/dashboard", label: "Dashboard" }] : []),
    { href: "/indicators", label: "Indicators & Strategies" },
    { href: "/support", label: "Help & Support" },
    { href: "/about", label: "About" },
  ];

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "";

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl" data-testid="navbar">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5" data-testid="link-home">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Pine Signal Lab</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={location === link.href ? "text-foreground" : "text-muted-foreground"}
                  data-testid={`link-nav-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link href="/cart">
              <motion.div animate={cartControls}>
                <Button variant="ghost" size="icon" className="relative" data-testid="button-cart">
                  <ShoppingCart className="h-4 w-4" />
                  {itemCount > 0 && (
                    <Badge
                      variant="default"
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]"
                    >
                      {itemCount}
                    </Badge>
                  )}
                </Button>
              </motion.div>
            </Link>

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
                  <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
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
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
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
                  className="w-full justify-start"
                  data-testid={`link-mobile-${link.label.toLowerCase()}`}
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
                <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    data-testid="link-mobile-dashboard"
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </Button>
                </Link>
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
                  <LogOut className="mr-2 h-4 w-4" /> Log out
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
