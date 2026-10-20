"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { cardPrice } from "@/lib/card";
import { syncOrgCardPayments } from "@/lib/card-sync";
import {
  countOwnedPublishedVenues,
  createCardCheckout,
  createPayment,
  createReferralCode,
  getCardCheckout,
  requireOrg,
  requireUser,
  setCardCheckout,
  setReferralTemplate,
} from "@/lib/dal";
import { cancelPreapproval, createPreference, createSubscriptionPlan, mpEnabled } from "@/lib/mercadopago";
import { reportError } from "@/lib/sentry";
import { MAX_BODY_LENGTH, MESSAGE_STYLES, serializeSetting } from "@/lib/referral-message";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema";
import { isRealDay, today } from "@/lib/dates";
import { isReceipt, storedType } from "@/lib/uploads";
import { normalizeWhatsapp } from "@/lib/whatsapp";

export type BrandState = { ok?: boolean; error?: string } | null;

// El logo llega ya reducido desde el navegador; aun así se limita el tamaño.
const logo = z.union([z.literal(""), z.string().regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).max(400_000)]);
const brand = z.object({
  name: z.string().trim().min(2).max(80),
  logo: logo.optional(),
  removeLogo: z.literal("1").optional(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  whatsapp: z.string().trim().max(30),
  language: z.enum(["es", "en"]).catch("es"),
});


export async function updateBrand(_prev: BrandState, formData: FormData): Promise<BrandState> {
  const user = await requireUser();
  const org = await requireOrg(user);
  const parsed = brand.safeParse({
    name: formData.get("name"),
    logo: formData.get("logo") || undefined,
    removeLogo: formData.get("removeLogo") || undefined,
    brandColor: formData.get("brandColor"),
    whatsapp: formData.get("whatsapp") ?? "",
    language: formData.get("language") ?? "es",
  });
  if (!parsed.success) return { error: "Revisa el nombre (mínimo 2 letras) y el logo (imagen PNG o JPG)." };
  const whatsapp = normalizeWhatsapp(parsed.data.whatsapp);
  if (whatsapp === undefined) return { error: "El WhatsApp debe tener 10 dígitos (o lada de país + número)." };

  await db
    .update(organization)
    .set({
      name: parsed.data.name,
      brandColor: parsed.data.brandColor,
      whatsapp,
      language: parsed.data.language,
      ...(parsed.data.removeLogo ? { logoUrl: null } : parsed.data.logo ? { logoUrl: parsed.data.logo } : {}),
    })
    .where(eq(organization.id, org.id));
  revalidatePath("/eventos");
  revalidatePath("/negocio");
  return { ok: true };
}

export type PaymentState = { ok?: boolean; error?: string } | null;

const paymentBody = z.object({
  plan: z.enum(["eventos", "casas", "ambos", "personal"]),
  tier: z.enum(["pro", "ilimitado"]).default("pro"),
  period: z.enum(["mes", "anio"]),
  amount: z.coerce.number().int().min(1).max(1_000_000),
});

/** El negocio sube el comprobante de su transferencia; la administración lo confirma. */
export async function submitPayment(_prev: PaymentState, formData: FormData): Promise<PaymentState> {
  const user = await requireUser("/negocio");
  const org = await requireOrg(user);
  const parsed = paymentBody.safeParse({
    plan: formData.get("plan"),
    tier: formData.get("tier") ?? undefined,
    period: formData.get("period"),
    amount: formData.get("amount"),
  });
  const receipt = formData.get("receipt");
  if (!parsed.success || !(receipt instanceof File) || receipt.size === 0) return { error: "Elige el plan, el periodo, el monto y el comprobante." };
  if (receipt.size > 5 * 1024 * 1024) return { error: "El comprobante puede pesar hasta 5 MB." };
  const data = Buffer.from(await receipt.arrayBuffer());
  // El tipo se revisa por el contenido: solo fotos (JPG, PNG, WebP, HEIC) o PDF.
  if (!isReceipt(data)) return { error: "El comprobante debe ser una foto (JPG, PNG o HEIC) o un PDF." };
  const created = await createPayment(org.id, {
    ...parsed.data,
    // Personal no tiene nivel.
    tier: parsed.data.plan === "personal" ? "pro" : parsed.data.tier,
    receipt: { name: receipt.name.slice(0, 120), mimeType: storedType(data), data },
  });
  if (!created) return { error: "Ya tienes comprobantes por revisar. Espera a que los confirmemos." };
  revalidatePath("/negocio");
  return { ok: true };
}

export type ReferralState = { code?: string; guestName?: string; venueId?: string; eventDate?: string | null; error?: string } | null;

const referralBody = z.object({
  venueId: z.string().min(1).max(64),
  guestName: z.string().trim().min(2).max(80),
  eventDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
});

/** Genera un código de referido para un cliente (desde Mi negocio o desde el panel del lugar). */
export async function createReferral(_prev: ReferralState, formData: FormData): Promise<ReferralState> {
  const user = await requireUser("/negocio");
  const org = await requireOrg(user);
  const parsed = referralBody.safeParse({ venueId: formData.get("venueId"), guestName: formData.get("guestName"), eventDate: formData.get("eventDate") ?? "" });
  if (!parsed.success) return { error: "Escribe el nombre del cliente y elige el lugar." };
  const d = parsed.data;
  // Una fecha pasada (por ejemplo, el año equivocado) crearía una cuenta que ya nació vencida.
  if (d.eventDate && (!isRealDay(d.eventDate) || d.eventDate < today())) {
    return { error: "La fecha del evento ya pasó. Revisa el día, el mes y el año." };
  }
  const result = await createReferralCode(org, d.venueId, d.guestName, d.eventDate || null);
  if ("error" in result) return { error: result.error };
  revalidatePath("/negocio");
  revalidatePath("/lugares", "layout");
  return { code: result.code, guestName: d.guestName, venueId: d.venueId, eventDate: d.eventDate || null };
}

export type MessageState = { ok?: boolean; error?: string } | null;

/** Guarda el estilo y el párrafo propio con que el negocio manda sus códigos; "restaurar" vuelve al sugerido. */
export async function saveReferralMessage(_prev: MessageState, formData: FormData): Promise<MessageState> {
  const user = await requireUser("/negocio");
  const org = await requireOrg(user);
  const restore = formData.get("restore") === "1";
  const parsed = z
    .object({ style: z.enum(MESSAGE_STYLES), body: z.string().max(MAX_BODY_LENGTH) })
    .safeParse({ style: formData.get("style") ?? "cercano", body: String(formData.get("body") ?? "").replace(/\r\n/g, "\n") });
  if (!parsed.success) return { error: `El texto puede tener hasta ${MAX_BODY_LENGTH} caracteres.` };
  await setReferralTemplate(org.id, user.id, restore ? null : serializeSetting(parsed.data));
  revalidatePath("/negocio");
  revalidatePath("/lugares", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Pago con tarjeta (Mercado Pago)

export type CardState = { error?: string } | null;

const cardBody = z.object({
  plan: z.enum(["eventos", "casas", "personal"]),
  tier: z.enum(["pro", "ilimitado"]),
  period: z.enum(["mes", "anio"]),
});

/** Arranca el pago con tarjeta: mensual = suscripción que se cobra sola; anual = un pago. Manda a Mercado Pago. */
export async function startCardPayment(_prev: CardState, formData: FormData): Promise<CardState> {
  const user = await requireUser("/negocio");
  const org = await requireOrg(user);
  if (!mpEnabled()) return { error: "El pago con tarjeta todavía no está disponible. Paga por transferencia." };
  const [plan, tier, period] = String(formData.get("option") ?? "").split("|");
  const parsed = cardBody.safeParse({ plan, tier, period });
  if (!parsed.success) return { error: "Elige el plan que quieres pagar." };
  const d = parsed.data;
  // El monto sale de la tabla de precios (nunca del navegador); un salón paga también sus salones adicionales.
  const extraVenues = org.kind === "venue" ? Math.max(0, (await countOwnedPublishedVenues(org.id)) - 1) : 0;
  const price = cardPrice({ ...d, tier: d.plan === "personal" ? "pro" : d.tier, orgKind: org.kind, extraVenues });
  if (!price) return { error: "Ese plan se paga por transferencia. Escríbenos por WhatsApp si necesitas ayuda." };
  const checkout = await createCardCheckout(org.id, {
    kind: d.period === "mes" ? "suscripcion" : "pago",
    plan: d.plan,
    tier: d.plan === "personal" ? "pro" : d.tier,
    period: d.period,
    amount: price.amount,
    title: price.title,
  });
  let goTo: string;
  try {
    const input = { checkoutId: checkout.id, title: price.title, amount: price.amount, email: user.email };
    const created = checkout.kind === "pago" ? await createPreference(input) : await createSubscriptionPlan(input);
    if (!created.init_point) throw new Error("Mercado Pago no regresó la página de pago");
    await setCardCheckout(checkout.id, { mpId: created.id });
    goTo = created.init_point;
  } catch (e) {
    await setCardCheckout(checkout.id, { status: "fallida" });
    void reportError({ message: `No se pudo abrir el pago con tarjeta: ${e instanceof Error ? e.message : e}`, source: "server" });
    return { error: "No pudimos abrir Mercado Pago. Intenta de nuevo en unos minutos o paga por transferencia." };
  }
  redirect(goTo);
}

/** "Revisar mi pago": pregunta a Mercado Pago por los pagos recientes de la cuenta. */
export async function syncCardPaymentsAction(): Promise<void> {
  const user = await requireUser("/negocio");
  const org = await requireOrg(user);
  if (mpEnabled()) await syncOrgCardPayments(org.id);
  revalidatePath("/negocio");
  revalidatePath("/eventos");
  redirect("/negocio?pago=revisado#pagar");
}

/** Cancela el cobro automático de una suscripción del negocio (el plan sigue hasta su fecha de fin). */
export async function cancelSubscriptionAction(formData: FormData): Promise<void> {
  const user = await requireUser("/negocio");
  const org = await requireOrg(user);
  const id = z.string().uuid().safeParse(formData.get("checkoutId"));
  if (!id.success) return;
  const checkout = await getCardCheckout(id.data);
  if (!checkout || checkout.orgId !== org.id || checkout.kind !== "suscripcion" || !checkout.mpSubscriptionId) return;
  try {
    await cancelPreapproval(checkout.mpSubscriptionId);
    await setCardCheckout(checkout.id, { status: "cancelada" });
  } catch (e) {
    void reportError({ message: `No se pudo cancelar la suscripción ${checkout.id}: ${e instanceof Error ? e.message : e}`, source: "server" });
  }
  revalidatePath("/negocio");
}

