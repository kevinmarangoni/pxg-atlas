const CONTEXT_LABELS = {
  normal_world: 'Mundo normal',
  nightmare_world: 'Nightmare World',
  nightmare_strong: 'Nightmare · Strong',
  nightmare_weak: 'Nightmare · Weak',
  region_outland: 'Outland',
  region_orre: 'Orre',
  mecha: 'Mecha',
  clan_capture_dungeon: 'Dungeon de captura de clan',
  dimensional_zone: 'Zona dimensional',
  mt_silver_serene: 'Mt. Silver · Serene',
  mt_silver_fierce: 'Mt. Silver · Fierce',
}

const CONFIDENCE_LABELS = {
  current_verified: 'Wiki atual',
  current_pool_verified: 'Pool oficial',
  legacy_unverified: 'Legado não verificado',
  official_exact: 'Wiki oficial · taxa exata',
  community_current_unofficial: 'Fonte comunitária atual',
  community_current_context_grouped: 'Fonte comunitária · contexto agrupado',
  community_context_inferred_from_tab_layout: 'Fonte comunitária · contexto inferido',
  community_unofficial: 'Fonte comunitária',
}

export function normalizeLootName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function lootKeyAliases(value) {
  const raw = String(value || '')
  const normalized = normalizeLootName(raw)
  const aliases = new Set()
  if (normalized === 'nidoranfe' || normalized === 'nidoran female' || /♀|\bfemale\b|\bfe\b/i.test(raw)) {
    aliases.add('nidoran female')
    aliases.add('nidoran-female')
  }
  if (normalized === 'nidoranma' || normalized === 'nidoran male' || /♂|\bmale\b|\bma\b/i.test(raw)) {
    aliases.add('nidoran male')
    aliases.add('nidoran-male')
  }
  aliases.add(normalized)
  return [...aliases]
}

export function buildLootPokemonIndex(data) {
  const index = new Map()
  for (const entry of data?.pokemon || []) {
    for (const key of [entry.id, entry.join_key, entry.normalized_name, entry.name, ...lootKeyAliases(entry.id), ...lootKeyAliases(entry.name)]) {
      if (!key) continue
      const normalized = normalizeLootName(key)
      if (normalized && !index.has(normalized)) index.set(normalized, entry)
    }
  }
  return index
}

export function findLootPokemon(data, names) {
  const index = buildLootPokemonIndex(data)
  for (const name of Array.isArray(names) ? names : [names]) {
    for (const key of lootKeyAliases(name)) {
      const match = index.get(normalizeLootName(key))
      if (match) return match
    }
  }
  return null
}

export function lootRatesForPokemon(data, entry) {
  if (!entry) return []
  const rates = data?.drop_rates_by_pokemon || {}
  const keys = [entry.join_key, entry.id, entry.normalized_name, normalizeLootName(entry.name)]
  for (const key of keys) {
    if (key && rates[key]?.contexts) return rates[key].contexts
  }
  return []
}

export function lootContextLabel(value) {
  const key = String(value || '')
  if (CONTEXT_LABELS[key]) return CONTEXT_LABELS[key]
  return key.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase()) || 'Contexto não informado'
}

export function lootConfidenceLabel(value) {
  return CONFIDENCE_LABELS[value] || String(value || 'Fonte não classificada').replaceAll('_', ' ')
}

export function lootChanceLabel(chance) {
  if (!chance) return 'Chance não informada'
  if (chance.type === 'exact_percent' && Number.isFinite(Number(chance.percent))) {
    return `${Number(chance.percent).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
  }
  return chance.label || 'Raro'
}

export function lootLuckyTiers(data) {
  return (data?.drop_modifiers?.x_lucky?.tiers || []).filter((tier) => tier.available !== false && Number.isFinite(Number(tier.bonus_percent)))
}

export function lootChanceWithLucky(chance, data, tier) {
  if (!chance || chance.type !== 'exact_percent' || !Number.isFinite(Number(chance.percent))) return null
  const basePercent = Number(chance.percent)
  const luckyTier = lootLuckyTiers(data).find((entry) => entry.tier === Number(tier))
  if (!luckyTier) return { basePercent, percent: basePercent, bonusPercent: 0 }
  return {
    basePercent,
    percent: basePercent * (1 + Number(luckyTier.bonus_percent) / 100),
    bonusPercent: Number(luckyTier.bonus_percent),
    tier: luckyTier.tier,
  }
}

export function lootQuantityLabel(quantity) {
  if (!quantity) return ''
  const minimum = quantity.min ?? quantity.minimum
  const maximum = quantity.max ?? quantity.maximum
  if (minimum == null && maximum == null) return ''
  if (minimum == null || maximum == null || minimum === maximum) return `${minimum ?? maximum}x`
  return `${minimum}–${maximum}x`
}

export function lootRateRowsForItem(contexts, item) {
  const keys = new Set(lootItemKeys(item?.id, item?.name))
  return (contexts || []).flatMap((context) => (context.drops || [])
    .filter((drop) => keys.has(normalizeLootName(drop.item_id)) || keys.has(normalizeLootName(drop.item)))
    .map((drop) => ({ context, drop })))
}

export function hasLootRecord(entry, contexts = []) {
  return Boolean(entry && (
    entry.drops?.length
    || entry.pool_drops?.length
    || entry.inactive_documented_drops?.length
    || entry.documented_hunt_contexts?.length
    || contexts.length
  ))
}

function lootItemKeys(itemId, itemName) {
  return [...new Set([itemId, itemName].filter(Boolean).map(normalizeLootName).filter(Boolean))]
}

function addLootItemRelation(index, itemId, itemName, pokemon, context = null) {
  for (const key of lootItemKeys(itemId, itemName)) {
    const relation = index.get(key) || { pokemon: new Map(), count: 0 }
    const current = relation.pokemon.get(pokemon.id) || { pokemon, contexts: [] }
    if (context && !current.contexts.some((value) => value.context_id === context.context_id)) current.contexts.push(context)
    relation.pokemon.set(pokemon.id, current)
    relation.count = relation.pokemon.size
    index.set(key, relation)
  }
}

export function buildLootItemIndex(data) {
  const index = new Map()
  for (const pokemon of data?.pokemon || []) {
    for (const drop of pokemon.drops || []) addLootItemRelation(index, drop.item_id, drop.item, pokemon)
    for (const pool of pokemon.pool_drops || []) {
      for (const item of pool.items || []) addLootItemRelation(index, normalizeLootName(item).replaceAll(' ', '-'), item, pokemon)
    }
  }
  for (const record of Object.values(data?.drop_rates_by_pokemon || {})) {
    const pokemon = (data?.pokemon || []).find((entry) => entry.join_key === record.pokemon_id || entry.id === record.pokemon_id || normalizeLootName(entry.name) === normalizeLootName(record.pokemon_name))
    if (!pokemon) continue
    for (const context of record.contexts || []) {
      for (const drop of context.drops || []) addLootItemRelation(index, drop.item_id, drop.item, pokemon, context)
    }
  }
  return index
}

export function lootRelationsForItem(data, item, index = buildLootItemIndex(data)) {
  const relation = lootItemKeys(item?.id, item?.name).map((key) => index.get(key)).find(Boolean)
  return relation ? [...relation.pokemon.values()] : []
}
