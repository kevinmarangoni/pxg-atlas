import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  addCatalogTables, buildCrafting, parseBalls, parseBerries, parseCatchRules,
  parseExperience, parseHeldTables, parseLinkedDirectory, parseNpcDirectory,
  parseGuideSections, parseQuests, parseRespawn,
} from '../scripts/sync-wiki-data.mjs'

const fixtures = JSON.parse(await readFile(new URL('./fixtures/wiki-pages.json', import.meta.url), 'utf8'))
const page = (name) => ({ page_title: name, source_url: `https://wiki.pokexgames.com/index.php/${name}`, revision_id: 123, html: fixtures[name] })

test('catalogo liga um drop ao Pokemon publicado', () => {
  const items = new Map()
  addCatalogTables(page('catalog'), items, 'Loot')
  const item = [...items.values()][0]
  assert.equal(item.name, 'Fire Essence')
  assert.deepEqual(item.dropped_by, ['Charmander'])
})

test('crafting interpreta lote, materiais e duracao', () => {
  const result = buildCrafting(page('crafting'))
  assert.equal(result.recipes[0].output.quantity, 10)
  assert.equal(result.recipes[0].ingredients[0].quantity, 3)
  assert.equal(result.recipes[0].time_seconds, 120)
})

test('links de imagem nao escondem helds, berries e pokebolas', () => {
  assert.equal(parseHeldTables(page('helds'))[0].name, 'X-Attack')
  const berry = parseBerries(page('berries'))[0]
  assert.equal(berry.name, 'Passho Berry')
  assert.equal(berry.ripening, 'Seis horas')
  const ball = parseBalls(page('balls'))[0]
  assert.equal(ball.name, 'Great Ball')
  assert.equal(ball.rate, '2x')
})

test('guias preservam ids, origem e spoilers sem abrir conteudo', () => {
  const quest = parseQuests(page('quests'))[0]
  assert.equal(quest.id, 'quest:7')
  assert.equal(quest.spoiler.available, true)
  assert.equal(parseNpcDirectory(page('npcs'))[0].name, 'Mark')
  assert.equal(parseLinkedDirectory(page('bosses'), 'boss', (title) => /^Boss Fight/.test(title))[0].name, 'Boss Fight - Mewtwo')
  assert.ok(parseGuideSections(page('npcs')).sections.some((section) => section.title === 'Mark'))
})

test('progressao, captura e respawn usam tabelas separadas', () => {
  const experience = parseExperience(page('experience'))
  assert.equal(experience.levels.normal[2], 100)
  assert.equal(experience.levels.nightmare[2], 500)
  assert.equal(experience.reductions[0].rows[0][1], '100%')
  assert.equal(parseCatchRules(page('capture')).length, 2)
  const respawn = parseRespawn(page('respawn'))
  assert.equal(respawn.pokemon[0].name, 'Charizard')
  assert.equal(respawn.npcs[0].name, 'Mark')
})
