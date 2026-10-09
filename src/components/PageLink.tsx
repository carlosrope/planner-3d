import type { AnchorHTMLAttributes } from "react";

/**
 * Enlace a una página que no es de React (el diseñador lo sirve un route handler):
 * navegación normal del navegador, sin prefetch ni navegación del router de Next.
 */
export function PageLink(props: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a {...props} />;
}
