import { networkInterfaces } from "node:os";

/** IPs de esta Mac en la red local (para abrir el servidor de desarrollo desde el iPhone). */
export function lanHosts(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((n) => n !== undefined && n.family === "IPv4" && !n.internal)
    .map((n) => n!.address);
}

export function lanOrigins(port = process.env.PORT ?? "3000"): string[] {
  return lanHosts().map((host) => `http://${host}:${port}`);
}
