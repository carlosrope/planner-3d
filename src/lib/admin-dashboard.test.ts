import { describe, expect, it } from "vitest";
import { dashboardTasks, payingOrgs, trialsEnding, venueFunnel, type DashOrg, type DashVenue } from "./admin-dashboard";

const now = new Date("2026-11-20T18:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
const inDays = (n: number) => new Date(now.getTime() + n * 86_400_000);
const venue = (over: Partial<DashVenue>): DashVenue => ({ id: "v", name: "Salón", slug: "salon", status: "publicado", createdAt: daysAgo(1), updatedAt: daysAgo(1), ownerOrgId: null, ...over });
const org = (over: Partial<DashOrg>): DashOrg => ({ id: "o", name: "Negocio", plan: "eventos", planEndsAt: inDays(20), createdAt: daysAgo(30), paid: true, ...over });

describe("resumen de la administración", () => {
  it("cuenta como de pago solo a quien pagó y tiene su plan vigente", () => {
    const orgs = [
      org({ id: "a" }),
      org({ id: "b", planEndsAt: daysAgo(1) }),
      org({ id: "c", paid: false }),
      org({ id: "d", plan: "prueba" }),
      org({ id: "e", plan: "ambos", planEndsAt: null }),
    ];
    expect(payingOrgs(orgs, now).map((o) => o.id)).toEqual(["a", "e"]);
  });

  it("avisa de las pruebas que terminan en 4 días o menos", () => {
    const orgs = [org({ id: "a", plan: "prueba", planEndsAt: inDays(3) }), org({ id: "b", plan: "prueba", planEndsAt: inDays(10) }), org({ id: "c", plan: "prueba", planEndsAt: daysAgo(1) })];
    expect(trialsEnding(orgs, now).map((o) => o.id)).toEqual(["a"]);
  });

  it("el embudo no cuenta las demos", () => {
    const venues = [venue({ slug: "salon-demostracion" }), venue({ id: "1" }), venue({ id: "2", status: "conversion" }), venue({ id: "3", status: "revision", slug: null })];
    expect(venueFunnel(venues, ["salon-demostracion"])).toEqual({ conversion: 1, revision: 1, publicado: 1, retirado: 0 });
  });

  it("ordena los pendientes: primero lo urgente", () => {
    const tasks = dashboardTasks(
      {
        venues: [
          venue({ id: "nuevo", name: "Quinta Nueva", status: "conversion", createdAt: daysAgo(1) }),
          venue({ id: "viejo", name: "Jardín Viejo", status: "conversion", createdAt: daysAgo(6) }),
          venue({ id: "rev", name: "Salón Espera", status: "revision", updatedAt: daysAgo(4) }),
          venue({ id: "rev2", name: "Salón Reciente", status: "revision", updatedAt: daysAgo(1) }),
        ],
        payments: [{ id: "p", orgName: "Salón Pago", amount: 790, createdAt: daysAgo(0) }],
        pilot: [{ venueId: "x", name: "Salón Piloto", alerts: ["No ha dado ningún código"] }, { venueId: "y", name: "Salón Bien", alerts: [] }],
        orgs: [org({ name: "Salón Termina", plan: "prueba", planEndsAt: inDays(1) })],
        suggestionsOpen: 2,
      },
      now,
    );
    expect(tasks.map((t) => [t.tone, t.text])).toEqual([
      ["urgente", "Convertir Jardín Viejo: lleva 6 días de 7"],
      ["urgente", "Llamar a Salón Piloto: no ha dado ningún código"],
      ["hoy", "Convertir Quinta Nueva: lleva 1 día de 7"],
      ["hoy", "Revisar el comprobante de Salón Pago por $790"],
      ["hoy", "La prueba de Salón Termina termina mañana: ofrecerle su plan"],
      ["pendiente", "Recordarle a Salón Espera que revise su salón (4 días sin confirmar)"],
      ["pendiente", "2 sugerencias del catálogo por atender"],
    ]);
  });
});
