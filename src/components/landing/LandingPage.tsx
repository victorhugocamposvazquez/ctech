"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ChainStrip } from "./ChainStrip";
import { HeroScene, IconDesktop, IconPhone } from "./HeroScene";
import { LandingChrome } from "./LandingChrome";
import { useLandingLocale } from "./LandingLocaleContext";
import {
  GraphicBlob,
  IconChains,
  IconCheck,
  IconCloud,
  IconCross,
  IconDevice,
  IconDiscover,
  IconGlobe,
  IconKeys,
  IconLedger,
  IconLock,
  IconReceive,
  IconSend,
  IconShield,
  IconSign,
  IconStore,
  IconSwap,
  ShowcaseArt,
  ShieldOrbitArt,
} from "./LandingGraphics";
import type { LandingLocale } from "@/lib/landing/i18n";

function useReveal(locale: LandingLocale) {
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>(".twc-reveal:not(.is-in)");
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
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [locale]);
}

export function LandingPage() {
  return (
    <LandingChrome active="home">
      <LandingContent />
    </LandingChrome>
  );
}

function LandingContent() {
  const { locale, t } = useLandingLocale();
  useReveal(locale);

  return (
    <main id="top">
      <section className="twc-hero" aria-label={t.brand}>
        <div className="twc-hero-inner">
          <div className="twc-hero-copy">
            <h1 className="twc-hero-title">{t.heroTitle}</h1>
            <p className="twc-hero-sub">{t.heroSubtitle}</p>
            <div className="twc-hero-ctas">
              <Link href="/wallet" className="twc-btn twc-btn-primary">
                <IconPhone />
                {t.ctaPrimary}
              </Link>
              <Link href="/wallet" className="twc-btn twc-btn-outline">
                <IconDesktop />
                {t.ctaSecondary}
              </Link>
            </div>
          </div>

          <div className="twc-hero-visual">
            <HeroScene />
          </div>
        </div>

        <ChainStrip label={t.chainsLabel} />
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
          <article className="twc-feature twc-feature--visual">
            <GraphicBlob tone="blue" size="md">
              <IconKeys />
            </GraphicBlob>
            <h3>{t.featureKeysTitle}</h3>
            <p>{t.featureKeysBody}</p>
          </article>
          <article className="twc-feature twc-feature--visual">
            <GraphicBlob tone="green" size="md">
              <IconCloud />
            </GraphicBlob>
            <h3>{t.featureCloudTitle}</h3>
            <p>{t.featureCloudBody}</p>
          </article>
          <article className="twc-feature twc-feature--visual">
            <GraphicBlob tone="soft" size="md">
              <IconChains />
            </GraphicBlob>
            <h3>{t.featureMultiTitle}</h3>
            <p>{t.featureMultiBody}</p>
          </article>
        </div>
      </section>

      <section id="security" className="twc-privacy">
        <div className="twc-section twc-split twc-reveal">
          <div className="twc-split-copy">
            <div className="twc-section-head">
              <h2 className="twc-section-title">{t.privacyTitle}</h2>
              <p className="twc-section-body">{t.privacyBody}</p>
            </div>
            <div className="twc-privacy-grid">
              <article className="twc-privacy-item twc-privacy-item--visual">
                <GraphicBlob tone="dark" size="sm">
                  <IconLock />
                </GraphicBlob>
                <div>
                  <h3>{t.privacyPoint1Title}</h3>
                  <p>{t.privacyPoint1Body}</p>
                </div>
              </article>
              <article className="twc-privacy-item twc-privacy-item--visual">
                <GraphicBlob tone="dark" size="sm">
                  <IconShield />
                </GraphicBlob>
                <div>
                  <h3>{t.privacyPoint2Title}</h3>
                  <p>{t.privacyPoint2Body}</p>
                </div>
              </article>
              <article className="twc-privacy-item twc-privacy-item--visual">
                <GraphicBlob tone="dark" size="sm">
                  <IconGlobe />
                </GraphicBlob>
                <div>
                  <h3>{t.privacyPoint3Title}</h3>
                  <p>{t.privacyPoint3Body}</p>
                </div>
              </article>
            </div>
          </div>
          <ShowcaseArt variant="privacy" />
        </div>
      </section>

      <section id="how" className="twc-section twc-reveal">
        <div className="twc-section-head twc-section-head--center">
          <h2 className="twc-section-title">{t.howTitle}</h2>
          <p className="twc-section-body">{t.howBody}</p>
        </div>
        <ol className="twc-steps twc-steps--visual">
          <li className="twc-step twc-step--visual">
            <div className="twc-step-top">
              <GraphicBlob tone="blue" size="md">
                <IconDevice />
              </GraphicBlob>
              <span className="twc-step-num">01</span>
            </div>
            <h3>{t.how1Title}</h3>
            <p>{t.how1Body}</p>
          </li>
          <li className="twc-step twc-step--visual">
            <div className="twc-step-top">
              <GraphicBlob tone="green" size="md">
                <IconSign />
              </GraphicBlob>
              <span className="twc-step-num">02</span>
            </div>
            <h3>{t.how2Title}</h3>
            <p>{t.how2Body}</p>
          </li>
          <li className="twc-step twc-step--visual">
            <div className="twc-step-top">
              <GraphicBlob tone="soft" size="md">
                <IconLedger />
              </GraphicBlob>
              <span className="twc-step-num">03</span>
            </div>
            <h3>{t.how3Title}</h3>
            <p>{t.how3Body}</p>
          </li>
        </ol>
      </section>

      <section className="twc-band">
        <div className="twc-section twc-reveal">
          <div className="twc-section-head">
            <h2 className="twc-section-title">{t.toolsTitle}</h2>
            <p className="twc-section-body">{t.toolsBody}</p>
          </div>
          <div className="twc-tools twc-tools--visual">
            <article className="twc-tool twc-tool--visual">
              <GraphicBlob tone="blue" size="md">
                <IconSend />
              </GraphicBlob>
              <div>
                <span className="twc-tool-label">01</span>
                <h3>{t.toolSendTitle}</h3>
                <p>{t.toolSendBody}</p>
              </div>
            </article>
            <article className="twc-tool twc-tool--visual">
              <GraphicBlob tone="green" size="md">
                <IconReceive />
              </GraphicBlob>
              <div>
                <span className="twc-tool-label">02</span>
                <h3>{t.toolReceiveTitle}</h3>
                <p>{t.toolReceiveBody}</p>
              </div>
            </article>
            <article className="twc-tool twc-tool--visual">
              <GraphicBlob tone="soft" size="md">
                <IconSwap />
              </GraphicBlob>
              <div>
                <span className="twc-tool-label">03</span>
                <h3>{t.toolSwapTitle}</h3>
                <p>{t.toolSwapBody}</p>
              </div>
            </article>
            <article className="twc-tool twc-tool--visual">
              <GraphicBlob tone="blue" size="md">
                <IconDiscover />
              </GraphicBlob>
              <div>
                <span className="twc-tool-label">04</span>
                <h3>{t.toolDiscoverTitle}</h3>
                <p>{t.toolDiscoverBody}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="twc-section twc-reveal">
        <div className="twc-section-head twc-section-head--center">
          <h2 className="twc-section-title">{t.compareTitle}</h2>
          <p className="twc-section-body">{t.compareBody}</p>
        </div>
        <div className="twc-compare twc-compare--visual">
          <div className="twc-compare-col twc-compare-col--muted">
            <div className="twc-compare-badge twc-compare-badge--bad">
              <IconCross />
            </div>
            <h3>{t.compareLeftTitle}</h3>
            <ul>
              <li>
                <IconCross />
                <span>{t.compareLeft1}</span>
              </li>
              <li>
                <IconCross />
                <span>{t.compareLeft2}</span>
              </li>
              <li>
                <IconCross />
                <span>{t.compareLeft3}</span>
              </li>
            </ul>
          </div>
          <div className="twc-compare-col twc-compare-col--accent">
            <div className="twc-compare-badge twc-compare-badge--good">
              <IconCheck />
            </div>
            <h3>{t.compareRightTitle}</h3>
            <ul>
              <li>
                <IconCheck />
                <span>{t.compareRight1}</span>
              </li>
              <li>
                <IconCheck />
                <span>{t.compareRight2}</span>
              </li>
              <li>
                <IconCheck />
                <span>{t.compareRight3}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="networks" className="twc-network-wrap">
        <div className="twc-section twc-split twc-reveal">
          <div className="twc-split-copy">
            <div className="twc-section-head">
              <h2 className="twc-section-title">{t.networkTitle}</h2>
              <p className="twc-section-body">{t.networkBody}</p>
            </div>
            <div className="twc-features twc-features--stack">
              <article className="twc-feature twc-feature--row">
                <GraphicBlob tone="blue" size="sm">
                  <IconChains />
                </GraphicBlob>
                <div>
                  <h3>{t.networkBnbTitle}</h3>
                  <p>{t.networkBnbBody}</p>
                </div>
              </article>
              <article className="twc-feature twc-feature--row">
                <GraphicBlob tone="green" size="sm">
                  <IconLedger />
                </GraphicBlob>
                <div>
                  <h3>{t.networkOpenTitle}</h3>
                  <p>{t.networkOpenBody}</p>
                </div>
              </article>
              <article className="twc-feature twc-feature--row">
                <GraphicBlob tone="soft" size="sm">
                  <IconStore />
                </GraphicBlob>
                <div>
                  <h3>{t.networkPwaTitle}</h3>
                  <p>{t.networkPwaBody}</p>
                </div>
              </article>
            </div>
          </div>
          <ShowcaseArt variant="network" />
        </div>
      </section>

      <section className="twc-community twc-section twc-reveal">
        <div className="twc-section-head twc-section-head--center">
          <h2 className="twc-section-title twc-title-pre">{t.communityTitle}</h2>
          <p className="twc-section-body">{t.communityBody}</p>
        </div>
        <div className="twc-quotes">
          <figure className="twc-quote">
            <blockquote>{t.quote1Text}</blockquote>
            <figcaption>
              <span className="twc-quote-avatar twc-quote-avatar--blue" aria-hidden>
                {t.quote1Name.charAt(0)}
              </span>
              <b>{t.quote1Name}</b>
            </figcaption>
          </figure>
          <figure className="twc-quote twc-quote--accent">
            <blockquote>{t.quote2Text}</blockquote>
            <figcaption>
              <span className="twc-quote-avatar twc-quote-avatar--green" aria-hidden>
                {t.quote2Name.charAt(0)}
              </span>
              <b>{t.quote2Name}</b>
            </figcaption>
          </figure>
          <figure className="twc-quote">
            <blockquote>{t.quote3Text}</blockquote>
            <figcaption>
              <span className="twc-quote-avatar twc-quote-avatar--ink" aria-hidden>
                {t.quote3Name.charAt(0)}
              </span>
              <b>{t.quote3Name}</b>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="twc-final twc-final--visual twc-reveal">
        <div className="twc-final-art" aria-hidden>
          <ShieldOrbitArt />
        </div>
        <div className="twc-final-inner">
          <h2>{t.finalTitle}</h2>
          <p>{t.finalBody}</p>
          <Link href="/wallet" className="twc-btn twc-btn-green">
            {t.finalCta}
          </Link>
        </div>
      </section>
    </main>
  );
}
