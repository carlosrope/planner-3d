import { describe, expect, it } from "vitest";
import { buildEnvelope, parseDsn, redact, stackFrames } from "./sentry";

describe("sentry", () => {
  it("lee el DSN", () => {
    expect(parseDsn("https://abc123@o42.ingest.us.sentry.io/789")).toEqual({ url: "https://o42.ingest.us.sentry.io/api/789/envelope/", key: "abc123" });
    expect(parseDsn("")).toBeNull();
    expect(parseDsn(undefined)).toBeNull();
    expect(parseDsn("no-es-url")).toBeNull();
  });
  it("arma el envelope con el error", () => {
    const dsn = parseDsn("https://k@o1.ingest.sentry.io/2")!;
    const { eventId, body } = buildEnvelope({ message: "falló", source: "browser", url: "https://x/eventos" }, dsn, new Date("2026-10-15T00:00:00Z"), "production");
    const [header, item, event] = body.trim().split("\n").map((l) => JSON.parse(l));
    expect(header.event_id).toBe(eventId);
    // Sentry rechaza (400) un encabezado con "dsn" que no sea el DSN completo: no se manda.
    expect(header.dsn).toBeUndefined();
    expect(item.type).toBe("event");
    expect(event.exception.values[0].value).toBe("falló");
    expect(event.tags.source).toBe("browser");
    expect(event.environment).toBe("production");
  });
  it("lee los frames de un stack", () => {
    const frames = stackFrames("Error: x\n    at save (https://a/app.js:10:5)\n    at https://a/b.js:3:1");
    expect(frames?.at(-1)).toEqual({ function: "save", filename: "https://a/app.js", lineno: 10, colno: 5 });
    expect(stackFrames(undefined)).toBeUndefined();
  });

  it("no manda a Sentry los tokens que sirven para entrar", () => {
    expect(redact("https://plantea.com.mx/v/k7m2qz9x4w8p3n5r?visita=1")).toBe("https://plantea.com.mx/v/[token]?visita=1");
    expect(redact("https://plantea.com.mx/lugares/salon/3d?r=abc123def456")).toBe("https://plantea.com.mx/lugares/salon/3d?r=[oculto]");
    expect(redact("/revisar/abcdefghijklmnopqrstuvwx")).toBe("/revisar/[token]");
    expect(redact("/restablecer?token=XYZ&next=/admin")).toBe("/restablecer?token=[oculto]&next=/admin");
    const dsn = parseDsn("https://clave@o1.ingest.us.sentry.io/2")!;
    const { body } = buildEnvelope(
      { message: "falló en https://plantea.com.mx/v/k7m2qz9x4w8p3n5r", source: "browser", url: "https://plantea.com.mx/v/k7m2qz9x4w8p3n5r", stack: "at f (https://plantea.com.mx/v/k7m2qz9x4w8p3n5r:10:5)" },
      dsn,
    );
    expect(body).not.toContain("k7m2qz9x4w8p3n5r");
  });
});
