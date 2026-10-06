/**
 * Reads a local image File, scales it to max dimensions using an HTML5 Canvas,
 * and returns an optimized WebP or PNG Data URL.
 * This completely avoids cloud storage bucket RLS issues and produces compact images (20-45KB).
 */
export function optimizeAndReadImage(file: File, maxDim = 600, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo seleccionado"));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error("Formato de imagen no soportado"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSide = Math.max(img.width, img.height);
        const scale = maxSide > maxDim ? maxDim / maxSide : 1;
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Usar webp para comprimir fotos a ~40-70KB preservando excelente calidad
        const dataUrl = canvas.toDataURL("image/webp", quality);
        resolve(dataUrl);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
