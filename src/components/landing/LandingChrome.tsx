"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { CookieBanner } from "./CookieBanner";
import { FooterCertBadges } from "./FooterCertBadges";
import { TrustMark } from "./HeroScene";
import { LanguageSelector } from "./LanguageSelector";
import {
  detectLandingLocale,
  LANDING_COPY,
  persistLandingLocale,
  type LandingLocale,
} from "@/lib/landing/i18n";

type Props = {
  active?: "home" | "about";
  children: (ctx: {
    locale: LandingLocale;
    t: (typeof LANDING_COPY)[LandingLocale];
  }) => ReactNode;
};

export function LandingChrome({ children, active = "home" }: Props) {
  const [locale, setLocale] = useState<LandingLocale>("en");
  const [scrolled, setScrolled] = useState(false);
  const t = LANDING_COPY[locale];

  useEffect(() => {
    setLocale(detectLandingLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const changeLocale = (next: LandingLocale) => {
    setLocale(next);
    persistLandingLocale(next);
  };

  const featuresHref = active === "home" ? "#decentralized" : "/#decentralized";
  const securityHref = active === "home" ? "#security" : "/#security";

  return (
    <div className="twc">
      <header className={`twc-nav ${scrolled ? "is-scrolled" : ""}`}>
        <div className="twc-nav-inner">
          <Link href="/" className="twc-brand">
            <TrustMark />
            <span className="twc-brand-trust">
              TRUST WALLET<span className="twc-brand-cloud"> CLOUD</span>
            </span>
          </Link>

          <nav className="twc-nav-links" aria-label="Primary">
            <Link href="/wallet">{t.navWallet}</Link>
            <a href={featuresHref}>{t.navFeatures}</a>
            <a href={securityHref}>{t.navSecurity}</a>
            <a
              href="/about"
              className={active === "about" ? "is-active" : undefined}
            >
              {t.navAbout}
            </a>
          </nav>

          <div className="twc-nav-actions">
            <a href="/about" className="twc-nav-about-mobile">
              {t.navAbout}
            </a>
            <LanguageSelector
              locale={locale}
              onChange={changeLocale}
              label={t.language}
            />
            <Link href="/wallet" className="twc-btn twc-btn-primary twc-btn-sm">
              {t.navOpen}
            </Link>
          </div>
        </div>
      </header>

      {children({ locale, t })}

      <footer className="twc-footer">
        <div className="twc-footer-inner">
          <div className="twc-footer-brand">
            <TrustMark />
            <span>Trust Wallet Cloud</span>
          </div>
          <div className="twc-footer-meta">
            <p className="twc-footer-copy">{t.footerRights}</p>
            <nav className="twc-footer-links" aria-label="Legal">
              <Link href="/about" className="twc-footer-link">
                {t.navAbout}
              </Link>
              <Link href="/privacy" className="twc-footer-link">
                {t.footerPrivacy}
              </Link>
              <Link href="/cookies" className="twc-footer-link">
                {t.footerCookies}
              </Link>
              <Link href="/wallet" className="twc-footer-link">
                {t.footerWallet}
              </Link>
            </nav>
            <LanguageSelector
              locale={locale}
              onChange={changeLocale}
              label={t.language}
            />
          </div>
        </div>
        <FooterCertBadges
          iso27701Alt={t.footerIso27701}
          iso27001Alt={t.footerIso27001}
        />
      </footer>

      <CookieBanner copy={t} />
    </div>
  );
}
