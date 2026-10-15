/**
 * Reporte de errores a Sentry sin SDK: se arma el "envelope" y se manda por HTTP.
 * Con SENTRY_DSN vacío no hace nada (desarrollo, o mientras no exista la cuenta).
 * Partes puras (parseDsn, buildEnvelope) cubiertas por sentry.test.ts.
 */
export type Dsn = { url: string; key: string };

/** https://CLAVE@o123.ingest.us.sentry.io/456 → URL del envelope y la clave pública. */
export function parseDsn(dsn: string | undefined): Dsn | null {
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    const project = u.pathname.replace(/^\/+|\/+$/g, "");
    if (!u.username || !project) return null;
    return { url: `${u.protocol}//${u.host}/api/${project}/envelope/`, key: u.username };
  } catch {
    return null;
  }
}

export type ErrorReport = {
  message: string;
  type?: string;
  stack?: string;
  /** "server" (Next.js) o "browser" (el celular de la planner). */
  source: "server" | "browser";
  url?: string;
  userAgent?: string;
  extra?: Record<string, unknown>;
};

const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, "0")).join("");

/** Convierte un stack de V8/Safari en frames de Sentry (lo más reciente al final, como lo espera Sentry). */
export function stackFrames(stack: string | undefined) {
  if (!stack) return undefined;
  const frames = stack
    .split("\n")
    .map((line) => /(?:at\s+(.*?)\s+\(?|^(.*?)@)?(\S+?):(\d+):(\d+)\)?\s*$/.exec(line.trim()))
    .filter((m): m is RegExpExecArray => Boolean(m))
    .map((m) => ({ function: m[1] || m[2] || "?", filename: m[3], lineno: Number(m[4]), colno: Number(m[5]) }));
  return frames.length ? frames.reverse() : undefined;
}

export function buildEnvelope(report: ErrorReport, dsn: Dsn, now = new Date(), environment = process.env.NODE_ENV ?? "development") {
  const eventId = hex(16);
  const event = {
    event_id: eventId,
    timestamp: now.getTime() / 1000,
    platform: "javascript",
    level: "error",
    environment,
    release: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 12),
    tags: { source: report.source },
    request: report.url ? { url: report.url, headers: report.userAgent ? { "User-Agent": report.userAgent } : undefined } : undefined,
    exception: {
      values: [{ type: report.type || "Error", value: report.message.slice(0, 2000), stacktrace: stackFrames(report.stack) ? { frames: stackFrames(report.stack) } : undefined }],
    },
    extra: report.extra,
  };
  const header = { event_id: eventId, sent_at: now.toISOString(), dsn: `${dsn.key}` };
  const body = JSON.stringify(event);
  return { eventId, body: `${JSON.stringify(header)}\n${JSON.stringify({ type: "event" })}\n${body}\n` };
}

/** Manda el error a Sentry; nunca lanza (un fallo al reportar no debe tumbar la petición). */
export async function reportError(report: ErrorReport): Promise<boolean> {
  const dsn = parseDsn(process.env.SENTRY_DSN);
  if (!dsn) return false;
  try {
    const { body } = buildEnvelope(report, dsn);
    const res = await fetch(`${dsn.url}?sentry_key=${dsn.key}&sentry_version=7`, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body,
    });
    return res.ok;
  } catch {
    return false;
  }
}
