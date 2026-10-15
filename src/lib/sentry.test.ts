import { describe, expect, it } from "vitest";
import { buildEnvelope, parseDsn, stackFrames } from "./sentry";

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
});
