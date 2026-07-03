"use client";

import { useEffect, useState } from "react";
import {
  applyPwaUpdate,
  initPwaUpdateCheck,
  subscribePwaUpdate,
} from "@/lib/wallet/pwa-update";

export function usePwaUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    void initPwaUpdateCheck();
    return subscribePwaUpdate(setUpdateAvailable);
  }, []);

  return {
    updateAvailable,
    applyUpdate: applyPwaUpdate,
  };
}
