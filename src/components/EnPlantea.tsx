import Link from "next/link";
import { listCatalog } from "@/lib/dal";
import { DEMO_SLUGS, TESTIMONIALS } from "@/lib/testimonials";

/**
 * "Ya están en Plantea": salones reales publicados (sin las demos) y testimonios con permiso.
 * Con nada real que enseñar, no se pinta nada.
 */
export async function EnPlantea() {
  const venues = (await listCatalog("salon")).filter((v) => !DEMO_SLUGS.includes(v.slug ?? v.id)).slice(0, 6);
  if (venues.length === 0 && TESTIMONIALS.length === 0) return null;
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">Ya están en Plantea</h2>
      {venues.length > 0 && (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {venues.map((v) => {
            const slug = v.slug ?? v.id;
            return (
              <li key={v.id}>
                <Link href={`/lugares/${slug}`} className="block overflow-hidden rounded-2xl border border-stone-200 bg-white">
                  {v.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element -- foto del lugar servida por la app
                    <img src={`/lugares/${slug}/foto/${v.cover}`} alt={v.name} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="aspect-[4/3] w-full bg-[#f3ece2]" />
                  )}
                  <p className="px-3 pt-2 text-sm font-semibold text-stone-900">{v.name}</p>
                  <p className="px-3 pb-3 text-xs text-stone-500">{v.city}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {TESTIMONIALS.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="rounded-2xl border border-stone-200 bg-white p-5">
              <blockquote className="text-stone-800">“{t.quote}”</blockquote>
              <figcaption className="mt-3 text-sm text-stone-500">
                <b className="text-stone-800">{t.name}</b> · {t.role}, {t.business}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
