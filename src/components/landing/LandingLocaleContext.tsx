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
import {
  detectLandingLocale,
  LANDING_COPY,
  persistLandingLocale,
  type LandingCopy,
  type LandingLocale,
} from "@/lib/landing/i18n";

type LandingLocaleContextValue = {
  locale: LandingLocale;
  t: LandingCopy;
  setLocale: (locale: LandingLocale) => void;
};

const LandingLocaleContext = createContext<LandingLocaleContextValue | null>(
  null
);

export function LandingLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LandingLocale>("en");
  const t = LANDING_COPY[locale];

  useEffect(() => {
    setLocaleState(detectLandingLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: LandingLocale) => {
    setLocaleState(next);
    persistLandingLocale(next);
  }, []);

  const value = useMemo(
    () => ({ locale, t, setLocale }),
    [locale, t, setLocale]
  );

  return (
    <LandingLocaleContext.Provider value={value}>
      {children}
    </LandingLocaleContext.Provider>
  );
}

export function useLandingLocale() {
  const ctx = useContext(LandingLocaleContext);
  if (!ctx) {
    throw new Error("useLandingLocale must be used within LandingLocaleProvider");
  }
  return ctx;
}
