"use client";

import { useActionState, useState } from "react";
import { MAX_BODY_LENGTH, MESSAGE_STYLES, MESSAGE_STYLE_LABELS, defaultBody, referralMessage, type MessageSetting, type MessageStyle } from "@/lib/referral-message";
import { saveReferralMessage } from "./actions";

/**
 * Cómo se manda el código: se elige un estilo tocándolo y, si se quiere, se escribe el párrafo del medio con
 * palabras propias. El nombre, el código y el enlace los pone Plantea solo.
 */
export function MessageEditor({ setting, origin, venueName }: { setting: MessageSetting; origin: string; venueName: string }) {
  const [state, action, pending] = useActionState(saveReferralMessage, null);
  const [style, setStyle] = useState<MessageStyle>(setting.style);
  const [body, setBody] = useState(setting.body ?? "");
  const sample = { code: "PALMAS-7K3M", guestName: "Ana y Luis", venueName: venueName || "tu salón", eventDate: "2026-11-21" };
  const custom = setting.style !== "cercano" || Boolean(setting.body);

  return (
    <details className="mt-5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3" open={state?.error ? true : undefined}>
      <summary className="cursor-pointer text-sm font-semibold text-stone-800">
        Cambiar el mensaje de WhatsApp <span className="font-normal text-stone-500">· {custom ? MESSAGE_STYLE_LABELS[setting.style] : "sugerido"}</span>
      </summary>
      <form action={action} className="mt-3 space-y-4">
        <fieldset>
          <legend className="text-sm font-medium text-stone-800">1. Elige cómo quieres sonar</legend>
          <div className="mt-2 space-y-2">
            {MESSAGE_STYLES.map((s) => (
              <label
                key={s}
                className={`block cursor-pointer rounded-xl border bg-white p-3 ${style === s ? "border-[#b5653a] ring-1 ring-[#b5653a]" : "border-stone-200"}`}
              >
                <span className="flex items-center gap-2">
                  <input type="radio" name="style" value={s} checked={style === s} onChange={() => setStyle(s)} className="h-4 w-4 accent-[#b5653a]" />
                  <span className="font-semibold">{MESSAGE_STYLE_LABELS[s]}</span>
                </span>
                <span className="mt-1 block whitespace-pre-line text-xs text-stone-500">{referralMessage(sample, origin, { style: s, body: null }).split("\n\n").slice(0, 2).join("\n\n")}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-sm font-medium text-stone-800">2. Si quieres, escribe el mensaje con tus palabras</span>
          <span className="mt-0.5 block text-xs text-stone-500">Déjalo vacío para usar el del estilo, que ya pone tu salón y la fecha de cada cliente.</span>
          <textarea
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            maxLength={MAX_BODY_LENGTH}
            placeholder={defaultBody(style, sample)}
            className="mt-2 w-full rounded-xl border border-stone-300 bg-white p-3 text-base outline-none placeholder:text-stone-400 focus:border-stone-800"
          />
        </label>

        <div>
          <p className="text-sm font-medium text-stone-800">3. Así lo recibe tu cliente</p>
          <p className="mt-1 text-xs text-stone-500">El nombre, el código y el enlace se ponen solos con los de cada cliente.</p>
          <p className="mt-2 whitespace-pre-line rounded-xl rounded-tl-sm bg-[#dcf8c6] p-3 text-sm text-stone-900">{referralMessage(sample, origin, { style, body })}</p>
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-sm text-emerald-700">Guardado. Tus códigos se mandan con este mensaje.</p>}
        <div className="flex flex-wrap gap-2">
          <button disabled={pending} className="h-11 rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "Guardando…" : "Guardar mensaje"}
          </button>
          <button
            type="submit"
            name="restore"
            value="1"
            disabled={pending}
            onClick={() => {
              setStyle("cercano");
              setBody("");
            }}
            className="h-11 rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800"
          >
            Usar el sugerido
          </button>
        </div>
      </form>
    </details>
  );
}
