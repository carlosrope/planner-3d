import { execFileSync } from "node:child_process";

/** Base de prueba nueva en cada corrida: se borra, se crea, se migra y se cargan los lugares de demostración. */
export default function globalSetup() {
  const url = process.env.E2E_DATABASE_URL!;
  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith("_prueba")) throw new Error(`La base de pruebas debe terminar en _prueba (es ${name}).`);
  const admin = url.replace(/\/[^/?]+(\?|$)/, "/postgres$1");
  const env = { ...process.env, DATABASE_URL: url };
  execFileSync("psql", [admin, "-qc", `drop database if exists "${name}" with (force)`], { stdio: "inherit" });
  execFileSync("psql", [admin, "-qc", `create database "${name}"`], { stdio: "inherit" });
  execFileSync("npx", ["drizzle-kit", "migrate"], { stdio: "inherit", env });
  execFileSync("npx", ["tsx", "scripts/seed.ts"], { stdio: "inherit", env });
}
