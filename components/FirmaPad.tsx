"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";

export interface FirmaPadHandle {
  /** PNG ritagliato attorno alla firma, oppure null se la firma è troppo corta. */
  esporta: () => { png: Uint8Array; dataUrl: string } | null;
  cancella: () => void;
}

/** Lunghezza minima del tratto (in px CSS) perché la firma sia considerata valida. */
const LUNGHEZZA_MINIMA = 120;

const FirmaPad = forwardRef<FirmaPadHandle, { onChange: (valida: boolean) => void }>(function FirmaPad(
  { onChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const disegnando = useRef(false);
  const ultimo = useRef<{ x: number; y: number } | null>(null);
  const lunghezza = useRef(0);
  const limiti = useRef({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
  const [, forza] = useState(0);

  const prepara = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const r = c.getBoundingClientRect();
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = "#0b1f5c";
  }, []);

  const cancella = useCallback(() => {
    prepara();
    lunghezza.current = 0;
    limiti.current = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    onChange(false);
    forza((n) => n + 1);
  }, [prepara, onChange]);

  useEffect(() => {
    prepara();
    // Se cambia la larghezza (rotazione del telefono) il canvas si azzera: si rifirma.
    const onResize = () => cancella();
    window.addEventListener("orientationchange", onResize);
    return () => window.removeEventListener("orientationchange", onResize);
  }, [prepara, cancella]);

  const punto = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const segna = (p: { x: number; y: number }) => {
    const l = limiti.current;
    l.minX = Math.min(l.minX, p.x);
    l.minY = Math.min(l.minY, p.y);
    l.maxX = Math.max(l.maxX, p.x);
    l.maxY = Math.max(l.maxY, p.y);
  };

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    canvasRef.current!.setPointerCapture(e.pointerId);
    disegnando.current = true;
    const p = punto(e);
    ultimo.current = p;
    segna(p);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2);
    ctx.fillStyle = "#0b1f5c";
    ctx.fill();
  };

  const move = (e: React.PointerEvent) => {
    if (!disegnando.current || !ultimo.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = punto(e);
    ctx.beginPath();
    ctx.moveTo(ultimo.current.x, ultimo.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lunghezza.current += Math.hypot(p.x - ultimo.current.x, p.y - ultimo.current.y);
    ultimo.current = p;
    segna(p);
  };

  const up = () => {
    if (!disegnando.current) return;
    disegnando.current = false;
    ultimo.current = null;
    onChange(lunghezza.current >= LUNGHEZZA_MINIMA);
  };

  useImperativeHandle(ref, () => ({
    cancella,
    esporta: () => {
      const c = canvasRef.current;
      if (!c || lunghezza.current < LUNGHEZZA_MINIMA) return null;
      const dpr = window.devicePixelRatio || 1;
      const l = limiti.current;
      const pad = 6;
      const x = Math.max(0, Math.floor((l.minX - pad) * dpr));
      const y = Math.max(0, Math.floor((l.minY - pad) * dpr));
      const w = Math.min(c.width - x, Math.ceil((l.maxX - l.minX + pad * 2) * dpr));
      const h = Math.min(c.height - y, Math.ceil((l.maxY - l.minY + pad * 2) * dpr));
      const out = document.createElement("canvas");
      out.width = w;
      out.height = h;
      out.getContext("2d")!.drawImage(c, x, y, w, h, 0, 0, w, h);
      const dataUrl = out.toDataURL("image/png");
      const bin = atob(dataUrl.split(",")[1]);
      const png = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) png[i] = bin.charCodeAt(i);
      return { png, dataUrl };
    },
  }));

  return (
    <div className="sig-wrap">
      <canvas
        ref={canvasRef}
        aria-label="Spazio per la firma"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
      />
      <div className="sig-line" />
      <div className="sig-label">Firma qui con il dito</div>
    </div>
  );
});

export default FirmaPad;
