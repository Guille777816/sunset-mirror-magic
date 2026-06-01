import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listAllProducts,
  upsertProduct,
  deleteProduct,
  checkIsAdmin,
} from "@/lib/products.functions";
import { getSettings, updateSettings } from "@/lib/settings.functions";
import { Upload, Trash2, Pencil, Plus, X, ImageIcon, LayoutGrid, Settings2, Package } from "lucide-react";

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

const CATEGORY_LABELS: Record<string, string> = {
  autos: "Autos",
  camionetas: "Camionetas",
  camiones: "Camiones",
  agricolas: "Agrícolas",
  industriales: "Industriales",
};

type Tab = "productos" | "imagenes" | "ajustes";

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [tab, setTab] = useState<Tab>("productos");
  const [filterCat, setFilterCat] = useState<string>("todas");

  const checkAdmin = useServerFn(checkIsAdmin);
  const fetchAll = useServerFn(listAllProducts);
  const save = useServerFn(upsertProduct);
  const remove = useServerFn(deleteProduct);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { navigate({ to: "/login", replace: true }); return; }
      try { const r = await checkAdmin(); setIsAdmin(r.isAdmin); } catch { setIsAdmin(false); }
      setReady(true);
    });
  }, [navigate, checkAdmin]);

  const { data: products = [] } = useQuery({
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
          Tu usuario no tiene rol de administrador. Abrí el backend y agregá una fila en{" "}
          <code className="rounded bg-muted px-1">user_roles</code> con tu user_id y rol{" "}
          <code className="rounded bg-muted px-1">admin</code>.
        </p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-6 py-2 text-sm font-bold uppercase text-primary-foreground">
          Volver al inicio
        </Link>
      </div>
    );
  }

  const filteredProducts = filterCat === "todas"
    ? (products as Product[])
    : (products as Product[]).filter((p) => p.category === filterCat);

  const countByCategory = (cat: string) =>
    (products as Product[]).filter((p) => p.category === cat).length;

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b bg-background shadow-sm">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xs text-muted-foreground hover:text-primary">← Sitio</Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="text-xl font-black text-secondary">Panel Admin</h1>
          </div>
          <button
            onClick={() => setEditing({ ...empty })}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-primary)]"
          >
            <Plus className="h-4 w-4" /> Nuevo producto
          </button>
        </div>
        {/* Tabs */}
        <div className="container mx-auto flex gap-1 px-4 pb-0">
          {([ 
            { id: "productos", label: "Productos", icon: Package },
            { id: "imagenes", label: "Imágenes", icon: ImageIcon },
            { id: "ajustes", label: "Ajustes del sitio", icon: Settings2 },
          ] as { id: Tab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                tab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-secondary"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">

        {/* ── TAB: PRODUCTOS ── */}
        {tab === "productos" && (
          <div>
            {/* Stats por categoría */}
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
              {Object.entries(CATEGORY_LABELS).map(([slug, label]) => (
                <button
                  key={slug}
                  onClick={() => setFilterCat(slug === filterCat ? "todas" : slug)}
                  className={`rounded-2xl p-4 text-left transition border ${
                    filterCat === slug
                      ? "border-primary bg-primary/10"
                      : "border-transparent bg-card hover:border-primary/30"
                  }`}
                >
                  <p className="text-2xl font-black text-secondary">{countByCategory(slug)}</p>
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                </button>
              ))}
            </div>

            {/* Filtro activo */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-secondary">
                  {filterCat === "todas" ? `Todos los productos (${(products as any[]).length})` : `${CATEGORY_LABELS[filterCat]} (${filteredProducts.length})`}
                </span>
                {filterCat !== "todas" && (
                  <button onClick={() => setFilterCat("todas")} className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground hover:text-destructive">
                    × Limpiar filtro
                  </button>
                )}
              </div>
            </div>

            {/* Tabla de productos */}
            <div className="overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-product)]">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-secondary-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Imagen</th>
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
                  {filteredProducts.map((p: any) => (
                    <tr key={p.id} className="border-t hover:bg-muted/40 transition">
                      <td className="px-4 py-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.model} className="h-12 w-12 rounded-xl object-cover border" />
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-secondary">{p.brand}</div>
                        <div className="text-xs text-muted-foreground">{p.model}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{p.size}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold capitalize">
                          {CATEGORY_LABELS[p.category] ?? p.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">$ {Number(p.price_ars).toLocaleString("es-AR")}</td>
                      <td className="px-4 py-3 text-right">{p.stock}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${p.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {p.is_active ? "Activo" : "Oculto"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => saveMut.mutate({ ...p, price_ars: Number(p.price_ars), is_featured: !p.is_featured })}
                          title={p.is_featured ? "Quitar de promo" : "Marcar como promo"}
                          className={`mr-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${p.is_featured ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/20"}`}
                        >
                          ★ {p.is_featured ? "Promo" : "Promo"}
                        </button>
                        <button
                          onClick={() => setEditing({ ...p, price_ars: Number(p.price_ars) })}
                          className="mr-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                        >
                          <Pencil className="h-3 w-3" /> Editar
                        </button>
                        <button
                          onClick={() => { if (confirm("¿Eliminar este producto?")) delMut.mutate(p.id); }}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-destructive hover:underline"
                        >
                          <Trash2 className="h-3 w-3" /> Borrar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                        {filterCat === "todas" ? "No hay productos cargados aún." : `No hay productos en la categoría ${CATEGORY_LABELS[filterCat]}.`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB: IMÁGENES ── */}
        {tab === "imagenes" && (
          <ImageManager products={products as Product[]} onRefresh={() => qc.invalidateQueries({ queryKey: ["admin-products"] })} />
        )}

        {/* ── TAB: AJUSTES ── */}
        {tab === "ajustes" && <SettingsPanel />}
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

/* ─────────────────── IMAGE MANAGER ─────────────────── */
function ImageManager({ products, onRefresh }: { products: Product[]; onRefresh: () => void }) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const qc = useQueryClient();
  const save = useServerFn(upsertProduct);

  async function handleUpload(product: Product, file: File) {
    if (!product.id) return;
    setUploading(product.id);
    setMsg(null);
    try {
      const ext = file.name.split(".").pop();
      const path = `${product.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      const publicUrl = urlData.publicUrl + "?t=" + Date.now();

      await save({ data: { ...product, price_ars: Number(product.price_ars), image_url: publicUrl } });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["public-products"] });
      onRefresh();
      setMsg({ type: "ok", text: `Imagen de "${product.brand} ${product.model}" actualizada ✓` });
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Error al subir imagen" });
    } finally {
      setUploading(null);
    }
  }

  async function handleRemove(product: Product) {
    if (!product.id || !product.image_url) return;
    if (!confirm("¿Quitar la imagen de este producto?")) return;
    setUploading(product.id);
    try {
      await save({ data: { ...product, price_ars: Number(product.price_ars), image_url: null } });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["public-products"] });
      onRefresh();
      setMsg({ type: "ok", text: "Imagen eliminada ✓" });
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Error" });
    } finally {
      setUploading(null);
    }
  }

  const grouped = Object.entries(CATEGORY_LABELS).map(([slug, label]) => ({
    slug, label,
    items: products.filter((p) => p.category === slug),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-secondary">Gestión de imágenes</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Subí imágenes directamente desde tu computadora. Formatos: JPG, PNG, WebP — máx. 5 MB.
        </p>
      </div>

      {msg && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${msg.type === "ok" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-3 opacity-60 hover:opacity-100"><X className="inline h-3 w-3" /></button>
        </div>
      )}

      <div className="space-y-8">
        {grouped.map(({ slug, label, items }) => (
          <div key={slug}>
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-secondary">
              <span className="rounded-full bg-primary/15 px-3 py-0.5 text-xs font-bold uppercase text-primary">{label}</span>
              <span className="text-sm text-muted-foreground font-normal">{items.length} producto(s)</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
              {items.map((p) => (
                <div key={p.id} className="rounded-2xl bg-card p-3 shadow-[var(--shadow-product)]">
                  {/* Preview */}
                  <div className="relative mb-2 aspect-square overflow-hidden rounded-xl bg-muted">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.model} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                        <ImageIcon className="h-8 w-8 opacity-40" />
                        <span className="text-[10px]">Sin imagen</span>
                      </div>
                    )}
                    {uploading === p.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </div>
                    )}
                    {p.image_url && uploading !== p.id && (
                      <button
                        onClick={() => handleRemove(p)}
                        className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-white shadow"
                        title="Quitar imagen"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-primary uppercase tracking-wider truncate">{p.brand}</p>
                  <p className="text-xs font-semibold text-secondary truncate">{p.model}</p>
                  <p className="mb-2 text-[10px] text-muted-foreground font-mono">{p.size}</p>
                  {/* Upload button */}
                  <input
                    ref={(el) => { fileRefs.current[p.id!] = el; }}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(p, file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    disabled={uploading === p.id}
                    onClick={() => fileRefs.current[p.id!]?.click()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-primary/40 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50"
                  >
                    <Upload className="h-3 w-3" />
                    {p.image_url ? "Cambiar" : "Subir imagen"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <div className="rounded-2xl bg-card p-10 text-center text-muted-foreground">
            No hay productos cargados todavía. Creá productos primero desde la pestaña "Productos".
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── PRODUCT FORM ─────────────────── */
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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-secondary">{p.id ? "Editar" : "Nuevo"} producto</h2>
          <button onClick={onCancel} className="rounded-full p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Marca"><input className={input} value={p.brand} onChange={(e) => set("brand", e.target.value)} /></Field>
          <Field label="Modelo"><input className={input} value={p.model} onChange={(e) => set("model", e.target.value)} /></Field>
          <Field label="Medida"><input className={input} placeholder="ej: 185/65R15" value={p.size} onChange={(e) => set("size", e.target.value)} /></Field>
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
          <Field label="Descripción" col2>
            <textarea className={input + " min-h-[70px] rounded-2xl py-2"} value={p.description ?? ""} onChange={(e) => set("description", e.target.value || null)} />
          </Field>
          <Field label="URL de imagen (pegá un enlace https://...)" col2>
            <input
              className={input}
              placeholder="https://ejemplo.com/foto.jpg"
              value={p.image_url ?? ""}
              onChange={(e) => set("image_url", e.target.value || null)}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={p.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Activo (visible en el sitio)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={p.is_featured} onChange={(e) => set("is_featured", e.target.checked)} /> ★ Destacado (Promo)
          </label>
        </div>
        {p.id && (
          <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
            💡 También podés subir la foto desde tu computadora en la pestaña <strong>Imágenes</strong>.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-destructive">{String(error?.message ?? error)}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-full border px-5 py-2 text-sm font-semibold">Cancelar</button>
          <button disabled={saving} onClick={() => onSave(p)} className="rounded-full bg-primary px-6 py-2 text-sm font-bold uppercase text-primary-foreground disabled:opacity-60">
            {saving ? "Guardando..." : "Guardar"}
          </button>
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

/* ─────────────────── SETTINGS PANEL ─────────────────── */
type Settings = {
  phone: string; whatsapp: string; email: string; address: string;
  business_name: string; cuit: string; instagram: string; facebook: string; hours: string;
  hero_eyebrow: string; hero_title: string; hero_subtitle: string; hero_description: string;
  promo_banner: string;
  logo_url: string; hero_image_url: string;
};

function SettingsPanel() {
  const qc = useQueryClient();
  const fetchS = useServerFn(getSettings);
  const saveS = useServerFn(updateSettings);
  const { data } = useQuery({ queryKey: ["settings"], queryFn: () => fetchS() });
  const [s, setS] = useState<Settings | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState<"logo" | "hero" | null>(null);

  useEffect(() => {
    if (data && !s) setS({
      phone: data.phone, whatsapp: data.whatsapp, email: data.email, address: data.address,
      business_name: (data as any).business_name ?? "",
      cuit: (data as any).cuit ?? "",
      instagram: (data as any).instagram ?? "",
      facebook: (data as any).facebook ?? "",
      hours: (data as any).hours ?? "",
      hero_eyebrow: data.hero_eyebrow, hero_title: data.hero_title, hero_subtitle: data.hero_subtitle,
      hero_description: data.hero_description, promo_banner: data.promo_banner,
      logo_url: (data as any).logo_url ?? "",
      hero_image_url: (data as any).hero_image_url ?? "",
    });
  }, [data, s]);

  const mut = useMutation({
    mutationFn: (v: Settings) => saveS({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setMsg("Guardado ✓");
      setTimeout(() => setMsg(null), 2500);
    },
  });

  async function handleAssetUpload(kind: "logo" | "hero", file: File) {
    if (!s) return;
    setUploadingAsset(kind);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
      const url = urlData.publicUrl + "?t=" + Date.now();
      const next = { ...s, [kind === "logo" ? "logo_url" : "hero_image_url"]: url };
      setS(next);
      await saveS({ data: next });
      qc.invalidateQueries({ queryKey: ["settings"] });
      setMsg(`${kind === "logo" ? "Logo" : "Portada"} actualizado ✓`);
      setTimeout(() => setMsg(null), 2500);
    } catch (e: any) {
      setMsg("Error: " + (e?.message ?? "no se pudo subir"));
    } finally {
      setUploadingAsset(null);
    }
  }

  if (!s) return null;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });

  return (
    <div className="space-y-6">
      {/* Identidad visual: logo + portada */}
      <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-product)]">
        <h3 className="mb-4 text-base font-bold text-secondary">Identidad visual</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <AssetUploader
            title="Logo de la empresa"
            hint="PNG con fondo transparente recomendado. Se muestra en el encabezado del sitio."
            currentUrl={s.logo_url}
            uploading={uploadingAsset === "logo"}
            onFile={(f) => handleAssetUpload("logo", f)}
            onUrlChange={(v) => set("logo_url", v)}
            previewClass="h-20 object-contain bg-muted"
          />
          <AssetUploader
            title="Foto de portada (Hero)"
            hint="Imagen grande del banner principal. Recomendado: 1600×700px."
            currentUrl={s.hero_image_url}
            uploading={uploadingAsset === "hero"}
            onFile={(f) => handleAssetUpload("hero", f)}
            onUrlChange={(v) => set("hero_image_url", v)}
            previewClass="h-32 object-cover"
          />
        </div>
      </div>

      {/* Datos de la empresa */}
      <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-product)]">
        <h3 className="mb-4 text-base font-bold text-secondary">Datos de la empresa</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Razón social / Nombre comercial"><input className={input} value={s.business_name} onChange={(e) => set("business_name", e.target.value)} /></Field>
          <Field label="CUIT"><input className={input} placeholder="30-12345678-9" value={s.cuit} onChange={(e) => set("cuit", e.target.value)} /></Field>
          <Field label="Instagram (URL o @usuario)"><input className={input} value={s.instagram} onChange={(e) => set("instagram", e.target.value)} /></Field>
          <Field label="Facebook (URL)"><input className={input} value={s.facebook} onChange={(e) => set("facebook", e.target.value)} /></Field>
          <Field label="Horario de atención" col2><input className={input} value={s.hours} onChange={(e) => set("hours", e.target.value)} /></Field>
        </div>
      </div>

      {/* Contacto */}
      <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-product)]">
        <h3 className="mb-4 text-base font-bold text-secondary">Contacto y dirección</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Teléfono visible"><input className={input} value={s.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="WhatsApp (solo números, ej: 5493764000000)"><input className={input} value={s.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
          <Field label="Email"><input className={input} value={s.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Dirección"><input className={input} value={s.address} onChange={(e) => set("address", e.target.value)} /></Field>
        </div>
      </div>

      {/* Hero */}
      <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-product)]">
        <h3 className="mb-4 text-base font-bold text-secondary">Textos del Hero (banner principal)</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Texto chico (eyebrow)" col2><input className={input} value={s.hero_eyebrow} onChange={(e) => set("hero_eyebrow", e.target.value)} /></Field>
          <Field label="Título"><input className={input} value={s.hero_title} onChange={(e) => set("hero_title", e.target.value)} /></Field>
          <Field label="Subtítulo"><input className={input} value={s.hero_subtitle} onChange={(e) => set("hero_subtitle", e.target.value)} /></Field>
          <Field label="Descripción" col2>
            <textarea className={input + " min-h-[70px] rounded-2xl py-2"} value={s.hero_description} onChange={(e) => set("hero_description", e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Banner */}
      <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-product)]">
        <h3 className="mb-4 text-base font-bold text-secondary">Banner promocional</h3>
        <Field label="Texto del banner (franja naranja)" col2>
          <input className={input} value={s.promo_banner} onChange={(e) => set("promo_banner", e.target.value)} />
        </Field>
      </div>

      {mut.error && <p className="text-sm text-destructive">{String((mut.error as any)?.message ?? mut.error)}</p>}
      <div className="flex items-center justify-end gap-3">
        {msg && <span className="text-sm font-semibold text-primary">{msg}</span>}
        <button
          onClick={() => mut.mutate(s)}
          disabled={mut.isPending}
          className="rounded-full bg-primary px-6 py-2 text-sm font-bold uppercase text-primary-foreground disabled:opacity-60"
        >
          {mut.isPending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

function AssetUploader({
  title, hint, currentUrl, uploading, onFile, onUrlChange, previewClass,
}: {
  title: string; hint: string; currentUrl: string; uploading: boolean;
  onFile: (f: File) => void; onUrlChange: (v: string) => void; previewClass: string;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="text-sm font-bold text-secondary">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      <div className="my-3 flex items-center justify-center overflow-hidden rounded-lg bg-muted">
        {currentUrl ? (
          <img src={currentUrl} alt={title} className={`max-w-full ${previewClass}`} />
        ) : (
          <div className="grid h-20 w-full place-items-center text-xs text-muted-foreground">Sin imagen</div>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <div className="flex gap-2">
        <button
          disabled={uploading}
          onClick={() => ref.current?.click()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary py-2 text-xs font-bold uppercase text-primary-foreground disabled:opacity-60"
        >
          <Upload className="h-3 w-3" /> {uploading ? "Subiendo..." : "Subir imagen"}
        </button>
      </div>
      <input
        className={input + " mt-2 text-xs"}
        placeholder="o pegá URL https://..."
        value={currentUrl}
        onChange={(e) => onUrlChange(e.target.value)}
      />
    </div>
  );
}
