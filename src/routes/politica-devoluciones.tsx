import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/politica-devoluciones")({
  head: () => ({
    meta: [
      { title: "Política de Envíos y Devoluciones — Le Radial" },
      {
        name: "description",
        content:
          "Política de envíos y devoluciones de Le Radial: envío gratuito en Argentina y Chile, devoluciones por defecto de fabricación y garantía de 5 años con certificación INMETRO - TÜV SÜD.",
      },
    ],
  }),
  component: PoliticaDevolucionesPage,
});

function PoliticaDevolucionesPage() {
  return (
    <div className="min-h-screen bg-muted">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Link
          to="/"
          className="mb-6 inline-block text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          ← Volver
        </Link>

        <div className="rounded-2xl bg-card p-8 shadow-[var(--shadow-product)]">
          <div className="mb-6 flex items-baseline gap-1">
            <span className="text-2xl font-black tracking-tighter text-primary">LE</span>
            <span className="text-2xl font-black tracking-tighter text-secondary">RADIAL</span>
          </div>

          <h1 className="text-2xl font-bold text-secondary">
            Política de Envíos y Devoluciones
          </h1>

          <section className="mt-8">
            <h2 className="text-lg font-bold text-secondary">Envíos</h2>
            <ul className="mt-3 space-y-2 text-sm text-foreground/90">
              <li>• Envío gratuito a Argentina y Chile.</li>
              <li>• Tiempo de entrega: 0 a 1 días hábiles.</li>
              <li>• Pedido mínimo: 4 unidades por compra.</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-bold text-secondary">Devoluciones</h2>
            <p className="mt-3 text-sm text-foreground/90">
              Aceptamos devoluciones únicamente por defecto de fabricación. No se aceptan
              devoluciones por arrepentimiento de compra.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-bold text-secondary">Garantía</h2>
            <p className="mt-3 text-sm text-foreground/90">
              Todos nuestros neumáticos cuentan con certificación INMETRO - TÜV SÜD y garantía
              de 5 años por defecto de fabricación.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-bold text-secondary">Contacto</h2>
            <p className="mt-3 text-sm text-foreground/90">
              Ante cualquier consulta sobre un producto con defecto de fabricación, escribinos a{" "}
              <a href="mailto:hola@leradial.com.ar" className="text-primary hover:underline">
                hola@leradial.com.ar
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
