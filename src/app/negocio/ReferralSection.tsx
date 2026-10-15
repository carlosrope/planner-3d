import { listReferralCodes, referralAllowance, type Org } from "@/lib/dal";
import { siteOrigin } from "@/lib/brand";
import { ReferralForm } from "./ReferralForm";
import { formatDay, formatInstant } from "@/lib/dates";


/**
 * Códigos para los clientes del negocio: el dueño de un salón (o la planner) genera uno por cliente; el cliente
 * crea su cuenta con él y arma su evento en ese lugar sin pagar. En el panel de un lugar, `venueId` fija el lugar.
 */
export async function ReferralSection({ org, venues, venueId }: { org: Org; venues: { id: string; name: string }[]; venueId?: string }) {
  const [allowance, codes] = await Promise.all([referralAllowance(org), listReferralCodes(org.id, venueId)]);
  if (allowance.quota === 0 && codes.length === 0) return null;
  const origin = siteOrigin();
  const places = venueId ? venues.filter((v) => v.id === venueId) : venues;
  const linkFor = (code: string) => `${origin}/registro?codigo=${encodeURIComponent(code)}`;
  const messageFor = (c: { code: string; guestName: string; venueName: string }) =>
    `Hola ${c.guestName}, con este código armas tu evento en ${c.venueName} en 3D, sin costo: ${c.code}. Entra aquí y crea tu cuenta: ${linkFor(c.code)}`;

  return (
    <section id="codigos" className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
      <h2 className="text-lg font-semibold">Códigos para tus clientes</h2>
      <p className="mt-1 text-sm text-stone-600">
        Cada cliente que renta contigo recibe un código, crea su cuenta y arma su propio evento en 3D sin pagar: lo cubre tu plan. Un código es
        para una persona y un evento, y dura hasta 30 días después de la fecha.
      </p>
      <p className="mt-2 text-sm">
        {allowance.left === null ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900">Códigos sin tope · {allowance.used} este mes</span>
        ) : allowance.quota === 0 ? (
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">Tu plan actual no da códigos</span>
        ) : (
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${allowance.left === 0 ? "bg-red-100 text-red-900" : "bg-stone-100 text-stone-700"}`}>
            {allowance.used} de {allowance.quota} este mes · quedan {allowance.left}
          </span>
        )}
      </p>
      {allowance.left !== 0 && places.length > 0 && <ReferralForm venues={places} venueId={venueId} />}
      {allowance.left === 0 && (
        <p className="mt-3 text-sm text-stone-600">Ya diste los códigos de este mes. Con el plan Ilimitado no hay tope: escríbenos por WhatsApp.</p>
      )}

      {codes.length > 0 && (
        <ul className="mt-4 divide-y divide-stone-100">
          {codes.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="min-w-0">
                <p className="font-mono text-base font-semibold tracking-wide">{c.code}</p>
                <p className="text-sm text-stone-600">
                  {c.guestName}
                  {c.eventDate ? ` · ${formatDay(c.eventDate)}` : ""}
                  {venueId ? "" : ` · ${c.venueName}`}
                </p>
              </div>
              {c.usedAt ? (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900">
                  {c.eventId ? "Evento armado" : "Cuenta creada"} · {formatInstant(c.usedAt, "dayMonthShort")}
                </span>
              ) : (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(messageFor(c))}`}
                  target="_blank"
                  rel="noopener"
                  className="flex h-10 items-center rounded-xl bg-[#25d366] px-3 text-sm font-medium text-white"
                >
                  Mandar por WhatsApp
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
