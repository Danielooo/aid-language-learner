"use client";

import { createContext, useContext } from "react";

import type { ReactNode } from "react";

type AppProfileContextValue = {
  username: string;
};

const AppProfileContext = createContext<AppProfileContextValue | null>(null);

type AppProfileProviderProps = {
  username: string;
  children: ReactNode;
};

export function AppProfileProvider({ username, children }: AppProfileProviderProps) {
  return (
    <AppProfileContext.Provider value={{ username }}>
      {children}
    </AppProfileContext.Provider>
  );
}

export function useAppProfile(): AppProfileContextValue {
  const context = useContext(AppProfileContext);
  // Dev-routes delen componenten met de app-shell maar hebben geen provider.
  if (!context) {
    return { username: "gast" };
  }
  return context;
}
