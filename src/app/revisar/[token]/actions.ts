"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { confirmVenueReview, requestVenueCorrections } from "@/lib/dal";

export type ReviewState = { ok?: boolean; error?: string } | null;

const token = z.string().min(8).max(64);

/** El dueño confirma: el lugar se publica y aparece en el catálogo. */
export async function confirmReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const t = token.safeParse(formData.get("token"));
  if (!t.success) return { error: "Enlace inválido." };
  const row = await confirmVenueReview(t.data);
  if (!row) return { error: "No se pudo publicar: el lugar todavía no tiene plano o ya cambió de estado." };
  revalidatePath(`/revisar/${t.data}`);
  revalidatePath("/salones");
  revalidatePath("/casas");
  return { ok: true };
}

/** El dueño pide correcciones: vuelve a conversión con sus notas. */
export async function requestCorrections(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const parsed = z.object({ token, notes: z.string().trim().min(5).max(600) }).safeParse({
    token: formData.get("token"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: "Escribe qué hay que corregir (mínimo 5 letras)." };
  const row = await requestVenueCorrections(parsed.data.token, parsed.data.notes);
  if (!row) return { error: "No se pudo registrar: el lugar ya cambió de estado." };
  revalidatePath(`/revisar/${parsed.data.token}`);
  return { ok: true };
}
