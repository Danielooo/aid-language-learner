"use client";

import Link from "next/link";
import { useState } from "react";

import { signOut } from "@/app/(auth)/actions";
import { Container } from "@/app/_components/ui/container";
import { ThemeToggle } from "@/app/_components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/dev", label: "Dev-lab" },
] as const;

const navLinkClasses =
  "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

const buttonClasses =
  "inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90";

const ghostButtonClasses =
  "inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted";

type SiteHeaderProps = {
  accountLabel: string | null;
};

// Client component houdt alleen het mobile-menu open/dicht. Auth-state
// komt als prop binnen via [site-header-server.tsx](./site-header-server.tsx)
// — ServerComponent leest sessie en geeft zichtbare Naam door.
export function SiteHeader({ accountLabel }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container>
        <div className="flex min-h-16 items-center justify-between gap-4">
          <Link
            href="/"
            onClick={closeMenu}
            aria-label="AID Language Learner — home"
            className="text-3xl font-bold tracking-tighter text-foreground"
          >
            LL
          </Link>

          <nav
            aria-label="Hoofdnavigatie"
            className="hidden items-center gap-6 md:flex"
          >
            {navItems.map((item) => (
              <Link key={item.label} href={item.href} className={navLinkClasses}>
                {item.label}
              </Link>
            ))}
            <ThemeToggle />
            <AuthControls accountLabel={accountLabel} onAfterClick={closeMenu} />
          </nav>

          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="site-mobile-nav"
            onClick={() => setOpen((prev) => !prev)}
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-md text-foreground md:hidden",
              "hover:bg-muted",
            )}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </Container>

      {open && (
        <div
          id="site-mobile-nav"
          className="border-t border-border bg-background md:hidden"
        >
          <Container>
            <nav
              aria-label="Hoofdnavigatie mobiel"
              className="flex flex-col gap-1 py-4"
            >
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={closeMenu}
                  className={cn(navLinkClasses, "rounded-md px-3 py-2")}
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-col gap-3 border-t border-border pt-4">
                <ThemeToggle />
                <AuthControls accountLabel={accountLabel} onAfterClick={closeMenu} />
              </div>
            </nav>
          </Container>
        </div>
      )}
    </header>
  );
}

function AuthControls({
  accountLabel,
  onAfterClick,
}: {
  accountLabel: string | null;
  onAfterClick?: () => void;
}) {
  if (accountLabel) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">{accountLabel}</span>
        <form action={signOut}>
          <button
            type="submit"
            onClick={onAfterClick}
            className={ghostButtonClasses}
          >
            Uitloggen
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        onClick={onAfterClick}
        className={ghostButtonClasses}
      >
        Inloggen
      </Link>
      <Link
        href="/register"
        onClick={onAfterClick}
        className={buttonClasses}
      >
        Registreren
      </Link>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}
