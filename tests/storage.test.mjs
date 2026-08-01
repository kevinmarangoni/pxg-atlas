import test from 'node:test'
import assert from 'node:assert/strict'
import { migratePokelogStageProgress } from '../src/lib/pokemon.js'
import { storageItemKey, validateAtlasBackup } from '../src/lib/storage.js'

const valid = {
  version: 2,
  activePriceProfileId: 'default',
  priceProfiles: [{ id: 'default', name: 'Padrão', prices: { 'fire stone': 25 } }],
  craftingProjects: [{ id: 'craft-1', targetItemId: 'Great_Ball', quantity: 10, inventory: {}, selections: {} }],
  progress: { pokelog: {}, quests: {}, bosses: {} },
  berryTimers: [{ id: 'timer-1', name: 'Passho Berry', endAt: '2026-08-02T12:00:00.000Z' }],
}

test('backup valido aceita perfis, projetos, progresso e timers', () => {
  assert.deepEqual(validateAtlasBackup(valid), { valid: true, errors: [] })
})

test('backup rejeita perfil ativo ausente e valores malformados', () => {
  const validation = validateAtlasBackup({ ...valid, activePriceProfileId: 'ghost', priceProfiles: [{ ...valid.priceProfiles[0], prices: { stone: -2 } }] })
  assert.equal(validation.valid, false)
  assert.ok(validation.errors.some((error) => /ativo/.test(error)))
  assert.ok(validation.errors.some((error) => /preço inválido/.test(error)))
})

test('chaves de preço são estáveis entre acentos e caixa', () => {
  assert.equal(storageItemKey('Poké Ball'), storageItemKey('POKE ball'))
})

test('migração converte índices antigos em ids estáveis de estágio', () => {
  const stages = [{ stage: 'Bronze I' }, { stage: 'Silver II' }]
  assert.deepEqual(migratePokelogStageProgress(['legacy-index:1', 'Bronze_I'], stages), ['Silver_II', 'Bronze_I'])
})
