import assert from 'node:assert/strict';
import test from 'node:test';
import { cachedRead, clearReadCache, readCacheTtl } from '@/modules/realtime/readCache';
import { clearResourceHistory, publishResourceChange, subscribeResourceChanges, topicsForUrl } from '@/modules/realtime/resourceBus';

test('una lectura simultánea se comparte y un evento invalida solo su recurso', async () => {
  clearReadCache();
  let calls = 0;
  let finish;
  const fetcher = () => { calls++; return new Promise(resolve => { finish = resolve; }); };
  const first = cachedRead('session:branches', '/v2/branches', fetcher);
  const second = cachedRead('session:branches', '/v2/branches', fetcher);
  assert.equal(calls, 1);
  finish({ count: 1 });
  assert.deepEqual(await first, await second);
  publishResourceChange({ topics: ['chat'] });
  assert.deepEqual(await cachedRead('session:branches', '/v2/branches', fetcher), { count: 1 });
  publishResourceChange({ topics: ['branches'] });
  const next = cachedRead('session:branches', '/v2/branches', fetcher);
  assert.equal(calls, 2);
  finish({ count: 2 });
  assert.deepEqual(await next, { count: 2 });
});

test('una respuesta iniciada antes de invalidar nunca repuebla la caché', async () => {
  clearReadCache();
  let finish;
  const old = cachedRead('old', '/v2/services', () => new Promise(resolve => { finish = resolve; }));
  publishResourceChange({ topics: ['services'] });
  finish('stale');
  await old;
  const value = await cachedRead('old', '/v2/services', async () => 'fresh');
  assert.equal(value, 'fresh');
  clearReadCache();
  assert.equal(await cachedRead('old', '/v2/services', async () => 'new-session'), 'new-session');
});

test('errores no quedan cacheados y disponibilidad/cobros consultan siempre al servidor', async () => {
  clearReadCache();
  await assert.rejects(cachedRead('fail', '/v2/businesses', async () => { throw new Error('offline'); }));
  assert.equal(await cachedRead('fail', '/v2/businesses', async () => 'ok'), 'ok');
  for (const path of ['/auth/me', '/v2/appointments/availability', '/v2/wallet', '/v2/payments/checkout']) assert.equal(readCacheTtl(path), 0);
  assert(topicsForUrl('/analytics/overview').includes('appointments'));
});

test('eventos repetidos por reconexión se deduplican y se liberan suscriptores', () => {
  clearResourceHistory();
  let calls = 0;
  const off = subscribeResourceChanges(() => { calls++; });
  publishResourceChange({ topics: ['branches'], revision: 'same-event' });
  publishResourceChange({ topics: ['branches'], revision: 'same-event' });
  assert.equal(calls, 1);
  off();
  publishResourceChange({ topics: ['branches'], revision: 'new-event' });
  assert.equal(calls, 1);
});

test('lecturas con AbortSignal comparten petición y cancelar un consumidor no cancela al otro', async () => {
  clearReadCache();
  const firstSignal = new AbortController();
  const secondSignal = new AbortController();
  let networkSignal;
  let finish;
  let calls = 0;
  const fetcher = signal => { networkSignal = signal; calls++; return new Promise(resolve => { finish = resolve; }); };
  const first = cachedRead('shared-signals', '/analytics/overview', fetcher, true, firstSignal.signal);
  const second = cachedRead('shared-signals', '/analytics/overview', fetcher, true, secondSignal.signal);
  const cancelled = assert.rejects(first, { name: 'AbortError' });
  firstSignal.abort();
  await cancelled;
  assert.equal(calls, 1);
  assert.equal(networkSignal.aborted, false);
  finish({ value: 42 });
  assert.deepEqual(await second, { value: 42 });
  assert.deepEqual(await cachedRead('shared-signals', '/analytics/overview', fetcher, true, new AbortController().signal), { value: 42 });
  assert.equal(calls, 1);
});

test('cancelar todos los consumidores aborta red y una respuesta tardía no llena caché', async () => {
  clearReadCache();
  const consumer = new AbortController();
  let networkSignal;
  let finish;
  const abandoned = cachedRead('all-cancel', '/v2/branches', signal => { networkSignal = signal; return new Promise(resolve => { finish = resolve; }); }, true, consumer.signal);
  const cancelled = assert.rejects(abandoned, { name: 'AbortError' });
  consumer.abort();
  await cancelled;
  assert.equal(networkSignal.aborted, true);
  finish('stale');
  await Promise.resolve();
  assert.equal(await cachedRead('all-cancel', '/v2/branches', async () => 'fresh'), 'fresh');
});

test('cambiar sesión rechaza consumidores pendientes y los GET sensibles conservan su signal', async () => {
  clearReadCache();
  let finish;
  const old = cachedRead('old-session', '/analytics/overview', () => new Promise(resolve => { finish = resolve; }));
  const cancelled = assert.rejects(old, { name: 'AbortError' });
  clearReadCache();
  await cancelled;
  finish('late');
  const controller = new AbortController();
  await cachedRead('payment', '/v2/payments', async signal => { assert.equal(signal, controller.signal); return 1; }, true, controller.signal);
  assert(topicsForUrl('/v2/branches?analytics=1').includes('appointments'));
  assert(topicsForUrl('/v2/resources').includes('availability'));
});

test('eventos de chat no eliminan deduplicación ni caché de una lectura de sucursales en curso', async () => {
  clearReadCache();
  let finish;
  let calls = 0;
  const fetcher = () => { calls++; return new Promise(resolve => { finish = resolve; }); };
  const first = cachedRead('unrelated-live-event', '/v2/branches', fetcher);
  publishResourceChange({ topics: ['chat'] });
  const second = cachedRead('unrelated-live-event', '/v2/branches', fetcher);
  assert.equal(calls, 1);
  finish('value');
  assert.equal(await first, await second);
  assert.equal(await cachedRead('unrelated-live-event', '/v2/branches', async () => 'unexpected'), 'value');
});

test('una lectura invalidada conserva cancelación por cierre de sesión', async () => {
  clearReadCache();
  let finish;
  const old = cachedRead('invalidated-session', '/v2/branches', () => new Promise(resolve => { finish = resolve; }));
  const cancelled = assert.rejects(old, { name: 'AbortError' });
  publishResourceChange({ topics: ['branches'] });
  clearReadCache();
  await cancelled;
  finish('late');
});
