"use client";

import { type ReactNode } from "react";

type WalletAuthScreenProps = {
  children: ReactNode;
  /** Acción principal fija abajo (Continuar, Importar, etc.). */
  footer?: ReactNode;
  /** Centra el contenido verticalmente (unlock, hub de conexión). */
  centered?: boolean;
  /** Barra superior dentro del área segura (volver, etc.). */
  topBar?: ReactNode;
  className?: string;
};

export function WalletAuthScreen({
  children,
  footer,
  centered = true,
  topBar,
  className = "",
}: WalletAuthScreenProps) {
  const hasFooter = !!footer;

  return (
    <div
      className={`wallet-auth-screen wallet-gradient-top ${
        hasFooter ? "wallet-auth-screen--has-footer" : ""
      } ${className}`.trim()}
    >
      {topBar ? <div className="wallet-auth-top-bar">{topBar}</div> : null}
      <div
        className={`wallet-auth-screen__content ${
          centered && !hasFooter ? "" : "wallet-auth-screen__content--top"
        }`}
      >
        {children}
      </div>
      {footer ? <div className="wallet-auth-screen__footer">{footer}</div> : null}
    </div>
  );
}
