import type { ShownCapacity } from "@/lib/designer/capacity";

/** Ficha del salón: cuántos caben en cada montaje (calculado del plano, topado en el aforo del salón). */
export function Capacidades({ items, aforo }: { items: ShownCapacity[]; aforo: number | null }) {
  if (!items.length) return null;
  // Si todos topan en el aforo, una sola línea en lugar de repetir el mismo número en cada montaje.
  const allCapped = items.every((c) => c.capped);
  return (
    <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5" aria-labelledby="cuantos-caben">
      <h2 id="cuantos-caben" className="text-lg font-semibold">
        ¿Cuántos caben?
      </h2>
      <ul className="mt-3 divide-y divide-stone-100">
        {allCapped ? (
          <li className="flex items-baseline justify-between gap-3 py-2">
            <span className="text-stone-700">En cualquier montaje</span>
            <span className="shrink-0 font-semibold text-stone-900">
              hasta {items[0].value.toLocaleString("es-MX")}
              <span className="font-normal text-stone-500"> · aforo del salón</span>
            </span>
          </li>
        ) : null}
        {!allCapped &&
          items.map((c) => (
          <li key={c.template} className="flex items-baseline justify-between gap-3 py-2">
            <span className="text-stone-700">{c.label}</span>
            <span className="shrink-0 font-semibold text-stone-900">
              hasta {c.value.toLocaleString("es-MX")}
              {c.capped && <span className="font-normal text-stone-500"> · aforo del salón</span>}
            </span>
          </li>
          ))}
      </ul>
      <p className="mt-2 text-sm text-stone-500">
        Aproximado, según el plano del salón y un montaje con pista, escenario y barra donde el evento los lleva
        {aforo ? `; nunca más que su aforo de ${aforo.toLocaleString("es-MX")} personas` : ""}. Confírmalo con el salón.
      </p>
    </section>
  );
}
