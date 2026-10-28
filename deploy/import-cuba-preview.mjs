import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

/** @typedef {string | number | boolean | null | object} JsonValue */
/** @typedef {{[key: string]: JsonValue}} JsonObject */
/** @typedef {{open: string, close: string, closed: boolean}} Hours */
/** @typedef {{name: string, price: number, duration: number}} PreviewService */
/** @typedef {{name: string, specialty: string}} PreviewProfessional */
/** @typedef {{path: string, author: string, source: string, license: string, caption: string}} Photo */
/** @typedef {{slug: string, name: string, address: string, photo: string, sources: {label: string, url: string}[]}} PreviewBusiness */
/** @typedef {{version: string, checked_on: string, public_origin: string, notice: string, cancellation_terms: string, schedule: {[day: string]: Hours}, services: PreviewService[], professionals: PreviewProfessional[], photos: {[key: string]: Photo}, businesses: PreviewBusiness[]}} Manifest */
/** @typedef {{origin: string, email: string, password: string}} Credentials */
/** @typedef {(input: string | URL | Request, init?: RequestInit) => Promise<Response>} Fetcher */
/** @typedef {{id: number, slug: string, active: boolean, services: number, professionals: number, issues: string[]}} Inspection */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API_ORIGIN = 'https://habitu-sebaz-api.onrender.com';
const PUBLIC_ORIGIN = 'https://habitu-sebaz.vercel.app';
const SLUGS = ['cuba-prueba-bambinos', 'cuba-prueba-imperio', 'cuba-prueba-barber-house-studio'];
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const TIMEOUT_MS = 90000;

/** @param {boolean} condition @param {string} message */
const ensure = (condition, message) => { if (!condition) throw new Error(message); };
/** @param {JsonValue | undefined} value @returns {JsonObject} */
const object = (value) => {
  ensure(value !== null && typeof value === 'object' && !Array.isArray(value), 'Respuesta de API no válida.');
  return /** @type {JsonObject} */ (value);
};
/** @param {JsonValue | undefined} value @returns {JsonObject[]} */
const rows = (value) => {
  ensure(Array.isArray(value), 'Falta una lista esperada en la respuesta de API.');
  return /** @type {JsonValue[]} */ (value).map(object);
};
/** @param {JsonValue | undefined} value @returns {number} */
const id = (value) => {
  const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : 0;
  ensure(Number.isSafeInteger(number) && number > 0, 'La API no devolvió un identificador válido.');
  return number;
};
/** @param {string | Uint8Array} content */
const digest = (content) => createHash('sha256').update(content).digest('hex');
/** @param {Manifest} manifest @param {string} key */
const photoUrl = (manifest, key) => new URL(manifest.photos[key].path, PUBLIC_ORIGIN).href;
/** @param {Manifest} manifest */
const schedules = (manifest) => DAYS.map((day, index) => ({day: index, open_time: manifest.schedule[day].open, close_time: manifest.schedule[day].close, is_closed: manifest.schedule[day].closed}));
/** @param {string} value */
const httpsUrl = (value) => {
  const parsed = new URL(value);
  ensure(parsed.protocol === 'https:' && !parsed.username && !parsed.password, 'Sólo se admiten referencias HTTPS sin credenciales.');
};

/** @param {Manifest} manifest */
export const validateManifest = (manifest) => {
  ensure(manifest.public_origin === PUBLIC_ORIGIN, 'El origen público debe ser el autorizado.');
  ensure(manifest.businesses.length === 3 && SLUGS.every(slug => manifest.businesses.some(business => business.slug === slug)), 'El catálogo debe contener exactamente los tres slugs autorizados.');
  ensure(manifest.services.length === 4 && manifest.professionals.length === 2, 'Se requieren cuatro servicios y dos profesionales de prueba por negocio.');
  ensure(/NO.*afiliado|no está afiliado/i.test(manifest.notice) && /NO.*cita real/i.test(manifest.notice) && /no.*cobros/i.test(manifest.notice), 'Falta el aviso explícito de prueba, no afiliación y ausencia de cita real/cobros.');
  ensure(/no.*cobros/i.test(manifest.cancellation_terms) && /prueba/i.test(manifest.cancellation_terms), 'Las condiciones deben explicar que no hay cobros.');
  ensure(Object.keys(manifest.schedule).length === 7, 'Se requieren siete días de horario.');
  for (const day of DAYS) {
    const hours = manifest.schedule[day];
    ensure(Boolean(hours) && /^\d{2}:\d{2}$/.test(hours.open) && /^\d{2}:\d{2}$/.test(hours.close) && hours.open < hours.close && hours.closed === false, 'El horario de prueba no es válido.');
  }
  for (const service of manifest.services) ensure(/prueba/i.test(service.name) && service.price > 0 && service.price <= 100000 && service.duration >= 30 && service.duration <= 60, 'Tarifa, duración o etiqueta de servicio de prueba no válida.');
  for (const professional of manifest.professionals) ensure(/^Barbero de prueba [12]$/.test(professional.name), 'No se admiten identidades reales de personal.');
  for (const photo of Object.values(manifest.photos)) {
    ensure(/^\/catalog\/cuba\/[a-z0-9-]+\.jpg$/.test(photo.path), 'La fotografía debe ser un JPG local del catálogo.');
    httpsUrl(photo.source); httpsUrl(photo.license);
  }
  ensure(Boolean(manifest.photos['tools-federico']), 'Falta la fotografía de herramientas para los perfiles sin rostro.');
  for (const business of manifest.businesses) {
    ensure(/ · Prueba$/.test(business.name) && business.address.includes('Cuba, Pereira') && Boolean(manifest.photos[business.photo]), 'Nombre, dirección o fotografía de negocio no válido.');
    ensure(business.sources.length > 0, 'Faltan fuentes verificadas de dirección.');
    business.sources.forEach(source => httpsUrl(source.url));
  }
};

export const readManifest = async () => {
  const raw = await readFile(resolve(ROOT, 'deploy/catalog/cuba-preview.json'), 'utf8');
  const manifest = /** @type {Manifest} */ (JSON.parse(raw));
  validateManifest(manifest);
  for (const photo of Object.values(manifest.photos)) {
    const bytes = await readFile(resolve(ROOT, 'frontend/public'+photo.path));
    ensure(bytes.length > 1000 && bytes[0] === 0xff && bytes[1] === 0xd8, 'Falta una fotografía JPG local válida.');
  }
  return {manifest, hash: digest(raw)};
};

/** @param {Manifest} manifest */
export const dryRunPlan = (manifest) => {
  validateManifest(manifest);
  return {mode: 'dry-run', origin: API_ORIGIN, businesses: manifest.businesses.map(business => ({slug: business.slug, name: business.name, address: business.address})), services: 12, professionals: 6, professional_service_links: 24, payment_modes: ['ON_SITE'], creates_staff_logins: false};
};

/** Verify the deployed static bytes before any login or catalog mutation. @param {Manifest} manifest @param {Fetcher} fetcher */
const verifyPhotos = async (manifest, fetcher) => {
  for (const photo of Object.values(manifest.photos)) {
    const local = await readFile(resolve(ROOT, 'frontend/public'+photo.path));
    const response = await fetcher(new URL(photo.path, PUBLIC_ORIGIN), {redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS)});
    ensure(response.status === 200 && Boolean(response.headers.get('content-type')?.includes('image/jpeg')), 'Las fotografías todavía no están publicadas como JPG; no se inició la importación.');
    ensure(digest(new Uint8Array(await response.arrayBuffer())) === digest(local), 'La fotografía publicada no coincide con el archivo revisado; no se inició la importación.');
  }
};

/** @param {{manifest: Manifest, credentials: Credentials, fetcher?: Fetcher, log?: (message: string) => void, resumePaused?: boolean}} settings */
export const importCatalog = async ({manifest, credentials, fetcher = fetch, log = console.log, resumePaused = false}) => {
  validateManifest(manifest);
  ensure(credentials.origin === API_ORIGIN, 'El host de producción no coincide con el autorizado.');
  ensure(credentials.email.length > 3 && credentials.password.length > 0, 'Faltan las credenciales locales de superadmin.');
  let token = '';
  /** @param {string} method @param {string} path @param {object} [body] @returns {Promise<JsonObject>} */
  const api = async (method, path, body) => {
    ensure(path.startsWith('/') && !path.startsWith('//'), 'Ruta de API no válida.');
    let response;
    try {
      response = await fetcher(API_ORIGIN+'/api'+path, {method, headers: {'Accept': 'application/json', ...(body ? {'Content-Type': 'application/json'} : {}), ...(token ? {'Authorization': 'Bearer '+token} : {})}, body: body ? JSON.stringify(body) : undefined, redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS)});
    } catch {
      throw new Error(`No se confirmó ${method} ${path}. No se reintentó; revisa el slug antes de recuperar una operación incompleta.`);
    }
    ensure(response.ok, `La API rechazó ${method} ${path} (HTTP ${response.status}). No se reintentó.`);
    if (response.status === 204) return {};
    let payload;
    try { payload = await response.json(); } catch { throw new Error(`La API devolvió JSON no válido en ${method} ${path}.`); }
    return object(/** @type {JsonValue} */ (payload));
  };

  /** @param {number} businessId @param {PreviewBusiness} fixture @param {boolean} expectedActive @param {JsonObject} [knownPolicy] @returns {Promise<Inspection>} */
  const inspect = async (businessId, fixture, expectedActive, knownPolicy) => {
    const [detail, operations, terms] = await Promise.all([api('GET', `/v2/businesses/${businessId}`), api('GET', `/v2/operations/context?business_id=${businessId}`), knownPolicy ? Promise.resolve({data: knownPolicy}) : api('GET', `/v2/booking/checkout/policy?business_id=${businessId}`)]);
    const business = object(detail.data), context = object(operations.data), policy = object(terms.data);
    const services = rows(business.services), professionals = rows(business.professionals), branches = rows(business.branches), staff = rows(context.professionals), links = rows(context.service_links);
    const issues = [];
    if (business.slug !== fixture.slug || business.name !== fixture.name || business.description !== description(fixture)) issues.push('identidad o aviso de prueba');
    if (business.is_active !== expectedActive) issues.push('estado del negocio');
    if (business.phone || business.email || business.verified || Number(business.rating ?? 0) !== 0 || Number(business.reviews_count ?? 0) !== 0 || rows(business.reviews).length !== 0) issues.push('contactos, comprobación o reseñas no permitidas');
    if (services.length !== 4 || professionals.length !== 2 || branches.length !== 1 || staff.length !== 2) issues.push('cantidades de catálogo');
    const branchId = branches.length === 1 ? id(branches[0].id) : -1;
    /** @param {JsonObject[]} actual @param {boolean} professional */
    const validSchedule = (actual, professional) => actual.length === 7 && DAYS.every((day, index) => {
      const slot = actual.find(row => Number(professional ? row.day_of_week : row.day) === index || (!professional && String(row.day).toLowerCase() === day));
      return slot && (!professional || Number(slot.branch_id) === branchId) && String(professional ? slot.start_time : slot.open_time).slice(0, 5) === manifest.schedule[day].open && String(professional ? slot.end_time : slot.close_time).slice(0, 5) === manifest.schedule[day].close && (professional ? slot.is_available === true : slot.is_closed === false);
    });
    if (branches.length === 1 && (!branches[0].is_active || branches[0].address !== fixture.address || !validSchedule(rows(branches[0].schedules), false))) issues.push('sede u horario');
    for (const expected of manifest.services) {
      const service = services.find(row => row.name === expected.name);
      if (!service || Number(service.price) !== expected.price || Number(service.duration_minutes) !== expected.duration || service.booking_model !== 'professional' || service.requires_professional !== true || service.requires_confirmation !== true || Number(service.booking_capacity) !== 1 || service.is_active !== true || service.image_url !== photoUrl(manifest, fixture.photo)) issues.push('configuración de servicio');
    }
    for (const expected of manifest.professionals) {
      const professional = professionals.find(row => row.name === expected.name);
      const operation = staff.find(row => row.name === expected.name);
      if (!professional || professional.photo_url !== photoUrl(manifest, 'tools-federico') || !operation || operation.user_id !== null || !validSchedule(rows(operation.availability), true)) issues.push('personal de prueba u horario');
    }
    if (links.filter(link => link.is_active === true && Number(link.branch_id) === branchId).length !== 8 || !professionals.every(professional => services.every(service => links.some(link => Number(link.professional_id) === Number(professional.id) && Number(link.service_id) === Number(service.id) && Number(link.branch_id) === branchId && link.is_active === true)))) issues.push('pivotes explícitos');
    if (policy.configured !== true || JSON.stringify(policy.allowed_modes) !== '["ON_SITE"]' || policy.deposit_percentage !== null || policy.cancellation_terms !== manifest.cancellation_terms) issues.push('política sin cobros ni anticipos');
    return {id: businessId, slug: fixture.slug, active: business.is_active === true, services: services.length, professionals: professionals.length, issues};
  };
  /** @param {PreviewBusiness} fixture */
  const description = (fixture) => `${manifest.notice}\n\nFotografía ilustrativa: ${manifest.photos[fixture.photo].author}. Dirección consultada: ${manifest.checked_on}.`;

  /** @param {PreviewBusiness} fixture @param {JsonObject} created @returns {Promise<JsonObject>} */
  const configureBusiness = async (fixture, created) => {
    const businessId = id(created.id);
    const branchId = id(rows(created.branches)[0]?.id);
      await api('PUT', `/v2/branches/${branchId}`, {address: fixture.address, name: 'Sede Cuba · Prueba', is_main_branch: true, is_active: true, schedules: schedules(manifest)});
      const serviceRows = rows(created.services);
      ensure(serviceRows.length === 4 && rows(created.professionals).length === 2, 'La creación no devolvió cuatro servicios y dos profesionales; el negocio queda pausado.');
      for (const service of serviceRows) {
        const expected = manifest.services.find(row => row.name === service.name);
        ensure(Boolean(expected), 'La API devolvió un servicio inesperado; el negocio queda pausado.');
        await api('PUT', `/v2/services/${id(service.id)}`, {description: 'PRUEBA: tarifa y duración ficticias; no es una oferta ni una cita del establecimiento real. Fotografía ilustrativa de '+manifest.photos[fixture.photo].author+'.', price: expected?.price, duration_minutes: expected?.duration, booking_model: 'professional', requires_professional: true, requires_confirmation: true, booking_capacity: 1, duration_mode: 'fixed', buffer_minutes: 0, slot_interval_minutes: 15, min_advance_minutes: 0, max_advance_days: 60, allow_cancellation: true, allow_reschedule: true, cancellation_notice_minutes: 0, reschedule_notice_minutes: 0, is_active: true, image_url: photoUrl(manifest, fixture.photo), media_gallery: [{type: 'image', url: photoUrl(manifest, fixture.photo), caption: manifest.photos[fixture.photo].caption}]});
      }
      for (const professional of rows(created.professionals)) {
        const professionalId = id(professional.id);
        await api('PUT', `/v2/professionals/${professionalId}`, {bio: 'Perfil ficticio de prueba; no representa a un empleado del negocio real. Fotografía ilustrativa de herramientas: Federico Tonini / Unsplash.', photo_url: photoUrl(manifest, 'tools-federico'), is_active: true});
        await api('PUT', `/v2/operations/professionals/${professionalId}/services`, {branch_id: branchId, service_ids: serviceRows.map(row => id(row.id))});
        await api('PUT', `/v2/operations/professionals/${professionalId}/schedule`, {branch_id: branchId, slots: schedules(manifest).map(slot => ({day_of_week: slot.day, start_time: slot.open_time, end_time: slot.close_time, is_available: !slot.is_closed}))});
      }
      const terms = await api('PUT', `/v2/booking/checkout/policy/${businessId}`, {allowed_modes: ['ON_SITE'], deposit_percentage: null, hold_minutes: 15, cancellation_terms: manifest.cancellation_terms});
      return object(terms.data);
  };

  /** @type {Inspection[]} */
  const skipped = [];
  /** @type {{fixture: PreviewBusiness, id: number, inspection?: Inspection, policy?: JsonObject, record?: JsonObject, resumed?: boolean}[]} */
  const staged = [];
  try {
    await verifyPhotos(manifest, fetcher);
    const login = await api('POST', '/auth/login', {email: credentials.email, password: credentials.password});
    ensure(typeof login.token === 'string' && login.token.length > 0, 'No se obtuvo una sesión de importación.');
    token = /** @type {string} */ (login.token);
    const me = await api('GET', '/auth/me');
    ensure(object(me.user).role === 'SUPERADMIN', 'La cuenta autenticada no es superadmin; no se modificó el catálogo.');
    const ownerId = id(object(me.user).id);
    const categories = rows((await api('GET', '/v2/businesses/categories')).data);
    const category = categories.find(row => row.slug === 'barberia');
    ensure(Boolean(category), 'Falta la categoría barbería; no se modificó el catálogo.');
    const current = rows((await api('GET', '/v2/businesses')).data);
    for (const fixture of manifest.businesses) {
      const existing = current.find(row => row.slug === fixture.slug);
      if (!existing) continue;
      if (existing.is_active === false && resumePaused) {
        const record = object((await api('GET', `/v2/businesses/${id(existing.id)}`)).data);
        const children = rows(record.services), profiles = rows(record.professionals), branches = rows(record.branches);
        const context = object((await api('GET', `/v2/operations/context?business_id=${id(existing.id)}`)).data);
        const staff = rows(context.professionals);
        const matches = record.is_active === false && record.slug === fixture.slug && record.name === fixture.name
          && record.description === description(fixture) && Number(record.owner_user_id) === ownerId
          && record.logo_url === photoUrl(manifest, fixture.photo) && record.banner_url === photoUrl(manifest, fixture.photo)
          && !record.phone && !record.email && !record.verified && Number(record.rating ?? 0) === 0 && Number(record.reviews_count ?? 0) === 0 && rows(record.reviews).length === 0
          && children.length === 4 && manifest.services.every(expected => children.some(row => row.name === expected.name && Number(row.price) === expected.price && Number(row.duration_minutes) === expected.duration && Number(row.business_id) === id(record.id) && (!row.image_url || row.image_url === photoUrl(manifest, fixture.photo))))
          && profiles.length === 2 && staff.length === 2 && manifest.professionals.every(expected => profiles.some(row => row.name === expected.name && row.specialty === expected.specialty && Number(row.business_id) === id(record.id) && (!row.photo_url || row.photo_url === photoUrl(manifest, 'tools-federico')) && staff.some(member => Number(member.id) === Number(row.id) && member.user_id === null)))
          && branches.length === 1 && branches[0].address === fixture.address && Number(branches[0].business_id) === id(record.id)
          && ['Sede Principal', 'Sede Cuba · Prueba'].includes(String(branches[0].name));
        ensure(matches, `No se reanudó ${fixture.slug}: identidad, propietario, fotos o catálogo hijo no coinciden con la importación revisada.`);
        staged.push({fixture, id: id(record.id), record, resumed: true});
        log(`Reanudación explícita preparada: ${fixture.slug}; permanece pausado.`);
        continue;
      }
      const checked = existing.is_active === true ? await inspect(id(existing.id), fixture, true) : {id: id(existing.id), slug: fixture.slug, active: false, services: 0, professionals: 0, issues: ['negocio pausado; requiere recuperación explícita']};
      skipped.push(checked);
      log(`Existente conservado: ${fixture.slug}; ${checked.active ? 'activo' : 'pausado'}; ${checked.issues.length ? 'requiere revisión: '+checked.issues.join(', ') : 'completo'}.`);
    }
    if (skipped.some(row => row.issues.length > 0)) return {created: [], resumed: [], skipped, recovery_required: true};

    for (const fixture of manifest.businesses.filter(row => !skipped.some(existing => existing.slug === row.slug))) {
      let stage = staged.find(row => row.fixture.slug === fixture.slug);
      let created = stage?.record;
      if (!created) {
        created = object((await api('POST', '/v2/businesses', {business_category_id: id(category?.id), name: fixture.name, slug: fixture.slug, description: description(fixture), website: fixture.sources[0].url, logo_url: photoUrl(manifest, fixture.photo), banner_url: photoUrl(manifest, fixture.photo), address: fixture.address, uses_professionals: true, uses_resources: false, services: manifest.services, professionals: manifest.professionals, schedule: manifest.schedule})).data);
      const businessId = id(created.id);
      stage = {fixture, id: businessId, record: created};
      staged.push(stage);
      await api('PUT', `/v2/businesses/${businessId}`, {is_active: false});
      log(`Creado y pausado: ${fixture.slug} (ID ${businessId}).`);
      }
      ensure(Boolean(stage), 'Falta el estado del negocio de prueba.');
      if (stage) stage.policy = await configureBusiness(fixture, created);
    }
    for (const row of staged) {
      row.inspection = await inspect(row.id, row.fixture, false, row.policy);
      ensure(row.inspection.issues.length === 0, `El negocio ${row.fixture.slug} permanece pausado: ${row.inspection.issues.join(', ')}.`);
    }
    const checked = [...skipped, ...staged.flatMap(row => row.inspection ? [row.inspection] : [])];
    ensure(checked.length === 3 && checked.reduce((total, row) => total+row.services, 0) === 12 && checked.reduce((total, row) => total+row.professionals, 0) === 6, 'La validación global no confirmó 12 servicios y 6 profesionales; no se activó ningún negocio nuevo.');
    for (const row of staged) {
      await api('PUT', `/v2/businesses/${row.id}`, {is_active: true});
      log(`Activado después de validar el catálogo completo: ${row.fixture.slug}.`);
    }
    return {created: staged.filter(row => !row.resumed).map(row => ({id: row.id, slug: row.fixture.slug})), resumed: staged.filter(row => row.resumed).map(row => ({id: row.id, slug: row.fixture.slug})), skipped, recovery_required: false};
  } finally {
    if (token) await api('POST', '/auth/logout');
  }
};

const main = async () => {
  const args = process.argv.slice(2);
  ensure(args.every(arg => ['--apply', '--dry-run', '--resume-paused'].includes(arg)) && !(args.includes('--apply') && args.includes('--dry-run')), 'Uso: node deploy/import-cuba-preview.mjs [--dry-run | --apply [--resume-paused]]');
  ensure(!args.includes('--resume-paused') || args.includes('--apply'), 'La recuperación explícita requiere --apply --resume-paused.');
  const {manifest, hash} = await readManifest();
  if (!args.includes('--apply')) {
    console.log(JSON.stringify({...dryRunPlan(manifest), manifest_sha256: hash}, null, 2));
    return;
  }
  const privateEnv = parseEnv(await readFile(resolve(ROOT, 'deploy/.env.preview'), 'utf8'));
  const result = await importCatalog({manifest, resumePaused: args.includes('--resume-paused'), credentials: {origin: privateEnv.APP_URL ?? '', email: privateEnv.SUPERADMIN_EMAIL ?? '', password: privateEnv.SUPERADMIN_PASSWORD ?? ''}});
  console.log(JSON.stringify(result, null, 2));
  if (result.recovery_required) process.exitCode = 2;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error instanceof Error ? error.message : 'No se pudo completar la importación.'); process.exitCode = 1; });
}
