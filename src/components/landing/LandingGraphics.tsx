import type { ReactNode } from "react";

/** Ilustraciones estilo Trust Wallet: blobs + iconografía bold. */

type Tone = "blue" | "green" | "dark" | "soft";

const TONE: Record<Tone, { bg: string; fg: string }> = {
  blue: { bg: "rgba(5, 0, 255, 0.1)", fg: "#0500ff" },
  green: { bg: "rgba(72, 255, 145, 0.18)", fg: "#0a9f5c" },
  dark: { bg: "rgba(255, 255, 255, 0.08)", fg: "#48ff91" },
  soft: { bg: "#eef0f8", fg: "#0500ff" },
};

export function GraphicBlob({
  tone = "blue",
  children,
  size = "md",
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { bg, fg } = TONE[tone];
  return (
    <span
      className={`twc-gblob twc-gblob--${size} ${className}`.trim()}
      style={{ background: bg, color: fg }}
      aria-hidden
    >
      {children}
    </span>
  );
}

export function IconKeys() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <circle cx="18" cy="22" r="8" stroke="currentColor" strokeWidth="2.4" />
      <path
        d="M24 22h16v4h-4v4h-4v-4h-2"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="22" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function IconCloud() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <path
        d="M16 32h18a7 7 0 000-14 9 9 0 00-17.2-2.5A6.5 6.5 0 0016 32z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M20 24l3 3 6-7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconChains() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <circle cx="16" cy="18" r="6" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="32" cy="30" r="6" stroke="currentColor" strokeWidth="2.4" />
      <path
        d="M21 22l6 4"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="34" cy="14" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M30 16l-4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconLock() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <rect x="12" y="20" width="24" height="18" rx="4" stroke="currentColor" strokeWidth="2.4" />
      <path
        d="M18 20v-4a6 6 0 0112 0v4"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="24" cy="29" r="2.2" fill="currentColor" />
    </svg>
  );
}

export function IconShield() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <path
        d="M24 8l14 5v11c0 9-6 15-14 17-8-2-14-8-14-17V13l14-5z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M18 24l4 4 8-9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconGlobe() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="2.4" />
      <path
        d="M10 24h28M24 10c4 4 6 9 6 14s-2 10-6 14c-4-4-6-9-6-14s2-10 6-14z"
        stroke="currentColor"
        strokeWidth="2.2"
      />
    </svg>
  );
}

export function IconSend() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <path
        d="M12 24l24-10-8 24-5-9-11-5z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M28 14L23 29" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconReceive() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <rect x="12" y="12" width="24" height="24" rx="5" stroke="currentColor" strokeWidth="2.4" />
      <path
        d="M18 22v8h8M18 30l12-12"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSwap() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <path
        d="M14 18h20l-5-5M34 30H14l5 5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconDiscover() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <circle cx="22" cy="22" r="10" stroke="currentColor" strokeWidth="2.4" />
      <path d="M29 29l8 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="22" cy="22" r="3" fill="currentColor" />
    </svg>
  );
}

export function IconDevice() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <rect x="15" y="8" width="18" height="32" rx="4" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="24" cy="34" r="1.6" fill="currentColor" />
      <path d="M20 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconSign() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <path
        d="M14 30c4-8 8-12 16-14"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M26 14l6 2-2 6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 36h24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconLedger() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <rect x="10" y="10" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="2.4" />
      <path d="M16 20h16M16 26h12M16 32h8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
      <path
        d="M7.5 12.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconCross() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.12" />
      <path
        d="M8 8l8 8M16 8l-8 8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconStore() {
  return (
    <svg viewBox="0 0 48 48" fill="none">
      <path
        d="M12 18h24v18a3 3 0 01-3 3H15a3 3 0 01-3-3V18z"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <path
        d="M10 18l2.5-7h23L38 18"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M20 28h8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** Composición ilustrada: escudo + monedas orbitando (estilo Trust). */
export function ShieldOrbitArt() {
  return (
    <div className="twc-orbit" aria-hidden>
      <div className="twc-orbit-ring twc-orbit-ring--a" />
      <div className="twc-orbit-ring twc-orbit-ring--b" />
      <div className="twc-orbit-core">
        <svg viewBox="0 0 80 80" className="twc-orbit-shield">
          <defs>
            <linearGradient id="twcShieldGrad" x1="40" y1="8" x2="40" y2="72">
              <stop stopColor="#5cffaa" />
              <stop offset="1" stopColor="#48ff91" />
            </linearGradient>
          </defs>
          <path
            d="M40 10L16 20v18c0 16 10 28 24 31 14-3 24-15 24-31V20L40 10z"
            fill="url(#twcShieldGrad)"
          />
          <path
            d="M40 18L24 25v13c0 11 7 20 16 22 9-2 16-11 16-22V25L40 18z"
            fill="#0500ff"
          />
          <path
            d="M40 28l-8 3v8c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11v-8l-8-3z"
            fill="url(#twcShieldGrad)"
          />
        </svg>
      </div>
      <span className="twc-orbit-coin twc-orbit-coin--1" />
      <span className="twc-orbit-coin twc-orbit-coin--2" />
      <span className="twc-orbit-coin twc-orbit-coin--3" />
      <span className="twc-orbit-coin twc-orbit-coin--4" />
    </div>
  );
}

/** Panel ilustrado para secciones split. */
export function ShowcaseArt({ variant = "privacy" }: { variant?: "privacy" | "network" }) {
  if (variant === "network") {
    return (
      <div className="twc-showcase-art twc-showcase-art--network" aria-hidden>
        <div className="twc-showcase-grid">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`twc-showcase-node twc-showcase-node--${i}`} />
          ))}
        </div>
        <div className="twc-showcase-center">
          <GraphicBlob tone="blue" size="lg">
            <IconGlobe />
          </GraphicBlob>
        </div>
      </div>
    );
  }

  return (
    <div className="twc-showcase-art twc-showcase-art--privacy" aria-hidden>
      <div className="twc-showcase-blob twc-showcase-blob--a" />
      <div className="twc-showcase-blob twc-showcase-blob--b" />
      <div className="twc-showcase-stack">
        <GraphicBlob tone="dark" size="lg">
          <IconShield />
        </GraphicBlob>
        <div className="twc-showcase-pills">
          <span>
            <IconLock /> Encryption
          </span>
          <span>
            <IconKeys /> Self-custody
          </span>
        </div>
      </div>
    </div>
  );
}
