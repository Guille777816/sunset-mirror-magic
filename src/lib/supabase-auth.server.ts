// Middleware de autenticación resiliente: usa las variables de servidor y,
// si no están disponibles en el entorno de despliegue, cae en las variables
// VITE_* que Vite reemplaza en tiempo de build.
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function resolveConfig() {
  const url =
    process.env['SUPABASE_URL'] ||
    import.meta.env.VITE_SUPABASE_URL;
  const key =
    process.env['SUPABASE_PUBLISHABLE_KEY'] ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Configuración de backend no disponible.");
  }
  return { url: url as string, key: key as string };
}

export const requireAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { url, key } = resolveConfig();
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: falta el token de sesión");
    }
    const token = authHeader.slice("Bearer ".length);
    if (!token) throw new Error("Unauthorized: token vacío");

    const supabase = createClient<Database>(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      throw new Error("Unauthorized: sesión inválida");
    }

    return next({
      context: { supabase, userId: data.claims.sub as string, claims: data.claims },
    });
  },
);

export function createPublicServerClient() {
  const { url, key } = resolveConfig();
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}
