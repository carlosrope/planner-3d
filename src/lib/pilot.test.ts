import { describe, expect, it } from "vitest";
import { pilotAlerts, pilotDay, pilotHealth, type PilotStats } from "./pilot";

const now = new Date("2026-11-20T18:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
const base: PilotStats = { publishedAt: daysAgo(2), lastLogin: daysAgo(1), codesGiven: 0, codesUsed: 0, clientEvents: 0, clientViews: 0, inquiries: 0 };

describe("piloto de salones fundadores", () => {
  it("cuenta el día de la prueba desde la publicación", () => {
    expect(pilotDay(null, now)).toBeNull();
    expect(pilotDay(now, now)).toBe(1);
    expect(pilotDay(daysAgo(9), now)).toBe(10);
    // Publicado a las 17:00 y revisado a las 12:00 siete días después: va en su día 8, no en el 7.
    expect(pilotDay(new Date("2026-10-12T17:00:00-07:00"), new Date("2026-10-19T12:00:00-07:00"))).toBe(8);
  });

  it("sin publicar no hay avisos", () => {
    expect(pilotAlerts({ ...base, publishedAt: null }, now)).toEqual([]);
    expect(pilotHealth({ ...base, publishedAt: null }, now)).toBe("sin_publicar");
  });

  it("los primeros días va en camino aunque no haya hecho nada", () => {
    expect(pilotHealth({ ...base, lastLogin: null }, now)).toBe("en_camino");
  });

  it("pide llamarle si no entra en 5 días, sin códigos al día 7 o con códigos sin eventos al día 14", () => {
    expect(pilotAlerts({ ...base, publishedAt: daysAgo(6), lastLogin: null }, now)).toEqual(["No ha entrado a su cuenta"]);
    expect(pilotAlerts({ ...base, publishedAt: daysAgo(6), lastLogin: daysAgo(5) }, now)).toEqual(["No entra desde hace 5 días"]);
    expect(pilotAlerts({ ...base, publishedAt: daysAgo(8) }, now)).toEqual(["No ha dado ningún código"]);
    expect(pilotAlerts({ ...base, publishedAt: daysAgo(15), codesGiven: 3 }, now)).toEqual(["Dio códigos, pero ningún cliente ha armado su evento"]);
    expect(pilotHealth({ ...base, publishedAt: daysAgo(8) }, now)).toBe("llamar");
  });

  it("le saca provecho cuando un cliente usó su código, armó el evento y lo vieron", () => {
    const good = { ...base, publishedAt: daysAgo(15), codesGiven: 3, codesUsed: 1, clientEvents: 1, clientViews: 4 };
    expect(pilotHealth(good, now)).toBe("provecho");
    expect(pilotHealth({ ...good, clientViews: 0 }, now)).toBe("en_camino");
    expect(pilotHealth({ ...good, clientViews: 0, inquiries: 2 }, now)).toBe("provecho");
  });
});
