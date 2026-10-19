/** Inicio de sesión con Google: solo se muestra cuando Railway tiene GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET. */
export const googleEnabled = () => Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
