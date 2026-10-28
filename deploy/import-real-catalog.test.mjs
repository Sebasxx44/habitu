import assert from 'node:assert/strict';
import test from 'node:test';
import { importRealCatalog, listingPayload, readCatalog, validateCatalog } from './import-real-catalog.mjs';

const catalog = await readCatalog();
const credentials = {origin: 'https://habitu-sebaz-api.onrender.com', email: 'catalog-admin@example.test', password: 'fake-catalog-password'};
const sessionToken = 'fake-catalog-session-token';
const categories = [
  {id: 1, slug: 'veterinaria'},
  {id: 2, slug: 'beauty-salon'},
  {id: 3, slug: 'cancha-futbol'},
  {id: 4, slug: 'tattoo-studio'},
];

const listingDetail = (row, id) => ({
  ...listingPayload(row, categories.find(category => category.slug === row.category_slug).id),
  id,
  owner_user_id: null,
  verified: false,
  rating: '0.0',
  reviews_count: 0,
  services: [],
  professionals: [],
  resources: [],
  branches: [{id: id + 1000, address: row.address}],
});

const server = ({role = 'SUPERADMIN', previews = false} = {}) => {
  const businesses = new Map();
  const calls = [];
  const messages = [];
  const controls = {photoStatus: 200};
  if (previews) {
    catalog.retire_preview_slugs.forEach((slug, index) => businesses.set(index + 1, {
      id: index + 1,
      slug,
      name: `Nombre histórico ${index + 1} · Prueba`,
      description: 'FICHA DE PRUEBA conservada como historial.',
      owner_user_id: 7,
      booking_mode: 'internal',
      is_active: true,
    }));
    businesses.set(4, {id: 4, slug: 'otro-negocio', name: 'Comercio ajeno', owner_user_id: 99, is_active: true});
  }
  let nextId = 100;
  const fetcher = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? 'GET';
    const headers = new Headers(init.headers);
    const body = init.body ? JSON.parse(String(init.body)) : null;
    calls.push({method, url: url.href, path: url.pathname, headers, body});
    if (url.origin !== credentials.origin) {
      assert.equal(method, 'HEAD');
      assert(catalog.businesses.some(row => row.photo.url === url.href));
      assert.equal(headers.get('Authorization'), null);
      assert.equal(headers.get('Cookie'), null);
      assert.equal(init.body, undefined);
      assert.equal(init.redirect, 'manual');
      return new Response(null, {status: controls.photoStatus, headers: {'Content-Type': 'image/jpeg'}});
    }
    assert.equal(init.redirect, 'manual');
    if (url.pathname === '/api/auth/login') {
      assert.deepEqual(body, {email: credentials.email, password: credentials.password});
      return Response.json({token: sessionToken});
    }
    assert.equal(headers.get('Authorization'), `Bearer ${sessionToken}`);
    if (url.pathname === '/api/auth/me') return Response.json({user: {id: 7, role}});
    if (url.pathname === '/api/auth/logout') return Response.json({success: true});
    if (url.pathname === '/api/v2/businesses/categories') return Response.json({data: categories});
    if (url.pathname === '/api/v2/businesses' && method === 'GET') return Response.json({data: [...businesses.values()]});
    if (url.pathname === '/api/v2/businesses' && method === 'POST') {
      assert.equal(body.is_active, false);
      const row = catalog.businesses.find(item => item.slug === body.slug);
      assert(row);
      const detail = {...listingDetail(row, nextId++), ...body};
      businesses.set(detail.id, detail);
      return Response.json({data: detail});
    }
    const id = Number(url.pathname.split('/').at(-1));
    const existing = businesses.get(id);
    assert(existing, `Solicitud inesperada: ${method} ${url.pathname}`);
    if (method === 'PUT') {
      if (body.is_active === true) {
        assert.equal(catalog.businesses.filter(row => [...businesses.values()].some(item => item.slug === row.slug)).length, 8);
      }
      Object.assign(existing, body);
    } else assert.equal(method, 'GET');
    return Response.json({data: existing});
  };
  const run = () => importRealCatalog({catalog, credentials, fetcher, log: message => messages.push(message)});
  return {businesses, calls, messages, controls, fetcher, run};
};

const writes = calls => calls.filter(call => call.path.startsWith('/api/v2/') && !['GET', 'HEAD'].includes(call.method));

test('el manifiesto fijo y su payload describen ocho referencias externas sin agendas ni cuentas', () => {
  assert.equal(catalog.businesses.length, 8);
  assert.equal(validateCatalog(catalog), undefined);
  assert.throws(() => validateCatalog({...catalog, businesses: catalog.businesses.slice(1)}));
  assert.throws(() => validateCatalog({...catalog, retire_preview_slugs: [...catalog.retire_preview_slugs, 'otro-negocio']}));
  for (const row of catalog.businesses) {
    const payload = listingPayload(row, 12);
    assert.equal(payload.slug, row.slug);
    assert.equal(payload.name, row.name);
    assert.equal(payload.booking_mode, 'external');
    assert.equal(payload.booking_url, row.booking_url);
    assert.equal(payload.is_active, false);
    assert.equal(payload.uses_professionals, false);
    assert.equal(payload.uses_resources, false);
    for (const key of ['services', 'professionals', 'users', 'staff', 'schedules', 'schedule', 'resources', 'owner_user_id', 'published_team']) {
      assert.equal(Object.hasOwn(payload, key), false, `${row.slug}: ${key}`);
    }
  }
});

test('crea ocho fichas pausadas antes de activar y retira sólo tres pruebas propias sin renombrarlas', async () => {
  const fake = server({previews: true});
  const originalNames = [1, 2, 3].map(id => fake.businesses.get(id).name);
  const result = await fake.run();
  const mutations = writes(fake.calls);
  const creations = mutations.filter(call => call.method === 'POST');
  assert.equal(creations.length, 8);
  assert(creations.every(call => call.path === '/api/v2/businesses' && call.body.is_active === false));
  const firstActivation = mutations.findIndex(call => call.body.is_active === true);
  const lastCreation = mutations.findLastIndex(call => call.method === 'POST');
  assert(firstActivation > lastCreation);
  assert.deepEqual(result.retired.map(row => row.slug), catalog.retire_preview_slugs);
  assert.deepEqual([1, 2, 3].map(id => fake.businesses.get(id).name), originalNames);
  assert([1, 2, 3].every(id => fake.businesses.get(id).is_active === false));
  assert.equal(fake.businesses.get(4).is_active, true);
  assert.equal(result.staff_accounts_created, 0);
  assert.equal(result.internal_calendars_created, 0);
  assert(mutations.filter(call => call.method === 'PUT').every(call => Object.keys(call.body).join() === 'is_active'));
  assert.equal(fake.calls.some(call => ['/api/auth/users', '/api/v2/services', '/api/v2/professionals', '/api/v2/appointments'].includes(call.path)), false);
  for (const secret of [credentials.email, credentials.password, sessionToken]) assert.equal(fake.messages.join('\n').includes(secret), false);
  const foreignPreview = fake.businesses.get(1);
  Object.assign(foreignPreview, {is_active: true, owner_user_id: 99});
  fake.calls.length = 0;
  await assert.rejects(fake.run(), /requiere revisión/);
  assert.equal(foreignPreview.is_active, true);
  assert.equal(writes(fake.calls).length, 0);
});

test('repetir la importación es idempotente y no emite CRUD del catálogo', async () => {
  const fake = server();
  await fake.run();
  fake.calls.length = 0;
  const result = await fake.run();
  assert.equal(result.published.length, 8);
  assert.equal(fake.businesses.size, 8);
  assert.equal(writes(fake.calls).length, 0);
  assert.equal(fake.calls.filter(call => call.path === '/api/auth/logout').length, 1);
});

test('conserva una ficha existente diferente y no la sobrescribe ni crea sustitutos', async () => {
  const fake = server();
  const existing = {...listingDetail(catalog.businesses[0], 41), name: 'Nombre editado por su responsable', is_active: true};
  fake.businesses.set(existing.id, existing);
  const before = structuredClone(existing);
  await assert.rejects(fake.run(), /se conservó sin sobrescribir/);
  assert.deepEqual(existing, before);
  assert.equal(fake.businesses.size, 1);
  assert.equal(writes(fake.calls).length, 0);
});

test('una foto HEAD fallida aborta antes del login y nunca envía credenciales a sus publicadores', async () => {
  const fake = server();
  fake.controls.photoStatus = 404;
  await assert.rejects(fake.run(), /No se pudo verificar la imagen/);
  assert.equal(fake.businesses.size, 0);
  assert.equal(fake.calls.length, 8);
  assert(fake.calls.every(call => call.method === 'HEAD' && call.headers.get('Authorization') === null && call.body === null));
  assert.equal(fake.calls.some(call => call.url.startsWith(credentials.origin)), false);
});

test('rechaza destino no autorizado y rol distinto de superadmin antes de cualquier CRUD', async () => {
  const fake = server({role: 'CLIENTE'});
  await assert.rejects(importRealCatalog({catalog, credentials: {...credentials, origin: 'https://otro-servidor.test'}, fetcher: fake.fetcher}), /destino/);
  assert.equal(fake.calls.length, 0);
  await assert.rejects(fake.run(), /Se requiere superadmin/);
  assert.equal(writes(fake.calls).length, 0);
  assert.equal(fake.businesses.size, 0);
  assert.equal(fake.calls.filter(call => call.path === '/api/auth/logout').length, 1);
  assert.deepEqual(fake.messages, []);
});
