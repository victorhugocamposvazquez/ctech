"use client";

import { useId } from "react";

/** Composición hero estilo Trust Wallet: móviles + props neón. */

export function HeroScene() {
  return (
    <div className="twc-scene" aria-hidden>
      <div className="twc-scene-glow" />

      {/* Discos abstractos */}
      <span className="twc-scene-disc twc-scene-disc--a" />
      <span className="twc-scene-disc twc-scene-disc--b" />
      <span className="twc-scene-disc twc-scene-disc--c" />

      {/* Teléfono light (detrás) */}
      <div className="twc-scene-phone twc-scene-phone--light">
        <div className="twc-scene-phone-bezel">
          <div className="twc-scene-phone-ui twc-scene-phone-ui--light">
            <div className="twc-scene-ui-top">
              <span className="twc-scene-ui-pill" />
              <span className="twc-scene-ui-dot" />
            </div>
            <p className="twc-scene-ui-label">Total balance</p>
            <p className="twc-scene-ui-balance">$1,228.20</p>
            <div className="twc-scene-ui-actions">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="twc-scene-ui-rows">
              <div>
                <i className="twc-scene-token twc-scene-token--bnb" />
                <b>BNB</b>
                <em>$412.00</em>
              </div>
              <div>
                <i className="twc-scene-token twc-scene-token--usdt" />
                <b>USDT</b>
                <em>$500.00</em>
              </div>
              <div>
                <i className="twc-scene-token twc-scene-token--eth" />
                <b>ETH</b>
                <em>$316.20</em>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Teléfono dark (delante) */}
      <div className="twc-scene-phone twc-scene-phone--dark">
        <div className="twc-scene-phone-bezel twc-scene-phone-bezel--dark">
          <div className="twc-scene-phone-ui twc-scene-phone-ui--dark">
            <div className="twc-scene-ui-top">
              <span className="twc-scene-ui-pill twc-scene-ui-pill--dark" />
              <span className="twc-scene-ui-dot twc-scene-ui-dot--green" />
            </div>
            <p className="twc-scene-ui-label twc-scene-ui-label--dark">Cloud Wallet</p>
            <p className="twc-scene-ui-balance twc-scene-ui-balance--dark">$2,480.00</p>
            <div className="twc-scene-ui-actions twc-scene-ui-actions--dark">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="twc-scene-ui-rows twc-scene-ui-rows--dark">
              <div>
                <i className="twc-scene-token twc-scene-token--bnb" />
                <b>BNB</b>
                <em>$890.00</em>
              </div>
              <div>
                <i className="twc-scene-token twc-scene-token--usdt" />
                <b>USDT</b>
                <em>$1,200.00</em>
              </div>
              <div>
                <i className="twc-scene-token twc-scene-token--btc" />
                <b>BTC</b>
                <em>$390.00</em>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Escudo neón */}
      <div className="twc-prop twc-prop--shield">
        <svg viewBox="0 0 120 140" fill="none">
          <defs>
            <linearGradient id="twcNeonShield" x1="20" y1="10" x2="100" y2="130">
              <stop stopColor="#4d7cff" />
              <stop offset="0.45" stopColor="#7b5cff" />
              <stop offset="1" stopColor="#48ff91" />
            </linearGradient>
            <linearGradient id="twcNeonShieldInner" x1="40" y1="30" x2="80" y2="100">
              <stop stopColor="#0500ff" />
              <stop offset="1" stopColor="#1a1a2e" />
            </linearGradient>
            <filter id="twcShieldGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M60 8L18 24v32c0 28 18 48 42 54 24-6 42-26 42-54V24L60 8z"
            fill="url(#twcNeonShield)"
            filter="url(#twcShieldGlow)"
          />
          <path
            d="M60 22L32 34v22c0 18 12 32 28 36 16-4 28-18 28-36V34L60 22z"
            fill="url(#twcNeonShieldInner)"
          />
          <path
            d="M60 40l-12 5v12c0 8 5 14 12 16 7-2 12-8 12-16V45l-12-5z"
            fill="url(#twcNeonShield)"
          />
        </svg>
      </div>

      {/* Llave neón */}
      <div className="twc-prop twc-prop--key">
        <svg viewBox="0 0 100 56" fill="none">
          <defs>
            <linearGradient id="twcNeonKey" x1="0" y1="0" x2="100" y2="56">
              <stop stopColor="#ffe566" />
              <stop offset="0.4" stopColor="#ff7ad9" />
              <stop offset="1" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
          <circle cx="22" cy="28" r="14" stroke="url(#twcNeonKey)" strokeWidth="7" />
          <circle cx="22" cy="28" r="5" fill="url(#twcNeonKey)" />
          <path
            d="M34 28h52v8H74v8H64v-8H54v6H44v-6H34z"
            fill="url(#twcNeonKey)"
          />
        </svg>
      </div>

      {/* Candado neón */}
      <div className="twc-prop twc-prop--lock">
        <svg viewBox="0 0 72 90" fill="none">
          <defs>
            <linearGradient id="twcNeonLock" x1="8" y1="8" x2="64" y2="84">
              <stop stopColor="#22d3ee" />
              <stop offset="0.5" stopColor="#a78bfa" />
              <stop offset="1" stopColor="#48ff91" />
            </linearGradient>
          </defs>
          <path
            d="M20 38V28a16 16 0 0132 0v10"
            stroke="url(#twcNeonLock)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <rect x="10" y="38" width="52" height="42" rx="10" fill="url(#twcNeonLock)" />
          <circle cx="36" cy="58" r="5" fill="#0a0a12" />
          <path d="M36 63v8" stroke="#0a0a12" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

export function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="twc-btn-ico">
      <rect x="7" y="3" width="10" height="18" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M11 17.5h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconDesktop() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="twc-btn-ico">
      <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function TrustMark() {
  const gradId = `twcLogoGrad-${useId().replace(/:/g, "")}`;

  return (
    <svg
      className="twc-trust-mark"
      width="39"
      height="43"
      viewBox="0 0 39 43"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M0.710815 6.67346L19.4317 0.606445V42.6064C6.05944 37.0059 0.710815 26.2727 0.710815 20.207V6.67346Z"
        fill="#0500FF"
      />
      <path
        d="M38.1537 6.67346L19.4329 0.606445V42.6064C32.8051 37.0059 38.1537 26.2727 38.1537 20.207V6.67346Z"
        fill={`url(#${gradId})`}
      />
      <defs>
        <linearGradient
          id={gradId}
          x1="33.1809"
          y1="-2.33467"
          x2="19.115"
          y2="42.0564"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.02" stopColor="#0000FF" />
          <stop offset="0.08" stopColor="#0094FF" />
          <stop offset="0.16" stopColor="#48FF91" />
          <stop offset="0.42" stopColor="#0094FF" />
          <stop offset="0.68" stopColor="#0038FF" />
          <stop offset="0.9" stopColor="#0500FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
