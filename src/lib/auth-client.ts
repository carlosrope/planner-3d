import { createAuthClient } from "better-auth/react";

// Sin baseURL: usa el origen actual, así funciona igual en localhost y desde el iPhone.
export const authClient = createAuthClient();
