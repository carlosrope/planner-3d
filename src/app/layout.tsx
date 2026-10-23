import type { Metadata, Viewport } from "next";
import { ErrorReporter } from "@/components/ErrorReporter";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { CONTACT_WHATSAPP } from "@/lib/brand";
import { waLink } from "@/lib/whatsapp";
import { SITE_URL } from "@/lib/site";
import { Suspense } from "react";
import { dmSans, sora } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  // Canónicas y Open Graph siempre con plantea.com.mx, aunque la app también responda en Railway.
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "Plantea",
    // Imagen con el slogan «Plantéalo. Míralo. Vívelo.» (fuente en herramientas/marca-plantea/og, fuera del repo).
    images: [{ url: "/og/plantea.jpg", width: 1200, height: 630, alt: "Plantea: Plantéalo. Míralo. Vívelo. Tu evento o tu casa en 3D" }],
  },
  twitter: { card: "summary_large_image" },
  title: { default: "Plantea · tu evento o tu casa en 3D", template: "%s · Plantea" },
  description: "Plantea tu evento o tu casa en 3D antes de vivirlo: planos 2D y recorridos 3D de salones y casas reales de México, desde el celular.",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "48x48" }, { url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f4ef",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${sora.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
        {/* Lee la ruta para ocultarse en las páginas de trabajo: va en Suspense para no bloquear el prerender. */}
        <Suspense fallback={null}>
          <WhatsAppFloat href={waLink(CONTACT_WHATSAPP, "Hola, quiero saber más de Plantea.")} />
        </Suspense>
        {process.env.SENTRY_DSN ? <ErrorReporter /> : null}
      </body>
    </html>
  );
}
