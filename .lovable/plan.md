## Qué voy a hacer

### 1. Nuevo logotipo circular (imagen 1)
- Subo el círculo "Le Radial – Ultra High Performance" como asset del sitio.
- Lo uso como **favicon** (pestaña del navegador) y como imagen por defecto cuando no hay logo cargado en Ajustes.

### 2. Header (arriba del sitio)
- Reemplazo el texto grande "LE RADIAL" por el cartel negro rectangular de la imagen 3 (queda como logo horizontal en el header).
- Se sigue respetando el logo que subís desde Admin → Ajustes; si no hay ninguno, se usa el cartel negro.
- Quito el texto "cubiertas" que aparece al costado del nombre.

### 3. Barra superior de dirección
- Saco el texto por defecto "Posadas, Misiones · Envíos a toda la Argentina".
- Muestro exclusivamente la dirección que tengas cargada en Admin → Ajustes (ahora la de Buenos Aires). Si el campo está vacío, no aparece nada.

### 4. Sección Categorías → Banners rotativos administrables
- **Elimino** de la portada la grilla de tarjetas de categorías (Autos / Camionetas / Camiones / Agrícolas / Industriales).
- En su lugar creo un **carrusel de banners** ancho, con auto-scroll (rotación automática cada ~5 s, con transición suave y opción de pausar al pasar el mouse).
- La navegación por categorías sigue disponible en el menú superior (Inicio · Autos · Camionetas · …), como ya está.
- Nuevo panel en Admin → **"Banners"** para gestionarlos:
  - Subir imagen desde la compu (o pegar URL).
  - Título opcional, subtítulo opcional y enlace opcional (por si querés que el banner lleve a una categoría o promo).
  - Activar / desactivar cada banner.
  - Ordenarlos (número de orden).
  - Editar y borrar.
- Los banners se guardan en la base de datos en una tabla nueva `banners` con permisos:
  - Ver: cualquiera (solo los activos).
  - Crear / editar / borrar: solo admin.

### 5. Redes sociales en el footer
- **Bug actual**: cargás los links de Instagram / Facebook en Ajustes pero los íconos no aparecen porque el footer no los estaba mostrando.
- Agrego los íconos de **Instagram** y **Facebook** al footer, al lado del botón de WhatsApp. Solo aparecen si el link está cargado en Ajustes; si el campo está vacío, no se muestra ese ícono.
- Los enlaces abren en pestaña nueva.

---

## Detalles técnicos (para referencia)

- Subir el logo circular con `lovable-assets` a `src/assets/le-radial-circle.png.asset.json` y usarlo como favicon en `__root.tsx` + como fallback en `index.tsx`.
- Subir el cartel negro a `src/assets/le-radial-header.png.asset.json` y usarlo como fallback del `<img>` de logo en el header.
- Nueva migración: tabla `public.banners` con columnas `id`, `title`, `subtitle`, `image_url`, `link_url`, `is_active`, `sort_order`, timestamps. RLS: `SELECT` público sobre `is_active = true`, escritura sólo admin. `GRANT SELECT` a `anon,authenticated`, `ALL` a `service_role`.
- Server functions nuevas en `src/lib/banners.functions.ts`: `listPublicBanners`, `listAllBanners` (admin), `upsertBanner` (admin), `deleteBanner` (admin).
- En `src/routes/index.tsx`: eliminar la sección `#categorias`, reemplazar por `<BannerCarousel />` con `embla-carousel-react` + `embla-carousel-autoplay` (autoplay 5s, loop, pausa on hover).
- En `src/routes/admin.tsx`: nueva pestaña "Banners" con listado + formulario + subida a Storage (`site-assets`) reutilizando el patrón de imágenes ya existente.
- Footer en `src/routes/index.tsx`: renderizar `<a>` con íconos `Instagram` y `Facebook` de lucide-react cuando `settings.instagram` / `settings.facebook` no estén vacíos.
- Barra superior: renderizar el `<span>` de dirección sólo si `settings.address` está cargado, sin fallback hardcodeado.
