import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const dataDirectory = resolve(process.cwd(), 'public/data')
const failures = []
const checks = []

async function load(filename) {
  try { return JSON.parse(await readFile(resolve(dataDirectory, filename), 'utf8')) }
  catch (error) { failures.push(`${filename}: ${error.message}`); return null }
}

function assert(condition, message) {
  if (!condition) failures.push(message)
}

function uniqueIds(entries, label) {
  const ids = entries.map((entry) => entry.id)
  assert(ids.every(Boolean), `${label}: há registros sem id.`)
  assert(new Set(ids).size === ids.length, `${label}: há ids duplicados.`)
}

const [catalog, crafting, guides, progression, world, pokemon] = await Promise.all([
  load('pxg_catalog.json'), load('pxg_crafting.json'), load('pxg_guides.json'),
  load('pxg_progression.json'), load('pxg_world_content.json'), load('pxg_pokemon_capture.json'),
])

for (const [name, payload] of Object.entries({ catalog, crafting, guides, progression, world })) {
  if (!payload) continue
  assert(payload.metadata?.complete === true, `${name}: snapshot não está marcado como completo.`)
  assert(payload.metadata?.generated_at, `${name}: generated_at ausente.`)
  assert(Array.isArray(payload.metadata?.pages) && payload.metadata.pages.every((page) => page.source_url && page.revision_id), `${name}: metadados de página incompletos.`)
}

if (catalog && crafting) {
  uniqueIds(catalog.items || [], 'catalog.items')
  uniqueIds(crafting.recipes || [], 'crafting.recipes')
  uniqueIds(catalog.berries || [], 'catalog.berries')
  uniqueIds(catalog.balls || [], 'catalog.balls')
  const itemIds = new Set(catalog.items.map((item) => item.id))
  const recipeIds = new Set(crafting.recipes.map((recipe) => recipe.id))
  for (const recipe of crafting.recipes) {
    assert(itemIds.has(recipe.output?.item_id), `crafting: saída inexistente em ${recipe.id}.`)
    assert(Number(recipe.output?.quantity) > 0, `crafting: quantidade de saída inválida em ${recipe.id}.`)
    for (const ingredient of recipe.ingredients || []) {
      assert(itemIds.has(ingredient.item_id), `crafting: ingrediente ${ingredient.item_id} não existe (${recipe.id}).`)
      assert(Number(ingredient.quantity) > 0, `crafting: quantidade inválida em ${recipe.id}.`)
    }
  }
  for (const item of catalog.items) {
    assert(new Set(item.dropped_by || []).size === (item.dropped_by || []).length, `catalog: drops duplicados em ${item.id}.`)
    for (const recipeId of [...(item.produced_by_recipe_ids || []), ...(item.used_in_recipe_ids || [])]) {
      assert(recipeIds.has(recipeId), `catalog: receita ${recipeId} referenciada por ${item.id} não existe.`)
    }
  }
  checks.push(`${catalog.items.length} itens`, `${crafting.recipes.length} receitas`)
  assert(catalog.items.length >= 2000, `catalog: esperados ao menos 2.000 itens, encontrados ${catalog.items.length}.`)
  assert((catalog.berries || []).length >= 25, `catalog: berries insuficientes (${catalog.berries?.length || 0}).`)
  assert((catalog.held_items || []).length >= 30, `catalog: helds insuficientes (${catalog.held_items?.length || 0}).`)
}

if (guides) {
  uniqueIds(guides.quests || [], 'guides.quests')
  uniqueIds(guides.npcs || [], 'guides.npcs')
  uniqueIds(guides.bosses || [], 'guides.bosses')
  assert((guides.quests || []).every((quest) => quest.name && quest.guide_url), 'guides: quests sem nome ou guia.')
  assert((guides.quests || []).every((quest) => Number(quest.detail_revision_id) > 0), 'guides: alguma quest não possui revisão do detalhe sincronizado.')
  assert((guides.npcs || []).every((npc) => Number(npc.detail_revision_id) > 0), 'guides: algum NPC não possui revisão do detalhe sincronizado.')
  assert((guides.bosses || []).every((boss) => Number(boss.detail_revision_id) > 0), 'guides: algum boss não possui revisão do detalhe sincronizado.')
  assert(Number(guides.metadata.total_detail_pages) >= 200, 'guides: snapshot detalhado incompleto.')
  checks.push(`${guides.quests.length} quests`, `${guides.npcs.length} NPCs`, `${guides.bosses.length} bosses`)
}

if (progression) {
  const normalLevels = Object.keys(progression.experience?.levels?.normal || {})
  const nightmareLevels = Object.keys(progression.experience?.levels?.nightmare || {})
  assert((progression.balls || []).length >= 20, `progression: esperadas ao menos 20 Pokébolas, encontradas ${progression.balls?.length || 0}.`)
  assert(normalLevels.length === 600, `progression: esperados 600 levels normais, encontrados ${normalLevels.length}.`)
  assert(nightmareLevels.length >= 100, `progression: esperados ao menos 100 levels Nightmare, encontrados ${nightmareLevels.length}.`)
  assert((progression.balls || []).length > 0, 'progression: catálogo de Pokébolas vazio.')
  checks.push(`${normalLevels.length} levels`, `${nightmareLevels.length} levels Nightmare`)
}

if (world) {
  for (const point of world.points || []) {
    assert(point.id && point.kind && point.region, 'world: ponto sem id, tipo ou região.')
    assert([point.x, point.y, point.z].every((value) => Number.isFinite(Number(value))), `world: coordenada inválida em ${point.id}.`)
  }
  checks.push(`${(world.respawn?.pokemon || []).length} timers de Pokémon`)
}

if (pokemon) {
  assert(pokemon.metadata?.complete === true, 'pokemon: snapshot principal não está completo.')
  assert((pokemon.pokemon || []).length >= 1000, 'pokemon: menos de 1.000 registros no snapshot principal.')
  assert((pokemon.tasks || []).length >= 500, 'pokemon: menos de 500 tasks no snapshot principal.')
  checks.push(`${pokemon.pokemon.length} Pokémon`, `${pokemon.tasks.length} tasks`)
}

if (failures.length) {
  console.error(['Validação de dados falhou:', ...failures.map((failure) => `- ${failure}`)].join('\n'))
  process.exitCode = 1
} else {
  console.log(`Dados válidos: ${checks.join(' · ')}`)
}
