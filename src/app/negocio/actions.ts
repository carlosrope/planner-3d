"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrg, requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema";

export type BrandState = { ok?: boolean; error?: string } | null;

// El logo llega ya reducido desde el navegador; aun así se limita el tamaño.
const logo = z.union([z.literal(""), z.string().regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).max(400_000)]);
const brand = z.object({
  name: z.string().trim().min(2).max(80),
  logo: logo.optional(),
  removeLogo: z.literal("1").optional(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  whatsapp: z.string().trim().max(30),
});

/** WhatsApp en formato internacional: 10 dígitos de México → 52 + número. */
function normalizeWhatsapp(raw: string): string | null | undefined {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `52${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return undefined;
}

export async function updateBrand(_prev: BrandState, formData: FormData): Promise<BrandState> {
  const user = await requireUser();
  const org = await requireOrg(user);
  const parsed = brand.safeParse({
    name: formData.get("name"),
    logo: formData.get("logo") || undefined,
    removeLogo: formData.get("removeLogo") || undefined,
    brandColor: formData.get("brandColor"),
    whatsapp: formData.get("whatsapp") ?? "",
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
      ...(parsed.data.removeLogo ? { logoUrl: null } : parsed.data.logo ? { logoUrl: parsed.data.logo } : {}),
    })
    .where(eq(organization.id, org.id));
  revalidatePath("/eventos");
  revalidatePath("/negocio");
  return { ok: true };
}
