import { env } from "node:process";

// CONSTANTS
const TIMEOUT_MS = 20000;
const REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "authorization",
  "content-type",
  "idempotency-key",
  "x-event-checksum",
];
const RESPONSE_HEADERS = [
  "content-type",
  "content-disposition",
  "content-language",
  "retry-after",
  "www-authenticate",
  "x-request-id",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
];
const METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const ROUTE_QUERY = "__habitu_api_path";

// SERVICES
const responseHeaders = (): Headers =>
  new Headers({
    "Cache-Control": "private, no-store",
    "CDN-Cache-Control": "no-store",
    "Vercel-CDN-Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });

const failure = (status: number, code: string, message: string): Response =>
  Response.json(
    { success: false, error: code, message },
    { status, headers: responseHeaders() },
  );

const backendOrigin = (): URL | null => {
  const configured = env.HABITU_API_ORIGIN;
  if (!configured) return null;
  try {
    const url = new URL(configured);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
      ? url
      : null;
  } catch {
    return null;
  }
};

// HANDLER
const proxy = async (request: Request): Promise<Response> => {
  const incoming = new URL(request.url);
  if (!/^\/api(?:\/|$)/.test(incoming.pathname))
    return failure(404, "API_ROUTE_NOT_FOUND", "La ruta de API no existe.");
  if (!METHODS.includes(request.method))
    return failure(405, "API_METHOD_NOT_ALLOWED", "Método no permitido.");

  // Vercel explicitly routes standalone API paths to this static function.
  const routedPath = incoming.searchParams.get(ROUTE_QUERY);
  const pathname =
    routedPath === null ? incoming.pathname : `/api/${routedPath}`;
  incoming.searchParams.delete(ROUTE_QUERY);
  const target = new URL(incoming.origin);
  target.pathname = pathname;
  target.search = incoming.search;
  if (!/^\/api(?:\/|$)/.test(target.pathname))
    return failure(400, "API_ROUTE_NOT_FOUND", "La ruta de API no es válida.");

  const origin = backendOrigin();
  if (!origin)
    return failure(
      503,
      "API_NOT_CONFIGURED",
      "El servidor de la aplicación aún no está disponible. El acceso, las reservas y los pagos estarán habilitados al completar su configuración.",
    );

  // The destination is fixed by server configuration; no URL supplied by a client is used.
  target.protocol = origin.protocol;
  target.host = origin.host;
  const headers = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  headers.set("Cache-Control", "no-store");

  const signal = AbortSignal.any([
    request.signal,
    AbortSignal.timeout(TIMEOUT_MS),
  ]);
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : await request.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
      signal,
    });

    // Never follow redirects with the user's Bearer token or expose redirect credentials.
    if (
      upstream.status >= 300 &&
      upstream.status < 400 &&
      upstream.status !== 304
    ) {
      await upstream.body?.cancel();
      return failure(
        502,
        "API_REDIRECT_BLOCKED",
        "El servidor respondió con una redirección no válida. Inténtalo de nuevo más tarde.",
      );
    }
    if (
      upstream.headers.get("content-type")?.toLowerCase().includes("text/html")
    ) {
      await upstream.body?.cancel();
      return failure(
        502,
        "API_INVALID_RESPONSE",
        "El servidor no pudo responder a esta solicitud. Inténtalo de nuevo más tarde.",
      );
    }

    const resultHeaders = responseHeaders();
    for (const name of RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value !== null) resultHeaders.set(name, value);
    }
    return new Response(
      request.method === "HEAD" || [204, 205, 304].includes(upstream.status)
        ? null
        : upstream.body,
      { status: upstream.status, headers: resultHeaders },
    );
  } catch (cause) {
    const timedOut =
      signal.aborted ||
      (cause instanceof Error && cause.name === "TimeoutError");
    return failure(
      timedOut ? 504 : 502,
      timedOut ? "API_TIMEOUT" : "API_UNAVAILABLE",
      "No se pudo confirmar la respuesta del servidor. Consulta el estado de tu operación antes de repetir una reserva o un pago.",
    );
  }
};

// EXPORT
export default { fetch: proxy };
