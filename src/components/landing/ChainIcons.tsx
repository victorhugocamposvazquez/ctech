import type { ReactElement } from "react";

/** Iconos de redes compatibles (estilo marca, 32×32). */

export type ChainMeta = {
  id: string;
  name: string;
  Icon: () => ReactElement;
};

function BnbIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
      <path
        fill="#fff"
        d="M16 7.2l2.3 2.3-6.1 6.1-2.3-2.3L16 7.2zm6.1 3.8l2.3 2.3-8.4 8.4-2.3-2.3 8.4-8.4zM9.9 11l2.3 2.3-6.1 6.1L3.8 17 9.9 11zm12.2 0L28.2 17l-2.3 2.3-6.1-6.1L22.1 11zM16 17.7l2.3 2.3-2.3 2.3-2.3-2.3 2.3-2.3z"
      />
    </svg>
  );
}

function EthIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#627EEA" />
      <path fill="#fff" fillOpacity=".6" d="M16.5 5v8.1l6.8 3.05L16.5 5z" />
      <path fill="#fff" d="M16.5 5L9.7 16.15l6.8-3.04V5z" />
      <path fill="#fff" fillOpacity=".6" d="M16.5 21.97v5.02l6.81-9.42-6.81 4.4z" />
      <path fill="#fff" d="M16.5 26.99v-5.02l-6.8-4.4 6.8 9.42z" />
      <path fill="#fff" fillOpacity=".2" d="M16.5 20.57l6.8-4.42-6.8-3.04v7.46z" />
      <path fill="#fff" fillOpacity=".6" d="M9.7 16.15l6.8 4.42v-7.46l-6.8 3.04z" />
    </svg>
  );
}

function BtcIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#F7931A" />
      <path
        fill="#fff"
        d="M22.1 14.3c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.6-.4-.7 2.6c-.4-.1-.9-.2-1.3-.3l.7-2.6-1.6-.4-.7 2.7c-.4-.1-.7-.2-1-.3l-2.2-.6-.4 1.7s1.2.3 1.2.3c.6.2.8.6.7 1l-.7 3c0 0 .1 0 .2.1h-.2l-1.1 4.3c-.1.2-.3.5-.7.4 0 0-1.2-.3-1.2-.3l-.8 1.8 2.1.5c.4.1.8.2 1.1.3l-.7 2.8 1.6.4.7-2.7c.4.1.9.2 1.3.3l-.7 2.7 1.6.4.7-2.8c2.9.5 5 .3 5.9-2.3.7-2.1 0-3.3-1.5-4 .1 0 1.2-.4 1.5-2zm-2.7 3.8c-.5 2.1-4 1-5.1.7l.9-3.7c1.1.3 4.7.8 4.2 3zm.5-3.9c-.5 1.9-3.4.9-4.3.7l.8-3.3c1 .2 4 .7 3.5 2.6z"
      />
    </svg>
  );
}

function SolIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#000" />
      <path
        fill="#14F195"
        d="M10.2 19.6a.7.7 0 01.5-.2h11.6a.3.3 0 01.2.6l-2.2 2.2a.7.7 0 01-.5.2H8.2a.3.3 0 01-.2-.6l2.2-2.2z"
      />
      <path
        fill="#9945FF"
        d="M10.2 12.4a.7.7 0 01.5-.2h11.6a.3.3 0 01.2.6l-2.2 2.2a.7.7 0 01-.5.2H8.2a.3.3 0 01-.2-.6l2.2-2.2z"
      />
      <path
        fill="#00D18C"
        d="M22.3 10a.7.7 0 00-.5-.2H10.2a.3.3 0 00-.2.6l2.2 2.2a.7.7 0 00.5.2h11.6a.3.3 0 00.2-.6L22.3 10z"
      />
    </svg>
  );
}

function PolygonIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#8247E5" />
      <path
        fill="#fff"
        d="M20.8 12.4a1.4 1.4 0 00-1.4 0l-2.5 1.4-1.7 1-2.5 1.4a1.4 1.4 0 01-1.4 0l-2-1.1a1.4 1.4 0 01-.7-1.2v-2.3c0-.5.3-1 .7-1.2l2-1.1a1.4 1.4 0 011.4 0l2 1.1c.4.2.7.7.7 1.2v1.4l1.7-1v-1.4a1.4 1.4 0 00-.7-1.2l-3.6-2.1a1.4 1.4 0 00-1.4 0L8.2 9.5a1.4 1.4 0 00-.7 1.2v4.2c0 .5.3 1 .7 1.2l3.6 2.1a1.4 1.4 0 001.4 0l2.5-1.4 1.7-1 2.5-1.4a1.4 1.4 0 011.4 0l2 1.1c.4.2.7.7.7 1.2v2.3c0 .5-.3 1-.7 1.2l-2 1.2a1.4 1.4 0 01-1.4 0l-2-1.1a1.4 1.4 0 01-.7-1.2v-1.4l-1.7 1v1.4c0 .5.3 1 .7 1.2l3.6 2.1a1.4 1.4 0 001.4 0l3.6-2.1c.4-.2.7-.7.7-1.2v-4.2a1.4 1.4 0 00-.7-1.2l-3.6-2.2z"
      />
    </svg>
  );
}

function AvaxIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#E84142" />
      <path
        fill="#fff"
        d="M20.9 19.5h3.3c.3 0 .5.1.6.3.2.2.2.5.1.8l-1.7 3c-.1.2-.3.4-.5.5-.2.1-.5.1-.7 0l-1.4-.8a.7.7 0 01-.3-.5c0-.2 0-.4.1-.6l1.5-2.7zm-2.4-4.3l1.7-2.9c.1-.2.3-.4.5-.5.2-.1.5-.1.7 0 .2.1.4.3.5.5l5.5 9.6c.1.2.1.5 0 .7-.1.2-.3.4-.5.5H21c-.3 0-.5-.1-.6-.3L18.5 15zm-5.3 0L11.4 22H6.7c-.3 0-.5-.1-.6-.3-.2-.2-.2-.5-.1-.8l5.5-9.5c.1-.2.3-.4.5-.5.2-.1.5-.1.7 0 .2.1.4.3.5.5l1.7 2.9-1.7 3zm2.6 1.5l1.7 3c.1.2.1.4 0 .6a.7.7 0 01-.6.3h-3.4c-.2 0-.5-.1-.6-.3a.7.7 0 010-.7l1.7-3c.1-.2.3-.3.6-.3.2 0 .4.1.6.3z"
      />
    </svg>
  );
}

function ArbIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#213147" />
      <path fill="#28A0F0" d="M16.4 7.2L8.8 20.5h3.6l4-7 2.4 4.1h-2.2l-1.2 2.2h6.8L16.4 7.2z" />
      <path fill="#fff" d="M18.2 18.8l-1.3 2.3h5.4l-1.5-2.6-1.3.1-.3.2h-1z" />
      <path fill="#213147" d="M14.2 20.5h-1.8l2.5-4.3 1.1 1.9-1.8 2.4z" />
    </svg>
  );
}

function OpIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#FF0420" />
      <path
        fill="#fff"
        d="M10.4 18.8c0-1.9 1.5-3.4 3.6-3.4 1.5 0 2.5.7 3 1.8l-1.5.8c-.3-.6-.8-1-1.5-1-.9 0-1.6.7-1.6 1.8s.7 1.8 1.6 1.8c.7 0 1.2-.4 1.5-1l1.5.8c-.5 1.1-1.5 1.8-3 1.8-2.1 0-3.6-1.5-3.6-3.4zm8.2-3.2h1.9v1.3h.1c.4-.8 1.1-1.4 2.2-1.4v1.9h-.2c-1.1 0-2 .8-2 2.2v2.5h-2V15.6z"
      />
    </svg>
  );
}

function BaseIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#0052FF" />
      <path
        fill="#fff"
        d="M16 24.5c-4.7 0-8.5-3.8-8.5-8.5S11.3 7.5 16 7.5c4.2 0 7.7 3 8.4 7H19.5a3.5 3.5 0 10.5 3h5.4c-1 3.6-4.3 6.5-8.4 6.5z"
      />
    </svg>
  );
}

function CosmosIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#2E3148" />
      <ellipse cx="16" cy="16" rx="9" ry="3.5" stroke="#fff" strokeWidth="1.2" />
      <ellipse
        cx="16"
        cy="16"
        rx="9"
        ry="3.5"
        stroke="#fff"
        strokeWidth="1.2"
        transform="rotate(60 16 16)"
      />
      <ellipse
        cx="16"
        cy="16"
        rx="9"
        ry="3.5"
        stroke="#fff"
        strokeWidth="1.2"
        transform="rotate(120 16 16)"
      />
      <circle cx="16" cy="16" r="2" fill="#fff" />
    </svg>
  );
}

export const COMPATIBLE_CHAINS: ChainMeta[] = [
  { id: "bnb", name: "BNB Smart Chain", Icon: BnbIcon },
  { id: "eth", name: "Ethereum", Icon: EthIcon },
  { id: "btc", name: "Bitcoin", Icon: BtcIcon },
  { id: "sol", name: "Solana", Icon: SolIcon },
  { id: "polygon", name: "Polygon", Icon: PolygonIcon },
  { id: "avax", name: "Avalanche", Icon: AvaxIcon },
  { id: "arb", name: "Arbitrum", Icon: ArbIcon },
  { id: "op", name: "Optimism", Icon: OpIcon },
  { id: "base", name: "Base", Icon: BaseIcon },
  { id: "cosmos", name: "Cosmos", Icon: CosmosIcon },
];
