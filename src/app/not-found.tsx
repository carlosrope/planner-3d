import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_WHATSAPP, SOCIAL } from "@/lib/brand";
import { waLink } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Página no encontrada", robots: { index: false }, alternates: { canonical: null } };

const REDES = [
  {
    label: "Facebook",
    href: SOCIAL.facebook,
    icon: <path d="M14 8h3V4h-3c-2.8 0-4.5 1.9-4.5 4.7V11H7v4h2.5v8h4v-8H17l.5-4h-4V8.9c0-.6.4-.9.5-.9Z" />,
  },
  {
    label: "Instagram",
    href: SOCIAL.instagram,
    icon: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.3" cy="6.7" r="1.2" />
      </>
    ),
  },
  {
    label: "WhatsApp",
    href: waLink(CONTACT_WHATSAPP, "Hola, llegué a una página de Plantea que no existe."),
    icon: (
      <path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5Zm0 17.2c-1.5 0-2.9-.4-4.2-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A7.7 7.7 0 1 1 12 19.7Zm4.3-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.3 6.3 0 0 1-3.1-2.7c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3c-.2.2-.8.8-.8 2s.9 2.3 1 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2.1.7 2.8.6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.2Z" />
    ),
  },
];

/** Página para enlaces que no existen: con la marca, en español, y salidas claras a la portada, los salones y las redes. */
export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-4 pb-24 pt-14 text-center sm:pt-20">
      {/* eslint-disable-next-line @next/next/no-img-element -- logo SVG estático */}
      <img src="/marca/plantea-symbol-color.svg" alt="" className="h-16 w-16" />
      <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-[#b5653a]">Error 404</p>
      <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">No encontramos esta página</h1>
      <p className="mt-3 text-stone-600">Puede que el enlace esté mal escrito o que ese lugar ya no esté publicado. Desde aquí puedes seguir:</p>
      <div className="mt-7 grid w-full gap-3 sm:grid-cols-2">
        <Link href="/" className="flex h-12 items-center justify-center rounded-xl bg-[#b5653a] font-semibold text-white hover:bg-[#a4552d]">
          Ir al inicio
        </Link>
        <Link href="/salones" className="flex h-12 items-center justify-center rounded-xl border border-stone-900 bg-white font-semibold hover:bg-stone-50">
          Ver salones en 3D
        </Link>
      </div>
      <p className="mt-10 text-sm font-medium text-stone-700">Síguenos o escríbenos</p>
      <ul className="mt-3 flex gap-3">
        {REDES.map((r) => (
          <li key={r.label}>
            <a
              href={r.href}
              target="_blank"
              rel="noopener"
              aria-label={r.label}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-800 transition hover:border-[#b5653a] hover:text-[#b5653a]"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                {r.icon}
              </svg>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
