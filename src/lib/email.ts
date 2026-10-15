import "server-only";

/**
 * Correo transaccional. Con RESEND_API_KEY manda por Resend (https://resend.com, API HTTP, sin SDK);
 * sin llave, en desarrollo imprime el correo en la consola del servidor (el enlace se copia de ahí).
 * EMAIL_FROM: remitente verificado en Resend, por ejemplo "Plantea <hola@plantea.com.mx>".
 */
export type Email = { to: string; subject: string; text: string; html?: string };

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

export async function sendEmail(mail: Email): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const line = "─".repeat(60);
    console.log(`\n${line}\n[correo · sin RESEND_API_KEY] Para: ${mail.to}\nAsunto: ${mail.subject}\n\n${mail.text}\n${line}\n`);
    return process.env.NODE_ENV === "production" ? { ok: false, error: "Correo no configurado" } : { ok: true };
  }
  const from = process.env.EMAIL_FROM || "Plantea <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html ?? toHtml(mail.text) }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[correo] Resend respondió ${res.status}: ${body.slice(0, 300)}`);
    return { ok: false, error: `Resend ${res.status}` };
  }
  return { ok: true };
}

/** Texto plano → HTML sencillo: párrafos y enlaces clicables. */
function toHtml(text: string): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => escape(p).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>').replace(/\n/g, "<br>"))
    .map((p) => `<p style="margin:0 0 16px">${p}</p>`)
    .join("");
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:16px;line-height:1.5;color:#1c1917;max-width:560px">${paragraphs}</div>`;
}

/** Correo para restablecer la contraseña (Better Auth llama a esto con el enlace de un solo uso). */
export function passwordResetEmail(to: string, name: string, url: string): Email {
  const first = name.trim().split(/\s+/)[0] || "Hola";
  return {
    to,
    subject: "Restablece tu contraseña de Plantea",
    text: `Hola, ${first}.\n\nAlguien pidió cambiar la contraseña de tu cuenta de Plantea. Si fuiste tú, abre este enlace (sirve una hora):\n\n${url}\n\nSi no fuiste tú, ignora este correo: tu contraseña sigue igual.\n\nPlantea · ProLink365`,
  };
}
