"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

import type { ComponentProps } from "react";

// Dunne wrapper rond next-themes, zodat we lib-specifieke props
// op één plek vasthouden en RootLayout een server component blijft.
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
