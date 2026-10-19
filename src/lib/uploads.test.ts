import { describe, expect, it } from "vitest";
import { fileHeaders, isPhoto, isPlanFile, isReceipt, sniffType, storedType } from "./uploads";

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));
const jpeg = bytes([0xff, 0xd8, 0xff, 0xe0], "rest");
const png = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "rest");
const webp = bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 ");
const heic = bytes([0, 0, 0, 24], "ftypheic", "rest");
const pdf = bytes("%PDF-1.7\n");
const svg = bytes('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const html = bytes("<!doctype html><script>alert(1)</script>");

describe("archivos subidos", () => {
  it("reconoce el tipo por el contenido", () => {
    expect(sniffType(jpeg)).toBe("image/jpeg");
    expect(sniffType(png)).toBe("image/png");
    expect(sniffType(webp)).toBe("image/webp");
    expect(sniffType(heic)).toBe("image/heic");
    expect(sniffType(pdf)).toBe("application/pdf");
    expect(sniffType(svg)).toBeNull();
    expect(sniffType(html)).toBeNull();
    expect(sniffType(new Uint8Array())).toBeNull();
  });

  it("un SVG o un HTML no pasan como foto ni como comprobante", () => {
    expect(isPhoto(jpeg)).toBe(true);
    expect(isPhoto(pdf)).toBe(false);
    expect(isPhoto(svg)).toBe(false);
    expect(isReceipt(pdf)).toBe(true);
    expect(isReceipt(svg)).toBe(false);
  });

  it("el plano puede ser foto, PDF o AutoCAD, pero no un SVG con otro nombre", () => {
    expect(isPlanFile("plano.jpg", jpeg)).toBe(true);
    expect(isPlanFile("plano.pdf", pdf)).toBe(true);
    expect(isPlanFile("salon.DWG", bytes("AC1032"))).toBe(true);
    expect(isPlanFile("salon.dxf", bytes("0\nSECTION"))).toBe(true);
    expect(isPlanFile("plano.png", svg)).toBe(false);
    expect(storedType(bytes("AC1032"))).toBe("application/octet-stream");
  });

  it("solo las imágenes y los PDF se abren en el navegador, y nada puede ejecutar código", () => {
    expect(fileHeaders(jpeg, "foto.jpg")).toMatchObject({ "content-type": "image/jpeg", "x-content-type-options": "nosniff" });
    expect(fileHeaders(jpeg, "foto.jpg")["content-disposition"]).toMatch(/^inline/);
    expect(fileHeaders(jpeg, "foto.jpg")["content-security-policy"]).toContain("sandbox");
    expect(fileHeaders(pdf, "comprobante.pdf")["content-disposition"]).toMatch(/^inline/);
    const bad = fileHeaders(svg, "foto.svg");
    expect(bad["content-type"]).toBe("application/octet-stream");
    expect(bad["content-disposition"]).toMatch(/^attachment/);
    expect(bad["content-security-policy"]).toContain("sandbox");
    expect(fileHeaders(jpeg, "foto.jpg", { download: true })["content-disposition"]).toMatch(/^attachment/);
  });
});
