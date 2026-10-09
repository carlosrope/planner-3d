"use client";

import { useEffect, useState } from "react";

/** Cuadros por segundo, para medir la fluidez del plano en el teléfono. */
export function FpsMeter() {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0;
    let start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      frames++;
      if (now - start >= 500) {
        setFps(Math.round((frames * 1000) / (now - start)));
        frames = 0;
        start = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const color = fps >= 50 ? "bg-green-600" : fps >= 30 ? "bg-amber-500" : "bg-red-600";
  return (
    <div className={`pointer-events-none absolute left-3 top-3 z-20 rounded-md px-2 py-1 font-mono text-xs text-white ${color}`}>
      {fps} fps
    </div>
  );
}
