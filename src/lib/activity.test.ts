import { describe, expect, it } from "vitest";
import { activityStage, daysSince, isPreviewBot, latest } from "./activity";

describe("actividad de las cuentas", () => {
  it("no cuenta las vistas previas de WhatsApp ni los buscadores", () => {
    expect(isPreviewBot("WhatsApp/2.23.20.0 A")).toBe(true);
    expect(isPreviewBot("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)")).toBe(true);
    expect(isPreviewBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(isPreviewBot(null)).toBe(true);
    expect(isPreviewBot("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1")).toBe(false);
  });
  it("el paso más avanzado gana", () => {
    expect(activityStage({ lastLogin: null, ownEvents: 0, shares: 0, shareViews: 0 })).toBe("sin_entrar");
    expect(activityStage({ lastLogin: new Date(), ownEvents: 0, shares: 0, shareViews: 0 })).toBe("entro");
    expect(activityStage({ lastLogin: new Date(), ownEvents: 2, shares: 0, shareViews: 0 })).toBe("armo");
    expect(activityStage({ lastLogin: new Date(), ownEvents: 1, shares: 1, shareViews: 0 })).toBe("compartio");
    expect(activityStage({ lastLogin: new Date(), ownEvents: 1, shares: 1, shareViews: 3 })).toBe("visto");
  });
  it("fechas", () => {
    const now = new Date("2026-10-15T12:00:00Z");
    expect(daysSince(new Date("2026-10-12T13:00:00Z"), now)).toBe(2);
    expect(daysSince(null, now)).toBeNull();
    expect(latest(null, new Date("2026-10-01"), undefined, new Date("2026-10-03"))?.toISOString()).toBe("2026-10-03T00:00:00.000Z");
  });
});
