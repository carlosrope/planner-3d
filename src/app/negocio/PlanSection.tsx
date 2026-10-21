import Link from "next/link";
import { cardPrice } from "@/lib/card";
import { countOwnedPublishedVenues, getReferralOrigin, listCardCheckouts, listPayments, type Org } from "@/lib/dal";
import { mpEnabled } from "@/lib/mercadopago";
import { PAYMENT_PERIOD_LABELS, PAYMENT_STATUS_LABELS, PLAN_LABELS, SECTIONS, TIER_LABELS, activeModules, isLitePlan, planDaysLeft, referralQuota, type Plan } from "@/lib/domain";
import { PRICES_URL, CONTACT_WHATSAPP, spei } from "@/lib/brand";
import { waLink } from "@/lib/whatsapp";
import { cancelSubscriptionAction, syncCardPaymentsAction } from "./actions";
import { PlanPicker, type PlanCardData } from "./PlanPicker";
import { PERSONAL_PROFILE, PROFILES } from "@/lib/plans";
import { PaymentForm } from "./PaymentForm";
import { TrialRedeemForm } from "./TrialRedeemForm";
import { canRedeemTrial } from "@/lib/trial-codes";
import { formatDate, formatInstant } from "@/lib/dates";


const RESULT: Record<string, { text: string; tone: "ok" | "warn" | "bad" }> = {
  ok: { text: "¡Listo! Mercado Pago aprobó tu pago y tu plan ya está activo.", tone: "ok" },
  suscripcion: { text: "Tu cobro mensual quedó activo. En cuanto Mercado Pago apruebe el primer cobro, tu plan se activa solo.", tone: "ok" },
  pendiente: { text: "Tu pago está en proceso en Mercado Pago (por ejemplo, un pago en OXXO). Tu plan se activa solo en cuanto se apruebe.", tone: "warn" },
  rechazado: { text: "Mercado Pago no aprobó el pago. Intenta con otra tarjeta o paga por transferencia.", tone: "bad" },
  error: { text: "No pudimos revisar tu pago en este momento. Usa «Revisar mi pago» en unos minutos.", tone: "warn" },
  revisado: { text: "Revisamos tus pagos en Mercado Pago.", tone: "ok" },
};
const TONE = { ok: "border-emerald-200 bg-emerald-50 text-emerald-900", warn: "border-amber-200 bg-amber-50 text-amber-900", bad: "border-red-200 bg-red-50 text-red-900" };
const CARD_STATUS: Record<string, string> = { activa: "Cobro mensual activo", pausada: "Cobro mensual en pausa", pendiente: "Por autorizar en Mercado Pago" };

/** Lo que incluye cada plan, como en /planes (src/lib/plans.ts). */
function pointsFor(plan: string, tier: string, kind: Org["kind"]): string[] {
  const profile = (id: string) => PROFILES.find((p) => p.id === id);
  if (plan === "personal") return PERSONAL_PROFILE.plans[0].points;
  if (plan === "casas") return profile("casas")?.plans[kind === "developer" ? 1 : 0].points ?? [];
  return profile(kind === "venue" ? "salon" : "planner")?.plans[tier === "ilimitado" ? 1 : 0].points ?? [];
}

/** Tarjetas de planes para pagar con tarjeta (solo los que tienen precio publicado), con su precio mensual y anual. */
async function planCards(org: Org, wanted?: Plan): Promise<PlanCardData[]> {
  const extraVenues = org.kind === "venue" ? Math.max(0, (await countOwnedPublishedVenues(org.id)) - 1) : 0;
  // Un salón paga Eventos; una inmobiliaria o desarrolladora, Casas; una planner o cuenta nueva ve todas.
  const fits = (plan: string) => (org.kind === "venue" ? plan === "eventos" : org.kind === "agency" || org.kind === "developer" ? plan === "casas" : true);
  const plans = [
    ["eventos", "pro"],
    ["eventos", "ilimitado"],
    ["casas", "pro"],
    ["personal", "pro"],
  ] as const;
  return plans
    .filter(([plan]) => fits(plan))
    .flatMap(([plan, tier]) => {
      const at = (period: "mes" | "anio") => {
        const p = cardPrice({ plan, tier, period, orgKind: org.kind, extraVenues });
        return p ? { value: `${plan}|${tier}|${period}`, amount: p.amount, title: p.title } : undefined;
      };
      const monthly = at("mes");
      const annual = at("anio");
      if (!monthly && !annual) return [];
      // "Plantea · Salón Pro + 1 salón adicional · mensual" → quién ("Salón") y el plan ("Pro + 1 salón adicional").
      const [who, ...rest] = (monthly ?? annual)!.title.replace("Plantea · ", "").replace(/ · (mensual|anual)$/, "").split(" ");
      const name = plan === "personal" || plan === "casas" ? who : rest.join(" ");
      return [
        {
          key: `${plan}|${tier}`,
          who: plan === "personal" ? "Organizo mi fiesta" : plan === "casas" ? "Casas" : who,
          name,
          points: pointsFor(plan, tier, org.kind),
          // Se recomienda Ilimitado en eventos (salones y planners) y el único plan de Casas para inmobiliarias.
          featured: (wanted ? wanted === plan : plan === (org.kind === "agency" || org.kind === "developer" ? "casas" : "eventos")) && tier === (plan === "eventos" ? "ilimitado" : "pro"),
          lead: tier === "ilimitado",
          current: org.plan === plan && org.tier === tier && Boolean(org.planEndsAt) && org.planEndsAt!.getTime() > Date.now(),
          monthly: monthly && { value: monthly.value, amount: monthly.amount },
          annual: annual && { value: annual.value, amount: annual.amount },
        },
      ];
    });
}

/** Tu plan: qué incluye, cuándo vence, cómo pagar (tarjeta o transferencia) y los pagos enviados. */
export async function PlanSection({ org, wanted, result }: { org: Org; wanted?: Plan; result?: string }) {
  const card = mpEnabled() && org.plan !== "invitado";
  const [payments, origin, options, checkouts] = await Promise.all([
    listPayments(org.id),
    getReferralOrigin(org),
    card ? planCards(org, wanted) : Promise.resolve([] as PlanCardData[]),
    card ? listCardCheckouts(org.id) : Promise.resolve([]),
  ]);
  // Solo las suscripciones a las que el cliente ya se suscribió en Mercado Pago (las demás son intentos sin terminar).
  const subscriptions = checkouts.filter((c) => c.kind === "suscripcion" && c.mpSubscriptionId && ["activa", "pausada"].includes(c.status));
  const notice = result ? RESULT[result] : undefined;
  const cardsShown = card && options.length > 0;
  const bank = spei();
  const quota = referralQuota(org);
  const active = activeModules(org);
  const free = org.plan === "libre";
  const expired = !free && active.length === 0;
  const daysLeft = planDaysLeft(org.planEndsAt);
  const soon = daysLeft !== null && daysLeft > 0 && daysLeft <= 7;
  const modules = org.modules.map((m) => SECTIONS[m].label).join(" y ");

  return (
    <section className="mt-8 space-y-4">
      <h2 className="text-xl font-semibold">Tu plan</h2>
      <div className={`rounded-2xl border p-4 ${expired ? "border-red-200 bg-red-50" : soon ? "border-amber-200 bg-amber-50" : "border-stone-200 bg-white"}`}>
        <p className="text-lg font-semibold">
          {PLAN_LABELS[org.plan]}
          {!isLitePlan(org.plan) && org.plan !== "prueba" && !free ? ` ${TIER_LABELS[org.tier]}` : ""}
        </p>
        {free ? (
          cardsShown ? (
            <p className="text-sm text-stone-600">Elige tu plan aquí abajo para crear tus proyectos.</p>
          ) : (
            <p className="text-sm text-stone-600">
              Para crear tus proyectos, elige tu plan en{" "}
              <Link href={PRICES_URL} className="underline">
                plantea.com.mx/planes
              </Link>{" "}
              y págalo aquí abajo.
            </p>
          )
        ) : origin ? (
          <p className="text-sm text-stone-600">
            Tu evento en {origin.venueName} lo cubre el plan de {origin.issuerName}: un evento, con el diseñador completo y enlace para compartir.
          </p>
        ) : org.plan === "personal" ? (
          <p className="text-sm text-stone-600">Un evento activo a la vez, con el diseñador completo y enlace para compartir (sin logo ni hojas de proveedores).</p>
        ) : (
          <p className="text-sm text-stone-600">
            Incluye: {modules || "ningún módulo"}.{quota === null ? " Códigos para tus clientes sin tope." : quota > 0 ? ` ${quota} códigos para tus clientes al mes.` : ""}
          </p>
        )}
        {!free && <p className="mt-1 text-sm">
          {org.planEndsAt
            ? expired
              ? `Terminó el ${formatInstant(org.planEndsAt, "long")}. Tus proyectos siguen guardados; al confirmar tu pago se reactivan el mismo día.`
              : `Vigente hasta el ${formatInstant(org.planEndsAt, "long")}${soon ? ` (quedan ${daysLeft} días)` : ""}.`
            : "Sin fecha de vencimiento."}
        </p>}
        {!cardsShown && !free && (
          <p className="mt-2 text-sm">
            Planes y precios:{" "}
            <Link href={PRICES_URL} className="underline">
              plantea.com.mx/planes
            </Link>
          </p>
        )}
      </div>

      {notice && <p className={`rounded-2xl border p-3 text-sm ${TONE[notice.tone]}`}>{notice.text}</p>}

      {/* Sin plan de pago: aquí se escribe el código de mes gratis que manda Plantea (también sirve al crear la cuenta). */}
      {canRedeemTrial(org) && <TrialRedeemForm />}

      {cardsShown && (
        <div id="pagar" className="scroll-mt-20 rounded-2xl border border-stone-200 bg-stone-50/60 p-4 sm:p-5">
          <h3 className="text-center text-lg font-semibold">{free || expired ? "Elige tu plan" : "Renueva o cambia tu plan"}</h3>
          <p className="mt-1 text-center text-sm text-stone-600">Paga con tarjeta y tu plan se activa en cuanto Mercado Pago aprueba el pago. Precios con IVA.</p>
          <PlanPicker cards={options} />
          {subscriptions.length > 0 && (
            <ul className="mt-5 space-y-2 text-sm">
              {subscriptions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white p-3">
                  <span>
                    {s.title.replace("Plantea · ", "").replace(/ · mensual$/, "")} · {`$${s.amount.toLocaleString("es-MX")}`} al mes · <b>{CARD_STATUS[s.status] ?? s.status}</b>
                  </span>
                  <form action={cancelSubscriptionAction}>
                    <input type="hidden" name="checkoutId" value={s.id} />
                    <button className="h-9 rounded-lg border border-stone-300 bg-white px-3 font-medium">Cancelar cobro automático</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {checkouts.length > 0 && (
            <form action={syncCardPaymentsAction} className="mt-3 text-center">
              <button className="text-sm underline">¿Ya pagaste y no se activó? Revisar mi pago</button>
            </form>
          )}
        </div>
      )}

      {org.plan !== "invitado" && (
      // Con tarjeta disponible, la transferencia queda como opción secundaria, plegada; sin tarjeta, abierta como antes.
      <details
        id={cardsShown ? "transferencia" : "pagar"}
        open={!cardsShown}
        className="group scroll-mt-20 rounded-2xl border border-stone-200 bg-white p-4"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
          {cardsShown ? "¿Prefieres pagar por transferencia (SPEI)?" : free ? "Activar tu plan por transferencia" : "Pagar o renovar por transferencia"}
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-stone-400 transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        {bank ? (
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-stone-500">Banco</dt>
            <dd>{bank.bank}</dd>
            <dt className="text-stone-500">CLABE</dt>
            <dd className="font-mono">{bank.clabe}</dd>
            <dt className="text-stone-500">Titular</dt>
            <dd>{bank.holder}</dd>
            <dt className="text-stone-500">Concepto</dt>
            <dd>{org.name}</dd>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-stone-600">
            Pide los datos de la cuenta por{" "}
            <a href={waLink(CONTACT_WHATSAPP, `Hola, quiero pagar el plan de ${org.name} en Plantea.`)} target="_blank" rel="noopener" className="underline">
              WhatsApp
            </a>
            .
          </p>
        )}
        <p className="mt-3 text-sm text-stone-600">
          Después de transferir, sube tu comprobante. Lo confirmamos el mismo día hábil y tu plan queda activo; la factura CFDI llega por correo.
        </p>
        <PaymentForm currentPlan={wanted ?? org.plan} currentTier={org.tier} />
      </details>
      )}

      {payments.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <h3 className="font-semibold">Tus pagos</h3>
          <ul className="mt-2 divide-y divide-stone-100 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 py-2">
                <div>
                  <p>
                    {PLAN_LABELS[p.plan]} · {PAYMENT_PERIOD_LABELS[p.period]} · ${p.amount.toLocaleString("es-MX")} · {p.method === "tarjeta" ? "tarjeta" : "transferencia"}
                  </p>
                  <p className="text-stone-500">
                    {formatDate(p.createdAt)}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    p.status === "confirmado" ? "bg-emerald-100 text-emerald-900" : p.status === "rechazado" ? "bg-red-100 text-red-900" : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {PAYMENT_STATUS_LABELS[p.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
