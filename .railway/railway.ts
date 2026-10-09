import { defineRailway, preserve, project, service } from "railway/iac";

// Configuración del servicio web en Railway (proyecto planner-3d). Solo administra este
// servicio; la base de datos Postgres se maneja desde Railway.
// Las variables secretas (clave de sesiones, código de invitación) viven en Railway:
// preserve() conserva su valor sin escribirlo aquí.
export const partial = "planner-3d";

export default defineRailway(() => {
  const web = service("planner-3d", {
    start: "npm run start",
    healthcheck: "/",
    healthcheckTimeout: 120,
    // Antes de arrancar: migraciones y planos de los lugares de demostración.
    preDeploy: "npm run db:migrate && npm run db:seed:prod",
    variables: {
      DATABASE_URL: preserve(),
      BETTER_AUTH_SECRET: preserve(),
      BETTER_AUTH_URL: preserve(),
      SIGNUP_CODE: preserve(),
    },
  });
  return project("planner-3d", { resources: [web] });
});
