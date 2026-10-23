import type { ReactNode } from "react";
import { SOCIAL } from "@/lib/brand";

// Redes de Plantea con sus íconos: la 404, las páginas de error y el cierre de la portada. Sin hooks ni datos del
// servidor, así que sirve igual en páginas del servidor y del navegador (las de error son del navegador).

export type Red = { label: string; handle?: string; href: string; icon: ReactNode };

export const ICONO_WHATSAPP = (
  <path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5Zm0 17.2c-1.5 0-2.9-.4-4.2-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A7.7 7.7 0 1 1 12 19.7Zm4.3-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.3 6.3 0 0 1-3.1-2.7c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3c-.2.2-.8.8-.8 2s.9 2.3 1 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2.1.7 2.8.6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.2Z" />
);

/** Instagram y Facebook de Plantea (cuentas @plantea.3d y Plantea3D). */
export const REDES: Red[] = [
  {
    label: "Instagram",
    handle: "@plantea.3d",
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
    label: "Facebook",
    handle: "Plantea3D",
    href: SOCIAL.facebook,
    icon: <path d="M14 8h3V4h-3c-2.8 0-4.5 1.9-4.5 4.7V11H7v4h2.5v8h4v-8H17l.5-4h-4V8.9c0-.6.4-.9.5-.9Z" />,
  },
];

const Icono = ({ children, className = "h-6 w-6" }: { children: ReactNode; className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    {children}
  </svg>
);

/** Botones redondos solo con el ícono (el nombre de la red va en aria-label). */
export function RedesIconos({ redes = REDES, className = "" }: { redes?: Red[]; className?: string }) {
  return (
    <ul className={`flex gap-3 ${className}`}>
      {redes.map((r) => (
        <li key={r.label}>
          <a
            href={r.href}
            target="_blank"
            rel="noopener"
            aria-label={r.label}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-800 transition hover:border-[#b5653a] hover:text-[#a4552d]"
          >
            <Icono>{r.icon}</Icono>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Botones con el ícono, la red y la cuenta: en el celular uno debajo del otro, a lo ancho. */
export function RedesBotones({ redes = REDES, className = "" }: { redes?: Red[]; className?: string }) {
  return (
    <ul className={`flex flex-col gap-3 sm:flex-row sm:justify-center ${className}`}>
      {redes.map((r) => (
        <li key={r.label}>
          <a
            href={r.href}
            target="_blank"
            rel="noopener"
            className="flex h-12 items-center justify-center gap-2.5 rounded-xl border border-stone-300 bg-white px-5 font-semibold text-stone-900 transition hover:border-[#b5653a] hover:text-[#a4552d]"
          >
            <Icono className="h-5 w-5">{r.icon}</Icono>
            {r.label}
            {r.handle ? <span className="font-normal text-stone-500">{r.handle}</span> : null}
          </a>
        </li>
      ))}
    </ul>
  );
}
