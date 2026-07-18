"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getCookieConsent,
  setCookieConsent,
} from "@/lib/landing/cookie-consent";
import type { LandingCopy } from "@/lib/landing/i18n";

type Props = {
  copy: Pick<
    LandingCopy,
    "cookieBannerBody" | "cookieBannerAccept" | "cookieBannerCookies"
  >;
};

export function CookieBanner({ copy }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getCookieConsent() === null);
  }, []);

  const accept = () => {
    setCookieConsent("accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="twc-cookie-banner" role="dialog" aria-label="Cookie notice">
      <div className="twc-cookie-banner-inner">
        <p className="twc-cookie-banner-text">
          {copy.cookieBannerBody}{" "}
          <Link href="/cookies" className="twc-cookie-banner-link">
            {copy.cookieBannerCookies}
          </Link>
        </p>
        <button
          type="button"
          className="twc-btn twc-btn-primary twc-btn-sm twc-cookie-banner-btn"
          onClick={accept}
        >
          {copy.cookieBannerAccept}
        </button>
      </div>
    </div>
  );
}
