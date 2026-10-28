import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** @typedef {string | number | boolean | null | object} JsonValue */
/** @typedef {{[key: string]: JsonValue}} JsonObject */
/** @typedef {{slug: string, name: string, category_slug: string, description: string, address: string, phone: string | null, email: string | null, website: string, booking_url: string, listing_source_url: string, photo: {url: string, source_url: string, attribution: string}, published_services: string[], published_team: string[]}} Listing */
/** @typedef {{version: string, reviewed_at: string, businesses: Listing[], retire_preview_slugs: string[]}} Catalog */
/** @typedef {(input: string | URL | Request, init?: RequestInit) => Promise<Response>} Fetcher */
/** @typedef {{origin: string, email: string, password: string}} Credentials */

// CONFIGURATION
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const API_ORIGIN = "https://habitu-sebaz-api.onrender.com";
const LOCAL_ORIGIN = "http://localhost:8000";
const SLUGS = [
  "asvet-pereira",
  "bioveterinarios-pereira",
  "mascovet-pereira",
  "sportcenter-la-villa-pereira",
  "jesimoncadabeauty-pereira",
  "el-eden-de-la-belleza-pereira",
  "spaces-tattoo-pereira",
  "estigma-tattoo-pereira",
];
const PREVIEWS = [
  "cuba-prueba-bambinos",
  "cuba-prueba-imperio",
  "cuba-prueba-barber-house-studio",
];

// HELPERS
/** @param {boolean} condition @param {string} message */
const ensure = (condition, message) => {
  if (!condition) throw new Error(message);
};
/** @param {JsonValue | undefined} value @returns {JsonObject} */
const object = (value) => {
  ensure(
    Boolean(value && typeof value === "object" && !Array.isArray(value)),
    "Respuesta de catálogo no válida.",
  );
  return /** @type {JsonObject} */ (value);
};
/** @param {JsonValue | undefined} value @returns {JsonObject[]} */
const rows = (value) => {
  ensure(Array.isArray(value), "Falta una colección del catálogo.");
  return /** @type {JsonValue[]} */ (value).map(object);
};
/** @param {JsonValue | undefined} value */
const identifier = (value) => {
  ensure(
    typeof value === "number" && Number.isSafeInteger(value) && value > 0,
    "Identificador no válido.",
  );
  return /** @type {number} */ (value);
};
/** @param {string} value */
const https = (value) => {
  const url = new URL(value);
  ensure(
    url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !/[\u0000-\u0020\u007f]/.test(value),
    "La referencia debe ser una URL HTTPS pública.",
  );
};
/** @param {Catalog} catalog */
export const validateCatalog = (catalog) => {
  ensure(
    catalog.version === "pereira-real-2026-10-28" &&
      catalog.reviewed_at === "2026-10-28",
    "Revisa la versión de las fuentes antes de importar.",
  );
  ensure(
    catalog.businesses.length === 8 &&
      new Set(catalog.businesses.map((row) => row.slug)).size === 8 &&
      SLUGS.every((slug) =>
        catalog.businesses.some((row) => row.slug === slug),
      ),
    "El catálogo revisado contiene ocho fichas concretas.",
  );
  ensure(
    JSON.stringify(catalog.retire_preview_slugs) === JSON.stringify(PREVIEWS),
    "No se permite retirar otras fichas.",
  );
  for (const row of catalog.businesses) {
    ensure(
      [
        "veterinaria",
        "beauty-salon",
        "cancha-futbol",
        "tattoo-studio",
      ].includes(row.category_slug),
      "Categoría no revisada.",
    );
    ensure(
      row.name.length > 2 &&
        row.address.length > 8 &&
        row.description.length > 25 &&
        !/prueba|demostraci[oó]n/i.test(row.name),
      "Faltan los datos publicados del negocio.",
    );
    [
      row.website,
      row.booking_url,
      row.listing_source_url,
      row.photo.url,
      row.photo.source_url,
    ].forEach(https);
    ensure(
      row.phone === null || /^\+57\d{10}$/.test(row.phone),
      "Usa un teléfono comercial colombiano publicado.",
    );
    ensure(
      row.email === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email),
      "Correo comercial no válido.",
    );
    ensure(
      row.photo.attribution.length > 5 &&
        Array.isArray(row.published_services) &&
        Array.isArray(row.published_team),
      "Falta procedencia de la ficha.",
    );
  }
};
export const readCatalog = async () => {
  const catalog = /** @type {Catalog} */ (
    JSON.parse(
      await readFile(resolve(ROOT, "deploy/catalog/pereira-real.json"), "utf8"),
    )
  );
  validateCatalog(catalog);
  return catalog;
};
/** @param {Listing} row @param {number} categoryId */
export const listingPayload = (row, categoryId) => ({
  business_category_id: categoryId,
  slug: row.slug,
  name: row.name,
  description: `${row.description}\n\nImagen publicada por ${row.photo.attribution}. Información consultada el 2026-10-28; reservas y condiciones en el canal oficial del negocio.`,
  address: row.address,
  phone: row.phone,
  email: row.email,
  website: row.website,
  banner_url: row.photo.url,
  booking_mode: "external",
  booking_url: row.booking_url,
  listing_source_url: row.listing_source_url,
  uses_professionals: false,
  uses_resources: false,
  is_active: false,
});

// IMPORT
/** @param {{catalog: Catalog, credentials: Credentials, local?: boolean, fetcher?: Fetcher, log?: (message: string) => void}} options */
export const importRealCatalog = async ({
  catalog,
  credentials,
  local = false,
  fetcher = fetch,
  log = console.log,
}) => {
  validateCatalog(catalog);
  ensure(
    credentials.origin === (local ? LOCAL_ORIGIN : API_ORIGIN),
    "El destino no coincide con el entorno autorizado.",
  );
  ensure(
    credentials.email.length > 3 && credentials.password.length > 0,
    "Faltan credenciales del administrador del catálogo.",
  );
  // No credentials are sent to photo publishers, and no photographs are rehosted.
  const photos = await Promise.allSettled(
    catalog.businesses.map(async (row) => {
      const response = await fetcher(row.photo.url, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(30000),
      });
      ensure(
        response.ok &&
          /^image\/(?:jpeg|png|webp|avif)(?:;|$)/i.test(
            response.headers.get("content-type") ?? "",
          ),
        `No se pudo verificar la imagen publicada de ${row.slug}.`,
      );
    }),
  );
  for (const photo of photos)
    if (photo.status === "rejected") throw photo.reason;

  let token = "";
  /** @param {string} method @param {string} path @param {object} [body] @returns {Promise<JsonObject>} */
  const api = async (method, path, body) => {
    let response;
    try {
      response = await fetcher(credentials.origin + "/api" + path, {
        method,
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        redirect: "manual",
        signal: AbortSignal.timeout(90000),
      });
    } catch {
      throw new Error(
        `No se confirmó ${method} ${path}; no se reintentó la operación.`,
      );
    }
    ensure(
      response.ok,
      `HTTP ${response.status} en ${method} ${path}; revisa el slug antes de continuar.`,
    );
    return object(/** @type {JsonValue} */ (await response.json()));
  };
  /** @type {{row: Listing, id: number, active: boolean}[]} */
  const staged = [];
  /** @type {{id: number, slug: string}[]} */
  const retired = [];
  try {
    const login = await api("POST", "/auth/login", {
      email: credentials.email,
      password: credentials.password,
    });
    ensure(
      typeof login.token === "string" && login.token.length > 0,
      "No se obtuvo una sesión del catálogo.",
    );
    token = /** @type {string} */ (login.token);
    const actor = object((await api("GET", "/auth/me")).user);
    ensure(
      actor.role === "SUPERADMIN",
      "Se requiere superadmin para publicar referencias externas.",
    );
    const categories = rows(
      (await api("GET", "/v2/businesses/categories")).data,
    );
    ensure(
      catalog.businesses.every((row) =>
        categories.some((category) => category.slug === row.category_slug),
      ),
      "Falta desplegar una categoría del catálogo.",
    );
    const current = rows((await api("GET", "/v2/businesses")).data);
    for (const row of catalog.businesses) {
      const category = categories.find(
        (item) => item.slug === row.category_slug,
      );
      const payload = listingPayload(row, identifier(category?.id));
      const existing = current.find((item) => item.slug === row.slug);
      const detail = existing
        ? object(
            (await api("GET", `/v2/businesses/${identifier(existing.id)}`))
              .data,
          )
        : object((await api("POST", "/v2/businesses", payload)).data);
      const matches =
        detail.slug === row.slug &&
        detail.name === row.name &&
        detail.booking_mode === "external" &&
        detail.owner_user_id === null &&
        detail.description === payload.description &&
        detail.banner_url === row.photo.url &&
        detail.website === row.website &&
        detail.booking_url === row.booking_url &&
        detail.listing_source_url === row.listing_source_url &&
        (detail.phone ?? null) === row.phone &&
        (detail.email ?? null) === row.email &&
        detail.verified === false &&
        Number(detail.rating) === 0 &&
        Number(detail.reviews_count) === 0 &&
        rows(detail.services).length === 0 &&
        rows(detail.professionals).length === 0 &&
        rows(detail.resources).length === 0 &&
        rows(detail.branches).length === 1 &&
        rows(detail.branches)[0].address === row.address;
      ensure(
        matches,
        `La ficha ${row.slug} no coincide con la referencia revisada; se conservó sin sobrescribir.`,
      );
      staged.push({
        row,
        id: identifier(detail.id),
        active: detail.is_active === true,
      });
      log(`Referencia verificada: ${row.slug} (ID ${detail.id}).`);
    }
    ensure(staged.length === 8, "No se verificaron todas las fichas.");
    for (const item of staged)
      if (!item.active)
        await api("PUT", `/v2/businesses/${item.id}`, { is_active: true });
    for (const slug of catalog.retire_preview_slugs) {
      const previous = current.find((row) => row.slug === slug);
      if (!previous || previous.is_active === false) continue;
      ensure(
        Number(previous.owner_user_id) === Number(actor.id) &&
          String(previous.name).endsWith(" · Prueba") &&
          String(previous.description).startsWith("FICHA DE PRUEBA") &&
          previous.booking_mode === "internal",
        `La ficha previa ${slug} requiere revisión; no se modificó.`,
      );
      await api("PUT", `/v2/businesses/${identifier(previous.id)}`, {
        is_active: false,
      });
      retired.push({ id: identifier(previous.id), slug });
    }
    return {
      published: staged.map((item) => ({ id: item.id, slug: item.row.slug })),
      retired,
      staff_accounts_created: 0,
      internal_calendars_created: 0,
    };
  } finally {
    if (token) await api("POST", "/auth/logout");
  }
};

// CLI
const main = async () => {
  const args = process.argv.slice(2);
  ensure(
    args.every((arg) =>
      ["--dry-run", "--apply", "--apply-local"].includes(arg),
    ) && args.length <= 1,
    "Uso: node deploy/import-real-catalog.mjs [--dry-run | --apply | --apply-local]",
  );
  const catalog = await readCatalog();
  if (!args.includes("--apply") && !args.includes("--apply-local")) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          businesses: catalog.businesses.map((row) => ({
            slug: row.slug,
            category: row.category_slug,
            name: row.name,
          })),
          retire_from_public_catalog: catalog.retire_preview_slugs,
          staff_accounts_created: 0,
          internal_calendars_created: 0,
        },
        null,
        2,
      ),
    );
    return;
  }
  const local = args.includes("--apply-local");
  const env = local
    ? process.env
    : parseEnv(await readFile(resolve(ROOT, "deploy/.env.preview"), "utf8"));
  const credentials = local
    ? {
        origin: LOCAL_ORIGIN,
        email: env.CATALOG_ADMIN_EMAIL ?? "",
        password: env.CATALOG_ADMIN_PASSWORD ?? "",
      }
    : {
        origin: env.APP_URL ?? "",
        email: env.SUPERADMIN_EMAIL ?? "",
        password: env.SUPERADMIN_PASSWORD ?? "",
      };
  console.log(
    JSON.stringify(
      await importRealCatalog({ catalog, credentials, local }),
      null,
      2,
    ),
  );
};
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "No se completó la importación.",
    );
    process.exitCode = 1;
  });
