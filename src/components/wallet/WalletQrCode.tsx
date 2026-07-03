"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function WalletQrCode({
  value,
  size = 220,
}: {
  value: string;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    void QRCode.toCanvas(canvas, value, {
      width: size,
      margin: 2,
      color: { dark: "#060608", light: "#ffffff" },
    });
  }, [value, size]);

  return (
    <div className="wallet-qr-frame">
      <canvas ref={canvasRef} className="rounded-xl" />
    </div>
  );
}
