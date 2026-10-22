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
    // En producción solo se anota a quién iba: el cuerpo trae enlaces que sirven para entrar (contraseña, verificación)
    // y no deben quedar en los registros. En local se imprime completo para poder probar.
    if (process.env.NODE_ENV === "production") {
      console.error(`[correo · sin RESEND_API_KEY] No se mandó «${mail.subject}» a ${mail.to}`);
      return { ok: false, error: "Correo no configurado" };
    }
    const line = "─".repeat(60);
    console.log(`\n${line}\n[correo · sin RESEND_API_KEY] Para: ${mail.to}\nAsunto: ${mail.subject}\n\n${mail.text}\n${line}\n`);
    return { ok: true };
  }
  const from = process.env.EMAIL_FROM || "Plantea <onboarding@resend.dev>";
  // Respuestas a un buzón real (un remitente que no recibe correo es señal de spam para Hotmail y Gmail).
  const replyTo = process.env.EMAIL_REPLY_TO || undefined;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [mail.to], reply_to: replyTo, subject: mail.subject, text: mail.text, html: mail.html ?? toHtml(mail.text) }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[correo] Resend respondió ${res.status}: ${body.slice(0, 300)}`);
    return { ok: false, error: `Resend ${res.status}` };
  }
  return { ok: true };
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Texto plano → HTML sencillo: párrafos y enlaces clicables. */
function toHtml(text: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => escape(p).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>').replace(/\n/g, "<br>"))
    .map((p) => `<p style="margin:0 0 16px">${p}</p>`)
    .join("");
  return layout(paragraphs);
}

/** Dominio público de Plantea para el pie (del remitente; por omisión plantea.com.mx). */
const siteName = () => /@([^>\s]+)/.exec(process.env.EMAIL_FROM ?? "")?.[1] ?? "plantea.com.mx";

/** Marco de todos los correos: marca Plantea, ancho de celular, pie con quién lo manda y por qué. */
function layout(body: string, why = "Recibes este correo porque tienes una cuenta en Plantea."): string {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f5f1ec;padding:24px 12px">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px 24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.5;color:#1c1917">
<p style="margin:0 0 20px;font-size:20px;font-weight:700;letter-spacing:-0.01em">Plantea</p>
${body}
</div>
<p style="max-width:520px;margin:16px auto 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#78716c;text-align:center">
${escape(why)}<br>Plantea · México · ${escape(siteName())}</p>
</body></html>`;
}

/** Correo para restablecer la contraseña (Better Auth llama a esto con el enlace de un solo uso). */
export function passwordResetEmail(to: string, name: string, url: string): Email {
  const first = name.trim().split(/\s+/)[0] || "";
  const hello = first ? `Hola, ${first}.` : "Hola.";
  const text = `${hello}

Recibimos una solicitud para cambiar la contraseña de tu cuenta de Plantea (${to}). Para crear una nueva, abre este enlace; sirve una sola vez durante una hora:

${url}

Si no lo pediste tú, ignora este correo: tu contraseña sigue igual y nadie puede cambiarla sin este enlace.

Plantea · México`;
  const html = layout(
    `<p style="margin:0 0 16px">${escape(hello)}</p>
<p style="margin:0 0 20px">Recibimos una solicitud para cambiar la contraseña de tu cuenta de Plantea (<strong>${escape(to)}</strong>).</p>
<p style="margin:0 0 24px"><a href="${escape(url)}" style="display:inline-block;background:#1c1917;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:12px">Crear contraseña nueva</a></p>
<p style="margin:0 0 16px;font-size:14px;color:#57534e">El botón sirve una sola vez durante una hora. Si no funciona, copia este enlace en tu navegador:<br><a href="${escape(url)}" style="color:#57534e;word-break:break-all">${escape(url)}</a></p>
<p style="margin:0;font-size:14px;color:#57534e">Si no lo pediste tú, ignora este correo: tu contraseña sigue igual y nadie puede cambiarla sin este enlace.</p>`,
    "Recibes este correo porque alguien pidió cambiar la contraseña de esta cuenta de Plantea.",
  );
  return { to, subject: "Tu enlace para crear una contraseña nueva en Plantea", text, html };
}
