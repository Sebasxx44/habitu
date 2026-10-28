import test from 'node:test'
import assert from 'node:assert/strict'
import { buildGrowthActions } from '../src/modules/agenda/growthActions.ts'

const overview = (metrics = [], services = []) => ({ metrics, services, currency: 'COP' })
const metric = (id, value, change = null) => ({ id, value, change })

test('sin reservas recomienda preparar operación sin inventar ingresos ni crecimiento', () => {
  const actions = buildGrowthActions(overview())
  assert.deepEqual(actions.map(action => action.id), ['start'])
  assert.match(actions[0].evidence, /No hay reservas/)
})

test('ausencias y caída de valor se priorizan con cifras reales y límite de tres acciones', () => {
  const actions = buildGrowthActions(overview([metric('reservations', 20), metric('cancelled', 3), metric('noShow', 1), metric('realizedValue', 100000, -25), metric('uniqueClients', 12), metric('returningClients', 4)], [{ name: 'Corte', completed: 8, revenue: 100000 }]))
  assert.deepEqual(actions.map(action => action.id), ['recover', 'value', 'retention'])
  assert.match(actions[0].evidence, /3 cancelaciones y 1 ausencias entre 20/)
  assert.match(actions[1].evidence, /25%/)
  assert.match(actions[2].evidence, /4 de 12/)
})

test('elige servicio por valor realizado y nunca recomienda servicios sin completar', () => {
  const actions = buildGrowthActions(overview([metric('reservations', 3), metric('realizedValue', 80000, null)], [{ name: 'Pendiente', completed: 0, revenue: 100000 }, { name: 'Corte', completed: 2, revenue: 50000 }, { name: 'Color', completed: 1, revenue: 80000 }]))
  assert.equal(actions.length, 1)
  assert.equal(actions[0].title, 'Da visibilidad a Color')
  assert.match(actions[0].evidence, /COP/)
  assert.ok(!actions.some(action => action.id === 'value'))
})

test('los horarios heredados conservan el día tanto en español como en inglés', async () => {
  const { branchDayIndex } = await import('../src/modules/branches/schedule.ts')
  assert.equal(branchDayIndex('Mié'), 3)
  assert.equal(branchDayIndex('MONDAY'), 1)
  assert.equal(branchDayIndex('6'), 6)
  assert.equal(branchDayIndex('Sábado'), 6)
  assert.equal(branchDayIndex('7'), null)
})
