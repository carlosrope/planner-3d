/**
 * Archivos que suben los dueños y las cuentas (planos, fotos, comprobantes): el tipo se deduce del contenido, no del que
 * dice el navegador, para que nadie suba un SVG o un HTML con código disfrazado de imagen. Puro: uploads.test.ts.
 */

export type SafeType = "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "image/heic" | "application/pdf";

const startsWith = (data: Uint8Array, bytes: number[], at = 0) => bytes.every((b, i) => data[at + i] === b);
const ascii = (data: Uint8Array, from: number, to: number) => String.fromCharCode(...data.subarray(from, to));

/** Tipo real del archivo por sus primeros bytes, o null si no es una imagen de mapa de bits ni un PDF. */
export function sniffType(data: Uint8Array): SafeType | null {
  if (startsWith(data, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (ascii(data, 0, 4) === "GIF8") return "image/gif";
  if (ascii(data, 0, 4) === "RIFF" && ascii(data, 8, 12) === "WEBP") return "image/webp";
  if (ascii(data, 4, 8) === "ftyp" && /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(ascii(data, 8, 12))) return "image/heic";
  if (ascii(data, 0, 5) === "%PDF-") return "application/pdf";
  return null;
}

export const isPhoto = (data: Uint8Array) => sniffType(data)?.startsWith("image/") ?? false;
export const isReceipt = (data: Uint8Array) => sniffType(data) !== null;
/** Plano: una foto, un PDF o un archivo de AutoCAD (DWG/DXF, que solo se descarga). */
export const isPlanFile = (name: string, data: Uint8Array) => sniffType(data) !== null || /\.(dwg|dxf)$/i.test(name);

/** Tipo con el que se guarda: el real si es imagen o PDF; lo demás (DWG, DXF) como binario. */
export const storedType = (data: Uint8Array) => sniffType(data) ?? "application/octet-stream";

/**
 * Cabeceras para servir un archivo subido: imágenes y PDF se ven en el navegador; todo lo demás se descarga. Nada se
 * puede ejecutar en plantea.com.mx aunque el archivo traiga código (sandbox y nosniff).
 */
export function fileHeaders(data: Uint8Array, name: string, opts: { download?: boolean } = {}): Record<string, string> {
  const type = sniffType(data);
  const inline = !opts.download && type !== null;
  const headers: Record<string, string> = {
    "content-type": type ?? "application/octet-stream",
    "content-disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(name)}`,
    "x-content-type-options": "nosniff",
  };
  // El visor de PDF del navegador no corre en la página; a lo demás se le quita todo permiso.
  if (type !== "application/pdf") headers["content-security-policy"] = "default-src 'none'; img-src 'self' data:; sandbox";
  return headers;
}
