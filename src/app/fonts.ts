import { DM_Sans, Sora } from "next/font/google";

// Tipografías de la marca (docs/marca-plantea.md): Sora para títulos, DM Sans para texto. Aparte del diseño para que
// global-error.tsx, que lo reemplaza cuando falla, use las mismas.
export const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
export const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
