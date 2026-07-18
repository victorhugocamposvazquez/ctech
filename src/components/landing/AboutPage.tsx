"use client";

import Link from "next/link";
import { useEffect } from "react";
import { getAboutCopy } from "@/lib/landing/about-i18n";
import type { LandingLocale } from "@/lib/landing/i18n";
import {
  GraphicBlob,
  IconKeys,
  IconShield,
  ShowcaseArt,
  ShieldOrbitArt,
} from "./LandingGraphics";
import { LandingChrome } from "./LandingChrome";
import { useLandingLocale } from "./LandingLocaleContext";

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

export function AboutPage() {
  return (
    <LandingChrome active="about">
      <AboutContent />
    </LandingChrome>
  );
}

function AboutContent() {
  const { locale } = useLandingLocale();
  const a = getAboutCopy(locale);
  useReveal(locale);

  return (
    <main className="twc-about" key={locale}>
      <section className="twc-about-hero">
        <div className="twc-about-hero-inner">
          <div className="twc-about-hero-copy">
            <h1 className="twc-about-hero-title">{a.heroTitle}</h1>
            <p className="twc-about-hero-body">{a.heroBody}</p>
            <Link href="/wallet" className="twc-btn twc-btn-primary">
              {a.heroCta}
            </Link>
          </div>
          <div className="twc-about-hero-art" aria-hidden>
            <ShieldOrbitArt />
          </div>
        </div>
      </section>

      <section className="twc-section twc-about-pillars twc-reveal">
        <article className="twc-about-pillar">
          <span className="twc-about-label">{a.purposeLabel}</span>
          <h2>{a.purposeTitle}</h2>
          <p>{a.purposeBody}</p>
        </article>
        <article className="twc-about-pillar twc-about-pillar--accent">
          <span className="twc-about-label">{a.visionLabel}</span>
          <h2>{a.visionTitle}</h2>
          <p>{a.visionBody}</p>
          <div className="twc-about-pillar-icon">
            <GraphicBlob tone="blue" size="md">
              <IconKeys />
            </GraphicBlob>
          </div>
        </article>
        <article className="twc-about-pillar twc-about-pillar--dark">
          <span className="twc-about-label">{a.missionLabel}</span>
          <h2>{a.missionTitle}</h2>
          <p>{a.missionBody}</p>
          <div className="twc-about-pillar-icon">
            <GraphicBlob tone="dark" size="md">
              <IconShield />
            </GraphicBlob>
          </div>
        </article>
      </section>

      <section className="twc-about-journey twc-reveal">
        <div className="twc-section">
          <div className="twc-section-head twc-section-head--center">
            <h2 className="twc-section-title">{a.journeyTitle}</h2>
          </div>
          <div className="twc-about-milestones">
            {a.milestones.map((item, index) => (
              <article key={`${locale}-${item.title}`} className="twc-about-milestone">
                <span className="twc-about-milestone-num">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="twc-section twc-reveal">
        <div className="twc-section-head twc-section-head--center">
          <h2 className="twc-section-title">{a.valuesTitle}</h2>
        </div>
        <div className="twc-about-values">
          {a.values.map((value) => (
            <article key={`${locale}-${value.title}`} className="twc-about-value">
              <h3>{value.title}</h3>
              <p>{value.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="twc-about-team twc-reveal">
        <div className="twc-section twc-split">
          <div className="twc-split-copy">
            <h2 className="twc-section-title">{a.teamTitle}</h2>
            <p className="twc-section-body">{a.teamBody}</p>
            <Link href="/wallet" className="twc-btn twc-btn-green">
              {a.teamCta}
            </Link>
          </div>
          <ShowcaseArt variant="privacy" />
        </div>
      </section>
    </main>
  );
}
