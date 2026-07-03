"use client";

import { useWalletTheme, type WalletTheme } from "@/contexts/WalletThemeContext";
import { t } from "@/lib/wallet/i18n";

const OPTIONS: { id: WalletTheme; label: string }[] = [
  { id: "light", label: t.themeLight },
  { id: "dark", label: t.themeDark },
];

export function ThemeSettings() {
  const { theme, setTheme } = useWalletTheme();

  return (
    <section className="wallet-settings-group">
      <div className="wallet-settings-row">
        <p className="wallet-settings-label">{t.appearance}</p>
        <p className="mt-1 text-sm text-wallet-muted">{t.appearanceHint}</p>
        <div className="wallet-segmented mt-3">
          {OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              className={`wallet-segmented-btn ${theme === id ? "active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
