import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listAllProducts,
  upsertProduct,
  deleteProduct,
  applyCatalogToModel,
} from "@/lib/products.functions";
import { getSettings, getAdminSettings, updateSettings, parseBranches, type Branch } from "@/lib/settings.functions";
import { listOrders, updateOrderStatus, deleteOrder } from "@/lib/orders.functions";
import { listAllBanners, upsertBanner, deleteBanner } from "@/lib/banners.functions";
import { listAllTestimonials, setTestimonialApproved, deleteTestimonial } from "@/lib/testimonials.functions";
import { Upload, Trash2, Pencil, Plus, X, ImageIcon, LayoutGrid, Settings2, Package, ClipboardList, Image as ImageLucide, MessageSquare, Star, Check, Tag, RotateCcw, FileText, Store, MapPin, Clock, Phone, Zap, Car, Sparkles, ExternalLink } from "lucide-react";
import { BrandLogo, DEFAULT_BRAND_LOGO_MAP } from "@/components/BrandLogo";
import { optimizeAndReadImage } from "@/lib/image-utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — Le Radial" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

type Product = {
  id?: string;
  slug?: string | null;
  brand: string;
  model: string;
  size: string;
  category?: string;
  categories: ("autos" | "camionetas" | "suv" | "camiones" | "agricolas" | "industriales")[];
  price_ars: number;
  stock: number;
  image_url: string | null;
  description: string | null;
  catalog_url?: string | null;
  is_active: boolean;
  is_featured: boolean;
  free_shipping: boolean;
};

const empty: Product = {
  brand: "", model: "", size: "", categories: ["autos"],
  price_ars: 0, stock: 0, image_url: null, description: null, catalog_url: null,
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

type Tab = "productos" | "marcas" | "pedidos" | "sucursales" | "banners" | "testimonios" | "imagenes" | "ajustes";

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [tab, setTab] = useState<Tab>("productos");
  const [filterCat, setFilterCat] = useState<string>("todas");
  const [searchProd, setSearchProd] = useState<string>("");
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [batchUpdating, setBatchUpdating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const fetchAll = useServerFn(listAllProducts);
  const save = useServerFn(upsertProduct);
  const remove = useServerFn(deleteProduct);
  const applyCatalog = useServerFn(applyCatalogToModel);
  const fetchSettingsAdmin = useServerFn(getAdminSettings);
  const saveSettingsAdmin = useServerFn(updateSettings);

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

  const { data: settingsData } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => fetchSettingsAdmin(),
    enabled: ready && isAdmin,
  });
  const settings = settingsData as any;
  const categoryImages: Record<string, string> = settings?.category_images ?? {};

  const saveMut = useMutation({
    mutationFn: async (input: Product & { applyCatalogToModel?: boolean; catalogKeyword?: string; vehicle_image_url?: string | null; vehicle_label?: string | null }) => {
      const { applyCatalogToModel: applyAll, catalogKeyword, vehicle_image_url, vehicle_label, ...p } = input;
      const res = await save({ data: p });
      const targetId = res?.id || p.id;
      if (targetId && settings && (vehicle_image_url !== undefined || vehicle_label !== undefined)) {
        const upImages = { ...(settings.category_images || {}) };
        if (vehicle_image_url) {
          upImages[`vehicle:${targetId}`] = vehicle_image_url;
        } else if (vehicle_image_url === null) {
          delete upImages[`vehicle:${targetId}`];
        }
        if (vehicle_label) {
          upImages[`vehicle_label:${targetId}`] = vehicle_label.trim();
        } else if (vehicle_label === null || vehicle_label === "") {
          delete upImages[`vehicle_label:${targetId}`];
        }
        await saveSettingsAdmin({
          data: {
            ...settings,
            category_images: upImages,
          },
        });
      }
      if (applyAll && p.brand.trim() && p.model.trim()) {
        const resApply = await applyCatalog({
          data: {
            brand: p.brand.trim(),
            model: p.model.trim(),
            keyword: catalogKeyword || undefined,
            catalog_url: p.catalog_url ?? null,
          },
        });
        alert(`¡Listo! Catálogo aplicado a ${resApply.count} producto(s) de ${p.brand} que coinciden con "${resApply.matchedPattern}".`);
      }
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["public-products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
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



  const pendingProducts = Array.isArray(products)
    ? (products as Product[]).filter((p) => !(p as any).updated_at?.startsWith("2026-10-04"))
    : [];

  async function handleBatchUpdatePending() {
    if (!pendingProducts.length) {
      alert("No hay productos pendientes por actualizar.");
      return;
    }

    const confirmed = confirm(
      `¿Deseás actualizar los precios de las ${pendingProducts.length} cubiertas pendientes?\n\n` +
      `• Autos (66): +$43.000 y +15%\n` +
      `• Camionetas y SUV (36): +$60.000 y +15%\n` +
      `• Camiones y Agrícolas (71): +$76.000 y +15%\n\n` +
      `Los 262 productos modificados ayer permanecerán intactos.`
    );
    if (!confirmed) return;

    setBatchUpdating(true);
    setBatchProgress({ current: 0, total: pendingProducts.length });

    try {
      let count = 0;
      for (const p of pendingProducts) {
        const oldPrice = Number(p.price_ars) || 0;
        const cat = ((p as any).category || "").toLowerCase();
        let addAmount = 43000;
        if (cat === "camionetas" || cat === "suv") addAmount = 60000;
        else if (cat === "camiones" || cat === "agricolas" || cat === "industriales") addAmount = 76000;

        const newPrice = Math.round(((oldPrice + addAmount) * 1.15) / 100) * 100;

        const { error } = await supabase
          .from("products")
          .update({ price_ars: newPrice, updated_at: new Date().toISOString() })
          .eq("id", p.id!);

        if (error) console.error("Error al actualizar producto:", p.id, error);

        count++;
        setBatchProgress({ current: count, total: pendingProducts.length });
      }

      await qc.invalidateQueries({ queryKey: ["admin-products"] });
      await qc.invalidateQueries({ queryKey: ["public-products"] });
      alert(`¡Éxito! Se actualizaron correctamente los precios de las ${count} cubiertas pendientes.`);
    } catch (e: any) {
      alert("Ocurrió un error: " + (e?.message || String(e)));
    } finally {
      setBatchUpdating(false);
      setBatchProgress(null);
    }
  }

  const featuredProducts = (Array.isArray(products) ? (products as Product[]) : []).filter((p) => p.is_featured);

  const filteredProducts = (Array.isArray(products) ? (products as Product[]) : []).filter((p) => {
    if (showFeaturedOnly && !p.is_featured) return false;
    if (showPendingOnly && (p as any).updated_at?.startsWith("2026-10-04")) return false;
    if (filterCat !== "todas" && !catsOf(p).includes(filterCat)) return false;
    if (searchProd.trim()) {
      const q = searchProd.toLowerCase().trim();
      const match =
        (p.brand || "").toLowerCase().includes(q) ||
        (p.model || "").toLowerCase().includes(q) ||
        (p.size || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const countByCategory = (cat: string) =>
    (Array.isArray(products) ? (products as Product[]) : []).filter((p) => catsOf(p).includes(cat)).length;

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
          <div className="flex items-center gap-2">
            {pendingProducts.length > 0 && (
              <button
                type="button"
                onClick={handleBatchUpdatePending}
                disabled={batchUpdating}
                className="flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-md transition disabled:opacity-50 cursor-pointer"
                title="Aplica los aumentos acordados a todas las cubiertas que quedaron pendientes"
              >
                <Zap className="h-4 w-4" />
                {batchUpdating
                  ? `Actualizando ${batchProgress?.current || 0}/${batchProgress?.total || 0}...`
                  : `Aumentar pendientes (${pendingProducts.length})`}
              </button>
            )}
            <button
              onClick={() => setEditing({ ...empty })}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-primary)] cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Nuevo producto
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="container mx-auto flex gap-1 px-4 pb-0 overflow-x-auto">
          {([ 
            { id: "productos", label: "Productos", icon: Package },
            { id: "marcas", label: "Marcas y Logos", icon: Tag },
            { id: "pedidos", label: "Pedidos", icon: ClipboardList },
            { id: "sucursales", label: "Sucursales", icon: Store },
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

            {/* Buscador y filtro activo */}
            <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <input
                  className={input + " pl-10 text-xs sm:text-sm"}
                  placeholder="🔍 Buscar por marca (ej: Bri...), modelo o medida..."
                  value={searchProd}
                  onChange={(e) => setSearchProd(e.target.value)}
                />
                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                {searchProd && (
                  <button
                    onClick={() => setSearchProd("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowFeaturedOnly(!showFeaturedOnly);
                    if (!showFeaturedOnly) setShowPendingOnly(false);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition border cursor-pointer ${
                    showFeaturedOnly
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-secondary border-border hover:bg-muted"
                  }`}
                  title="Muestra solo las cubiertas marcadas como destacadas en la portada"
                >
                  {showFeaturedOnly ? "✓ Mostrando sólo destacados" : `★ Ver sólo destacados (${featuredProducts.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPendingOnly(!showPendingOnly);
                    if (!showPendingOnly) setShowFeaturedOnly(false);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition border cursor-pointer ${
                    showPendingOnly
                      ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                      : "bg-card text-secondary border-border hover:bg-muted"
                  }`}
                  title="Muestra solo las cubiertas que no fueron actualizadas ayer"
                >
                  {showPendingOnly ? "✓ Mostrando sólo pendientes" : `Ver sólo pendientes (${pendingProducts.length})`}
                </button>
                <LayoutGrid className="h-4 w-4 text-muted-foreground ml-1" />
                <span className="text-xs sm:text-sm font-semibold text-secondary">
                  {filterCat === "todas"
                    ? `Mostrando ${filteredProducts.length} de ${(products as any[]).length} cubiertas`
                    : `${CATEGORY_LABELS[filterCat]} (${filteredProducts.length})`}
                </span>
                {(filterCat !== "todas" || searchProd || showPendingOnly || showFeaturedOnly) && (
                  <button
                    onClick={() => {
                      setFilterCat("todas");
                      setSearchProd("");
                      setShowPendingOnly(false);
                      setShowFeaturedOnly(false);
                    }}
                    className="ml-1 rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    × Limpiar filtros
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
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-secondary">$ {Number(p.price_ars).toLocaleString("es-AR")}</div>
                        {p.updated_at?.startsWith("2026-10-04") ? (
                          <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">✓ Ayer</span>
                        ) : (
                          <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">⏳ Pendiente</span>
                        )}
                      </td>
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

        {/* ── TAB: SUCURSALES ── */}
        {tab === "sucursales" && <BranchesAdminPanel />}

        {/* ── TAB: BANNERS ── */}
        {tab === "banners" && <BannersPanel />}

        {/* ── TAB: TESTIMONIOS ── */}
        {tab === "testimonios" && <TestimonialsAdminPanel />}

        {/* ── TAB: IMÁGENES ── */}
        {tab === "imagenes" && (
          <ImageManager
            products={products as Product[]}
            settings={settings}
            onRefresh={() => {
              qc.invalidateQueries({ queryKey: ["admin-products"] });
              qc.invalidateQueries({ queryKey: ["admin-settings"] });
              qc.invalidateQueries({ queryKey: ["settings"] });
            }}
          />
        )}

        {/* ── TAB: AJUSTES ── */}
        {tab === "ajustes" && <SettingsPanel />}
      </div>

      {editing && (
        <ProductForm
          value={editing}
          categoryImages={categoryImages}
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
function ImageManager({
  products,
  settings,
  onRefresh,
}: {
  products: Product[];
  settings?: any;
  onRefresh: () => void;
}) {
  const [imageTab, setImageTab] = useState<"vehiculos" | "cubiertas">("vehiculos");
  const [uploading, setUploading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const vehicleFileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const qc = useQueryClient();
  const saveProd = useServerFn(upsertProduct);
  const saveSettingsFn = useServerFn(updateSettings);

  const [onlyFeatured, setOnlyFeatured] = useState(true);
  const [search, setSearch] = useState("");
  const [editingUrlId, setEditingUrlId] = useState<string | null>(null);
  const [tempUrl, setTempUrl] = useState("");
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState("");

  const categoryImages: Record<string, string> = settings?.category_images ?? {};

  // Manejo de foto del neumático
  async function handleUploadTire(product: Product, file: File) {
    if (!product.id) return;
    setUploading(product.id);
    setMsg(null);
    try {
      const dataUrl = await optimizeAndReadImage(file, 600, 0.88);
      await saveProd({ data: { ...product, price_ars: Number(product.price_ars), image_url: dataUrl } });
      onRefresh();
      setMsg({ type: "ok", text: `Imagen de cubierta "${product.brand} ${product.model}" actualizada ✓` });
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Error al procesar la imagen" });
    } finally {
      setUploading(null);
    }
  }

  async function handleRemoveTire(product: Product) {
    if (!product.id || !product.image_url) return;
    if (!confirm("¿Quitar la imagen de este producto?")) return;
    setUploading(product.id);
    try {
      await saveProd({ data: { ...product, price_ars: Number(product.price_ars), image_url: null } });
      onRefresh();
      setMsg({ type: "ok", text: "Imagen de cubierta eliminada ✓" });
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Error" });
    } finally {
      setUploading(null);
    }
  }

  // Manejo de foto del vehículo (al pasar el mouse)
  async function handleSaveVehicleImage(product: Product, dataUrl: string | null, customLabel?: string | null) {
    if (!product.id || !settings) return;
    setUploading(product.id);
    setMsg(null);
    try {
      const upImages = { ...categoryImages };
      if (dataUrl) {
        upImages[`vehicle:${product.id}`] = dataUrl;
      } else {
        delete upImages[`vehicle:${product.id}`];
      }
      if (customLabel !== undefined) {
        if (customLabel && customLabel.trim()) {
          upImages[`vehicle_label:${product.id}`] = customLabel.trim();
        } else {
          delete upImages[`vehicle_label:${product.id}`];
        }
      }
      await saveSettingsFn({
        data: {
          ...settings,
          category_images: upImages,
        },
      });
      onRefresh();
      setMsg({
        type: "ok",
        text: dataUrl
          ? `Foto de vehículo guardada para "${product.brand} ${product.model}" ✓`
          : `Foto de vehículo restablecida al valor de fábrica ✓`,
      });
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Error al guardar" });
    } finally {
      setUploading(null);
    }
  }

  async function handleVehicleFile(product: Product, file: File) {
    try {
      const dataUrl = await optimizeAndReadImage(file, 800, 0.88);
      await handleSaveVehicleImage(product, dataUrl);
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Error al procesar la imagen" });
    }
  }

  const featuredCount = products.filter((p) => p.is_featured).length;

  const vehicleFilteredProducts = products.filter((p) => {
    if (onlyFeatured && !p.is_featured) return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const match =
        (p.brand || "").toLowerCase().includes(q) ||
        (p.model || "").toLowerCase().includes(q) ||
        (p.size || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const grouped = Object.entries(CATEGORY_LABELS).map(([slug, label]) => ({
    slug, label,
    items: products.filter((p) => catsOf(p).includes(slug)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      {/* Selector de sub-pestaña */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-xl font-black text-secondary flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" /> Galería e Imágenes
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Administrá tanto las fotos de los neumáticos como las fotos de cómo quedan puestos en vehículos.
          </p>
        </div>
        <div className="flex rounded-xl bg-muted p-1 gap-1">
          <button
            type="button"
            onClick={() => setImageTab("vehiculos")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition cursor-pointer ${
              imageTab === "vehiculos"
                ? "bg-white text-secondary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Car className="h-4 w-4 text-primary" /> Fotos en Vehículo (Destacados y Hover)
          </button>
          <button
            type="button"
            onClick={() => setImageTab("cubiertas")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition cursor-pointer ${
              imageTab === "cubiertas"
                ? "bg-white text-secondary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="h-4 w-4 text-secondary" /> Fotos de Cubiertas
          </button>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold animate-in fade-in ${msg.type === "ok" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-3 opacity-60 hover:opacity-100"><X className="inline h-3 w-3" /></button>
        </div>
      )}

      {/* ── SUB-TAB: FOTOS EN VEHÍCULO ── */}
      {imageTab === "vehiculos" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-secondary flex items-center gap-2">
                  <Car className="h-5 w-5 text-sky-600" /> Fotos Puestas en Vehículo (Efecto Hover)
                </h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-2xl leading-relaxed">
                  Asigná la foto exacta de cómo queda puesta la cubierta en un vehículo (ej: camioneta, auto o camión). Cuando el usuario pasa el mouse por encima en la portada, se visualiza esta foto correspondiente en lugar de la foto genérica de Brutus.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOnlyFeatured(true)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm cursor-pointer ${
                    onlyFeatured
                      ? "bg-primary text-primary-foreground"
                      : "bg-white text-secondary border hover:bg-neutral-50"
                  }`}
                >
                  ★ Sólo Destacados ({featuredCount})
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyFeatured(false)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm cursor-pointer ${
                    !onlyFeatured
                      ? "bg-primary text-primary-foreground"
                      : "bg-white text-secondary border hover:bg-neutral-50"
                  }`}
                >
                  Todas las cubiertas ({products.length})
                </button>
              </div>
            </div>
          </div>

          {/* Buscador */}
          <div className="relative max-w-md">
            <input
              className={input + " pl-10 text-xs sm:text-sm"}
              placeholder="Buscar por marca, modelo o medida..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Grilla de productos con su foto de vehículo */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vehicleFilteredProducts.map((p) => {
              const isPickup = p.category === "camionetas" || p.category === "suv" || p.model?.toLowerCase().includes("brutus");
              const isTruck = p.category === "camiones" || p.category === "pesados" || p.model?.toLowerCase().includes("xcurve");
              const defaultVehicleImg = isPickup
                ? "/images/featured/brutus-bg.jpg"
                : isTruck
                ? "/images/featured/xcurve-bg.jpg"
                : "/images/featured/fastway-bg.jpg";

              const customVehicleImg = categoryImages[`vehicle:${p.id}`] || (p.slug ? categoryImages[`vehicle:${p.slug}`] : null);
              const hasCustom = Boolean(customVehicleImg);
              const currentVehicleImg = customVehicleImg || defaultVehicleImg;

              const customLabel = categoryImages[`vehicle_label:${p.id}`] || (p.slug ? categoryImages[`vehicle_label:${p.slug}`] : "");
              const defaultLabel = isPickup ? "Camioneta / SUV" : isTruck ? "Camión Pesado" : "Auto / Calle";
              const currentLabel = customLabel || defaultLabel;

              return (
                <div
                  key={p.id}
                  className="flex flex-col justify-between rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md transition"
                >
                  <div>
                    {/* Header: Neumático info */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-primary uppercase">{p.brand}</span>
                          {p.is_featured && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase text-amber-800">
                              ★ Destacado
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-secondary line-clamp-1">{p.model}</h4>
                        <p className="font-mono text-xs text-muted-foreground">{p.size}</p>
                      </div>
                      {hasCustom ? (
                        <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0">
                          Personalizada ✓
                        </span>
                      ) : (
                        <span className="rounded-full bg-neutral-100 border border-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 shrink-0">
                          De fábrica
                        </span>
                      )}
                    </div>

                    {/* Visualización comparativa: Cubierta vs Vehículo */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {/* Lado A: Cubierta */}
                      <div className="relative aspect-square rounded-xl bg-neutral-100 p-2 flex items-center justify-center border overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.model} className="h-full w-full object-contain" />
                        ) : (
                          <div className="text-center text-[10px] text-muted-foreground">Sin foto cubierta</div>
                        )}
                        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          Cubierta
                        </span>
                      </div>

                      {/* Lado B: Vehículo en hover */}
                      <div className="relative aspect-square rounded-xl bg-neutral-900 border overflow-hidden group/thumb">
                        <img src={currentVehicleImg} alt="vehiculo" className="h-full w-full object-cover transition group-hover/thumb:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-1.5">
                          <span className="rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white truncate text-center">
                            {currentLabel}
                          </span>
                        </div>
                        <span className="absolute top-1 left-1 rounded bg-sky-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          En Vehículo
                        </span>
                      </div>
                    </div>

                    {/* Editor de Etiqueta del Vehículo */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-secondary mb-1">
                        <span>Etiqueta del vehículo:</span>
                        {customLabel && (
                          <span className="text-[10px] text-emerald-600 font-bold">Personalizada</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          className={input + " h-8 text-xs flex-1 rounded-xl px-2.5"}
                          placeholder={`Ej: Hilux, Amarok V6, Gol Trend (actual: ${currentLabel})`}
                          value={editingLabelId === p.id ? tempLabel : (customLabel || "")}
                          onFocus={() => {
                            if (editingLabelId !== p.id) {
                              setEditingLabelId(p.id!);
                              setTempLabel(customLabel || "");
                            }
                          }}
                          onChange={(e) => {
                            setEditingLabelId(p.id!);
                            setTempLabel(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveVehicleImage(p, customVehicleImg || null, tempLabel);
                              setEditingLabelId(null);
                            }
                          }}
                        />
                        {editingLabelId === p.id && (
                          <button
                            type="button"
                            onClick={() => {
                              handleSaveVehicleImage(p, customVehicleImg || null, tempLabel);
                              setEditingLabelId(null);
                            }}
                            className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground cursor-pointer"
                          >
                            OK
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Acciones de subida */}
                  <div className="space-y-2 border-t pt-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        ref={(el) => { vehicleFileRefs.current[p.id!] = el; }}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleVehicleFile(p, file);
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        disabled={uploading === p.id}
                        onClick={() => vehicleFileRefs.current[p.id!]?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 py-2 text-xs font-bold text-white transition hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5" /> {hasCustom ? "Cambiar foto" : "Subir foto vehículo"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (editingUrlId === p.id) {
                            setEditingUrlId(null);
                          } else {
                            setEditingUrlId(p.id!);
                            setTempUrl(customVehicleImg || "");
                          }
                        }}
                        className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                        title="Pegar URL directa"
                      >
                        URL
                      </button>

                      {hasCustom && (
                        <button
                          type="button"
                          onClick={() => handleSaveVehicleImage(p, null, null)}
                          className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-bold text-red-600 hover:bg-red-100 cursor-pointer"
                          title="Restablecer a foto por defecto"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Input de URL expandible */}
                    {editingUrlId === p.id && (
                      <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                        <input
                          className={input + " text-xs h-8 flex-1 rounded-lg"}
                          placeholder="https://ejemplo.com/foto-vehiculo.jpg"
                          value={tempUrl}
                          onChange={(e) => setTempUrl(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            handleSaveVehicleImage(p, tempUrl.trim() || null, customLabel || null);
                            setEditingUrlId(null);
                          }}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground cursor-pointer"
                        >
                          Guardar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {vehicleFilteredProducts.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed p-10 text-center bg-card">
                <Car className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm font-bold text-secondary">No se encontraron productos con ese criterio</p>
                {onlyFeatured && (
                  <button
                    type="button"
                    onClick={() => setOnlyFeatured(false)}
                    className="mt-3 text-xs text-primary font-bold underline cursor-pointer"
                  >
                    Ver todas las cubiertas del catálogo
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SUB-TAB: FOTOS DE CUBIERTAS (ORIGINAL) ── */}
      {imageTab === "cubiertas" && (
        <div className="space-y-8">
          <div className="rounded-2xl border bg-card p-4 text-xs text-muted-foreground">
            Aquí gestionás la <strong>foto principal del neumático</strong> aislado (fondo blanco/transparente). Formatos: JPG, PNG, WebP — máx. 5 MB.
          </div>
          {grouped.map(({ slug, label, items }) => (
            <div key={slug}>
              <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-secondary">
                <span className="rounded-full bg-primary/15 px-3 py-0.5 text-xs font-bold uppercase text-primary">{label}</span>
                <span className="text-sm text-muted-foreground font-normal">{items.length} producto(s)</span>
              </h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
                {items.map((p) => (
                  <div key={p.id} className="rounded-2xl bg-card p-3 shadow-[var(--shadow-product)]">
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
                          onClick={() => handleRemoveTire(p)}
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
                    <input
                      ref={(el) => { fileRefs.current[p.id!] = el; }}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadTire(p, file);
                        e.target.value = "";
                      }}
                    />
                    <button
                      disabled={uploading === p.id}
                      onClick={() => fileRefs.current[p.id!]?.click()}
                      className="flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-primary/40 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50 cursor-pointer"
                    >
                      <Upload className="h-3 w-3" />
                      {p.image_url ? "Cambiar" : "Subir imagen"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
/* ─────────────────── PRODUCT FORM ─────────────────── */
function ProductForm({
  value, onCancel, onSave, saving, error, categoryImages,
}: {
  value: Product;
  onCancel: () => void;
  onSave: (p: Product & { applyCatalogToModel?: boolean; catalogKeyword?: string; vehicle_image_url?: string | null; vehicle_label?: string | null }) => void;
  saving: boolean;
  error: any;
  categoryImages?: Record<string, string>;
}) {
  const [p, setP] = useState<Product>(value);
  const [uploading, setUploading] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [applyCatalogAll, setApplyCatalogAll] = useState(false);

  const [vehicleImg, setVehicleImg] = useState<string | null>(() => (value.id && categoryImages ? categoryImages[`vehicle:${value.id}`] || null : null));
  const [vehicleLabel, setVehicleLabel] = useState<string>(() => (value.id && categoryImages ? categoryImages[`vehicle_label:${value.id}`] || "" : ""));
  const [uploadingVehicle, setUploadingVehicle] = useState(false);

  async function handleVehicleUpload(file: File) {
    setUploadingVehicle(true);
    try {
      const dataUrl = await optimizeAndReadImage(file, 800, 0.88);
      setVehicleImg(dataUrl);
    } catch (e: any) {
      alert(e?.message ?? "Error al procesar la foto del vehículo");
    } finally {
      setUploadingVehicle(false);
    }
  }

  const cleanFamily = (m: string) =>
    m.replace(/\b(?:LT|LTR|SUV|AT|A\/T|MT|M\/T)?\s*\d{2,3}(?:\/\d{2,3})?[A-Z]\b/gi, "")
     .replace(/\b\d{1,2}PR\b/gi, "")
     .replace(/\b(?:LT|LTR)\b/gi, "")
     .replace(/\b\d{2,3}(?:\.\d{1,2})?\/\d{2,3}(?:\.\d{1,2})?R\d{2}[A-Z]*/gi, "")
     .replace(/\s+/g, " ")
     .trim();
  const [catalogKeyword, setCatalogKeyword] = useState(() => cleanFamily(value.model || ""));
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP({ ...p, [k]: v });

  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      const dataUrl = await optimizeAndReadImage(file, 600, 0.88);
      set("image_url", dataUrl);
    } catch (e: any) {
      alert(e?.message ?? "Error al procesar la imagen");
    } finally {
      setUploading(false);
    }
  }

  async function handlePdfUpload(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("El catálogo tiene que ser un archivo PDF.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert("El PDF pesa más de 20 MB. Probá comprimirlo antes de subirlo.");
      return;
    }
    setUploadingPdf(true);
    try {
      const base = `${p.brand}-${p.model}`
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "catalogo";
      const path = `${base}-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("product-catalogs")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("product-catalogs").getPublicUrl(path);
      setP((prev) => ({ ...prev, catalog_url: urlData.publicUrl }));
    } catch (e: any) {
      alert(e?.message ?? "Error al subir el PDF");
    } finally {
      setUploadingPdf(false);
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
          <div className="col-span-2 rounded-2xl border border-emerald-500/30 bg-emerald-50/60 p-3">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-secondary">
              <FileText className="h-4 w-4 text-emerald-600" /> Catálogo PDF (botón verde "Descargar catálogo")
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-emerald-600">
                <Upload className="h-4 w-4" />
                {uploadingPdf ? "Subiendo PDF..." : p.catalog_url ? "Cambiar PDF" : "Subir PDF desde tu computadora"}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  disabled={uploadingPdf}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); e.target.value = ""; }}
                />
              </label>
              {p.catalog_url && (
                <>
                  <a href={p.catalog_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-emerald-700 underline">
                    Ver catálogo actual
                  </a>
                  <button type="button" onClick={() => set("catalog_url", null)} className="text-xs font-semibold text-destructive hover:underline">
                    Quitar
                  </button>
                </>
              )}
            </div>
            <input
              className={input + " mt-2"}
              placeholder="o pegá el link del PDF: https://..."
              value={p.catalog_url ?? ""}
              onChange={(e) => set("catalog_url", e.target.value.trim() || null)}
            />
            <div className="mt-2.5 rounded-xl border border-emerald-300/80 bg-white/90 p-2.5 shadow-sm">
              <label className="flex items-start gap-2 text-xs font-semibold text-secondary">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 text-emerald-600 rounded"
                  checked={applyCatalogAll}
                  disabled={!p.brand.trim() || !p.model.trim()}
                  onChange={(e) => setApplyCatalogAll(e.target.checked)}
                />
                <div className="flex-1">
                  <span>
                    Aplicar este catálogo a todas las medidas de <strong>{p.brand.trim() || "esta marca"}</strong> que contengan:
                  </span>
                  <input
                    type="text"
                    className="mt-1 h-8 w-full rounded-lg border border-emerald-400 bg-white px-2.5 text-xs font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={catalogKeyword}
                    onChange={(e) => setCatalogKeyword(e.target.value)}
                    placeholder="ej: FORZA HT, BRUTUS, SPORT PLUS F1..."
                  />
                  <p className="mt-1 text-[11px] font-normal text-emerald-800">
                    💡 <strong>Coincidencia inteligente:</strong> Si ponés <em>FORZA HT</em>, detecta tanto <em>FORZA HT</em> como <em>FORZA H/T</em> con o sin barra, todas las medidas de rodado y versiones de carga.
                  </p>
                </div>
              </label>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Formatos admitidos: archivos PDF (máx. 20 MB).
            </p>
          </div>
          {/* Foto del vehículo en uso / puesta (al pasar el mouse) */}
          <div className="col-span-2 rounded-2xl border border-sky-400/40 bg-sky-50/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-secondary">
                <Car className="h-4 w-4 text-sky-600" /> Foto del Vehículo (Efecto Hover en Portada)
              </span>
              {vehicleImg && (
                <button
                  type="button"
                  onClick={() => setVehicleImg(null)}
                  className="text-xs font-semibold text-destructive hover:underline cursor-pointer"
                >
                  Quitar foto personalizada
                </button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Esta foto se muestra cuando el usuario pasa el mouse por encima del neumático en la tienda y en la sección Destacados. Si no subís ninguna, usa la de fábrica según el tipo de vehículo.
            </p>
            {vehicleImg && (
              <div className="relative h-28 w-full max-w-xs overflow-hidden rounded-xl border bg-neutral-900 shadow-sm">
                <img src={vehicleImg} alt="vehiculo" className="h-full w-full object-cover" />
                {vehicleLabel && (
                  <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    {vehicleLabel}
                  </span>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-sky-700 shadow-sm transition">
                <Upload className="h-4 w-4" />
                {uploadingVehicle ? "Subiendo..." : vehicleImg ? "Cambiar foto de vehículo" : "Subir foto de vehículo desde tu PC"}
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  disabled={uploadingVehicle}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleVehicleUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <span className="text-xs text-muted-foreground">o pegá URL:</span>
            </div>
            <input
              className={input}
              placeholder="https://ejemplo.com/foto-camioneta.jpg"
              value={vehicleImg ?? ""}
              onChange={(e) => setVehicleImg(e.target.value.trim() || null)}
            />
            <div>
              <label className="text-xs font-bold text-secondary">Etiqueta del vehículo (opcional):</label>
              <input
                className={input + " mt-1"}
                placeholder="Ej: Toyota Hilux, VW Amarok V6, Fiat Cronos, Scania R450..."
                value={vehicleLabel}
                onChange={(e) => setVehicleLabel(e.target.value)}
              />
            </div>
          </div>

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
            💡 También podés gestionar y subir las fotos en la pestaña <strong>Imágenes</strong> &gt; <strong>Fotos en Vehículo</strong>.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-destructive">{String(error?.message ?? error)}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-full border px-5 py-2 text-sm font-semibold">Cancelar</button>
          <button
            disabled={saving || uploadingPdf || uploadingVehicle}
            onClick={() => onSave({
              ...p,
              applyCatalogToModel: applyCatalogAll,
              catalogKeyword: catalogKeyword.trim() || undefined,
              vehicle_image_url: vehicleImg,
              vehicle_label: vehicleLabel,
            })}
            className="rounded-full bg-primary px-6 py-2 text-sm font-bold uppercase text-primary-foreground disabled:opacity-60"
          >
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
  const [uploadingAsset, setUploadingAsset] = useState<"logo" | "hero" | "branch" | null>(null);

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
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      setMsg("Ajustes guardados ✓");
      setTimeout(() => setMsg(null), 2500);
    },
    onError: (e: any) => {
      setMsg("Error al guardar: " + (e?.message ?? "Error desconocido"));
    },
  });

  async function handleAssetUpload(kind: "logo" | "hero" | "branch", file: File) {
    if (!s) return;
    setUploadingAsset(kind);
    try {
      let url = "";
      try {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${kind}-${Date.now()}.${ext}`;
        const { data: upData, error: upErr } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
        if (!upErr && upData) {
          const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
          url = urlData.publicUrl + "?t=" + Date.now();
        }
      } catch {
        // Fallback to optimized base64
      }

      if (!url) {
        const maxDim = kind === "logo" ? 360 : 960;
        url = await optimizeAndReadImage(file, maxDim, 0.82);
      }

      let next = { ...s };
      if (kind === "logo") {
        next.logo_url = url;
      } else if (kind === "hero") {
        next.hero_image_url = url;
      } else if (kind === "branch") {
        const catImgs: Record<string, any> = { ...(s.category_images || {}), sucursal: url };
        if (catImgs.branches_data) {
          try {
            const list = JSON.parse(catImgs.branches_data);
            if (Array.isArray(list) && list.length > 0) {
              const mainIdx = list.findIndex((b: any) => b.is_main);
              const idx = mainIdx >= 0 ? mainIdx : 0;
              list[idx].image_url = url;
              catImgs.branches_data = JSON.stringify(list);
            }
          } catch {}
        }
        next.category_images = catImgs;
      }

      setS(next);
      await saveS({ data: next });
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      setMsg(`${kind === "logo" ? "Logo" : kind === "hero" ? "Foto de portada" : "Foto del local / sucursal"} guardada con éxito ✓`);
      setTimeout(() => setMsg(null), 3000);
    } catch (e: any) {
      setMsg("Error al guardar imagen: " + (e?.message ?? "no se pudo procesar"));
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
        <div className="grid gap-6 md:grid-cols-3">
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
          <AssetUploader
            title="Foto de Sucursal (Mitre 480)"
            hint="Foto de la sede central mostrada en la sección de sucursales en inicio."
            currentUrl={s.category_images?.sucursal || "/images/sucursal-mitre.jpg"}
            uploading={uploadingAsset === "branch"}
            onFile={(f) => handleAssetUpload("branch", f)}
            onUrlChange={(v) => {
              const catImgs: Record<string, any> = { ...(s.category_images || {}), sucursal: v };
              if (catImgs.branches_data) {
                try {
                  const list = JSON.parse(catImgs.branches_data);
                  if (Array.isArray(list) && list.length > 0) {
                    const mainIdx = list.findIndex((b: any) => b.is_main);
                    const idx = mainIdx >= 0 ? mainIdx : 0;
                    list[idx].image_url = v;
                    catImgs.branches_data = JSON.stringify(list);
                  }
                } catch {}
              }
              set("category_images", catImgs);
            }}
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
      {title.toLowerCase().includes("sucursal") && (
        <button
          type="button"
          onClick={() => onUrlChange("/images/sucursal-mitre.jpg")}
          className="mt-2 w-full rounded-xl border border-primary/30 bg-primary/5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition"
        >
          ✓ Usar Foto Oficial Mitre 480 (/images/sucursal-mitre.jpg)
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
      let finalUrl = "";
      try {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `category-${slug}-${Date.now()}.${ext}`;
        const { data: upData, error: upErr } = await supabase.storage
          .from("site-assets")
          .upload(path, file, { upsert: true });
        if (!upErr && upData) {
          const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
          finalUrl = urlData.publicUrl + "?t=" + Date.now();
        }
      } catch {
        // Fallback
      }
      if (!finalUrl) {
        finalUrl = await optimizeAndReadImage(file, 900, 0.82);
      }
      onChange({ ...value, [slug]: finalUrl });
      setMsg(`Imagen de ${slug} lista — recordá Guardar ajustes abajo ↓`);
    } catch (e: any) {
      setMsg("Error: " + (e?.message ?? "no se pudo procesar"));
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
  const [newBrandFile, setNewBrandFile] = useState<File | null>(null);
  const [newBrandPreview, setNewBrandPreview] = useState<string | null>(null);
  const newBrandFileInputRef = useRef<HTMLInputElement>(null);
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
  const customBrandEntries = Object.keys(categoryImages)
    .filter((k) => k.startsWith("brand:") && !k.startsWith("brand_name:"))
    .map((k) => {
      const norm = k.replace("brand:", "");
      const storedName = categoryImages[`brand_name:${norm}`];
      return storedName || (norm.charAt(0).toUpperCase() + norm.slice(1));
    });

  const brandMap = new Map<string, string>();
  for (const b of defaultBrands) brandMap.set(b.toLowerCase(), b);
  for (const b of dbBrands) brandMap.set(b.toLowerCase(), b);
  for (const b of customBrandEntries) {
    if (!brandMap.has(b.toLowerCase())) {
      brandMap.set(b.toLowerCase(), b);
    }
  }

  const allBrandNames = Array.from(brandMap.values()).sort((a, b) => a.localeCompare(b));

  const countForBrand = (b: string) =>
    products.filter((p) => (p.brand || "").trim().toLowerCase() === b.toLowerCase()).length;

  const [searchBrand, setSearchBrand] = useState("");
  const [filterMode, setFilterMode] = useState<"todas" | "catalogo" | "personalizado">("todas");

  const countWithCustomLogo = allBrandNames.filter((b) => {
    const val = categoryImages[`brand:${b.toLowerCase().trim()}`];
    return Boolean(val && val.trim().length > 0);
  }).length;

  const displayedBrands = allBrandNames.filter((b) => {
    if (searchBrand && !b.toLowerCase().includes(searchBrand.toLowerCase().trim())) {
      return false;
    }
    if (filterMode === "catalogo" && countForBrand(b) === 0) {
      return false;
    }
    if (filterMode === "personalizado") {
      const val = categoryImages[`brand:${b.toLowerCase().trim()}`];
      if (!val || val.trim().length === 0) return false;
    }
    return true;
  });

  const saveBrandLogo = async (brandName: string, logoValue: string | null, displayName?: string) => {
    if (!settings) return;
    setSaving(true);
    try {
      const normalized = brandName.trim().toLowerCase();
      const updatedImages = { ...categoryImages };
      if (logoValue === null) {
        delete updatedImages[`brand:${normalized}`];
        delete updatedImages[`brand_name:${normalized}`];
      } else {
        updatedImages[`brand:${normalized}`] = logoValue;
        const nameToStore = (displayName || brandName).trim();
        if (nameToStore) {
          updatedImages[`brand_name:${normalized}`] = nameToStore;
        }
      }
      const nextSettings = {
        ...settings,
        category_images: updatedImages,
      };
      await saveS({ data: nextSettings });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
      if (logoValue === null) {
        setMsg(`Marca / Logo de ${brandName} restablecido o eliminado ✓`);
      } else if (logoValue) {
        setMsg(`Logo de ${brandName} guardado con éxito ✓`);
      } else {
        setMsg(`Marca ${brandName} agregada ✓ Ahora podés subir su logo.`);
      }
      setTimeout(() => setMsg(null), 3500);
    } catch (e: any) {
      setMsg("Error al guardar: " + (e?.message ?? "Error"));
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (brandName: string, file: File) => {
    try {
      const dataUrl = await optimizeAndReadImage(file, 320, 0.92);
      saveBrandLogo(brandName, dataUrl);
    } catch (e: any) {
      setMsg("Error al procesar el logo: " + (e?.message ?? "Error"));
    }
  };

  const handleNewBrandFileChange = async (file: File) => {
    try {
      setNewBrandFile(file);
      const preview = await optimizeAndReadImage(file, 320, 0.92);
      setNewBrandPreview(preview);
    } catch (err: any) {
      setMsg("Error al procesar el archivo: " + (err?.message ?? "Error"));
    }
  };

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newBrandName.trim();
    if (!trimmed) return;

    let logoDataUrl = "";
    if (newBrandFile) {
      try {
        logoDataUrl = await optimizeAndReadImage(newBrandFile, 320, 0.92);
      } catch {
        logoDataUrl = newBrandPreview || "";
      }
    }

    await saveBrandLogo(trimmed, logoDataUrl, trimmed);
    setNewBrandName("");
    setNewBrandFile(null);
    setNewBrandPreview(null);
    setSearchBrand(trimmed);
    setFilterMode("todas");
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
      <div className="rounded-2xl bg-card p-6 shadow-[var(--shadow-product)] border">
        <div className="mb-4">
          <h3 className="text-base font-black text-secondary flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Incorporar Nueva Marca o Logo
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Podés agregar cualquier marca escribiendo su nombre y, si ya tenés el logo, seleccionarlo para subirlo todo junto.
          </p>
        </div>

        <form onSubmit={handleAddBrand} className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <input
            className={input + " flex-1 text-sm"}
            placeholder="Nombre de la marca (ej: Hankook, Westlake, Dunlop)..."
            value={newBrandName}
            onChange={(e) => setNewBrandName(e.target.value)}
          />

          <input
            ref={newBrandFileInputRef}
            type="file"
            accept="image/png,image/webp,image/svg+xml,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleNewBrandFileChange(f);
              e.target.value = "";
            }}
          />

          {newBrandPreview ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
              <img src={newBrandPreview} alt="Preview" className="h-6 w-auto max-w-[90px] object-contain" />
              <button
                type="button"
                onClick={() => {
                  setNewBrandFile(null);
                  setNewBrandPreview(null);
                }}
                className="text-muted-foreground hover:text-destructive"
                title="Quitar logo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => newBrandFileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition whitespace-nowrap shadow-sm"
            >
              <Upload className="h-4 w-4 text-primary" /> Elegir logo (opcional)
            </button>
          )}

          <button
            type="submit"
            disabled={!newBrandName.trim() || saving}
            className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-primary px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-md transition hover:bg-primary/95 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {newBrandFile ? "Guardar marca y logo" : "Agregar marca"}
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
            Con logo subido ({countWithCustomLogo})
          </button>
        </div>
      </div>

      {/* Cuadrícula de Marcas y Logos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayedBrands.map((brand) => {
          const norm = brand.trim().toLowerCase();
          const customLogo = categoryImages[`brand:${norm}`];
          const hasCustomLogo = Boolean(customLogo && customLogo.trim().length > 0);
          const isDbBrand = dbBrands.some((b) => b.toLowerCase() === norm);
          const isDefaultBrand = defaultBrands.some((b) => b.toLowerCase() === norm);
          const isCustomOnly = !isDbBrand && !isDefaultBrand;
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
                  {hasCustomLogo ? (
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      Personalizado ✓
                    </span>
                  ) : DEFAULT_BRAND_LOGO_MAP[norm] ? (
                    <span className="rounded-full bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-600">
                      De fábrica
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                      Sin logo aún
                    </span>
                  )}
                </div>

                {/* Previsualización del Logo */}
                <div className="my-4 flex h-20 w-full items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 p-3">
                  {hasCustomLogo || DEFAULT_BRAND_LOGO_MAP[norm] ? (
                    <BrandLogo brand={brand} customLogoUrl={customLogo} className="max-h-12 w-auto max-w-[180px] object-contain drop-shadow-sm" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="inline-flex items-center rounded bg-neutral-200/80 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-neutral-800 border border-neutral-300">
                        {brand}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-1 font-medium">Logo no asignado</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer">
                    <span className="flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 py-2 text-xs font-bold text-white transition hover:bg-neutral-800 text-center">
                      <Upload className="h-3.5 w-3.5" /> {hasCustomLogo ? "Cambiar logo" : "Subir logo (200×63)"}
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

                  {/* Restablecer logo oficial si es de fábrica o catálogo */}
                  {hasCustomLogo && (isDefaultBrand || isDbBrand) && (
                    <button
                      type="button"
                      onClick={() => saveBrandLogo(brand, null)}
                      className="rounded-xl border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100"
                      title="Restablecer logo oficial de fábrica"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Eliminar marca si es personalizada exclusiva */}
                  {isCustomOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`¿Eliminar la marca "${brand}" de la lista?`)) {
                          saveBrandLogo(brand, null);
                        }
                      }}
                      className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                      title="Eliminar marca"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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

/* ─────────────────── BRANCHES (SUCURSALES) PANEL ─────────────────── */
function BranchesAdminPanel() {
  const qc = useQueryClient();
  const fetchS = useServerFn(getAdminSettings);
  const saveS = useServerFn(updateSettings);
  const { data: settingsData } = useQuery({ queryKey: ["admin-settings"], queryFn: () => fetchS() });

  const rawBranches = parseBranches((settingsData as any)?.category_images);
  const branches: Branch[] = rawBranches.length > 0 ? rawBranches : [
    {
      id: "casa-central",
      name: "Buenos Aires",
      label: "Casa Central · Autocentro",
      address: (settingsData as any)?.address || "Bartolomé Mitre 480, C1036AAH, Ciudad Autónoma de Buenos Aires, Argentina",
      hours: (settingsData as any)?.hours || (settingsData as any)?.business_hours || "Lunes a Viernes de 8:00 a 17:00",
      phone: (settingsData as any)?.phone || "+54 9 11 2395-1455",
      image_url: (settingsData as any)?.category_images?.sucursal || "/images/sucursal-mitre.jpg",
      is_main: true,
    },
  ];

  const [editing, setEditing] = useState<Branch | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const saveMut = useMutation({
    mutationFn: async (newList: Branch[]) => {
      if (!settingsData) return;
      const updatedCategoryImages = {
        ...((settingsData as any).category_images || {}),
        branches_data: JSON.stringify(newList),
        sucursal: newList.find((b) => b.is_main)?.image_url || newList[0]?.image_url || "/images/sucursal-mitre.jpg",
      };
      const payload = {
        ...settingsData,
        category_images: updatedCategoryImages,
      };
      await saveS({ data: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      setEditing(null);
      setError(null);
      setMsg("Sucursales actualizadas con éxito ✓");
      setTimeout(() => setMsg(null), 3000);
    },
    onError: (e: any) => setError(e?.message ?? "Error al guardar sucursales"),
  });

  async function handleFile(file: File) {
    if (!editing) return;
    setUploading(true);
    setError(null);
    try {
      let finalUrl = "";
      try {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `branch-${Date.now()}.${ext}`;
        const { data: upData, error: upErr } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
        if (!upErr && upData) {
          const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
          finalUrl = urlData.publicUrl + "?t=" + Date.now();
        }
      } catch {
        // Fallback
      }
      if (!finalUrl) {
        finalUrl = await optimizeAndReadImage(file, 960, 0.82);
      }
      setEditing({ ...editing, image_url: finalUrl });
    } catch (err: any) {
      setError(err?.message ?? "Error al procesar la imagen");
    } finally {
      setUploading(false);
    }
  }

  function handleSaveBranch(b: Branch) {
    if (!b.name.trim() || !b.address.trim()) {
      setError("El nombre de la ciudad/sucursal y la dirección son obligatorios.");
      return;
    }
    let updated: Branch[];
    const exists = branches.some((item) => item.id === b.id);
    if (exists) {
      updated = branches.map((item) => (item.id === b.id ? b : item));
    } else {
      updated = [...branches, { ...b, id: b.id || `branch-${Date.now()}` }];
    }
    if (b.is_main) {
      updated = updated.map((item) => ({ ...item, is_main: item.id === b.id }));
    } else if (!updated.some((item) => item.is_main) && updated.length > 0) {
      updated[0].is_main = true;
    }
    saveMut.mutate(updated);
  }

  function handleDelete(id: string) {
    if (branches.length <= 1) {
      alert("Debe haber al menos una sucursal registrada en el sitio.");
      return;
    }
    if (!confirm("¿Seguro que deseas eliminar esta sucursal?")) return;
    let nextList = branches.filter((b) => b.id !== id);
    if (!nextList.some((b) => b.is_main) && nextList.length > 0) {
      nextList[0].is_main = true;
    }
    saveMut.mutate(nextList);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-secondary">Gestión de Sucursales</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configurá las sedes de atención con foto, dirección, horarios y mapa (estilo Sunset.com.py). Se muestran en la sección de inicio.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing({
              id: `branch-${Date.now()}`,
              name: "",
              label: "Sucursal Oficial",
              address: "",
              hours: "Lunes a Viernes de 8:00 a 17:00",
              phone: (settingsData as any)?.phone || "+54 9 11 2395-1455",
              image_url: "/images/sucursal-mitre.jpg",
              is_main: branches.length === 0,
            });
            setError(null);
          }}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-md hover:brightness-110 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Nueva Sucursal
        </button>
      </div>

      {msg && (
        <div className="mb-4 rounded-xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
          {msg}
        </div>
      )}

      {/* Grid de Sucursales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {branches.map((b) => (
          <div
            key={b.id}
            className="flex flex-col justify-between overflow-hidden rounded-2xl border bg-card p-5 shadow-[var(--shadow-product)] transition hover:border-primary/40"
          >
            <div>
              {/* Foto de la sucursal */}
              <div
                onClick={() => { setEditing({ ...b }); setError(null); }}
                className="group relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-neutral-900 border border-border cursor-pointer"
                title="Hacé clic para cambiar la foto de esta sucursal"
              >
                <img
                  src={b.image_url || "/images/sucursal-mitre.jpg"}
                  alt={b.name}
                  className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                  onError={(e) => { e.currentTarget.src = "/images/sucursal-mitre.jpg"; }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                  <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black shadow-lg">
                    <Upload className="h-3.5 w-3.5" /> Cambiar foto
                  </span>
                </div>
                <div className="absolute top-2.5 left-2.5">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase text-white ${
                      b.is_main ? "bg-[#E3151A]" : "bg-black/70 backdrop-blur-sm"
                    }`}
                  >
                    {b.is_main ? "Casa Central" : b.label || "Sucursal"}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="mt-4">
                <h3 className="text-lg font-black text-secondary">{b.name || "Sin nombre"}</h3>
                <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-[#E3151A] shrink-0 mt-0.5" />
                  <span>{b.address || "Sin dirección"}</span>
                </p>
                <div className="mt-2 space-y-1 text-[11px] text-muted-foreground border-t pt-2 border-border/50">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-neutral-400 shrink-0" />
                    <span>{b.hours}</span>
                  </div>
                  {b.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-neutral-400 shrink-0" />
                      <span>{b.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="mt-5 flex items-center justify-between border-t border-border pt-3">
              <span className="text-[11px] font-semibold text-muted-foreground">
                {b.is_main ? "★ Sede Principal" : "Sucursal secundaria"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setEditing({ ...b }); setError(null); }}
                  className="rounded-lg border p-1.5 text-xs text-muted-foreground hover:bg-neutral-100 hover:text-secondary transition cursor-pointer"
                  title="Editar sucursal"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  disabled={saveMut.isPending || branches.length <= 1}
                  className="rounded-lg border border-destructive/20 p-1.5 text-xs text-destructive hover:bg-destructive/10 transition disabled:opacity-40 cursor-pointer"
                  title="Eliminar sucursal"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal / Formulario de edición o creación */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-3xl bg-card p-6 shadow-2xl border border-border my-8">
            <button
              onClick={() => setEditing(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-neutral-100 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-bold text-secondary mb-1">
              {branches.some((item) => item.id === editing.id) ? "Editar Sucursal" : "Nueva Sucursal"}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Completá los datos y la foto que se mostrarán en la sección interactiva del sitio.
            </p>

            {error && (
              <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Foto de la sucursal */}
              <div>
                <label className="block text-xs font-bold text-secondary mb-1">
                  Foto de la Sucursal
                </label>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="relative aspect-[16/10] w-full sm:w-48 overflow-hidden rounded-xl bg-neutral-900 border shrink-0">
                    <img
                      src={editing.image_url || "/images/sucursal-mitre.jpg"}
                      alt="Previsualización"
                      className="h-full w-full object-cover"
                      onError={(e) => { e.currentTarget.src = "/images/sucursal-mitre.jpg"; }}
                    />
                  </div>
                  <div className="w-full space-y-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-bold uppercase text-primary-foreground hover:brightness-110 transition disabled:opacity-60 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploading ? "Subiendo foto..." : "Subir foto desde PC"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, image_url: "/images/sucursal-mitre.jpg" })}
                      className="w-full rounded-xl border border-primary/30 bg-primary/5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition cursor-pointer"
                    >
                      ✓ Usar Foto Oficial Mitre 480
                    </button>
                    <input
                      className={input + " text-xs"}
                      placeholder="o ingresá URL directa https://..."
                      value={editing.image_url}
                      onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Nombre de la sucursal / ciudad */}
              <div>
                <label className="block text-xs font-bold text-secondary mb-1">
                  Ciudad o Nombre de Sucursal *
                </label>
                <input
                  className={input}
                  placeholder="Ej: Buenos Aires, Minga Guazú, Rosario, Córdoba"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>

              {/* Etiqueta / Subtítulo */}
              <div>
                <label className="block text-xs font-bold text-secondary mb-1">
                  Etiqueta / Tipo de Sucursal
                </label>
                <input
                  className={input}
                  placeholder="Ej: Casa Central · Autocentro, Sucursal Distribución, Punto de Retiro"
                  value={editing.label || ""}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                />
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-xs font-bold text-secondary mb-1">
                  Dirección completa *
                </label>
                <input
                  className={input}
                  placeholder="Ej: Bartolomé Mitre 480, C1036AAH, CABA"
                  value={editing.address}
                  onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                />
              </div>

              {/* Horarios */}
              <div>
                <label className="block text-xs font-bold text-secondary mb-1">
                  Horarios de atención
                </label>
                <input
                  className={input}
                  placeholder="Ej: Lunes a Viernes de 8:00 a 17:00"
                  value={editing.hours}
                  onChange={(e) => setEditing({ ...editing, hours: e.target.value })}
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-xs font-bold text-secondary mb-1">
                  Teléfono / WhatsApp de contacto
                </label>
                <input
                  className={input}
                  placeholder="Ej: +54 9 11 2395-1455"
                  value={editing.phone || ""}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                />
              </div>

              {/* Enlace Google Maps */}
              <div>
                <label className="block text-xs font-bold text-secondary mb-1">
                  Enlace personalizado a Google Maps (opcional)
                </label>
                <input
                  className={input}
                  placeholder="Dejá vacío para generar la búsqueda automática con la dirección"
                  value={editing.maps_url || ""}
                  onChange={(e) => setEditing({ ...editing, maps_url: e.target.value })}
                />
              </div>

              {/* ¿Es Casa Central / Sede Principal? */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="is_main_branch"
                  checked={!!editing.is_main}
                  onChange={(e) => setEditing({ ...editing, is_main: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="is_main_branch" className="text-xs font-bold text-secondary cursor-pointer">
                  Marcar como Casa Central / Sede Principal
                </label>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t pt-4">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-full border px-5 py-2 text-xs font-bold uppercase text-muted-foreground hover:bg-neutral-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saveMut.isPending || uploading}
                onClick={() => handleSaveBranch(editing)}
                className="rounded-full bg-primary px-6 py-2 text-xs font-bold uppercase text-primary-foreground hover:brightness-110 transition disabled:opacity-60 cursor-pointer"
              >
                {saveMut.isPending ? "Guardando..." : "Guardar Sucursal"}
              </button>
            </div>
          </div>
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
      let finalUrl = "";
      try {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `banner-${Date.now()}.${ext}`;
        const { data: upData, error: upErr } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
        if (!upErr && upData) {
          const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
          finalUrl = urlData.publicUrl + "?t=" + Date.now();
        }
      } catch {
        // Fallback
      }
      if (!finalUrl) {
        finalUrl = await optimizeAndReadImage(file, 1200, 0.82);
      }
      setEditing({ ...editing, image_url: finalUrl });
    } catch (e: any) {
      setError(e?.message ?? "Error al procesar la imagen");
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

