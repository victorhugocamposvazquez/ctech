"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { isIosDevice, isStandalonePwa } from "@/lib/wallet/pwa-ios";

type WalletPasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "ref"
> & {
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

/**
 * Input de contraseña compatible con iOS PWA (WKWebView).
 * Evita autofocus roto y el bug de teclado que no aparece hasta el segundo toque.
 */
export function WalletPasswordInput({
  inputRef,
  className = "",
  onFocus,
  onTouchStart,
  readOnly,
  ...props
}: WalletPasswordInputProps) {
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;
  const needsIosFix = isIosDevice() || isStandalonePwa();
  const [iosReady, setIosReady] = useState(!needsIosFix);

  const activate = () => {
    if (!iosReady) setIosReady(true);
  };

  return (
    <input
      {...props}
      ref={ref}
      type="password"
      name={props.name ?? "password"}
      autoComplete={props.autoComplete ?? "current-password"}
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint={props.enterKeyHint ?? "go"}
      readOnly={needsIosFix ? !iosReady || !!readOnly : readOnly}
      onTouchStart={(e) => {
        activate();
        onTouchStart?.(e);
      }}
      onFocus={(e) => {
        activate();
        onFocus?.(e);
      }}
      className={`wallet-input wallet-password-input ${className}`.trim()}
    />
  );
}

/** Biometría automática al abrir: desactivada en PWA (bloquea el teclado). */
export function useAllowAutoBiometric(): boolean {
  const [allow, setAllow] = useState(false);
  useEffect(() => {
    setAllow(!isStandalonePwa());
  }, []);
  return allow;
}
