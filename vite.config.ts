import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  define: {
    "process.env.SUPABASE_URL": JSON.stringify("https://zentoxxhovjnqytrngrr.supabase.co"),
    "process.env.SUPABASE_PUBLISHABLE_KEY": JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplbnRveHhob3ZqbnF5dHJuZ3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMTU0NTksImV4cCI6MjEwNjU5MTQ1OX0.cVLFCOGmtv1Ra6V8mdZ84eLM3VvlHqneMpmtdBqgcP8"),
    "process.env.VITE_SUPABASE_URL": JSON.stringify("https://zentoxxhovjnqytrngrr.supabase.co"),
    "process.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplbnRveHhob3ZqbnF5dHJuZ3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMTU0NTksImV4cCI6MjEwNjU5MTQ1OX0.cVLFCOGmtv1Ra6V8mdZ84eLM3VvlHqneMpmtdBqgcP8"),
    // MP_ACCESS_TOKEN y VITE_MP_PUBLIC_KEY NO van aqui:
    // el define de Vite los quema en el bundle y pisa los secrets de Cloudflare.
    // Se leen en runtime desde process.env (Cloudflare vars/secrets).
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
});
