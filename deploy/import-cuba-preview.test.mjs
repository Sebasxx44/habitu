import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { importCatalog, readManifest, dryRunPlan } from './import-cuba-preview.mjs';

/** @typedef {import('./import-cuba-preview.mjs').JsonObject} JsonObject */
/** @typedef {import('./import-cuba-preview.mjs').Fetcher} Fetcher */
const {manifest} = await readManifest();
const credentials = {origin: 'https://habitu-sebaz-api.onrender.com', email: 'superadmin@test.invalid', password: 'fake-test-password'};

const server = async (role = 'SUPERADMIN') => {
  /** @type {Map<number, JsonObject>} */
  const businesses = new Map();
  /** @type {{method: string, path: string, body: JsonObject}[]} */
  const calls = [];
  const photos = new Map(await Promise.all(Object.values(manifest.photos).map(async photo => [photo.path, await readFile(new URL('../frontend/public'+photo.path, import.meta.url))])));
  let nextId = 100;
  const controls = {photosReady: true, failService: false};
  /** @param {string} kind @param {number} recordId @returns {JsonObject} */
  const findNested = (kind, recordId) => {
    for (const business of businesses.values()) {
      const record = /** @type {JsonObject[]} */ (business[kind]).find(row => Number(row.id) === recordId);
      if (record) return record;
    }
    throw new Error('Registro de prueba inexistente');
  };
  /** @type {Fetcher} */
  const fetcher = async (input, init = {}) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    const method = init.method ?? 'GET';
    const body = /** @type {JsonObject} */ (init.body ? JSON.parse(String(init.body)) : {});
    calls.push({method, path: url.pathname+url.search, body});
    if (url.pathname.startsWith('/catalog/cuba/')) return controls.photosReady ? new Response(photos.get(url.pathname), {headers: {'Content-Type': 'image/jpeg'}}) : new Response(null, {status: 404});
    assert.equal(url.origin, credentials.origin);
    assert.equal(init.redirect, 'manual');
    if (url.pathname === '/api/auth/login') return Response.json({token: 'only-this-import-token', user: {role}});
    assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer only-this-import-token');
    if (url.pathname === '/api/auth/me') return Response.json({user: {id: 1, role}});
    if (url.pathname === '/api/auth/logout') return Response.json({message: 'Sesión cerrada'});
    if (url.pathname === '/api/v2/businesses/categories') return Response.json({data: [{id: 7, slug: 'barberia'}]});
    if (url.pathname === '/api/v2/businesses' && method === 'GET') return Response.json({data: [...businesses.values()]});
    if (url.pathname === '/api/v2/businesses' && method === 'POST') {
      const businessId = nextId++, branchId = nextId++;
      const business = {id: businessId, owner_user_id: 1, ...body, is_active: true, email: null, phone: null, verified: false, rating: '0.0', reviews_count: 0, reviews: [],
        branches: [{id: branchId, business_id: businessId, name: 'Sede Principal', address: body.address, is_active: true, is_main_branch: true, schedules: []}],
        services: /** @type {JsonObject[]} */ (body.services).map(service => ({id: nextId++, business_id: businessId, ...service, duration_minutes: service.duration})),
        professionals: /** @type {JsonObject[]} */ (body.professionals).map(professional => ({id: nextId++, business_id: businessId, ...professional, user_id: null, is_active: true, availability: []})), service_links: [], policy: null};
      businesses.set(businessId, /** @type {JsonObject} */ (business));
      return Response.json({data: business});
    }
    const businessMatch = url.pathname.match(/^\/api\/v2\/businesses\/(\d+)$/);
    if (businessMatch) {
      const business = businesses.get(Number(businessMatch[1]));
      assert.ok(business);
      if (method === 'PUT') Object.assign(business, body);
      return Response.json({data: business});
    }
    const branchMatch = url.pathname.match(/^\/api\/v2\/branches\/(\d+)$/);
    if (branchMatch) return Response.json({data: Object.assign(findNested('branches', Number(branchMatch[1])), body)});
    const serviceMatch = url.pathname.match(/^\/api\/v2\/services\/(\d+)$/);
    if (serviceMatch) return controls.failService ? Response.json({}, {status: 422}) : Response.json({data: Object.assign(findNested('services', Number(serviceMatch[1])), body)});
    const professionalMatch = url.pathname.match(/^\/api\/v2\/professionals\/(\d+)$/);
    if (professionalMatch) return Response.json({data: Object.assign(findNested('professionals', Number(professionalMatch[1])), body)});
    const operationsMatch = url.pathname.match(/^\/api\/v2\/operations\/professionals\/(\d+)\/(services|schedule)$/);
    if (operationsMatch) {
      const professionalId = Number(operationsMatch[1]), professional = findNested('professionals', professionalId);
      if (operationsMatch[2] === 'schedule') professional.availability = /** @type {JsonObject[]} */ (body.slots).map(slot => ({...slot, branch_id: body.branch_id}));
      else {
        const business = businesses.get(Number(professional.business_id));
        assert.ok(business);
        /** @type {JsonObject[]} */ (business.service_links).push(.../** @type {number[]} */ (body.service_ids).map(serviceId => ({professional_id: professionalId, service_id: serviceId, branch_id: body.branch_id, is_active: true})));
      }
      return Response.json({data: []});
    }
    if (url.pathname === '/api/v2/operations/context') {
      const business = businesses.get(Number(url.searchParams.get('business_id')));
      assert.ok(business);
      return Response.json({data: {professionals: business.professionals, service_links: business.service_links}});
    }
    const policyMatch = url.pathname.match(/^\/api\/v2\/booking\/checkout\/policy(?:\/(\d+))?$/);
    if (policyMatch) {
      const business = businesses.get(Number(policyMatch[1] ?? url.searchParams.get('business_id')));
      assert.ok(business);
      // The real API intentionally rejects GET policy for paused businesses.
      if (method === 'GET' && !business.is_active) return Response.json({}, {status: 404});
      if (method === 'PUT') business.policy = {configured: true, ...body};
      return Response.json({data: business.policy});
    }
    assert.fail('Ruta de prueba no prevista: '+method+' '+url.pathname);
  };
  return {fetcher, businesses, calls, controls};
};

const catalogWrites = (calls) => calls.filter(call => call.method !== 'GET' && call.path.startsWith('/api/v2/'));

test('dry-run fijo valida 3 negocios, 12 servicios y 6 perfiles sin red ni credenciales', () => {
  const plan = dryRunPlan(manifest);
  assert.equal(plan.mode, 'dry-run');
  assert.equal(plan.businesses.length, 3);
  assert.equal(plan.services, 12);
  assert.equal(plan.professionals, 6);
  assert.equal(plan.professional_service_links, 24);
  assert.equal(plan.creates_staff_logins, false);
  assert.deepEqual(plan.payment_modes, ['ON_SITE']);
});

test('crea, pausa, configura y activa sólo después de validar los tres negocios; cierra su token', async () => {
  const fake = await server();
  const messages = [];
  const result = await importCatalog({manifest, credentials, fetcher: fake.fetcher, log: message => messages.push(message)});
  assert.equal(messages.some(message => message.includes(credentials.password) || message.includes('only-this-import-token')), false);
  assert.equal(result.created.length, 3);
  assert.equal(result.recovery_required, false);
  assert.equal(fake.businesses.size, 3);
  const writes = catalogWrites(fake.calls);
  const firstActivation = writes.findIndex(call => call.body.is_active === true && /^\/api\/v2\/businesses\//.test(call.path));
  const lastPolicy = writes.findLastIndex(call => call.path.includes('/checkout/policy/'));
  assert.ok(firstActivation > lastPolicy);
  for (const business of fake.businesses.values()) {
    assert.equal(business.is_active, true);
    assert.equal(business.email, null);
    assert.equal(business.phone, null);
    assert.equal(business.reviews_count, 0);
    assert.equal(business.rating, '0.0');
    assert.equal(business.service_links.length, 8);
    assert.equal(business.professionals.length, 2);
    assert.ok(business.professionals.every(professional => professional.user_id === null && professional.photo_url.endsWith('/tools-federico.jpg')));
  }
  assert.equal(fake.calls.filter(call => call.path === '/api/auth/logout').length, 1);
  assert.equal(fake.calls.some(call => /\/users|\/reviews|\/appointments|\/wompi|\/wallet/.test(call.path)), false);
});

test('una repetición conserva negocios existentes y no duplica ni escribe catálogo', async () => {
  const fake = await server();
  await importCatalog({manifest, credentials, fetcher: fake.fetcher, log: () => {}});
  fake.calls.length = 0;
  const result = await importCatalog({manifest, credentials, fetcher: fake.fetcher, log: () => {}});
  assert.equal(result.created.length, 0);
  assert.equal(result.skipped.length, 3);
  assert.equal(result.recovery_required, false);
  assert.equal(catalogWrites(fake.calls).length, 0);
  assert.equal(fake.businesses.size, 3);
});

test('un fallo deja el negocio pausado, no reintenta y exige recuperación explícita', async () => {
  const fake = await server();
  fake.controls.failService = true;
  await assert.rejects(importCatalog({manifest, credentials, fetcher: fake.fetcher, log: () => {}}), /No se reintentó/);
  assert.equal(fake.businesses.size, 1);
  assert.equal([...fake.businesses.values()][0].is_active, false);
  assert.equal(fake.calls.filter(call => call.method === 'POST' && call.path === '/api/v2/businesses').length, 1);
  assert.equal(fake.calls.filter(call => call.path === '/api/auth/logout').length, 1);
  fake.calls.length = 0;
  const result = await importCatalog({manifest, credentials, fetcher: fake.fetcher, log: () => {}});
  assert.equal(result.recovery_required, true);
  assert.equal(catalogWrites(fake.calls).length, 0);
});

test('si las fotos no están desplegadas, no inicia sesión ni muta datos', async () => {
  const fake = await server();
  fake.controls.photosReady = false;
  await assert.rejects(importCatalog({manifest, credentials, fetcher: fake.fetcher, log: () => {}}), /todavía no están publicadas/);
  assert.equal(fake.calls.some(call => call.path.startsWith('/api/')), false);
});

test('rechaza un host distinto y una cuenta sin rol superadmin', async () => {
  const fake = await server('CLIENTE');
  await assert.rejects(importCatalog({manifest, credentials: {...credentials, origin: 'https://other.test'}, fetcher: fake.fetcher}), /host de producción/);
  assert.equal(fake.calls.length, 0);
  await assert.rejects(importCatalog({manifest, credentials, fetcher: fake.fetcher, log: () => {}}), /no es superadmin/);
  assert.equal(catalogWrites(fake.calls).length, 0);
  assert.equal(fake.calls.filter(call => call.path === '/api/auth/logout').length, 1);
});


test('recupera explícitamente una ficha pausada compatible sin volver a crearla', async () => {
  const fake = await server();
  fake.controls.failService = true;
  await assert.rejects(importCatalog({manifest, credentials, fetcher: fake.fetcher, log: () => {}}));
  const paused = [...fake.businesses.values()][0];
  fake.controls.failService = false;
  fake.calls.length = 0;
  const result = await importCatalog({manifest, credentials, resumePaused: true, fetcher: fake.fetcher, log: () => {}});
  assert.equal(result.recovery_required, false);
  assert.deepEqual(result.resumed, [{id: paused.id, slug: paused.slug}]);
  assert.equal(result.created.length, 2);
  assert.equal(fake.businesses.size, 3);
  const creates = fake.calls.filter(call => call.method === 'POST' && call.path === '/api/v2/businesses');
  assert.equal(creates.length, 2);
  assert.equal(creates.some(call => call.body.slug === paused.slug), false);
  assert.equal(paused.is_active, true);
  assert.equal(fake.calls.filter(call => call.path === '/api/auth/logout').length, 1);
});

test('rechaza recuperar una ficha cuyo propietario o identidad no coincide y no muta catálogo', async () => {
  for (const mismatch of ['owner_user_id', 'name', 'logo_url', 'child_name']) {
    const fake = await server();
    fake.controls.failService = true;
    await assert.rejects(importCatalog({manifest, credentials, fetcher: fake.fetcher, log: () => {}}));
    const paused = [...fake.businesses.values()][0];
    if (mismatch === 'child_name') paused.professionals[0].name = 'Personal ajeno';
    else paused[mismatch] = mismatch === 'owner_user_id' ? 999 : 'Dato ajeno';
    fake.controls.failService = false;
    fake.calls.length = 0;
    await assert.rejects(importCatalog({manifest, credentials, resumePaused: true, fetcher: fake.fetcher, log: () => {}}), /no coinciden/);
    assert.equal(catalogWrites(fake.calls).length, 0);
    assert.equal(paused.is_active, false);
    assert.equal(fake.businesses.size, 1);
    assert.equal(fake.calls.filter(call => call.path === '/api/auth/logout').length, 1);
  }
});
