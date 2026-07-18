"use client";

import { useEffect, useRef, useState } from "react";
import {
  LANDING_LOCALES,
  type LandingLocale,
} from "@/lib/landing/i18n";

export function LanguageSelector({
  locale,
  onChange,
  label,
}: {
  locale: LandingLocale;
  onChange: (locale: LandingLocale) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = LANDING_LOCALES.find((l) => l.code === locale) ?? LANDING_LOCALES[0];

  useEffect(() => {
    if (!open) return;

    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="twc-lang" ref={rootRef}>
      <button
        type="button"
        className="twc-lang-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${current.native}`}
        onClick={() => setOpen((v) => !v)}
      >
        <svg className="twc-lang-globe" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M3 12h18M12 3c2.5 2.4 3.8 5.4 3.8 9S14.5 18.6 12 21c-2.5-2.4-3.8-5.4-3.8-9S9.5 5.4 12 3z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </svg>
        <span className="twc-lang-text">{current.native}</span>
        <svg
          className={`twc-lang-chevron ${open ? "is-open" : ""}`}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul className="twc-lang-menu" role="listbox" aria-label={label}>
          {LANDING_LOCALES.map((item) => {
            const active = item.code === locale;
            return (
              <li key={item.code} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`twc-lang-option ${active ? "is-active" : ""}`}
                  onClick={() => {
                    onChange(item.code);
                    setOpen(false);
                  }}
                >
                  <span className="twc-lang-option-native">{item.native}</span>
                  <span className="twc-lang-option-label">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
