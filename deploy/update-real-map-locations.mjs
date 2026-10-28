import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  API_ORIGIN,
  readCatalog,
  validateCatalog,
} from "./import-real-catalog.mjs";

/** @typedef {string | number | boolean | null | object} JsonValue */
/** @typedef {{[key: string]: JsonValue}} JsonObject */
/** @typedef {{slug: string, name: string, address: string, lat: number, lng: number, source_url: string, precision: 'published', reviewed_at: string}} PublishedLocation */
/** @typedef {Awaited<ReturnType<typeof readCatalog>>} Catalog */
/** @typedef {{origin: string, email: string, password: string}} Credentials */
/** @typedef {(input: string | URL | Request, init?: RequestInit) => Promise<Response>} Fetcher */

// CONFIGURATION
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_ORIGIN = "http://localhost:8000";

// HELPERS
/** @param {boolean} condition @param {string} message */
const ensure = (condition, message) => {
  if (!condition) throw new Error(message);
};
/** @param {JsonValue | undefined} value @returns {JsonObject} */
const object = (value) => {
  ensure(
    Boolean(value && typeof value === "object" && !Array.isArray(value)),
    "Respuesta JSON no válida.",
  );
  return /** @type {JsonObject} */ (value);
};
/** @param {JsonValue | undefined} value @returns {JsonObject[]} */
const rows = (value) => {
  ensure(Array.isArray(value), "Falta la colección esperada.");
  return /** @type {JsonValue[]} */ (value).map(object);
};
/** @param {JsonValue | undefined} value @returns {number} */
const identifier = (value) => {
  ensure(
    typeof value === "number" && Number.isSafeInteger(value) && value > 0,
    "Identificador no válido.",
  );
  return /** @type {number} */ (value);
};
/** @param {JsonValue | undefined} value @param {number} expected */
const coordinateMatches = (value, expected) =>
  (typeof value === "number" ||
    (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value))) &&
  Number(value) === expected;

/** @param {Catalog} catalog @param {PublishedLocation[]} locations */
export const validateMapLocations = (catalog, locations) => {
  validateCatalog(catalog);
  ensure(
    Array.isArray(locations) &&
      locations.length === 8 &&
      new Set(locations.map((point) => point.slug)).size === 8,
    "Se requieren los ocho puntos revisados.",
  );
  for (const listing of catalog.businesses) {
    const point = locations.find((item) => item.slug === listing.slug);
    ensure(
      Boolean(
        point &&
        point.name === listing.name &&
        point.address === listing.address,
      ),
      `La identidad revisada de ${listing.slug} no coincide con el catálogo.`,
    );
  }
  for (const point of locations) {
    ensure(
      point.precision === "published" && point.reviewed_at === "2026-10-28",
      "Falta revisar la procedencia del punto.",
    );
    ensure(
      typeof point.lat === "number" &&
        typeof point.lng === "number" &&
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lng) &&
        point.lat >= 4.7 &&
        point.lat <= 4.9 &&
        point.lng >= -75.9 &&
        point.lng <= -75.5 &&
        Number(point.lat.toFixed(8)) === point.lat &&
        Number(point.lng.toFixed(8)) === point.lng,
      "El punto debe estar en Pereira y respetar los ocho decimales de la base de datos.",
    );
    const source = new URL(point.source_url);
    ensure(
      source.protocol === "https:" &&
        !source.username &&
        !source.password &&
        ["maps.google.com", "www.fresha.com"].includes(source.hostname),
      "La fuente del punto no es una publicación revisada.",
    );
  }
};

export const readMapLocations = async () =>
  /** @type {PublishedLocation[]} */ (
    JSON.parse(
      await readFile(
        resolve(ROOT, "deploy/catalog/pereira-map-locations.json"),
        "utf8",
      ),
    )
  );

/** @param {JsonObject} detail @param {PublishedLocation} point @param {number} id */
const validateDetail = (detail, point, id) => {
  ensure(
    detail.id === id &&
      detail.slug === point.slug &&
      detail.name === point.name &&
      detail.address === point.address &&
      detail.is_active === true &&
      detail.booking_mode === "external" &&
      detail.owner_user_id === null,
    `La ficha ${point.slug} cambió de identidad, titular, canal o estado; se conservó.`,
  );
  const branches = rows(detail.branches);
  ensure(
    branches.length === 1 &&
      branches[0].is_main_branch === true &&
      branches[0].is_active === true &&
      branches[0].address === point.address,
    `La sede de ${point.slug} requiere revisión.`,
  );
  const branch = branches[0];
  identifier(branch.id);
  const empty =
    detail.lat === null &&
    detail.lng === null &&
    branch.lat === null &&
    branch.lng === null;
  const matches =
    coordinateMatches(detail.lat, point.lat) &&
    coordinateMatches(detail.lng, point.lng) &&
    coordinateMatches(branch.lat, point.lat) &&
    coordinateMatches(branch.lng, point.lng);
  ensure(
    empty || matches,
    `Las coordenadas previas de ${point.slug} no son nulas ni coinciden; no se sobrescribieron.`,
  );
  return matches;
};

/** @param {JsonObject} detail @returns {string} */
const preservedFields = (detail) =>
  JSON.stringify(detail, (key, value) =>
    ["lat", "lng", "updated_at"].includes(key) ? undefined : value,
  );

// UPDATE
/** @param {{catalog: Catalog, locations: PublishedLocation[], credentials?: Credentials, local?: boolean, apply?: boolean, fetcher?: Fetcher, log?: (message: string) => void}} options */
export const updateRealMapLocations = async ({
  catalog,
  locations,
  credentials,
  local = false,
  apply = false,
  fetcher = fetch,
  log = console.log,
}) => {
  validateMapLocations(catalog, locations);
  if (!apply)
    return {
      mode: "dry-run",
      origin: local ? LOCAL_ORIGIN : API_ORIGIN,
      locations: locations.map(({ slug, lat, lng, source_url }) => ({
        slug,
        lat,
        lng,
        source_url,
      })),
      writes: 0,
    };
  ensure(
    Boolean(
      credentials &&
      credentials.origin === (local ? LOCAL_ORIGIN : API_ORIGIN) &&
      credentials.email.length > 3 &&
      credentials.password.length > 0,
    ),
    "Faltan credenciales válidas para el origen exacto autorizado.",
  );
  const identity = /** @type {Credentials} */ (credentials);
  let token = "";
  /** @type {Error | null} */
  let failure = null;
  /** @param {string} method @param {string} path @param {object} [body] @returns {Promise<JsonObject>} */
  const api = async (method, path, body) => {
    let response;
    try {
      response = await fetcher(identity.origin + "/api" + path, {
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
        `No se confirmó ${method} ${path}; no se reintentó. Revisa el estado antes de repetir el comando.`,
      );
    }
    ensure(
      response.ok,
      `HTTP ${response.status} en ${method} ${path}; se detuvo la actualización.`,
    );
    let data;
    try {
      data = object(/** @type {JsonValue} */ (await response.json()));
    } catch {
      throw new Error(`Respuesta JSON no válida en ${method} ${path}.`);
    }
    ensure(data.success !== false, `La API no confirmó ${method} ${path}.`);
    return data;
  };
  /** @type {{id: number, point: PublishedLocation, matches: boolean, preserved: string}[]} */
  const staged = [];
  /** @type {{id: number, slug: string}[]} */
  const updated = [];
  try {
    const login = await api("POST", "/auth/login", {
      email: identity.email,
      password: identity.password,
    });
    ensure(
      typeof login.token === "string" && login.token.length > 0,
      "No se obtuvo una sesión propia.",
    );
    token = /** @type {string} */ (login.token);
    ensure(
      object((await api("GET", "/auth/me")).user).role === "SUPERADMIN",
      "Se requiere SUPERADMIN para actualizar los puntos revisados.",
    );
    const current = rows((await api("GET", "/v2/businesses")).data);
    // Validate the complete batch before the first location mutation.
    for (const point of locations) {
      const candidates = current.filter(
        (listing) => listing.slug === point.slug,
      );
      ensure(
        candidates.length === 1,
        `No hay una ficha única para ${point.slug}.`,
      );
      const id = identifier(candidates[0].id);
      const detail = object((await api("GET", `/v2/businesses/${id}`)).data);
      staged.push({
        id,
        point,
        matches: validateDetail(detail, point, id),
        preserved: preservedFields(detail),
      });
    }
    ensure(
      new Set(staged.map((item) => item.id)).size === 8,
      "Las fichas no tienen ocho identificadores únicos.",
    );
    for (const item of staged) {
      if (item.matches) continue;
      const { lat, lng } = item.point;
      const path = `/v2/businesses/${item.id}`;
      const mutation = object((await api("PUT", path, { lat, lng })).data);
      ensure(
        validateDetail(mutation, item.point, item.id) &&
          preservedFields(mutation) === item.preserved,
        `La respuesta PUT de ${item.point.slug} no confirmó exclusivamente el punto esperado.`,
      );
      const confirmed = object((await api("GET", path)).data);
      ensure(
        validateDetail(confirmed, item.point, item.id) &&
          preservedFields(confirmed) === item.preserved,
        `La lectura posterior de ${item.point.slug} no confirmó exclusivamente el punto esperado.`,
      );
      updated.push({ id: item.id, slug: item.point.slug });
      log(`Punto verificado: ${item.point.slug} (ID ${item.id}).`);
    }
  } catch (error) {
    failure =
      error instanceof Error
        ? error
        : new Error("No se completó la actualización de puntos.");
  } finally {
    if (token) {
      try {
        await api("POST", "/auth/logout");
      } catch {
        if (!failure)
          failure = new Error(
            "No se confirmó el cierre de la sesión creada por este comando.",
          );
        log("No se confirmó el cierre de la sesión creada por este comando.");
      }
    }
  }
  if (failure) throw failure;
  return {
    mode: "applied",
    updated,
    unchanged: staged
      .filter((item) => item.matches)
      .map((item) => ({ id: item.id, slug: item.point.slug })),
  };
};

// CLI
export const main = async (args = process.argv.slice(2)) => {
  ensure(
    args.length <= 1 &&
      args.every((arg) =>
        ["--dry-run", "--apply", "--apply-local"].includes(arg),
      ),
    "Uso: node deploy/update-real-map-locations.mjs [--dry-run | --apply | --apply-local]",
  );
  const catalog = await readCatalog();
  const locations = await readMapLocations();
  const local = args.includes("--apply-local");
  const apply = local || args.includes("--apply");
  /** @type {Credentials | undefined} */
  let credentials;
  if (apply) {
    const env = local
      ? process.env
      : parseEnv(await readFile(resolve(ROOT, "deploy/.env.preview"), "utf8"));
    credentials = local
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
  }
  const result = await updateRealMapLocations({
    catalog,
    locations,
    local,
    apply,
    credentials,
  });
  console.log(JSON.stringify(result, null, 2));
  return result;
};

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : "No se completó la actualización de puntos.",
    );
    process.exitCode = 1;
  });
