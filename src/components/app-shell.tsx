"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Receipt,
  User as UserIcon,
  Tags,
  ClipboardList,
  UserCheck,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LowStockAlert } from "@/components/low-stock-alert";
import { OfflineIndicator } from "@/components/offline-indicator";

type NavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  roles: string[];
  /** If true, show this item in the mobile bottom bar */
  primary?: boolean;
};

const NAV: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard, roles: ["OWNER"], primary: true },
  { href: "/pos", labelKey: "pos", icon: ShoppingCart, roles: ["OWNER", "CASHIER"], primary: true },
  { href: "/products", labelKey: "products", icon: Package, roles: ["OWNER"], primary: true },
  { href: "/categories", labelKey: "categories", icon: Tags, roles: ["OWNER"] },
  { href: "/customers", labelKey: "customers", icon: UserCheck, roles: ["OWNER"] },
  { href: "/stock", labelKey: "stock", icon: Boxes, roles: ["OWNER"], primary: true },
  { href: "/staff", labelKey: "staff", icon: Users, roles: ["OWNER"] },
  { href: "/reports", labelKey: "reports", icon: BarChart3, roles: ["OWNER"] },
  { href: "/audit", labelKey: "audit", icon: ClipboardList, roles: ["OWNER"] },
  { href: "/my-sales", labelKey: "mySales", icon: Receipt, roles: ["CASHIER"], primary: true },
  { href: "/settings", labelKey: "settings", icon: Settings, roles: ["OWNER"] },
];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; role: string };
}) {
  const pathname = usePathname();
  const t = useTranslations();
  const tNav = useTranslations("nav");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const items = NAV.filter((i) => i.roles.includes(user.role));
  const primaryItems = items.filter((i) => i.primary);
  const isPosPage = pathname.startsWith("/pos");

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* Header — surface-lowest floating bar */}
      <header className="sticky top-0 z-40 w-full bg-surface-lowest/80 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3 px-4">
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1.5 rounded-xl hover:bg-accent/50 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2 font-display font-bold">
            <img src="/logo.png" alt="SideSale" className="h-8 w-8 rounded-xl" />
            <span className="hidden sm:inline text-on-surface">{t("app.name")}</span>
          </Link>

          {/* Desktop/iPad nav — horizontal tabs */}
          <nav className="hidden md:flex items-center gap-1 ml-4 overflow-x-auto">
            {items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
                    active
                      ? "bg-accent text-on-surface"
                      : "text-muted-foreground hover:text-on-surface hover:bg-accent/50"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                  <span className="hidden lg:inline">{tNav(item.labelKey)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="User menu" className="rounded-xl">
                  <UserIcon className="h-[1.2rem] w-[1.2rem]" strokeWidth={2} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                    <span className="text-xs text-primary mt-1 font-semibold">{t(`role.${user.role}`)}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                  <LogOut className="mr-2 h-4 w-4" strokeWidth={2} />
                  {t("auth.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile slide-down menu (full nav) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-14 z-30 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <nav
            className="bg-surface-lowest rounded-b-2xl shadow-ambient-lg mx-2 p-3 space-y-1 animate-in slide-in-from-top-2 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-on-surface"
                      : "text-muted-foreground hover:text-on-surface hover:bg-accent/50"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                  {tNav(item.labelKey)}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      <main className={cn(
        "flex-1 p-3 sm:p-4 md:p-6",
        !isPosPage && "pb-20 md:pb-6"
      )}>
        {user.role === "OWNER" && <LowStockAlert />}
        {children}
      </main>

      {/* Mobile bottom nav — fixed, only primary items */}
      {!isPosPage && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-lowest/90 backdrop-blur-xl border-t border-outline-variant/20 safe-area-bottom">
          <div className="flex items-center justify-around px-2 py-1.5">
            {primaryItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[3.5rem] transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} strokeWidth={2} />
                  <span className="text-[10px] font-medium leading-tight">{tNav(item.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      <OfflineIndicator />
    </div>
  );
}
