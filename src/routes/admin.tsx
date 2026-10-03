import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listAllProducts,
  upsertProduct,
  deleteProduct,
  
} from "@/lib/products.functions";
import { getSettings, getAdminSettings, updateSettings } from "@/lib/settings.functions";
import { listOrders, updateOrderStatus, deleteOrder } from "@/lib/orders.functions";
import { listAllBanners, upsertBanner, deleteBanner } from "@/lib/banners.functions";
import { listAllTestimonials, setTestimonialApproved, deleteTestimonial } from "@/lib/testimonials.functions";
import { Upload, Trash2, Pencil, Plus, X, ImageIcon, LayoutGrid, Settings2, Package, ClipboardList, Image as ImageLucide, MessageSquare, Star, Check, Tag, RotateCcw } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

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
  category?: string;
  categories: ("autos" | "camionetas" | "suv" | "camiones" | "agricolas" | "industriales")[];
  price_ars: number;
  stock: number;
  image_url: string | null;
  description: string | null;
  is_active: boolean;
  is_featured: boolean;
  free_shipping: boolean;
};

const empty: Product = {
  brand: "", model: "", size: "", categories: ["autos"],
  price_ars: 0, stock: 0, image_url: null, description: null,
  is_active: true, is_featured: false, free_shipping: false,
};

function catsOf(p: { categories?: string[] | null; category?: string | null }): any[] {
  const list = Array.isArray(p?.categories) ? p.categories.filter(Boolean) : [];
  return list.length ? list : (p?.category ? [p.category] : []);
}

const CATEGORY_LABELS: Record<string, string> = {
  autos: "Autos",
  camionetas: "Camionetas",
  suv: "SUV",
  camiones: "Camiones",
  agricolas: "Agrícolas",
  industriales: "Industriales",
};

type Tab = "productos" | "marcas" | "pedidos" | "banners" | "testimonios" | "imagenes" | "ajustes";

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [tab, setTab] = useState<Tab>("productos");
  const [filterCat, setFilterCat] = useState<string>("todas");

  const fetchAll = useServerFn(listAllProducts);
  const save = useServerFn(upsertProduct);
  const remove = useServerFn(deleteProduct);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (!session) { navigate({ to: "/login", replace: true }); return; }
      const { data: role, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) {
        setAuthError(error.message);
        setIsAdmin(false);
      } else {
        setIsAdmin(!!role);
      }
      setReady(true);
    });
  }, [navigate]);

  const { data: products = [], isLoading: productsLoading, error: productsError } = useQuery({
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
        {authError && (
          <p className="mt-3 text-xs text-destructive">Detalle: {authError}</p>
        )}
        <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-6 py-2 text-sm font-bold uppercase text-primary-foreground">
          Volver al inicio
        </Link>
      </div>
    );
  }


  const filteredProducts = filterCat === "todas"
    ? (products as Product[])
    : (products as Product[]).filter((p) => catsOf(p).includes(filterCat));

  const countByCategory = (cat: string) =>
    (products as Product[]).filter((p) => catsOf(p).includes(cat)).length;

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b bg-background shadow-sm">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xs text-muted-foreground hover:text-primary">← Sitio</Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="text-xl font-black text-secondary">Panel Admin</h1>
            <span className="text-muted-foreground">·</span>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/login", replace: true });
              }}
              className="text-xs text-muted-foreground hover:text-destructive transition"
            >
              Cerrar sesión
            </button>
          </div>
          <button
            onClick={() => setEditing({ ...empty })}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-primary)]"
          >
            <Plus className="h-4 w-4" /> Nuevo producto
          </button>
        </div>
        {/* Tabs */}
        <div className="container mx-auto flex gap-1 px-4 pb-0 overflow-x-auto">
          {([ 
            { id: "productos", label: "Productos", icon: Package },
            { id: "marcas", label: "Marcas y Logos", icon: Tag },
            { id: "pedidos", label: "Pedidos", icon: ClipboardList },
            { id: "banners", label: "Banners", icon: ImageLucide },
            { id: "testimonios", label: "Testimonios", icon: MessageSquare },
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
                        <div className="flex items-center gap-2 mb-1">
                          <BrandLogo brand={p.brand} className="h-4 max-w-[70px]" />
                          <span className="font-bold text-secondary text-sm">{p.brand}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{p.model}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{p.size}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold capitalize">
                          {catsOf(p).map((c) => CATEGORY_LABELS[c] ?? c).join(", ")}
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
                        {productsLoading
                          ? "Cargando productos..."
                          : productsError
                            ? `No se pudieron cargar los productos: ${productsError instanceof Error ? productsError.message : "error desconocido"}`
                            : (filterCat === "todas" ? "No hay productos cargados aún." : `No hay productos en la categoría ${CATEGORY_LABELS[filterCat]}.`)}
                      </td>
                    </tr>

                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB: MARCAS Y LOGOS ── */}
        {tab === "marcas" && <BrandLogosPanel />}

        {/* ── TAB: PEDIDOS ── */}
        {tab === "pedidos" && <OrdersPanel />}

        {/* ── TAB: BANNERS ── */}
        {tab === "banners" && <BannersPanel />}

        {/* ── TAB: TESTIMONIOS ── */}
        {tab === "testimonios" && <TestimonialsAdminPanel />}

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
    items: products.filter((p) => catsOf(p).includes(slug)),
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
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP({ ...p, [k]: v });

  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${p.id ?? "tmp-" + Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      set("image_url", urlData.publicUrl + "?t=" + Date.now());
    } catch (e: any) {
      alert(e?.message ?? "Error al subir imagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-secondary">{p.id ? "Editar" : "Nuevo"} producto</h2>
          <button onClick={onCancel} className="rounded-full p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Marca" col2>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  list="known-brands-list"
                  className={input + " flex-1"}
                  value={p.brand}
                  onChange={(e) => set("brand", e.target.value)}
                  placeholder="Escribí cualquier marca (ej: Hankook, Continental, Bridgestone, XBRI...)"
                />
                <datalist id="known-brands-list">
                  {[
                    "Hankook", "Continental", "Bridgestone", "Michelin", "Pirelli", "Goodyear",
                    "Dunlop", "Yokohama", "Firestone", "Kumho", "Maxxis", "Toyo", "Cooper",
                    "Nexen", "Falken", "BFGoodrich", "XBRI", "Linglong", "Firemax", "Sunset Tires",
                    "Fate", "Kelly", "General Tire", "GT Radial", "Federal"
                  ].map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
                <div className="flex h-10 min-w-[90px] items-center justify-center rounded-xl border bg-neutral-50 px-2">
                  <BrandLogo brand={p.brand} className="h-4 max-w-[80px]" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                💡 Podés ingresar libremente cualquiera de tus más de 100 marcas. Al escribirla, el sistema la asocia con su logo correspondiente.
              </p>
            </div>
          </Field>
          <Field label="Modelo"><input className={input} value={p.model} onChange={(e) => set("model", e.target.value)} /></Field>
          <Field label="Medida"><input className={input} placeholder="ej: 185/65R15" value={p.size} onChange={(e) => set("size", e.target.value)} /></Field>
          <Field label="Categorías (podés elegir varias)" col2>
            <div className="flex flex-wrap gap-3 rounded-2xl border px-3 py-2">
              {(Object.keys(CATEGORY_LABELS) as Product["categories"]).map((c) => {
                const checked = catsOf(p).includes(c);
                return (
                  <label key={c} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={checked}
                      onChange={(e) => {
                        const current = catsOf(p);
                        const next = e.target.checked
                          ? [...current, c]
                          : current.filter((x) => x !== c);
                        set("categories", next as Product["categories"]);
                      }}
                    />
                    {CATEGORY_LABELS[c]}
                  </label>
                );
              })}
            </div>
          </Field>
          <Field label="Precio ARS"><input type="number" min={0} className={input} value={p.price_ars} onChange={(e) => set("price_ars", Number(e.target.value))} /></Field>
          <Field label="Stock"><input type="number" min={0} className={input} value={p.stock} onChange={(e) => set("stock", Number(e.target.value))} /></Field>
          <Field label="Descripción" col2>
            <textarea className={input + " min-h-[70px] rounded-2xl py-2"} value={p.description ?? ""} onChange={(e) => set("description", e.target.value || null)} />
          </Field>
                  <Field label="Imagen del producto" col2>
            {p.image_url && (
              <div className="mb-2 h-24 w-24 overflow-hidden rounded-xl bg-muted">
                <img src={p.image_url} alt="preview" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase text-primary-foreground hover:opacity-90">
                <Upload className="h-4 w-4" />
                {uploading ? "Subiendo..." : "Subir desde tu computadora"}
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }}
                />
              </label>
              <span className="text-xs text-muted-foreground">o pegá URL:</span>
            </div>
            <input
              className={input + " mt-2"}
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
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={p.free_shipping} onChange={(e) => set("free_shipping", e.target.checked)} /> 🚚 Envío gratis (muestra distintivo sobre la foto)
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
  category_images: Record<string, string>;
  bank_name: string; bank_holder: string; bank_cbu: string; bank_alias: string; bank_extra: string;
  rate_usd: number; rate_brl: number; rate_pyg: number;
};

function SettingsPanel() {
  const qc = useQueryClient();
  const fetchS = useServerFn(getAdminSettings);
  const saveS = useServerFn(updateSettings);
  const { data } = useQuery({ queryKey: ["admin-settings"], queryFn: () => fetchS() });
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
      hours: (data as any).hours ?? (data as any).business_hours ?? "",
      hero_eyebrow: data.hero_eyebrow, hero_title: data.hero_title, hero_subtitle: data.hero_subtitle,
      hero_description: data.hero_description, promo_banner: data.promo_banner,
      logo_url: (data as any).logo_url ?? "",
      hero_image_url: (data as any).hero_image_url ?? "",
      category_images: (data as any).category_images ?? {},
      bank_name: (data as any).bank_name ?? "",
      bank_holder: (data as any).bank_holder ?? "",
      bank_cbu: (data as any).bank_cbu ?? "",
      bank_alias: (data as any).bank_alias ?? "",
      bank_extra: (data as any).bank_extra ?? "",
      rate_usd: Number((data as any).rate_usd ?? 1450),
      rate_brl: Number((data as any).rate_brl ?? 279),
      rate_pyg: Number((data as any).rate_pyg ?? 5.5),
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
      const isRls = (e?.message || "").includes("row-level security");
      if (isRls) {
        setMsg("Aviso: El almacenamiento de Supabase no tiene el bucket 'site-assets'. Se recomienda usar el logo oficial (/images/logo-leradial.png) o una URL directa.");
      } else {
        setMsg("Error: " + (e?.message ?? "no se pudo subir"));
      }
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

      {/* Logos oficiales de marcas */}
      <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-product)]">
        <div className="mb-4">
          <h3 className="text-base font-bold text-secondary">Logotipos de marcas oficiales</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Cada producto asocia de forma automática su logo oficial en la tienda según el nombre que tenga en el campo <strong>Marca</strong> (ej: XBRI, Firemax, Linglong, Pirelli). No necesitás subir un logo por cada neumático: se asigna solo.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { name: "XBRI", label: "XBRI Tires" },
            { name: "Firemax", label: "Firemax" },
            { name: "Linglong", label: "Linglong" },
            { name: "Sunset Tires", label: "Sunset Tires" },
            { name: "Pirelli", label: "Pirelli" },
            { name: "Michelin", label: "Michelin" },
            { name: "Goodyear", label: "Goodyear" },
          ].map((b) => (
            <div key={b.name} className="flex flex-col items-center justify-center p-3 rounded-xl border bg-neutral-50/50 hover:bg-neutral-100/50 transition">
              <div className="h-8 flex items-center justify-center mb-2">
                <BrandLogo brand={b.name} className="h-5 max-w-[80px]" />
              </div>
              <span className="text-[11px] font-bold text-secondary">{b.name}</span>
              <span className="text-[9px] text-emerald-600 font-semibold mt-0.5">✓ Vinculado</span>
            </div>
          ))}
        </div>
      </div>

      {/* Imágenes de categorías (portada) */}
      <CategoryImagesPanel
        value={s.category_images}
        onChange={(next) => set("category_images", next)}
      />



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

      {/* Datos bancarios para transferencia */}
      <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-product)]">
        <h3 className="mb-1 text-base font-bold text-secondary">Datos bancarios (transferencia)</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Se muestran al cliente apenas confirma el pedido para que pague directo. Dejá vacío lo que no uses.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Banco"><input className={input} placeholder="Ej: Banco Macro" value={s.bank_name} onChange={(e) => set("bank_name", e.target.value)} /></Field>
          <Field label="Titular de la cuenta"><input className={input} placeholder="Nombre y apellido / Razón social" value={s.bank_holder} onChange={(e) => set("bank_holder", e.target.value)} /></Field>
          <Field label="CBU / CVU"><input className={input} placeholder="22 dígitos" value={s.bank_cbu} onChange={(e) => set("bank_cbu", e.target.value)} /></Field>
          <Field label="Alias"><input className={input} placeholder="mi.alias.mp" value={s.bank_alias} onChange={(e) => set("bank_alias", e.target.value)} /></Field>
          <Field label="Notas extra (CUIT, instrucciones)" col2>
            <textarea className={input + " min-h-[70px] rounded-2xl py-2"} placeholder="Ej: enviar comprobante por WhatsApp al 376..." value={s.bank_extra} onChange={(e) => set("bank_extra", e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Cotizaciones de monedas */}
      <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-product)]">
        <h3 className="mb-1 text-base font-bold text-secondary">Cotizaciones (cambiador de moneda)</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Actualizá estos valores cuando cambien las cotizaciones. Se usan para convertir los precios cuando el cliente elige USD, Real o Guaraní.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="1 USD = X ARS"><input type="number" step="0.01" className={input} value={s.rate_usd} onChange={(e) => set("rate_usd", Number(e.target.value))} /></Field>
          <Field label="1 BRL (Real) = X ARS"><input type="number" step="0.01" className={input} value={s.rate_brl} onChange={(e) => set("rate_brl", Number(e.target.value))} /></Field>
          <Field label="1 ARS = X PYG (Guaraníes)"><input type="number" step="0.01" className={input} value={s.rate_pyg} onChange={(e) => set("rate_pyg", Number(e.target.value))} /></Field>
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
      {title.toLowerCase().includes("logo") && (
        <button
          type="button"
          onClick={() => onUrlChange("/images/logo-leradial.png")}
          className="mt-2 w-full rounded-xl border border-primary/30 bg-primary/5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition"
        >
          ✓ Usar Logo Oficial Le Radial (/images/logo-leradial.png)
        </button>
      )}
      <input
        className={input + " mt-2 text-xs"}
        placeholder="o pegá URL https://..."
        value={currentUrl}
        onChange={(e) => onUrlChange(e.target.value)}
      />
    </div>
  );
}

/* ─────────────────── CATEGORY IMAGES ─────────────────── */
function CategoryImagesPanel({
  value,
  onChange,
}: {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const cats = [
    { slug: "autos", label: "Autos" },
    { slug: "camionetas", label: "Camionetas" },
    { slug: "suv", label: "SUV" },
    { slug: "camiones", label: "Camiones" },
    { slug: "agricolas", label: "Agrícolas" },
    { slug: "industriales", label: "Industriales" },
  ];

  async function upload(slug: string, file: File) {
    setUploading(slug);
    setMsg(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `category-${slug}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("site-assets")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
      const url = urlData.publicUrl + "?t=" + Date.now();
      onChange({ ...value, [slug]: url });
      setMsg(`Imagen de ${slug} actualizada — recordá Guardar cambios ↓`);
    } catch (e: any) {
      setMsg("Error: " + (e?.message ?? "no se pudo subir"));
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-product)]">
      <h3 className="mb-1 text-base font-bold text-secondary">Imágenes de categorías (portada)</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Cambiá la foto que aparece en cada tarjeta de categoría en la página de inicio.
      </p>
      {msg && (
        <div className="mb-4 rounded-xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">{msg}</div>
      )}
      <div className="grid gap-4 md:grid-cols-4">
        {cats.map((c) => (
          <CategoryImageCard
            key={c.slug}
            label={c.label}
            url={value[c.slug] || ""}
            uploading={uploading === c.slug}
            onFile={(f) => upload(c.slug, f)}
            onClear={() => {
              const next = { ...value };
              delete next[c.slug];
              onChange(next);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryImageCard({
  label, url, uploading, onFile, onClear,
}: {
  label: string; url: string; uploading: boolean;
  onFile: (f: File) => void; onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  return (
    <div className="rounded-xl border bg-background p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-secondary">{label}</p>
      <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-muted">
        {url ? (
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-[10px] text-muted-foreground">
            Imagen por defecto
          </div>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <div className="flex gap-1">
        <button
          disabled={uploading}
          onClick={() => ref.current?.click()}
          className="flex flex-1 items-center justify-center gap-1 rounded-full bg-primary py-1.5 text-[11px] font-bold uppercase text-primary-foreground disabled:opacity-60"
        >
          <Upload className="h-3 w-3" /> {uploading ? "..." : url ? "Cambiar" : "Subir"}
        </button>
        {url && (
          <button
            onClick={onClear}
            className="rounded-full border px-2 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-destructive"
            title="Usar imagen por defecto"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── BRAND LOGOS PANEL ─────────────────── */
function BrandLogosPanel() {
  const qc = useQueryClient();
  const fetchS = useServerFn(getAdminSettings);
  const saveS = useServerFn(updateSettings);
  const fetchP = useServerFn(listAllProducts);

  const { data: settingsData } = useQuery({ queryKey: ["admin-settings"], queryFn: () => fetchS() });
  const { data: productsData } = useQuery({ queryKey: ["admin-products"], queryFn: () => fetchP() });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [newBrandName, setNewBrandName] = useState("");
  const [editingUrlBrand, setEditingUrlBrand] = useState<string | null>(null);
  const [tempUrl, setTempUrl] = useState("");

  const products = (productsData ?? []) as any[];
  const settings = settingsData as any;
  const categoryImages: Record<string, string> = settings?.category_images ?? {};

  // Extract all unique brands from products in DB + default list + custom added
  const dbBrands = Array.from(new Set(products.map((p) => (p.brand || "").trim()).filter(Boolean)));
  const defaultBrands = [
    "XBRI", "Linglong", "Sunset Tires", "Firemax", "Pirelli", "Michelin", "Goodyear",
    "Hankook", "Continental", "Bridgestone", "Dunlop", "Yokohama", "Firestone", "Kumho",
    "Maxxis", "Toyo", "Cooper", "Nexen", "Falken", "BFGoodrich", "Fate"
  ];
  
  // Custom brands stored in category_images with key `brand:...`
  const customBrandKeys = Object.keys(categoryImages)
    .filter((k) => k.startsWith("brand:"))
    .map((k) => k.replace("brand:", ""));

  const allBrandNames = Array.from(
    new Set([...dbBrands, ...defaultBrands, ...customBrandKeys])
  ).sort((a, b) => a.localeCompare(b));

  const countForBrand = (b: string) =>
    products.filter((p) => (p.brand || "").trim().toLowerCase() === b.toLowerCase()).length;

  const [searchBrand, setSearchBrand] = useState("");
  const [filterMode, setFilterMode] = useState<"todas" | "catalogo" | "personalizado">("todas");

  const displayedBrands = allBrandNames.filter((b) => {
    if (searchBrand && !b.toLowerCase().includes(searchBrand.toLowerCase().trim())) {
      return false;
    }
    if (filterMode === "catalogo" && countForBrand(b) === 0) {
      return false;
    }
    if (filterMode === "personalizado" && !categoryImages[`brand:${b.toLowerCase().trim()}`]) {
      return false;
    }
    return true;
  });

  const saveBrandLogo = async (brandName: string, logoValue: string | null) => {
    if (!settings) return;
    setSaving(true);
    try {
      const normalized = brandName.trim().toLowerCase();
      const updatedImages = { ...categoryImages };
      if (logoValue) {
        updatedImages[`brand:${normalized}`] = logoValue;
      } else {
        delete updatedImages[`brand:${normalized}`];
      }
      const nextSettings = {
        ...settings,
        category_images: updatedImages,
      };
      await saveS({ data: nextSettings });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
      setMsg(`Logo de ${brandName} actualizado ✓`);
      setTimeout(() => setMsg(null), 3000);
    } catch (e: any) {
      setMsg("Error al guardar: " + (e?.message ?? "Error"));
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (brandName: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxW = 320;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const webpData = canvas.toDataURL("image/webp", 0.92);
          saveBrandLogo(brandName, webpData);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleAddBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    const name = newBrandName.trim();
    saveBrandLogo(name, "");
    setNewBrandName("");
  };

  return (
    <div className="space-y-6">
      {/* Mensaje de estado */}
      {msg && (
        <div className="sticky top-20 z-40 rounded-xl bg-primary px-4 py-3 text-center text-sm font-bold text-primary-foreground shadow-lg animate-in fade-in">
          {msg}
        </div>
      )}

      {/* Banner de Especificaciones de Imagen */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-red-50 to-orange-50 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-secondary flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" /> Medidas y Especificaciones de los Logotipos
            </h2>
            <p className="mt-1 text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Podés gestionar <strong>más de 100 marcas</strong> sin problema de espacio. Subís el logo una sola vez por marca acá, y al cargar cubiertas con esa marca se publica automáticamente con su logo oficial.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-xl border bg-white px-3 py-1.5 font-bold shadow-sm">
              📐 Medida ideal: <strong className="text-primary font-black">200 × 63 px</strong> (proporción ~ 3:1)
            </span>
            <span className="rounded-xl border bg-white px-3 py-1.5 font-bold shadow-sm">
              🖼️ Formato: <strong className="text-secondary font-black">PNG o WebP transparente</strong>
            </span>
            <span className="rounded-xl border bg-white px-3 py-1.5 font-bold shadow-sm">
              ⚡ Peso: <strong className="text-emerald-700 font-black">&lt; 200 KB</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Agregar Nueva Marca */}
      <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-product)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-secondary">¿Querés incorporar una nueva marca?</h3>
          <p className="text-xs text-muted-foreground">Escribí su nombre (ej: Hankook, Continental, Bridgestone) y agregala a tu lista.</p>
        </div>
        <form onSubmit={handleAddBrand} className="flex w-full sm:w-auto items-center gap-2">
          <input
            className={input + " w-full sm:w-64"}
            placeholder="Nombre de la marca..."
            value={newBrandName}
            onChange={(e) => setNewBrandName(e.target.value)}
          />
          <button
            type="submit"
            disabled={!newBrandName.trim() || saving}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Agregar
          </button>
        </form>
      </div>

      {/* Barra de búsqueda y filtros para 100+ marcas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl shadow-sm border">
        <div className="relative flex-1">
          <input
            className={input + " pl-10"}
            placeholder={`Buscar entre las ${allBrandNames.length} marcas registradas...`}
            value={searchBrand}
            onChange={(e) => setSearchBrand(e.target.value)}
          />
          <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          {searchBrand && (
            <button
              onClick={() => setSearchBrand("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterMode("todas")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              filterMode === "todas" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Todas ({allBrandNames.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("catalogo")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              filterMode === "catalogo" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            En catálogo ({dbBrands.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("personalizado")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              filterMode === "personalizado" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Con logo subido ({customBrandKeys.length})
          </button>
        </div>
      </div>

      {/* Cuadrícula de Marcas y Logos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayedBrands.map((brand) => {
          const norm = brand.trim().toLowerCase();
          const customLogo = categoryImages[`brand:${norm}`];
          const hasCustom = Boolean(customLogo);
          const count = countForBrand(brand);

          return (
            <div
              key={brand}
              className="flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-black tracking-tight text-secondary">{brand}</h4>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {count} neumático{count !== 1 ? "s" : ""} en catálogo
                    </span>
                  </div>
                  {hasCustom ? (
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Personalizado ✓
                    </span>
                  ) : (
                    <span className="rounded-full bg-neutral-100 border border-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                      De fábrica
                    </span>
                  )}
                </div>

                {/* Previsualización del Logo */}
                <div className="my-4 flex h-20 w-full items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 p-3">
                  <BrandLogo brand={brand} customLogoUrl={customLogo} className="max-h-12 w-auto max-w-[180px] object-contain drop-shadow-sm" />
                </div>
              </div>

              {/* Acciones */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer">
                    <span className="flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 py-2 text-xs font-bold text-white transition hover:bg-neutral-800 text-center">
                      <Upload className="h-3.5 w-3.5" /> Subir logo (200×63)
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/webp,image/svg+xml,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(brand, f);
                        e.target.value = "";
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      if (editingUrlBrand === brand) {
                        setEditingUrlBrand(null);
                      } else {
                        setEditingUrlBrand(brand);
                        setTempUrl(customLogo || "");
                      }
                    }}
                    className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                    title="Pegar URL directa"
                  >
                    URL
                  </button>

                  {hasCustom && (
                    <button
                      type="button"
                      onClick={() => saveBrandLogo(brand, null)}
                      className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                      title="Restablecer logo oficial"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Editor de URL desplegable */}
                {editingUrlBrand === brand && (
                  <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                    <input
                      className={input + " text-xs h-8 flex-1"}
                      placeholder="https://ejemplo.com/logo.png"
                      value={tempUrl}
                      onChange={(e) => setTempUrl(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        saveBrandLogo(brand, tempUrl.trim() || null);
                        setEditingUrlBrand(null);
                      }}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                    >
                      Guardar
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {displayedBrands.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-8 text-center bg-card">
            <Tag className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-bold text-secondary">No se encontró ninguna marca con ese nombre</p>
            <p className="text-xs text-muted-foreground mt-1">Podés agregarla escribiendo su nombre arriba y tocando "Agregar".</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── ORDERS PANEL ─────────────────── */
const STATUS_OPTIONS = ["pendiente", "pagado", "enviado", "entregado", "cancelado"] as const;
type OrderStatus = typeof STATUS_OPTIONS[number];

const STATUS_STYLE: Record<OrderStatus, string> = {
  pendiente:  "bg-yellow-100 text-yellow-800",
  pagado:     "bg-blue-100 text-blue-800",
  enviado:    "bg-indigo-100 text-indigo-800",
  entregado:  "bg-green-100 text-green-800",
  cancelado:  "bg-red-100 text-red-800",
};

function OrdersPanel() {
  const qc = useQueryClient();
  const fetchOrders = useServerFn(listOrders);
  const setStatus = useServerFn(updateOrderStatus);
  const delOrder = useServerFn(deleteOrder);
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchOrders(),
  });
  const [filter, setFilter] = useState<OrderStatus | "todos">("todos");
  const [openId, setOpenId] = useState<string | null>(null);

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: OrderStatus }) => setStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-orders"] }),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delOrder({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  const list = (orders as any[]).filter((o) => filter === "todos" || o.status === filter);
  const counts: Record<string, number> = { todos: (orders as any[]).length };
  for (const s of STATUS_OPTIONS) counts[s] = (orders as any[]).filter((o: any) => o.status === s).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["todos", ...STATUS_OPTIONS] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s as any)}
            className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
              filter === s ? "bg-primary text-primary-foreground" : "bg-card text-secondary hover:bg-muted"
            }`}
          >
            {s} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Cargando pedidos...</p>
      ) : list.length === 0 ? (
        <div className="rounded-2xl bg-card p-10 text-center text-sm text-muted-foreground">
          No hay pedidos {filter !== "todos" ? `en estado "${filter}"` : "todavía"}.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-product)]">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o: any) => {
                const date = new Date(o.created_at).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
                const isOpen = openId === o.id;
                const wa = String(o.customer_phone || "").replace(/\D/g, "");
                return (
                  <Fragment key={o.id}>
                    <tr key={o.id} className="border-t">
                      <td className="px-4 py-3">
                        <button onClick={() => setOpenId(isOpen ? null : o.id)} className="text-left">
                          <p className="font-bold text-secondary">#{o.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground">{date}</p>
                        </button>
                      </td>
                      <td className="px-4 py-3 font-semibold text-secondary">{o.customer_name}</td>
                      <td className="px-4 py-3">
                        {wa ? (
                          <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{o.customer_phone}</a>
                        ) : o.customer_phone}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-secondary">$ {Number(o.total_ars).toLocaleString("es-AR")}</td>
                      <td className="px-4 py-3">
                        <select
                          value={o.status}
                          onChange={(e) => statusMut.mutate({ id: o.id, status: e.target.value as OrderStatus })}
                          className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${STATUS_STYLE[o.status as OrderStatus] ?? "bg-muted"}`}
                        >
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setOpenId(isOpen ? null : o.id)} className="mr-2 rounded-full bg-muted px-3 py-1 text-xs font-bold text-secondary hover:bg-secondary hover:text-secondary-foreground">
                          {isOpen ? "Ocultar" : "Ver"}
                        </button>
                        <button
                          onClick={() => { if (confirm("¿Eliminar este pedido?")) delMut.mutate(o.id); }}
                          className="rounded-full bg-destructive/10 p-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-t bg-muted/40">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-secondary">Productos</p>
                              <ul className="mt-2 space-y-1 text-sm">
                                {(o.items as any[]).map((it, i) => (
                                  <li key={i} className="flex justify-between gap-3">
                                    <span>{it.qty} × {it.brand} {it.model} <span className="text-muted-foreground">({it.size})</span></span>
                                    <span className="font-semibold text-secondary">$ {Number(it.price_ars * it.qty).toLocaleString("es-AR")}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="space-y-1 text-sm">
                              {o.customer_email && <p><strong>Email:</strong> {o.customer_email}</p>}
                              {o.customer_address && <p><strong>Dirección:</strong> {o.customer_address}</p>}
                              {o.notes && <p><strong>Notas:</strong> {o.notes}</p>}
                              <p className="text-xs text-muted-foreground">Referencia para el cliente: LR-{o.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── BANNERS PANEL ─────────────────── */
type Banner = {
  id?: string;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  sort_order: number;
};

const emptyBanner: Banner = {
  title: "", subtitle: "", image_url: "", link_url: "", is_active: true, sort_order: 0,
};

function BannersPanel() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listAllBanners);
  const save = useServerFn(upsertBanner);
  const remove = useServerFn(deleteBanner);
  const { data: banners = [] } = useQuery({ queryKey: ["admin-banners"], queryFn: () => fetchAll() });
  const [editing, setEditing] = useState<Banner | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveMut = useMutation({
    mutationFn: (b: Banner) => save({ data: b }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      qc.invalidateQueries({ queryKey: ["public-banners"] });
      setEditing(null); setError(null);
    },
    onError: (e: any) => setError(e?.message ?? "Error al guardar"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      qc.invalidateQueries({ queryKey: ["public-banners"] });
    },
  });

  async function handleFile(file: File) {
    if (!editing) return;
    setUploading(true); setError(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `banner-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
      setEditing({ ...editing, image_url: urlData.publicUrl + "?t=" + Date.now() });
    } catch (e: any) {
      setError(e?.message ?? "Error al subir imagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-secondary">Banners rotativos de la portada</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Se muestran en la sección de la Inicio y rotan automáticamente. Podés activar / desactivar y ordenar cada uno.
          </p>
        </div>
        <button
          onClick={() => { setEditing({ ...emptyBanner }); setError(null); }}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-primary)]"
        >
          <Plus className="h-4 w-4" /> Nuevo banner
        </button>
      </div>

      <div className="grid gap-3">
        {(banners as Banner[]).length === 0 && (
          <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground">
            Todavía no hay banners. Creá el primero con el botón de arriba.
          </div>
        )}
        {(banners as Banner[]).map((b) => (
          <div key={b.id} className="flex flex-col gap-3 rounded-2xl bg-card p-3 shadow-[var(--shadow-product)] sm:flex-row sm:items-center">
            <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-40">
              {b.image_url ? (
                <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-muted-foreground">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${b.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {b.is_active ? "Activo" : "Oculto"}
                </span>
                <span className="text-xs text-muted-foreground">Orden: {b.sort_order}</span>
              </div>
              <p className="mt-1 font-bold text-secondary">{b.title || <span className="italic text-muted-foreground">(sin título)</span>}</p>
              {b.subtitle && <p className="text-xs text-muted-foreground">{b.subtitle}</p>}
              {b.link_url && <p className="mt-1 truncate text-[11px] text-primary">→ {b.link_url}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => saveMut.mutate({ ...b, is_active: !b.is_active })}
                className="rounded-full border px-3 py-1.5 text-xs font-bold uppercase text-secondary hover:bg-muted"
              >
                {b.is_active ? "Ocultar" : "Mostrar"}
              </button>
              <button
                onClick={() => { setEditing({ ...b }); setError(null); }}
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold uppercase text-primary hover:bg-primary/10"
              >
                <Pencil className="h-3 w-3" /> Editar
              </button>
              <button
                onClick={() => { if (b.id && confirm("¿Eliminar este banner?")) delMut.mutate(b.id); }}
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold uppercase text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3" /> Borrar
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-background p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-secondary">{editing.id ? "Editar banner" : "Nuevo banner"}</h3>
              <button onClick={() => setEditing(null)} className="rounded-full p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-secondary">Imagen del banner *</label>
                {editing.image_url && (
                  <div className="mb-2 aspect-[16/6] overflow-hidden rounded-xl bg-muted">
                    <img src={editing.image_url} alt="preview" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase text-primary-foreground hover:opacity-90">
                    <Upload className="h-4 w-4" />
                    {uploading ? "Subiendo..." : "Subir desde tu computadora"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    />
                  </label>
                  <span className="text-xs text-muted-foreground">o pegá una URL:</span>
                </div>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editing.image_url}
                  onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                  className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-secondary">Título (opcional)</label>
                <input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  placeholder="Ej: Nueva línea 2026"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-secondary">Subtítulo (opcional)</label>
                <input
                  value={editing.subtitle}
                  onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  placeholder="Ej: 15% off en cubiertas para camionetas"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-secondary">Enlace al hacer click (opcional)</label>
                <input
                  value={editing.link_url}
                  onChange={(e) => setEditing({ ...editing, link_url: e.target.value })}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  placeholder="Ej: https://wa.me/54..... o /producto/..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-secondary">Orden</label>
                  <input
                    type="number"
                    min={0}
                    value={editing.sort_order}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">Menor número = aparece primero.</p>
                </div>
                <label className="flex items-end gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.is_active}
                    onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  />
                  <span>Activo (visible en el sitio)</span>
                </label>
              </div>

              {error && <p className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setEditing(null)} className="rounded-full border px-5 py-2 text-sm font-semibold">Cancelar</button>
                <button
                  disabled={saveMut.isPending || !editing.image_url}
                  onClick={() => saveMut.mutate(editing)}
                  className="rounded-full bg-primary px-6 py-2 text-sm font-bold uppercase text-primary-foreground disabled:opacity-60"
                >
                  {saveMut.isPending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TestimonialsAdminPanel() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listAllTestimonials);
  const setApproved = useServerFn(setTestimonialApproved);
  const remove = useServerFn(deleteTestimonial);
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: () => fetchAll(),
  });
  const approveMut = useMutation({
    mutationFn: (v: { id: string; is_approved: boolean }) => setApproved({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
      qc.invalidateQueries({ queryKey: ["public-testimonials"] });
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-testimonials"] });
      qc.invalidateQueries({ queryKey: ["public-testimonials"] });
    },
  });

  const pending = (items as any[]).filter((t) => !t.is_approved);
  const approved = (items as any[]).filter((t) => t.is_approved);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-black text-secondary">Testimonios de clientes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Aprobá los mensajes que enviaron los clientes para que aparezcan en el sitio.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}

      <section>
        <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-primary">
          Pendientes ({pending.length})
        </h3>
        <div className="grid gap-3">
          {pending.length === 0 && (
            <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
              No hay testimonios pendientes.
            </div>
          )}
          {pending.map((t) => (
            <TestimonialRow
              key={t.id}
              t={t}
              onApprove={() => approveMut.mutate({ id: t.id, is_approved: true })}
              onDelete={() => { if (confirm("¿Eliminar este testimonio?")) delMut.mutate(t.id); }}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-secondary">
          Publicados ({approved.length})
        </h3>
        <div className="grid gap-3">
          {approved.length === 0 && (
            <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground">
              Todavía no hay testimonios publicados.
            </div>
          )}
          {approved.map((t) => (
            <TestimonialRow
              key={t.id}
              t={t}
              published
              onHide={() => approveMut.mutate({ id: t.id, is_approved: false })}
              onDelete={() => { if (confirm("¿Eliminar este testimonio?")) delMut.mutate(t.id); }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function TestimonialRow({
  t, published, onApprove, onHide, onDelete,
}: {
  t: any; published?: boolean;
  onApprove?: () => void; onHide?: () => void; onDelete: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-product)] sm:flex-row">
      {t.image_url ? (
        <img src={t.image_url} alt={t.name} className="h-16 w-16 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <MessageSquare className="h-6 w-6" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold text-secondary">{t.name}</p>
          <div className="flex items-center gap-0.5 text-primary">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-3.5 w-3.5 ${i < (t.rating || 0) ? "fill-current" : "opacity-30"}`} />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {new Date(t.created_at).toLocaleDateString("es-AR")}
          </span>
        </div>
        <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{t.message}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-start">
        {!published && onApprove && (
          <button onClick={onApprove}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-foreground">
            <Check className="h-3 w-3" /> Aprobar
          </button>
        )}
        {published && onHide && (
          <button onClick={onHide}
            className="rounded-full border px-3 py-1.5 text-xs font-bold uppercase text-secondary hover:bg-muted">
            Ocultar
          </button>
        )}
        <button onClick={onDelete}
          className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold uppercase text-destructive hover:bg-destructive/10">
          <Trash2 className="h-3 w-3" /> Borrar
        </button>
      </div>
    </div>
  );
}

