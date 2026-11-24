import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, Minus, Plus, ShoppingCart, Trash2, Check, Lock, CreditCard, Copy, CheckCheck, MessageCircle } from "lucide-react";
import { createOrder } from "./orders.functions";
import { createMpPreference } from "./mercadopago.functions";
import { useCurrency } from "./currency";
import { PaymentMethodsWidget } from "@/components/PaymentMethodsWidget";

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
  paymentMethod: "transfer" | "card";
  setPaymentMethod: (pm: "transfer" | "card") => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "leradial.cart.v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"transfer" | "card">("card");

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
    paymentMethod,
    setPaymentMethod,
  }), [items, isOpen, paymentMethod]);

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
  const { items, total, count, isOpen, close, remove, setQty, clear, paymentMethod, setPaymentMethod } = useCart();
  const { format } = useCurrency();
  const submit = useServerFn(createOrder);
  const [step, setStep] = useState<"cart" | "form" | "done">("cart");
  const [form, setForm] = useState({
    customer_name: "",
    customer_dni: "",
    customer_phone: "",
    customer_email: "",
    customer_address: "",
    notes: "",
  });

  const isTransfer = paymentMethod === "transfer";
  const discountAmount = isTransfer ? Math.round(total * 0.15) : 0;
  const finalTotal = Math.max(0, total - discountAmount);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderTotal, setOrderTotal] = useState<number>(0);
  const [orderPayment, setOrderPayment] = useState<any>(null);
  const [orderInitPoint, setOrderInitPoint] = useState<string | null>(null);
  const [confirmedItems, setConfirmedItems] = useState<CartItem[]>([]);

  useEffect(() => { if (isOpen) { setError(null); } }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.customer_name.trim() || !form.customer_dni.trim() || !form.customer_phone.trim()) {
      setError("Nombre, DNI / CUIT y teléfono son obligatorios para despachar tu pedido."); return;
    }
    setSending(true);
    try {
      const itemsSnapshot = [...items];
      setConfirmedItems(itemsSnapshot);
      const origin = typeof window !== "undefined" ? window.location.origin : "https://www.leradial.com.ar";
      const dniNote = `DNI/CUIT: ${form.customer_dni.trim()}`;
      const paymentNote = isTransfer 
        ? "Forma de pago: Transferencia Bancaria (15% OFF aplicado)" 
        : "Forma de pago: Tarjeta de Crédito / Mercado Pago (6 cuotas sin interés)";
      const parts = [dniNote];
      if (form.notes?.trim()) parts.push(form.notes.trim());
      parts.push(paymentNote);
      const notesWithPayment = parts.join(" | ");

      const res = await submit({ data: {
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        customer_email: form.customer_email.trim(),
        customer_address: form.customer_address.trim(),
        notes: notesWithPayment,
        items: itemsSnapshot.map(i => ({ id: i.id, qty: i.qty })),
        back_url_base: origin,
      }});
      setOrderId(res.id);
      setOrderTotal(isTransfer ? finalTotal : (res.total ?? total));
      setOrderPayment(res.payment ?? null);
      if (res.init_point) {
        setOrderInitPoint(res.init_point);
      }
      if (!isTransfer && res.init_point) {
        clear();
        window.location.href = res.init_point;
        return;
      }
      setStep("done");
      clear();
    } catch (err: any) {
      setError(err?.message || "No se pudo enviar el pedido. Probá de nuevo.");
    } finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={close} />
      <aside className="relative flex h-full max-h-[100dvh] w-full max-w-md flex-col bg-background shadow-2xl overflow-hidden z-10">
        <header className="flex shrink-0 items-center justify-between border-b px-5 py-4 bg-card">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="text-base sm:text-lg font-bold text-secondary">
              {step === "done" ? "¡Pedido recibido!" : step === "form" ? "Datos de envío y pago" : `Tu carrito (${count} ${count === 1 ? "cubierta" : "cubiertas"})`}
            </h2>
          </div>
          <button onClick={close} className="rounded-full p-2 hover:bg-muted transition" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </header>

        {step === "cart" && (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
              {items.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
                    <ShoppingCart className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-secondary">Tu carrito está vacío.</p>
                  <p className="text-xs text-muted-foreground">Elegí tus neumáticos en el catálogo para agregarlos.</p>
                  <button onClick={close} className="rounded-full bg-primary px-5 py-2 text-xs font-bold uppercase text-primary-foreground hover:bg-primary/90 transition">
                    Ver catálogo
                  </button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map(it => (
                    <li key={it.id} className="flex gap-3 rounded-2xl border bg-card p-3 shadow-xs">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted border border-neutral-200/60 flex items-center justify-center">
                        {it.image_url ? (
                          <img src={it.image_url} alt="" className="h-full w-full object-contain p-1" />
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">Neumático</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-primary">{it.brand}</span>
                            <button onClick={() => remove(it.id)} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-destructive transition" title="Eliminar">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="truncate text-sm font-bold text-secondary leading-snug">{it.model}</p>
                          <p className="text-xs font-medium text-muted-foreground">{it.size}</p>
                        </div>

                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            {/* Selector manual de cantidad */}
                            <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-0.5 border">
                              <button
                                onClick={() => setQty(it.id, it.qty - 1)}
                                className="grid h-7 w-7 place-items-center rounded-md bg-white border border-neutral-200 shadow-2xs hover:bg-neutral-50 active:scale-95 transition"
                                title="Restar 1"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-7 text-center text-sm font-black text-secondary">{it.qty}</span>
                              <button
                                onClick={() => setQty(it.id, it.qty + 1)}
                                className="grid h-7 w-7 place-items-center rounded-md bg-white border border-neutral-200 shadow-2xs hover:bg-neutral-50 active:scale-95 transition"
                                title="Sumar 1"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            {/* Subtotal del item */}
                            <div className="text-right">
                              <span className="text-sm font-black text-secondary block">{format(it.price_ars * it.qty)}</span>
                              {it.qty > 1 && (
                                <span className="text-[10px] text-muted-foreground block">{format(it.price_ars)} c/u</span>
                              )}
                            </div>
                          </div>

                          {/* Botones de selección rápida de cubiertas (1, 2, 4) */}
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Elegir:</span>
                            {[
                              { label: "1", qty: 1 },
                              { label: "2 (par)", qty: 2 },
                              { label: "4 (juego)", qty: 4 },
                            ].map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => setQty(it.id, preset.qty)}
                                className={`rounded-md px-2 py-0.5 text-[10px] font-black transition ${
                                  it.qty === preset.qty
                                    ? "bg-primary text-primary-foreground shadow-2xs"
                                    : "bg-muted text-neutral-600 hover:bg-neutral-200"
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Selector de Forma de Pago dentro del scroll */}
              {items.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-neutral-200/70">
                  <p className="text-xs font-black uppercase tracking-wider text-secondary">
                    Seleccioná tu medio de pago:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`rounded-2xl border p-3 text-left transition ${
                        !isTransfer
                          ? "border-[#009EE3] bg-[#009EE3]/10 text-secondary shadow-sm ring-2 ring-[#009EE3]/40"
                          : "border-neutral-200 bg-background text-neutral-600 hover:border-neutral-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-[#009EE3]">Tarjeta / MP</span>
                        <span className="rounded bg-[#009EE3] px-1.5 py-0.5 text-[9px] font-black text-white uppercase">6 cuotas</span>
                      </div>
                      <p className="mt-1 text-sm font-black text-secondary">
                        {format(total)}
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold text-emerald-700">
                        6 de {format(Math.round(total / 6))} sin interés
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("transfer")}
                      className={`rounded-2xl border p-3 text-left transition ${
                        isTransfer
                          ? "border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm ring-2 ring-emerald-500/40"
                          : "border-neutral-200 bg-background text-neutral-600 hover:border-neutral-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-emerald-800">Transferencia</span>
                        <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-black text-white uppercase">15% OFF</span>
                      </div>
                      <p className="mt-1 text-sm font-black text-emerald-950">
                        {format(Math.round(total * 0.85))}
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold text-emerald-700">
                        Ahorrás {format(discountAmount)}
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Desglose de importes */}
              {items.length > 0 && (
                <div className="space-y-1.5 rounded-xl bg-neutral-50 p-3.5 border border-neutral-200/70 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Precio de lista</span>
                    <span className={isTransfer ? "line-through text-neutral-400 font-semibold" : "font-bold text-secondary"}>
                      {format(total)}
                    </span>
                  </div>
                  {isTransfer && (
                    <div className="flex justify-between font-bold text-emerald-700">
                      <span>Descuento Transferencia (15%)</span>
                      <span>-{format(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between border-t border-neutral-200/80 pt-2 text-sm">
                    <span className="font-black uppercase tracking-wider text-secondary">Total a abonar</span>
                    <span className="text-xl font-black text-emerald-600">
                      {format(finalTotal)}
                    </span>
                  </div>
                  {!isTransfer && total > 0 && (
                    <p className="text-[11px] font-bold text-emerald-600 text-right">
                      o 6 cuotas fijas sin interés de {format(Math.round(total / 6))}
                    </p>
                  )}
                </div>
              )}

              {/* Nota de garantía compacta */}
              {items.length > 0 && (
                <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground pt-1 pb-2">
                  <Lock className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Pago 100% seguro · Garantía oficial 5 años</span>
                </div>
              )}
            </div>

            {/* Footer Fijo con el Botón Principal SIEMPRE visible */}
            {items.length > 0 && (
              <footer className="shrink-0 border-t p-4 sm:p-5 bg-card shadow-lg sticky bottom-0 z-10 space-y-2">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-bold text-muted-foreground uppercase tracking-wider">Total</span>
                  <span className="text-lg font-black text-secondary">
                    {format(finalTotal)}
                    {!isTransfer ? (
                      <span className="text-xs font-bold text-emerald-600 ml-1.5">(6 cuotas sin interés)</span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 ml-1.5">(15% OFF aplicado)</span>
                    )}
                  </span>
                </div>

                {!isTransfer ? (
                  <button
                    onClick={() => setStep("form")}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[#009EE3] py-3.5 px-4 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-sky-500/25 hover:bg-[#0087c2] active:scale-[0.99] transition"
                  >
                    <CreditCard className="h-5 w-5" />
                    Pagar con Mercado Pago (6 cuotas) ➔
                  </button>
                ) : (
                  <button
                    onClick={() => setStep("form")}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[#00A859] py-3.5 px-4 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-500/25 hover:bg-[#008f4c] active:scale-[0.99] transition"
                  >
                    <Lock className="h-4 w-4" />
                    Continuar con Transferencia (15% OFF) ➔
                  </button>
                )}

                <p className="text-center text-[10px] text-muted-foreground">
                  {!isTransfer ? "Aceptamos todas las tarjetas de crédito y débito vía Mercado Pago" : "Transferí con 15% OFF directo al Alias oficial LERADIAL"}
                </p>
              </footer>
            )}
          </>
        )}

        {step === "form" && (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto p-4 sm:p-5">
              <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 text-xs text-secondary">
                <p className="font-bold">Completá tus datos para el envío y facturación:</p>
                <p className="text-muted-foreground mt-0.5">
                  {!isTransfer ? "Luego te llevamos directo a Mercado Pago para abonar en 6 cuotas sin interés." : "Al confirmar te damos los datos de transferencia y link directo a WhatsApp."}
                </p>
              </div>

              <Field label="Nombre y apellido *" value={form.customer_name} onChange={v => setForm({ ...form, customer_name: v })} placeholder="Ej: Juan Pérez" />
              <Field label="DNI o CUIT (para despacho y factura) *" value={form.customer_dni} onChange={v => setForm({ ...form, customer_dni: v })} placeholder="Ej: 35.123.456 o 20-35123456-8" />
              <Field label="Teléfono (WhatsApp) *" value={form.customer_phone} onChange={v => setForm({ ...form, customer_phone: v })} placeholder="Ej: 11 2345 6789" type="tel" />
              <Field label="Email" value={form.customer_email} onChange={v => setForm({ ...form, customer_email: v })} type="email" placeholder="Para recibir tu comprobante" />
              <Field label="Dirección / Localidad de entrega" value={form.customer_address} onChange={v => setForm({ ...form, customer_address: v })} placeholder="Ej: Av. Rivadavia 1234, CABA" />

              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-secondary">Notas (opcional)</span>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Horarios de entrega o aclaraciones..."
                  className="w-full rounded-xl border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              {error && <p className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive font-medium">{error}</p>}

              <div className="rounded-xl bg-neutral-100 p-3 text-xs space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-muted-foreground">Total a abonar:</span>
                  <strong className="text-base text-secondary">{format(finalTotal)}</strong>
                </div>
                {!isTransfer ? (
                  <p className="text-[11px] font-semibold text-[#009EE3]">
                    💳 Financiación: 6 cuotas sin interés de {format(Math.round(total / 6))}
                  </p>
                ) : (
                  <p className="text-[11px] font-semibold text-emerald-700">
                    🏦 15% OFF por transferencia bancaria aplicado (-{format(discountAmount)})
                  </p>
                )}
              </div>
            </div>

            <footer className="shrink-0 flex gap-2 border-t p-4 bg-card shadow-lg sticky bottom-0 z-10">
              <button
                type="button"
                onClick={() => setStep("cart")}
                className="flex-1 rounded-full border py-3 text-xs font-bold uppercase hover:bg-muted transition"
              >
                Volver
              </button>

              {!isTransfer ? (
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-[2] flex items-center justify-center gap-1.5 rounded-full bg-[#009EE3] py-3.5 text-xs font-black uppercase tracking-wider text-white hover:bg-[#0087c2] shadow-md shadow-sky-500/25 disabled:opacity-50 transition"
                >
                  <CreditCard className="h-4 w-4" />
                  {sending ? "Conectando a MP..." : "Ir a Pagar a Mercado Pago ➔"}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-[2] flex items-center justify-center gap-1.5 rounded-full bg-[#00A859] py-3.5 text-xs font-black uppercase tracking-wider text-white hover:bg-[#008f4c] shadow-md disabled:opacity-50 transition"
                >
                  <Lock className="h-4 w-4" />
                  {sending ? "Enviando..." : "Confirmar Pedido (15% OFF) ➔"}
                </button>
              )}
            </footer>
          </form>
        )}

        {step === "done" && (
          <div className="flex flex-1 flex-col min-h-0 h-full overflow-y-auto p-5 sm:p-6">
            <div className="flex flex-col items-center text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-7 w-7" />
              </div>
              <h3 className="mt-3 text-xl font-black text-secondary">¡Pedido registrado con éxito!</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Pedido{orderId ? ` #${orderId.slice(0, 8).toUpperCase()}` : ""} · Total
              </p>
              <p className="mt-1 text-3xl font-black text-primary">{format(orderTotal)}</p>
              {!isTransfer && (
                <p className="mt-1 text-xs font-bold text-emerald-600">
                  En hasta 6 cuotas fijas sin interés de {format(Math.round(orderTotal / 6))}
                </p>
              )}
            </div>

            {orderId && (
              <MercadoPagoBlock
                orderId={orderId}
                total={orderTotal}
                payment={orderPayment}
                initialInitPoint={orderInitPoint}
                items={confirmedItems}
                isTransfer={isTransfer}
                customer={{
                  name: form.customer_name,
                  email: form.customer_email,
                  phone: form.customer_phone,
                }}
              />
            )}

            <button onClick={close} className="mt-6 rounded-full bg-neutral-900 py-3 text-sm font-bold uppercase text-white hover:bg-neutral-800 transition-colors">
              Cerrar y volver a la tienda
            </button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Una vez acreditado el pago, despachamos tu pedido en el día y te enviamos la guía de seguimiento.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-secondary">{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function MercadoPagoBlock({
  orderId,
  total,
  payment,
  initialInitPoint,
  items,
  customer,
  isTransfer = true,
}: {
  orderId: string;
  total: number;
  payment?: any;
  initialInitPoint?: string | null;
  items?: CartItem[];
  customer?: { name?: string; email?: string; phone?: string };
  isTransfer?: boolean;
}) {
  const createPref = useServerFn(createMpPreference);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initPoint, setInitPoint] = useState<string | null>(initialInitPoint || null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const shortRef = orderId.slice(0, 8).toUpperCase();
  const rawWa = payment?.whatsapp || "5491178292980";
  const cleanWa = rawWa.replace(/[^0-9]/g, "");
  const waMsg = encodeURIComponent(
    `¡Hola Le Radial! Acabo de confirmar el Pedido #${shortRef} por un total de $${total.toLocaleString("es-AR")}${isTransfer ? " (con 15% OFF por transferencia)" : ""} en la tienda online y quiero coordinar el pago / enviar el comprobante.`
  );
  const waHref = `https://wa.me/${cleanWa}?text=${waMsg}`;

  // Alias oficial confirmado por Guillermo: estrictamente LERADIAL
  const bankAlias = "LERADIAL";
  const bankCbu = payment?.bank_cbu || "";
  const bankHolder = payment?.bank_holder || "Le Radial";
  const bankName = payment?.bank_name || "Banco";

  function copyToClipboard(text: string, key: string) {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  }

  async function tryPay() {
    if (initPoint) {
      window.location.href = initPoint;
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await createPref({
        data: {
          order_id: orderId,
          back_url_base: window.location.origin,
          items: items?.map((i) => ({
            id: i.id,
            brand: i.brand,
            model: i.model,
            size: i.size,
            price_ars: i.price_ars,
            qty: i.qty,
          })),
          customer_name: customer?.name,
          customer_email: customer?.email,
          customer_phone: customer?.phone,
        },
      });
      if (res?.notConfigured) {
        setError("Mercado Pago está en mantenimiento técnico. Podés abonar por Transferencia Bancaria al Alias LERADIAL o coordinar por WhatsApp.");
        setLoading(false);
        return;
      }
      if (res?.init_point) {
        setInitPoint(res.init_point);
        window.location.href = res.init_point;
      }
    } catch (e: any) {
      setError(
        e?.message?.includes("configurado")
          ? "Mercado Pago en mantenimiento. Utilizá la opción de Transferencia Bancaria directa al Alias LERADIAL."
          : (e?.message || "No se pudo conectar con Mercado Pago. Podés abonar por transferencia.")
      );
      setLoading(false);
    }
  }

  const mpCard = (
    <div className={`rounded-2xl border ${!isTransfer ? "border-2 border-[#009EE3]/60 bg-[#009EE3]/10 shadow-md" : "border-[#009EE3]/30 bg-[#009EE3]/5"} p-4 text-left`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-[#009EE3]">
          Tarjeta o Mercado Pago
        </p>
        <span className="rounded-full bg-[#009EE3] px-2 py-0.5 text-[10px] font-bold text-white uppercase">
          6 cuotas sin interés
        </span>
      </div>
      <p className="mt-1 text-xs text-neutral-700 font-medium">
        Aboná en hasta 6 cuotas fijas sin interés con todas las tarjetas de crédito o con débito y saldo MP.
      </p>
      <button
        onClick={() => (initPoint ? (window.location.href = initPoint) : tryPay())}
        disabled={loading}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#009EE3] py-3 text-sm font-bold uppercase text-white shadow-md hover:bg-[#0081b8] disabled:opacity-60 transition"
      >
        <CreditCard className="h-4 w-4" />
        {loading ? "Conectando con Mercado Pago..." : initPoint ? "Abrir Mercado Pago (6 cuotas)" : "Pagar con Mercado Pago (6 cuotas)"}
      </button>
      {error && (
        <p className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] text-amber-900 font-medium">
          ⚠️ {error}
        </p>
      )}
    </div>
  );

  const transferCard = (
    <div className={`rounded-2xl border-2 ${isTransfer ? "border-emerald-500/60 bg-emerald-50/80 shadow-sm" : "border-neutral-200 bg-neutral-50/60"} p-4 text-left`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
          {isTransfer ? "Opción seleccionada: Transferencia (15% OFF)" : "Alternativa: Transferencia Bancaria (15% OFF)"}
        </p>
        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
          15% OFF
        </span>
      </div>
      <p className="mt-1 text-xs text-emerald-950 font-medium">
        Aboná con el 15% de descuento directo y envianos el comprobante para despachar en el día:
      </p>

      <div className="mt-3 space-y-2 rounded-xl bg-white p-3 border border-emerald-200/80 text-xs text-neutral-800">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold text-neutral-500 uppercase block">Alias</span>
            <span className="font-mono font-bold text-sm text-emerald-900">{bankAlias}</span>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(bankAlias, "alias")}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 transition"
          >
            {copiedKey === "alias" ? <CheckCheck className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedKey === "alias" ? "¡Copiado!" : "Copiar"}
          </button>
        </div>

        {bankCbu && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-100">
            <div>
              <span className="text-[10px] font-bold text-neutral-500 uppercase block">CBU</span>
              <span className="font-mono text-xs text-neutral-700">{bankCbu}</span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(bankCbu, "cbu")}
              className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 text-[11px] font-bold text-neutral-700 transition"
            >
              {copiedKey === "cbu" ? <CheckCheck className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedKey === "cbu" ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
        )}

        <div className="pt-1 text-[11px] text-neutral-600 border-t border-neutral-100 flex justify-between">
          <span><strong>Titular:</strong> {bankHolder}</span>
          {bankName && <span><strong>Banco:</strong> {bankName}</span>}
        </div>
      </div>

      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-md hover:bg-emerald-700 transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        Coordinar / Enviar comprobante
      </a>
    </div>
  );

  return (
    <div className="mt-5 space-y-4">
      {!isTransfer ? (
        <>
          {mpCard}
          {transferCard}
        </>
      ) : (
        <>
          {transferCard}
          {mpCard}
        </>
      )}
    </div>
  );
}


