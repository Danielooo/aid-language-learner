"use client";

import { createContext, useContext } from "react";

import { getDisplayLabel } from "@/lib/auth/display-label";

import type { ReactNode } from "react";

type AppProfileContextValue = {
  username: string;
  displayName: string | null;
  /** Zichtbare label buiten /profiel: Naam of username-fallback. */
  displayLabel: string;
};

const AppProfileContext = createContext<AppProfileContextValue | null>(null);

type AppProfileProviderProps = {
  username: string;
  displayName?: string | null;
  children: ReactNode;
};

export function AppProfileProvider({
  username,
  displayName = null,
  children,
}: AppProfileProviderProps) {
  const displayLabel = getDisplayLabel(displayName, username);

  return (
    <AppProfileContext.Provider value={{ username, displayName, displayLabel }}>
      {children}
    </AppProfileContext.Provider>
  );
}

export function useAppProfile(): AppProfileContextValue {
  const context = useContext(AppProfileContext);
  // Dev-routes delen componenten met de app-shell maar hebben geen provider.
  if (!context) {
    return { username: "gast", displayName: null, displayLabel: "gast" };
  }
  return context;
}
