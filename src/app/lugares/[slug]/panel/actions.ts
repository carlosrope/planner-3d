"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { grantVenueAccess, markInquiriesSeen, requireOrg, requireUser, revokeVenueAccess } from "@/lib/dal";

export type InviteState = { ok?: string; error?: string } | null;

const venueId = z.string().min(1).max(64);

export async function markSeen(formData: FormData): Promise<void> {
  const user = await requireUser("/lugares");
  const org = await requireOrg(user);
  const id = venueId.safeParse(formData.get("venueId"));
  if (!id.success) return;
  await markInquiriesSeen(org.id, id.data);
  revalidatePath("/lugares", "layout");
}

/** Invitar a una planner por el correo de su cuenta: su negocio puede crear eventos en este lugar. */
export async function inviteByEmail(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const user = await requireUser("/lugares");
  const org = await requireOrg(user);
  const parsed = z.object({ venueId, email: z.string().trim().email().max(120) }).safeParse({
    venueId: formData.get("venueId"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: "Escribe un correo válido." };
  const result = await grantVenueAccess(org.id, parsed.data.venueId, parsed.data.email);
  if ("error" in result) return { error: result.error };
  revalidatePath("/lugares", "layout");
  return { ok: `${result.orgName} ya puede planear en tu lugar.` };
}

export async function revokeAccess(formData: FormData): Promise<void> {
  const user = await requireUser("/lugares");
  const org = await requireOrg(user);
  const parsed = z.object({ venueId, orgId: z.string().min(1).max(64) }).safeParse({
    venueId: formData.get("venueId"),
    orgId: formData.get("orgId"),
  });
  if (!parsed.success) return;
  await revokeVenueAccess(org.id, parsed.data.venueId, parsed.data.orgId);
  revalidatePath("/lugares", "layout");
}
