"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { CookieBanner } from "@/components/landing/CookieBanner";
import { FooterCertBadges } from "@/components/landing/FooterCertBadges";
import {
  detectLandingLocale,
  LANDING_COPY,
  type LandingLocale,
} from "@/lib/landing/i18n";
import {
  getLegalCopy,
  type LegalBlock,
  type LegalPageId,
} from "@/lib/landing/legal-i18n";

type Props = {
  page: LegalPageId;
};

function LegalBlocks({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        switch (block.type) {
          case "p":
            return <p key={key}>{block.text}</p>;
          case "note":
            return (
              <p key={key} className="twc-legal-note">
                {block.text}
              </p>
            );
          case "h3":
            return <h3 key={key}>{block.text}</h3>;
          case "ul":
            return (
              <ul key={key} className="twc-legal-list">
                {block.items.map((item) => (
                  <li key={item.slice(0, 48)}>{item}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className="twc-legal-list twc-legal-list--ol">
                {block.items.map((item) => (
                  <li key={item.slice(0, 48)}>{item}</li>
                ))}
              </ol>
            );
          case "table":
            return (
              <div key={key} className="twc-legal-table-wrap">
                <table className="twc-legal-table">
                  <thead>
                    <tr>
                      {block.headers.map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row) => (
                      <tr key={row[0]?.slice(0, 32)}>
                        {row.map((cell, cellIndex) => (
                          <td key={`${cellIndex}-${cell.slice(0, 24)}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "link":
            return (
              <p key={key} className="twc-legal-inline-link">
                {block.prefix}
                <Link href={block.href}>{block.label}</Link>
              </p>
            );
          default:
            return <Fragment key={key} />;
        }
      })}
    </>
  );
}

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

        <div className="twc-legal-intro">
          {copy.intro.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </div>

        <nav className="twc-legal-toc" aria-label={copy.tocTitle}>
          <p className="twc-legal-toc-title">{copy.tocTitle}</p>
          <ol>
            {copy.sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        {copy.sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="twc-legal-section"
          >
            <h2>{section.title}</h2>
            <LegalBlocks blocks={section.blocks} />
          </section>
        ))}
      </main>

      <footer className="twc-legal-footer">
        <div className="twc-legal-footer-inner">
          <Link href="/about">{nav.navAbout}</Link>
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
