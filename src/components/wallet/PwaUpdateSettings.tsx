"use client";

import { useState } from "react";
import { applyPwaUpdate, checkForPwaUpdateNow } from "@/lib/wallet/pwa-update";
import { isStandalonePwa } from "@/lib/wallet/pwa-ios";
import { t } from "@/lib/wallet/i18n";

export function PwaUpdateSettings() {
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  if (!isStandalonePwa()) return null;

  const handleCheck = async () => {
    setChecking(true);
    setMessage("");
    try {
      const available = await checkForPwaUpdateNow();
      if (available) {
        applyPwaUpdate();
        return;
      }
      setMessage(t.pwaUpdateNone);
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="wallet-settings-group">
      <div className="wallet-settings-row">
        <p className="wallet-settings-label">{t.pwaUpdateTitle}</p>
        <p className="mt-1 text-sm text-wallet-muted">{t.pwaUpdateHint}</p>
        <button
          type="button"
          disabled={checking}
          onClick={() => void handleCheck()}
          className="wallet-btn-secondary mt-4"
        >
          {checking ? t.pwaUpdateChecking : t.pwaUpdateManual}
        </button>
        {message && <p className="mt-2 text-sm text-wallet-accent">{message}</p>}
      </div>
    </section>
  );
}
