"use client";

import { useEffect } from "react";

/** Manda a /api/errores los errores de JavaScript del navegador (máximo 5 por página, para no inundar). */
export function ErrorReporter() {
  useEffect(() => {
    let sent = 0;
    const send = (message: string, type?: string, stack?: string) => {
      if (sent >= 5 || !message) return;
      sent += 1;
      const payload = JSON.stringify({ message, type, stack, url: location.href.slice(0, 500) });
      const queued = navigator.sendBeacon?.("/api/errores", new Blob([payload], { type: "application/json" }));
      if (!queued) fetch("/api/errores", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    };
    const onError = (e: ErrorEvent) => send(e.message, e.error?.name, e.error?.stack);
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      send(r instanceof Error ? r.message : String(r), r instanceof Error ? r.name : "UnhandledRejection", r instanceof Error ? r.stack : undefined);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
