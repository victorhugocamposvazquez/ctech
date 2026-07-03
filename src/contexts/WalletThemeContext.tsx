"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type WalletTheme = "light" | "dark";

const STORAGE_KEY = "wallet_theme";
const DEFAULT_THEME: WalletTheme = "light";

interface WalletThemeContextValue {
  theme: WalletTheme;
  setTheme: (theme: WalletTheme) => void;
  themeClass: string;
}

const WalletThemeContext = createContext<WalletThemeContextValue | null>(null);

function readTheme(): WalletTheme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "dark" ? "dark" : "light";
}

function ThemeColorEffect({ theme }: { theme: WalletTheme }) {
  useEffect(() => {
    const color = theme === "light" ? "#f4f4f5" : "#060608";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", color);
  }, [theme]);
  return null;
}

export function WalletThemeProvider({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const [theme, setThemeState] = useState<WalletTheme>(DEFAULT_THEME);

  useEffect(() => {
    setThemeState(readTheme());
  }, []);

  const setTheme = useCallback((next: WalletTheme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const themeClass = theme === "light" ? "wallet-theme-light" : "wallet-theme-dark";

  const value = useMemo(
    () => ({ theme, setTheme, themeClass }),
    [theme, setTheme, themeClass]
  );

  return (
    <WalletThemeContext.Provider value={value}>
      <div className={`wallet-root wallet-theme ${themeClass} ${className}`.trim()}>
        <ThemeColorEffect theme={theme} />
        {children}
      </div>
    </WalletThemeContext.Provider>
  );
}

export function useWalletTheme() {
  const ctx = useContext(WalletThemeContext);
  if (!ctx) throw new Error("useWalletTheme outside WalletThemeProvider");
  return ctx;
}
