import { getReferralTemplate, listReferralCodes, referralAllowance, type Org } from "@/lib/dal";
import { siteOrigin } from "@/lib/brand";
import { formatInstant } from "@/lib/dates";
import { parseSetting } from "@/lib/referral-message";
import { CodeCard } from "./CodeCard";
import { MessageEditor } from "./MessageEditor";
import { ReferralForm } from "./ReferralForm";

/**
 * Códigos para los clientes del negocio: el dueño de un salón (o la planner) genera uno por cliente; el cliente
 * crea su cuenta con él y arma su evento en ese lugar sin pagar. En el panel de un lugar, `venueId` fija el lugar.
 */
export async function ReferralSection({
  org,
  venues,
  venueId,
  waitingForVenue = false,
}: {
  org: Org;
  venues: { id: string; name: string }[];
  venueId?: string;
  /** Cuenta de salón sin salón publicado todavía: sus códigos se activan al publicarse. */
  waitingForVenue?: boolean;
}) {
  const [allowance, codes, template] = await Promise.all([referralAllowance(org), listReferralCodes(org.id, venueId), getReferralTemplate(org.id)]);
  if (allowance.quota === 0 && codes.length === 0) return null;
  const origin = siteOrigin();
  const setting = parseSetting(template);
  const places = venueId ? venues.filter((v) => v.id === venueId) : venues;
  const pending = codes.filter((c) => !c.usedAt);
  const used = codes.filter((c) => c.usedAt);
  const unlimited = allowance.left === null;
  const pct = unlimited || !allowance.quota ? 0 : Math.min(100, Math.round((allowance.used / allowance.quota) * 100));

  return (
    <section id="codigos" className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Códigos para tus clientes</h2>
          <p className="mt-1 text-sm text-stone-600">Quien renta contigo arma su evento en 3D sin pagar. Un código por cliente.</p>
        </div>
        <div className="sm:text-right">
          {unlimited ? (
            <p className="text-sm font-semibold text-emerald-800">Sin tope · {allowance.used} este mes</p>
          ) : allowance.quota === 0 ? (
            <p className="text-sm text-stone-500">Tu plan no da códigos</p>
          ) : (
            <>
              <p className="font-display text-2xl font-bold text-stone-900">
                {allowance.left}
                <span className="text-sm font-normal text-stone-500"> de {allowance.quota} libres este mes</span>
              </p>
            </>
          )}
        </div>
      </div>
      {!unlimited && allowance.quota ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
          <div className={`h-full rounded-full ${allowance.left === 0 ? "bg-red-500" : "bg-[#a4552d]"}`} style={{ width: `${pct}%` }} />
        </div>
      ) : null}

      {allowance.left !== 0 && places.length > 0 && <ReferralForm venues={places} venueId={venueId} origin={origin} setting={setting} />}
      {waitingForVenue && (
        <p className="mt-4 rounded-xl bg-stone-50 p-3 text-sm text-stone-600">
          Tus códigos se activan cuando tu salón esté publicado en Plantea. Te avisamos por WhatsApp en cuanto quede listo.
        </p>
      )}
      {allowance.left === 0 && (
        <p className="mt-4 rounded-xl bg-stone-50 p-3 text-sm text-stone-600">
          Ya diste los códigos de este mes. Con el plan Ilimitado no hay tope: escríbenos por WhatsApp.
        </p>
      )}

      <MessageEditor setting={setting} origin={origin} venueName={places[0]?.name ?? ""} />

      {pending.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Por usar ({pending.length})</h3>
          <ul className="mt-2 space-y-3">
            {pending.map((c) => (
              <li key={c.id}>
                <CodeCard origin={origin} setting={setting} info={{ code: c.code, guestName: c.guestName, venueName: c.venueName, eventDate: c.eventDate }} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {used.length > 0 && (
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-stone-500">Ya usados ({used.length})</summary>
          <ul className="mt-2 divide-y divide-stone-100">
            {used.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span>
                  <span className="font-mono font-semibold">{c.code}</span> · {c.guestName}
                  {venueId ? "" : ` · ${c.venueName}`}
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900">
                  {c.eventId ? "Evento armado" : "Cuenta creada"} · {formatInstant(c.usedAt!, "dayMonthShort")}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
