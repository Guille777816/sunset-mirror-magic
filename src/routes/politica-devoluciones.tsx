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
              <li>• Tiempo de preparación: 2 días hábiles, para luego enviar el pedido.</li>
              <li>• Pedido mínimo: 4 unidades por compra.</li>
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-bold text-secondary">Devoluciones</h2>
            <p className="mt-3 text-sm text-foreground/90">
              Una vez recibido el producto, aceptamos devoluciones únicamente por defecto de
              fabricación.
            </p>
            <p className="mt-4 text-sm text-foreground/90">
              En caso de demora en aduana o arrepentimiento de compra con el envío ya iniciado
              (con gastos operativos y logísticos en curso), si el cliente prefiere no aguardar
              puede optar por:
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-6 text-sm text-foreground/90">
              <li>Nota de crédito para canjear por otro neumático.</li>
              <li>
                Cancelar la compra y recibir la devolución del dinero en un plazo de 20 a 30 días
                hábiles desde la confirmación de la cancelación.
              </li>
              <li>Seguir esperando a que la aduana libere el envío.</li>
            </ol>
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
