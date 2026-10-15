"use client";

import { usePathname } from "next/navigation";

/** Rutas de trabajo donde el botón estorbaría (la cuenta ya tiene sus propios contactos). */
const HIDDEN = [/^\/admin/, /^\/eventos/, /^\/negocio/, /^\/lugares\/[^/]+\/panel/, /^\/revisar/, /^\/entrar/, /^\/registro/, /^\/olvide/, /^\/restablecer/];

/** Botón flotante para escribirle a Plantea por WhatsApp desde las páginas públicas. */
export function WhatsAppFloat({ href }: { href: string }) {
  const path = usePathname() ?? "/";
  if (HIDDEN.some((re) => re.test(path))) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg shadow-black/20 hover:bg-[#1ebe5b] sm:bottom-6 sm:right-6"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden="true">
        <path d="M16.04 3C8.86 3 3.03 8.82 3.03 16c0 2.29.6 4.53 1.74 6.5L3 29l6.68-1.75A12.95 12.95 0 0 0 16.04 29C23.2 29 29 23.18 29 16S23.2 3 16.04 3Zm0 23.64c-2 0-3.95-.54-5.66-1.55l-.4-.24-3.97 1.04 1.06-3.86-.26-.4a10.6 10.6 0 0 1-1.63-5.64c0-5.88 4.79-10.66 10.68-10.66 5.88 0 10.65 4.78 10.65 10.66 0 5.88-4.78 10.65-10.47 10.65Zm5.85-7.98c-.32-.16-1.89-.93-2.18-1.04-.29-.1-.5-.16-.72.16-.21.32-.82 1.04-1 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.18.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.66 0 1.57 1.14 3.08 1.3 3.3.16.2 2.24 3.43 5.44 4.81.76.33 1.35.52 1.81.67.76.24 1.45.2 2 .12.61-.09 1.89-.77 2.15-1.52.27-.74.27-1.38.19-1.52-.08-.13-.29-.21-.61-.37Z" />
      </svg>
    </a>
  );
}
