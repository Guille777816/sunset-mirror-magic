import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

const VALID_CATEGORIES = new Set([
  "autos",
  "camionetas",
  "suv",
  "camiones",
  "agricolas",
  "industriales",
  "baterias",
  "lonas",
  "ofertas",
]);

function parseCategoryAndMeasure(pathname: string): { category?: string; medida?: string } | null {
  const clean = pathname.replace(/^\/+|\/+$/g, "");
  if (!clean) return null;
  const parts = clean.split("/");

  if (parts.length === 1) {
    const first = parts[0].toLowerCase();
    if (VALID_CATEGORIES.has(first)) {
      return { category: first };
    }
    if (/\d/.test(first) && (first.includes("r") || first.includes("x") || first.includes("-"))) {
      return { medida: first };
    }
  } else if (parts.length === 2) {
    const first = parts[0].toLowerCase();
    const second = parts[1].toLowerCase();
    if (VALID_CATEGORIES.has(first)) {
      return { category: first, medida: second };
    }
    if (first === "medida") {
      return { medida: second };
    }
  }
  return null;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/producto" || url.pathname === "/producto/") {
        return Response.redirect(`${url.origin}/`, 301);
      }

      const isSystemPath =
        url.pathname.startsWith("/api") ||
        url.pathname.startsWith("/admin") ||
        url.pathname.startsWith("/login") ||
        url.pathname.startsWith("/producto") ||
        url.pathname.startsWith("/politica-devoluciones") ||
        url.pathname.startsWith("/sitemap") ||
        url.pathname.startsWith("/assets") ||
        url.pathname.startsWith("/images") ||
        url.pathname.startsWith("/icons") ||
        url.pathname.startsWith("/videos") ||
        url.pathname.includes(".");

      let effectiveRequest = request;

      if (!isSystemPath) {
        const parsed = parseCategoryAndMeasure(url.pathname);
        if (parsed) {
          const rewrittenUrl = new URL(request.url);
          rewrittenUrl.pathname = "/";
          if (parsed.category) {
            rewrittenUrl.searchParams.set("categoria", parsed.category);
          }
          if (parsed.medida) {
            rewrittenUrl.searchParams.set("medida", parsed.medida);
          }
          effectiveRequest = new Request(rewrittenUrl.toString(), request);
        }
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(effectiveRequest, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
