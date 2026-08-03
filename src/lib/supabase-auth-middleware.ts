import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Middleware de autenticación resiliente:
// en algunos entornos publicados (dominio propio) las variables de entorno del
// servidor no están disponibles, así que usamos como respaldo las variables
// públicas VITE_ que quedan incrustadas en el build. Son claves públicas, no
// secretos, por lo que es seguro.
function getSupabaseConfig() {
  const url =
    (typeof process !== "undefined" ? process.env?.SUPABASE_URL : undefined) ||
    import.meta.env.VITE_SUPABASE_URL;
  const key =
    (typeof process !== "undefined"
      ? process.env?.SUPABASE_PUBLISHABLE_KEY
      : undefined) || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return { url, key };
}

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { url, key } = getSupabaseConfig();
    if (!url || !key) {
      throw new Error("Configuración de backend no disponible.");
    }

    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: sesión no encontrada");
    }
    const token = authHeader.slice("Bearer ".length);
    if (!token) throw new Error("Unauthorized: sesión no encontrada");

    const supabase = createClient<Database>(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      throw new Error("Unauthorized: Invalid token");
    }

    return next({
      context: { supabase, userId: data.claims.sub, claims: data.claims },
    });
  },
);
