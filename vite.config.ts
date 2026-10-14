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
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
});
