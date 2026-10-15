import type { Metadata, Viewport } from "next";
import { DM_Sans, Sora } from "next/font/google";
import { ErrorReporter } from "@/components/ErrorReporter";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// Tipografías de la marca (docs/marca-plantea.md): Sora para títulos, DM Sans para texto.
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  // Canónicas y Open Graph siempre con plantea.com.mx, aunque la app también responda en Railway.
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "Plantea",
    images: [{ url: "/portada/espacios-salon-3d.jpg", width: 800, height: 575, alt: "Salón de eventos en 3D en Plantea" }],
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
        {process.env.SENTRY_DSN ? <ErrorReporter /> : null}
      </body>
    </html>
  );
}
