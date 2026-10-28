import assert from 'node:assert/strict'
import test from 'node:test'
import { subscriptionsAreReady } from '../src/modules/realtime/subscriptionHealth.ts'

test('el transporte abierto no desactiva fallback mientras autentica canales privados', () => {
  assert.equal(subscriptionsAreReady(true, ['private-user.1', 'marketplace'], new Set()), false)
  assert.equal(subscriptionsAreReady(true, ['private-user.1', 'marketplace'], new Set(['marketplace'])), false)
  assert.equal(subscriptionsAreReady(true, ['private-user.1', 'marketplace'], new Set(['private-user.1', 'marketplace'])), true)
})

test('una suscripción fallida mantiene fallback aunque otros canales confirmen conexión', () => {
  const required = ['private-user.1', 'private-business.2', 'marketplace']
  assert.equal(subscriptionsAreReady(true, required, new Set(['private-user.1', 'marketplace'])), false)
  assert.equal(subscriptionsAreReady(false, required, new Set(required)), false)
  assert.equal(subscriptionsAreReady(true, [], new Set()), false)
})
