import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listAllProducts,
  upsertProduct,
  deleteProduct,
  checkIsAdmin,
} from "@/lib/products.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — Le Radial" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

type Product = {
  id?: string;
  brand: string;
  model: string;
  size: string;
  category: "autos" | "camionetas" | "camiones" | "agricolas" | "industriales";
  price_ars: number;
  stock: number;
  image_url: string | null;
  description: string | null;
  is_active: boolean;
  is_featured: boolean;
};

const empty: Product = {
  brand: "", model: "", size: "", category: "autos",
  price_ars: 0, stock: 0, image_url: null, description: null,
  is_active: true, is_featured: false,
};

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const checkAdmin = useServerFn(checkIsAdmin);
  const fetchAll = useServerFn(listAllProducts);
  const save = useServerFn(upsertProduct);
  const remove = useServerFn(deleteProduct);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate({ to: "/login", replace: true });
        return;
      }
      try {
        const r = await checkAdmin();
        setIsAdmin(r.isAdmin);
      } catch {
        setIsAdmin(false);
      }
      setReady(true);
    });
  }, [navigate, checkAdmin]);

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => fetchAll(),
    enabled: ready && isAdmin,
  });

  const saveMut = useMutation({
    mutationFn: (p: Product) => save({ data: p }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["public-products"] });
      setEditing(null);
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["public-products"] });
    },
  });

  if (!ready) return <div className="p-10 text-center text-muted-foreground">Cargando...</div>;

  if (!isAdmin) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-secondary">Acceso restringido</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Tu usuario no tiene rol de administrador. Para asignártelo, abrí el backend y agregá una fila en <code className="rounded bg-muted px-1">user_roles</code> con tu user_id y rol <code className="rounded bg-muted px-1">admin</code>.
        </p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-6 py-2 text-sm font-bold uppercase text-primary-foreground">Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="container mx-auto px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link to="/" className="text-xs text-muted-foreground hover:text-primary">← Sitio</Link>
            <h1 className="mt-1 text-3xl font-black text-secondary">Panel de productos</h1>
          </div>
          <button
            onClick={() => setEditing({ ...empty })}
            className="rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-primary)]"
          >+ Nuevo producto</button>
        </div>

        <div className="overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-product)]">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Marca / Modelo</th>
                <th className="px-4 py-3 text-left">Medida</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-right">Precio</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {products?.map((p: any) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-bold text-secondary">{p.brand}</div>
                    <div className="text-xs text-muted-foreground">{p.model}</div>
                  </td>
                  <td className="px-4 py-3">{p.size}</td>
                  <td className="px-4 py-3 capitalize">{p.category}</td>
                  <td className="px-4 py-3 text-right font-semibold">$ {Number(p.price_ars).toLocaleString("es-AR")}</td>
                  <td className="px-4 py-3 text-right">{p.stock}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${p.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {p.is_active ? "Activo" : "Oculto"}
                    </span>
                    {p.is_featured && <span className="ml-1 rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-secondary">★</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditing({ ...p, price_ars: Number(p.price_ars) })} className="mr-2 text-sm font-semibold text-primary hover:underline">Editar</button>
                    <button onClick={() => { if (confirm("¿Eliminar?")) delMut.mutate(p.id); }} className="text-sm font-semibold text-destructive hover:underline">Borrar</button>
                  </td>
                </tr>
              ))}
              {products?.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Sin productos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <ProductForm
          value={editing}
          onCancel={() => setEditing(null)}
          onSave={(p) => saveMut.mutate(p)}
          saving={saveMut.isPending}
          error={saveMut.error as any}
        />
      )}
    </div>
  );
}

function ProductForm({
  value, onCancel, onSave, saving, error,
}: {
  value: Product;
  onCancel: () => void;
  onSave: (p: Product) => void;
  saving: boolean;
  error: any;
}) {
  const [p, setP] = useState<Product>(value);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP({ ...p, [k]: v });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-secondary">{p.id ? "Editar" : "Nuevo"} producto</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Marca"><input className={input} value={p.brand} onChange={(e) => set("brand", e.target.value)} /></Field>
          <Field label="Modelo"><input className={input} value={p.model} onChange={(e) => set("model", e.target.value)} /></Field>
          <Field label="Medida"><input className={input} value={p.size} onChange={(e) => set("size", e.target.value)} /></Field>
          <Field label="Categoría">
            <select className={input} value={p.category} onChange={(e) => set("category", e.target.value as Product["category"])}>
              <option value="autos">Autos</option>
              <option value="camionetas">Camionetas</option>
              <option value="camiones">Camiones</option>
              <option value="agricolas">Agrícolas</option>
              <option value="industriales">Industriales</option>
            </select>
          </Field>
          <Field label="Precio ARS"><input type="number" min={0} className={input} value={p.price_ars} onChange={(e) => set("price_ars", Number(e.target.value))} /></Field>
          <Field label="Stock"><input type="number" min={0} className={input} value={p.stock} onChange={(e) => set("stock", Number(e.target.value))} /></Field>
          <Field label="URL imagen" col2><input className={input} placeholder="https://..." value={p.image_url ?? ""} onChange={(e) => set("image_url", e.target.value || null)} /></Field>
          <Field label="Descripción" col2><textarea className={input + " min-h-[70px] rounded-2xl py-2"} value={p.description ?? ""} onChange={(e) => set("description", e.target.value || null)} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Activo</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.is_featured} onChange={(e) => set("is_featured", e.target.checked)} /> Destacado</label>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{String(error?.message ?? error)}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-full border px-5 py-2 text-sm font-semibold">Cancelar</button>
          <button disabled={saving} onClick={() => onSave(p)} className="rounded-full bg-primary px-6 py-2 text-sm font-bold uppercase text-primary-foreground disabled:opacity-60">{saving ? "..." : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}

const input = "h-10 w-full rounded-full border border-input bg-background px-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

function Field({ label, col2, children }: { label: string; col2?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${col2 ? "col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-secondary">{label}</span>
      {children}
    </label>
  );
}
