"use client";

import { useActionState, useRef, useState } from "react";
import { DEFAULT_REFERRAL_TEMPLATE, MAX_TEMPLATE_LENGTH, REFERRAL_TAGS, referralMessage } from "@/lib/referral-message";
import { saveReferralMessage } from "./actions";

/** Editor del mensaje con el que se mandan los códigos: marcas para insertar y vista previa con un ejemplo. */
export function MessageEditor({ template, origin, venueName }: { template: string | null; origin: string; venueName: string }) {
  const [state, action, pending] = useActionState(saveReferralMessage, null);
  const [text, setText] = useState(template ?? DEFAULT_REFERRAL_TEMPLATE);
  const area = useRef<HTMLTextAreaElement>(null);
  const insert = (tag: string) => {
    const el = area.current;
    if (!el) return setText((t) => t + tag);
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    setText(text.slice(0, start) + tag + text.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    });
  };
  const preview = referralMessage({ code: "PALMAS-7K3M", guestName: "Ana y Luis", venueName: venueName || "tu salón", eventDate: "2026-11-21" }, origin, text);

  return (
    <details className="mt-5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3" open={state?.error ? true : undefined}>
      <summary className="cursor-pointer text-sm font-semibold text-stone-800">
        Editar el mensaje de WhatsApp {template ? <span className="font-normal text-stone-500">· mensaje propio</span> : <span className="font-normal text-stone-500">· sugerido</span>}
      </summary>
      <form action={action} className="mt-3 space-y-3">
        <p className="text-sm text-stone-600">Toca una etiqueta para ponerla donde está el cursor; se cambia por los datos de cada cliente.</p>
        <div className="flex flex-wrap gap-1.5">
          {REFERRAL_TAGS.map((t) => (
            <button key={t.tag} type="button" onClick={() => insert(t.tag)} className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-700">
              {t.label}
            </button>
          ))}
        </div>
        <textarea
          ref={area}
          name="template"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={9}
          maxLength={MAX_TEMPLATE_LENGTH}
          className="w-full rounded-xl border border-stone-300 bg-white p-3 text-base outline-none focus:border-stone-800"
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Así lo recibe tu cliente</p>
          <p className="mt-1 whitespace-pre-line rounded-xl rounded-tl-sm bg-[#dcf8c6] p-3 text-sm text-stone-900">{preview}</p>
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && !state.warning && <p className="text-sm text-emerald-700">Guardado. Los códigos se mandan con este mensaje.</p>}
        {state?.warning && <p className="text-sm text-amber-700">{state.warning}</p>}
        <div className="flex flex-wrap gap-2">
          <button disabled={pending} className="h-11 rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "Guardando…" : "Guardar mensaje"}
          </button>
          <button
            type="submit"
            name="restore"
            value="1"
            disabled={pending}
            onClick={() => setText(DEFAULT_REFERRAL_TEMPLATE)}
            className="h-11 rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800"
          >
            Usar el sugerido
          </button>
        </div>
      </form>
    </details>
  );
}
