import type { Viewport } from "next";

/** En el editor el pellizco es para el plano, no para hacer zoom a la página. */
export const editorViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};
