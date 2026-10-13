"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { inviteByEmail, markSeen, revokeAccess } from "./actions";

const field = "h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-base outline-none focus:border-stone-800";

export function SeenButton({ venueId }: { venueId: string }) {
  return (
    <form action={markSeen}>
      <input type="hidden" name="venueId" value={venueId} />
      <Pending label="Marcar como vistas" busy="Un momento…" className="text-sm underline" />
    </form>
  );
}

export function AccessForms({ venueId, access }: { venueId: string; access: { orgId: string; orgName: string }[] }) {
  const [state, action, pending] = useActionState(inviteByEmail, null);
  return (
    <div className="mt-3 space-y-3">
      {access.length > 0 && (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
          {access.map((a) => (
            <li key={a.orgId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>{a.orgName}</span>
              <form action={revokeAccess}>
                <input type="hidden" name="venueId" value={venueId} />
                <input type="hidden" name="orgId" value={a.orgId} />
                <Pending label="Quitar" busy="…" className="text-red-600" />
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={action} className="flex gap-2">
        <input type="hidden" name="venueId" value={venueId} />
        <input name="email" type="email" required placeholder="correo@de-la-planner.com" autoComplete="off" className={field} />
        <button disabled={pending} className="h-11 shrink-0 rounded-xl bg-stone-900 px-4 text-sm font-medium text-white disabled:opacity-60">
          {pending ? "…" : "Invitar"}
        </button>
      </form>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700">{state.ok}</p>}
    </div>
  );
}

function Pending({ label, busy, className }: { label: string; busy: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? busy : label}
    </button>
  );
}
