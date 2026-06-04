import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { X, Minus, Plus, ShoppingCart, Trash2, Copy, Check } from "lucide-react";
import { createOrder } from "./orders.functions";
import { getSettings } from "./settings.functions";

export type CartItem = {
  id: string;
  brand: string;
  model: string;
  size: string;
  price_ars: number;
  image_url?: string | null;
  qty: number;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  total: number;
  add: (p: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  isOpen: boolean;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "leradial.cart.v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setItems(JSON.parse(raw)); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const value = useMemo<CartCtx>(() => ({
    items,
    count: items.reduce((s, i) => s + i.qty, 0),
    total: items.reduce((s, i) => s + i.qty * i.price_ars, 0),
    add: (p, qty = 1) => setItems(prev => {
      const ex = prev.find(x => x.id === p.id);
      if (ex) return prev.map(x => x.id === p.id ? { ...x, qty: Math.min(99, x.qty + qty) } : x);
      return [...prev, { ...p, qty }];
    }),
    remove: (id) => setItems(prev => prev.filter(x => x.id !== id)),
    setQty: (id, qty) => setItems(prev => prev.map(x => x.id === id ? { ...x, qty: Math.max(1, Math.min(99, qty)) } : x)),
    clear: () => setItems([]),
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    isOpen,
  }), [items, isOpen]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <CartDrawer />
    </Ctx.Provider>
  );
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart fuera del CartProvider");
  return c;
}

function CartDrawer() {
  const { items, total, isOpen, close, remove, setQty, clear } = useCart();
  const submit = useServerFn(createOrder);
  const fetchS = useServerFn(getSettings);
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => fetchS() });
  const [step, setStep] = useState<"cart" | "form" | "done">("cart");
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", customer_email: "", customer_address: "", notes: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderTotal, setOrderTotal] = useState<number>(0);

  useEffect(() => { if (isOpen) { setStep(items.length ? "cart" : "cart"); setError(null); } }, [isOpen, items.length]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      setError("Nombre y teléfono son obligatorios."); return;
    }
    setSending(true);
    try {
      const res = await submit({ data: {
        ...form,
        items: items.map(i => ({ id: i.id, brand: i.brand, model: i.model, size: i.size, price_ars: i.price_ars, qty: i.qty })),
      }});
      setOrderId(res.id);
      setOrderTotal(res.total ?? total);
      setStep("done");
      clear();
    } catch (err: any) {
      setError(err?.message || "No se pudo enviar el pedido. Probá de nuevo.");
    } finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={close} />
      <aside className="flex h-full w-full max-w-md flex-col bg-background shadow-2xl">
        <header className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-secondary">
              {step === "done" ? "¡Pedido enviado!" : step === "form" ? "Tus datos" : "Tu carrito"}
            </h2>
          </div>
          <button onClick={close} className="rounded-full p-2 hover:bg-muted"><X className="h-5 w-5" /></button>
        </header>

        {step === "cart" && (
          <>
            <div className="flex-1 overflow-y-auto p-5">
              {items.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Tu carrito está vacío.</p>
              ) : (
                <ul className="space-y-3">
                  {items.map(it => (
                    <li key={it.id} className="flex gap-3 rounded-xl border bg-card p-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {it.image_url && <img src={it.image_url} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{it.brand}</p>
                        <p className="truncate text-sm font-bold text-secondary">{it.model}</p>
                        <p className="text-xs text-muted-foreground">{it.size}</p>
                        <div className="mt-1 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setQty(it.id, it.qty - 1)} className="grid h-7 w-7 place-items-center rounded-full border"><Minus className="h-3 w-3" /></button>
                            <span className="w-6 text-center text-sm font-bold">{it.qty}</span>
                            <button onClick={() => setQty(it.id, it.qty + 1)} className="grid h-7 w-7 place-items-center rounded-full border"><Plus className="h-3 w-3" /></button>
                          </div>
                          <span className="text-sm font-black text-secondary">$ {(it.price_ars * it.qty).toLocaleString("es-AR")}</span>
                        </div>
                      </div>
                      <button onClick={() => remove(it.id)} className="self-start rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <footer className="border-t p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Total</span>
                <span className="text-xl font-black text-secondary">$ {total.toLocaleString("es-AR")}</span>
              </div>
              <button
                disabled={items.length === 0}
                onClick={() => setStep("form")}
                className="w-full rounded-full bg-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-[var(--shadow-primary)] disabled:opacity-50"
              >
                Finalizar pedido
              </button>
            </footer>
          </>
        )}

        {step === "form" && (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              <Field label="Nombre y apellido *" value={form.customer_name} onChange={v => setForm({ ...form, customer_name: v })} />
              <Field label="Teléfono *" value={form.customer_phone} onChange={v => setForm({ ...form, customer_phone: v })} />
              <Field label="Email" value={form.customer_email} onChange={v => setForm({ ...form, customer_email: v })} type="email" />
              <Field label="Dirección de entrega" value={form.customer_address} onChange={v => setForm({ ...form, customer_address: v })} />
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-secondary">Notas</span>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
                  className="w-full rounded-xl border border-input bg-background p-3 text-sm" />
              </label>
              {error && <p className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{error}</p>}
              <div className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                Total a abonar: <strong className="text-secondary">$ {total.toLocaleString("es-AR")}</strong><br />
                {(settings as any)?.bank_cbu || (settings as any)?.bank_alias
                  ? "Al confirmar te mostramos los datos para pagar por transferencia."
                  : "Te contactaremos para coordinar el pago y la entrega."}
              </div>
            </div>
            <footer className="flex gap-2 border-t p-5">
              <button type="button" onClick={() => setStep("cart")} className="flex-1 rounded-full border py-3 text-sm font-bold uppercase">Volver</button>
              <button type="submit" disabled={sending} className="flex-[2] rounded-full bg-primary py-3 text-sm font-bold uppercase text-primary-foreground disabled:opacity-50">
                {sending ? "Enviando..." : "Enviar pedido"}
              </button>
            </footer>
          </form>
        )}

        {step === "done" && (
          <div className="flex flex-1 flex-col overflow-y-auto p-6">
            <div className="flex flex-col items-center text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-7 w-7" />
              </div>
              <h3 className="mt-3 text-xl font-black text-secondary">¡Pedido confirmado!</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Pedido{orderId ? ` #${orderId.slice(0, 8)}` : ""} · Total a transferir
              </p>
              <p className="mt-1 text-3xl font-black text-primary">$ {orderTotal.toLocaleString("es-AR")}</p>
            </div>

            <BankBlock settings={settings as any} orderId={orderId} total={orderTotal} />

            <button onClick={close} className="mt-6 rounded-full bg-primary py-3 text-sm font-bold uppercase text-primary-foreground">
              Listo, ya transferí
            </button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Una vez recibido el comprobante te confirmamos por WhatsApp y coordinamos la entrega.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-secondary">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm" />
    </label>
  );
}
