"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CookieBanner } from "@/components/landing/CookieBanner";
import { FooterCertBadges } from "@/components/landing/FooterCertBadges";
import {
  detectLandingLocale,
  LANDING_COPY,
  type LandingLocale,
} from "@/lib/landing/i18n";
import {
  getLegalCopy,
  type LegalPageId,
} from "@/lib/landing/legal-i18n";

type Props = {
  page: LegalPageId;
};

export function LegalDocumentPage({ page }: Props) {
  const [locale, setLocale] = useState<LandingLocale>("en");
  const copy = getLegalCopy(page, locale);
  const nav = LANDING_COPY[locale];

  useEffect(() => {
    setLocale(detectLandingLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <div className="twc twc-legal">
      <header className="twc-legal-header">
        <div className="twc-legal-header-inner">
          <Link href="/" className="twc-legal-back">
            ← {copy.back}
          </Link>
        </div>
      </header>

      <main className="twc-legal-main">
        <h1>{copy.title}</h1>
        <p className="twc-legal-updated">{copy.updated}</p>

        {copy.sections.map((section) => (
          <section key={section.title} className="twc-legal-section">
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </section>
        ))}
      </main>

      <footer className="twc-legal-footer">
        <div className="twc-legal-footer-inner">
          <Link href="/privacy">{nav.footerPrivacy}</Link>
          <Link href="/cookies">{nav.footerCookies}</Link>
          <Link href="/">{nav.brand}</Link>
        </div>
        <FooterCertBadges
          iso27701Alt={nav.footerIso27701}
          iso27001Alt={nav.footerIso27001}
        />
      </footer>

      <CookieBanner copy={nav} />
    </div>
  );
}
