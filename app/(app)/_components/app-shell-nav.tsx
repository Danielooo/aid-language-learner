"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/app/(auth)/actions";
import { Container } from "@/app/_components/ui/container";
import { ThemeToggle } from "@/app/_components/ui/theme-toggle";
import { APP_ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { getAppNavItems } from "./app-nav-items";

type AppShellNavProps = {
  accountLabel: string | null;
  isAdmin?: boolean;
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppTopNav({ accountLabel, isAdmin = false }: AppShellNavProps) {
  const pathname = usePathname();
  const navItems = getAppNavItems(isAdmin);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container width="xl">
        <div className="flex min-h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link
              href={isAdmin ? APP_ROUTES.adminBijdragen : APP_ROUTES.oefenen}
              aria-label="AID Language Learner — home"
              className="text-2xl font-bold tracking-tighter text-foreground"
            >
              LL
            </Link>
            <nav
              aria-label="Hoofdnavigatie"
              className="hidden items-center gap-1 md:flex"
            >
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={
                    isActive(pathname, item.href) ? "page" : undefined
                  }
                  className={cn(
                    "inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
                    isActive(pathname, item.href)
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {accountLabel && (
              <Link
                href={APP_ROUTES.profiel}
                aria-label={`Profiel van ${accountLabel}`}
                aria-current={
                  pathname === APP_ROUTES.profiel ? "page" : undefined
                }
                className={cn(
                  "inline-flex h-10 max-w-48 items-center truncate rounded-md border border-border px-3.5 text-sm font-medium transition-colors sm:max-w-64",
                  pathname === APP_ROUTES.profiel
                    ? "border-accent/30 bg-accent/10 text-accent"
                    : "bg-background text-foreground hover:bg-muted",
                )}
              >
                Hi, {accountLabel}
              </Link>
            )}
            <form action={signOut}>
              <button
                type="submit"
                aria-label="Uitloggen"
                title="Uitloggen"
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-muted"
              >
                <LogoutIcon />
              </button>
            </form>
          </div>
        </div>
      </Container>
    </header>
  );
}

export function AppTabBar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const navItems = getAppNavItems(isAdmin);
  const cols = navItems.length;

  return (
    <nav
      aria-label="Hoofdnavigatie mobiel"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  active
                    ? "text-accent"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
