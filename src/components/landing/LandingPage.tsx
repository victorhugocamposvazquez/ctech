"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LanguageSelector } from "./LanguageSelector";
import {
  detectLandingLocale,
  LANDING_COPY,
  persistLandingLocale,
  type LandingLocale,
} from "@/lib/landing/i18n";

function useReveal() {
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>(".twc-reveal");
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.18 }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
}

export function LandingPage() {
  const [locale, setLocale] = useState<LandingLocale>("en");
  const [scrolled, setScrolled] = useState(false);
  const t = LANDING_COPY[locale];

  useReveal();

  useEffect(() => {
    setLocale(detectLandingLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const changeLocale = (next: LandingLocale) => {
    setLocale(next);
    persistLandingLocale(next);
  };

  return (
    <div className="twc">
      <header className={`twc-nav ${scrolled ? "is-scrolled" : ""}`}>
        <div className="twc-nav-inner">
          <a href="#top" className="twc-brand">
            <Image
              src="/wallet/icons/icon-192.png"
              alt=""
              width={36}
              height={36}
              className="twc-brand-mark"
              priority
            />
            <span className="twc-brand-name">
              Trust Wallet <span>Cloud</span>
            </span>
          </a>

          <div className="twc-nav-actions">
            <Link href="/wallet" className="twc-nav-link">
              {t.navWallet}
            </Link>
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

      <main id="top">
        <section className="twc-hero" aria-label={t.brand}>
          <div className="twc-hero-plane" aria-hidden />
          <div className="twc-hero-inner">
            <div className="twc-hero-copy">
              <span className="twc-hero-brand">
                Trust Wallet <em>Cloud</em>
              </span>
              <h1 className="twc-hero-title">{t.heroTitle}</h1>
              <p className="twc-hero-sub">{t.heroSubtitle}</p>
              <div className="twc-hero-ctas">
                <Link href="/wallet" className="twc-btn twc-btn-primary">
                  {t.ctaPrimary}
                </Link>
                <a href="#decentralized" className="twc-btn twc-btn-ghost">
                  {t.ctaSecondary}
                </a>
              </div>
            </div>

            <div className="twc-hero-visual" aria-hidden>
              <div className="twc-hero-orb" />
              <Image
                src="/wallet/icons/icon-512.png"
                alt=""
                width={512}
                height={512}
                className="twc-hero-shield"
                priority
              />
            </div>
          </div>
        </section>

        <div className="twc-stats twc-reveal">
          <div className="twc-stat">
            <span className="twc-stat-value">{t.statsUsers}</span>
            <span className="twc-stat-label">{t.statsUsersLabel}</span>
          </div>
          <div className="twc-stat">
            <span className="twc-stat-value">{t.statsChains}</span>
            <span className="twc-stat-label">{t.statsChainsLabel}</span>
          </div>
          <div className="twc-stat">
            <span className="twc-stat-value">{t.statsSelfCustody}</span>
            <span className="twc-stat-label">{t.statsSelfCustodyLabel}</span>
          </div>
        </div>

        <section id="decentralized" className="twc-section twc-reveal">
          <div className="twc-section-head">
            <h2 className="twc-section-title">{t.sectionDecentralizedTitle}</h2>
            <p className="twc-section-body">{t.sectionDecentralizedBody}</p>
          </div>
          <div className="twc-features">
            <article className="twc-feature">
              <h3>{t.featureKeysTitle}</h3>
              <p>{t.featureKeysBody}</p>
            </article>
            <article className="twc-feature">
              <h3>{t.featureCloudTitle}</h3>
              <p>{t.featureCloudBody}</p>
            </article>
            <article className="twc-feature">
              <h3>{t.featureMultiTitle}</h3>
              <p>{t.featureMultiBody}</p>
            </article>
          </div>
        </section>

        <section className="twc-privacy">
          <div className="twc-section twc-reveal">
            <div className="twc-section-head">
              <h2 className="twc-section-title">{t.privacyTitle}</h2>
              <p className="twc-section-body">{t.privacyBody}</p>
            </div>
            <div className="twc-privacy-grid">
              <article className="twc-privacy-item">
                <h3>{t.privacyPoint1Title}</h3>
                <p>{t.privacyPoint1Body}</p>
              </article>
              <article className="twc-privacy-item">
                <h3>{t.privacyPoint2Title}</h3>
                <p>{t.privacyPoint2Body}</p>
              </article>
              <article className="twc-privacy-item">
                <h3>{t.privacyPoint3Title}</h3>
                <p>{t.privacyPoint3Body}</p>
              </article>
            </div>
          </div>
        </section>

        <section className="twc-final twc-reveal">
          <div className="twc-final-inner">
            <h2>{t.finalTitle}</h2>
            <p>{t.finalBody}</p>
            <Link href="/wallet" className="twc-btn twc-btn-green">
              {t.finalCta}
            </Link>
          </div>
        </section>
      </main>

      <footer className="twc-footer">
        <div className="twc-footer-inner">
          <div className="twc-footer-brand">
            <Image
              src="/wallet/icons/icon-192.png"
              alt=""
              width={28}
              height={28}
            />
            <span>Trust Wallet Cloud</span>
          </div>
          <div className="twc-footer-meta">
            <p className="twc-footer-copy">{t.footerRights}</p>
            <Link href="/wallet" className="twc-footer-link">
              {t.footerWallet}
            </Link>
            <LanguageSelector
              locale={locale}
              onChange={changeLocale}
              label={t.language}
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
