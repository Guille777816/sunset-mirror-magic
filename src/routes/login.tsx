import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — Le Radial" },
      { name: "description", content: "Accedé a tu cuenta de Le Radial." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/", replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setError("Te enviamos un email para verificar tu cuenta.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) setError(String(result.error?.message ?? result.error));
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="container mx-auto flex max-w-md flex-col px-4 py-12">
        <Link to="/" className="mb-6 text-sm font-semibold text-muted-foreground hover:text-primary">← Volver</Link>
        <div className="rounded-2xl bg-card p-8 shadow-[var(--shadow-product)]">
          <div className="mb-6 flex items-baseline gap-1">
            <span className="text-2xl font-black tracking-tighter text-primary">LE</span>
            <span className="text-2xl font-black tracking-tighter text-secondary">RADIAL</span>
          </div>
          <h1 className="text-2xl font-bold text-secondary">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Accedé para comprar y ver tus pedidos." : "Registrate para gestionar tus compras."}
          </p>

          <button
            onClick={handleGoogle}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border bg-background py-3 text-sm font-semibold hover:bg-muted"
          >
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-16c.4-1.1.4-2.3 0-3.5"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.2-8l-6.5 5A20 20 0 0 0 24 44"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.3-.4-3.5"/></svg>
            Continuar con Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> o <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="h-11 w-full rounded-full border border-input bg-background px-5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña (mín. 6)"
              className="h-11 w-full rounded-full border border-input bg-background px-5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="h-11 w-full rounded-full bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-primary)] transition hover:scale-[1.02] disabled:opacity-60"
            >
              {loading ? "..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
            </button>
          </form>

          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
            className="mt-5 w-full text-center text-sm text-muted-foreground hover:text-primary"
          >
            {mode === "login" ? "¿No tenés cuenta? Registrate" : "¿Ya tenés cuenta? Ingresá"}
          </button>
        </div>
      </div>
    </div>
  );
}
