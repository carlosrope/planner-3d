import type { Metadata, Viewport } from "next";
import { DM_Sans, Sora } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "./globals.css";

// Tipografías de la marca (docs/marca-plantea.md): Sora para títulos, DM Sans para texto.
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: { default: "Plantea · tu evento o tu casa en 3D", template: "%s · Plantea" },
  description: "Plantea tu evento o tu casa en 3D antes de vivirlo: planos 2D y recorridos 3D de salones y casas reales de Los Mochis, desde el celular.",
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
      </body>
    </html>
  );
}
