"use client";

import { useEffect, useState } from "react";
import { getAutoLockMs, setAutoLockMs } from "@/hooks/wallet/useAutoLock";
import { t } from "@/lib/wallet/i18n";

const OPTIONS = [
  { label: t.autoLockOff, ms: 0 },
  { label: t.autoLock5, ms: 5 * 60 * 1000 },
  { label: t.autoLock15, ms: 15 * 60 * 1000 },
  { label: t.autoLock60, ms: 60 * 60 * 1000 },
];

export function AutoLockSettings() {
  const [current, setCurrent] = useState(5 * 60 * 1000);

  useEffect(() => {
    setCurrent(getAutoLockMs());
  }, []);

  return (
    <section className="wallet-settings-group">
      <div className="wallet-settings-row">
        <p className="wallet-settings-label">{t.autoLock}</p>
        <p className="mt-1 text-sm text-wallet-muted">{t.autoLockHint}</p>
        <div className="wallet-segmented mt-3 !flex-wrap gap-1">
          {OPTIONS.map(({ label, ms }) => (
            <button
              key={ms}
              type="button"
              onClick={() => {
                setAutoLockMs(ms);
                setCurrent(ms);
              }}
              className={`wallet-segmented-btn text-xs ${current === ms ? "active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
