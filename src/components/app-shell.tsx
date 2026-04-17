"use client";

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
};

const NAV: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard, roles: ["OWNER"] },
  { href: "/pos", labelKey: "pos", icon: ShoppingCart, roles: ["OWNER", "CASHIER"] },
  { href: "/products", labelKey: "products", icon: Package, roles: ["OWNER"] },
  { href: "/categories", labelKey: "categories", icon: Tags, roles: ["OWNER"] },
  { href: "/customers", labelKey: "customers", icon: UserCheck, roles: ["OWNER"] },
  { href: "/stock", labelKey: "stock", icon: Boxes, roles: ["OWNER"] },
  { href: "/staff", labelKey: "staff", icon: Users, roles: ["OWNER"] },
  { href: "/reports", labelKey: "reports", icon: BarChart3, roles: ["OWNER"] },
  { href: "/audit", labelKey: "audit", icon: ClipboardList, roles: ["OWNER"] },
  { href: "/my-sales", labelKey: "mySales", icon: Receipt, roles: ["CASHIER"] },
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
  const items = NAV.filter((i) => i.roles.includes(user.role));

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* Header — surface-lowest floating bar */}
      <header className="sticky top-0 z-40 w-full bg-surface-lowest/80 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2 font-display font-bold">
            <img src="/logo.png" alt="SideSale" className="h-8 w-8 rounded-xl" />
            <span className="hidden sm:inline text-on-surface">{t("app.name")}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-4">
            {items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent text-on-surface"
                      : "text-muted-foreground hover:text-on-surface hover:bg-accent/50"
                  )}
                >
                  <item.icon className="h-4 w-4" strokeWidth={2} />
                  {tNav(item.labelKey)}
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

        {/* Mobile nav — horizontal scroll, no border */}
        <div className="md:hidden overflow-x-auto bg-surface-low">
          <nav className="flex items-center gap-1 px-2 py-2 min-w-max">
            {items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex flex-col items-center gap-0.5 rounded-xl px-3 py-1 text-xs font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" strokeWidth={2} />
                  {tNav(item.labelKey)}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6">
        {user.role === "OWNER" && <LowStockAlert />}
        {children}
      </main>
      <OfflineIndicator />
    </div>
  );
}
