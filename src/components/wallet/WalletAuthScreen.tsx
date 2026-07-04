"use client";

import { type ReactNode } from "react";

type WalletAuthScreenProps = {
  children: ReactNode;
  /** Centra el contenido verticalmente (unlock, hub de conexión). */
  centered?: boolean;
  /** Barra superior dentro del área segura (volver, etc.). */
  topBar?: ReactNode;
  className?: string;
};

export function WalletAuthScreen({
  children,
  centered = true,
  topBar,
  className = "",
}: WalletAuthScreenProps) {
  return (
    <div className={`wallet-auth-screen wallet-gradient-top ${className}`.trim()}>
      {topBar ? <div className="wallet-auth-top-bar">{topBar}</div> : null}
      <div
        className={`wallet-auth-screen__content ${
          centered ? "" : "wallet-auth-screen__content--top"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
