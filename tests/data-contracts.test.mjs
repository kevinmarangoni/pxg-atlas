import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildLootItemIndex, findLootPokemon, lootChanceWithLucky, lootLuckyTiers, lootRelationsForItem } from '../src/lib/loot.js'

const load = async (name) => JSON.parse(await readFile(new URL(`../public/data/${name}`, import.meta.url), 'utf8'))

test('snapshots modulares estao completos e versionados por revisao', async () => {
  const files = ['pxg_catalog.json', 'pxg_crafting.json', 'pxg_guides.json', 'pxg_progression.json', 'pxg_world_content.json']
  for (const file of files) {
    const snapshot = await load(file)
    assert.equal(snapshot.metadata.complete, true, file)
    assert.ok(snapshot.metadata.generated_at, file)
    assert.ok(snapshot.metadata.pages.every((page) => Number(page.revision_id) > 0 && page.source_url), file)
  }
})

test('catalogos essenciais nao podem regredir para vazios', async () => {
  const catalog = await load('pxg_catalog.json')
  const progression = await load('pxg_progression.json')
  assert.ok(catalog.items.length > 1800)
  assert.ok(catalog.held_items.length >= 30)
  assert.ok(catalog.berries.length >= 25)
  assert.ok(progression.balls.length >= 20)
})

test('base de loot preserva chaves de relacionamento e taxas', async () => {
  const loot = await load('pokemon_loot.json')
  assert.equal(loot._meta.schema, 'pxg-pokemon-loot-v3.1')
  assert.ok(loot.pokemon.length >= 1400)
  assert.ok(loot.pokemon.every((entry) => entry.id && entry.name && entry.join_key))
  assert.ok(loot.pokemon.some((entry) => entry.join_key === 'charizard' && entry.drops.some((drop) => drop.item_id === 'fire-tail')))
  assert.ok(loot.pokemon.some((entry) => entry.id === 'nidoran-female' && entry.name === 'Nidoran♀'))
  assert.ok(loot.pokemon.some((entry) => entry.id === 'nidoran-male' && entry.name === 'Nidoran♂'))
  assert.ok(loot.drop_rates_by_pokemon.charizard.contexts.length > 0)
})

test('indice de loot liga itens ao Pokemon e preserva variantes de Nidoran', async () => {
  const loot = await load('pokemon_loot.json')
  const index = buildLootItemIndex(loot)
  const relations = lootRelationsForItem(loot, { id: 'Fire_Tail', name: 'Fire Tail' }, index)
  assert.ok(relations.some((relation) => relation.pokemon.id === 'charizard'))
  assert.equal(findLootPokemon(loot, 'Nidoran♀')?.id, 'nidoran-female')
  assert.equal(findLootPokemon(loot, 'Nidoran♂')?.id, 'nidoran-male')
})

test('chance de loot aplica o bonus oficial de X-Lucky sem inventar cap', async () => {
  const loot = await load('pokemon_loot.json')
  assert.deepEqual(lootLuckyTiers(loot).map((tier) => tier.tier), [1, 2, 3, 4, 5, 6, 7, 9])
  assert.equal(lootChanceWithLucky({ type: 'exact_percent', percent: 4 }, loot, 7).percent, 8)
  assert.equal(lootChanceWithLucky({ type: 'exact_percent', percent: 60 }, loot, 9).percent, 150)
  assert.equal(lootChanceWithLucky({ type: 'rare' }, loot, 7), null)
})
