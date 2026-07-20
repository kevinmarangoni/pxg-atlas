export const ROLE_LABELS = {
  tank: 'Tank',
  offensive_tank: 'Offensive Tank',
  burst_damage_dealer: 'Burst Damage Dealer',
  over_time_damage_dealer: 'Over Time Damage Dealer',
  support_overtime: 'Support Over Time',
  support: 'Support',
  speedster: 'Speedster',
  disrupter: 'Disrupter',
}

// Official role artwork published by the PXG wiki. The catalog scraped into the
// JSON takes precedence; these URLs keep icons available if a definition is
// missing from an older export.
export const ROLE_ICON_URLS = {
  pve: {
    tank: 'https://wiki.pokexgames.com/images/thumb/8/80/Interface_Tank_PVE.png/24px-Interface_Tank_PVE.png',
    offensive_tank: 'https://wiki.pokexgames.com/images/thumb/0/00/Interface_OffensiveTanker_pve.png/24px-Interface_OffensiveTanker_pve.png',
    burst_damage_dealer: 'https://wiki.pokexgames.com/images/thumb/b/bc/Interface_BDD_PVE.png/24px-Interface_BDD_PVE.png',
    over_time_damage_dealer: 'https://wiki.pokexgames.com/images/thumb/e/e6/Interface_OTDD_PVE.png/24px-Interface_OTDD_PVE.png',
    support_overtime: 'https://wiki.pokexgames.com/images/thumb/f/f5/Interface_SupportOT_PVE.png/24px-Interface_SupportOT_PVE.png',
    speedster: 'https://wiki.pokexgames.com/images/thumb/a/ae/Interface_Speedster_PVE.png/24px-Interface_Speedster_PVE.png',
  },
  pvp: {
    tank: 'https://wiki.pokexgames.com/images/thumb/f/f5/Interface_Tanker_PVP.png/24px-Interface_Tanker_PVP.png',
    offensive_tank: 'https://wiki.pokexgames.com/images/thumb/a/a6/Interface_OffTank_PVP.png/24px-Interface_OffTank_PVP.png',
    burst_damage_dealer: 'https://wiki.pokexgames.com/images/thumb/b/b6/Interface_BDD_PVP.png/24px-Interface_BDD_PVP.png',
    over_time_damage_dealer: 'https://wiki.pokexgames.com/images/thumb/6/6e/Interface_OTDD_PVP.png/24px-Interface_OTDD_PVP.png',
    support: 'https://wiki.pokexgames.com/images/thumb/2/29/Interface_Support_PVP.png/24px-Interface_Support_PVP.png',
    disrupter: 'https://wiki.pokexgames.com/images/thumb/d/d7/Interface_Disrupter_PVP.png/24px-Interface_Disrupter_PVP.png',
  },
}

export function buildRoleCatalog(combatRoles = {}) {
  return Object.fromEntries(['pve', 'pvp'].map((mode) => {
    const definitions = Object.fromEntries((combatRoles[mode] ?? []).map((role) => [
      role.id,
      {
        ...role,
        iconUrl: role.icon?.icon_url || ROLE_ICON_URLS[mode]?.[role.id] || null,
      },
    ]))

    for (const [id, iconUrl] of Object.entries(ROLE_ICON_URLS[mode])) {
      definitions[id] ??= { id, mode, label: ROLE_LABELS[id] || id, iconUrl }
    }
    return [mode, definitions]
  }))
}

export function roleDefinition(role, mode, roleCatalog) {
  return roleCatalog?.[mode]?.[role] || {
    id: role,
    mode,
    label: ROLE_LABELS[role] || role,
    iconUrl: ROLE_ICON_URLS[mode]?.[role] || null,
  }
}

export const ELEMENT_COLORS = {
  Bug: '#9cab28', Dark: '#806a5b', Dragon: '#7762df', Electric: '#f6c945', Fairy: '#ec9ad6',
  Fighting: '#ce4b68', Fire: '#f27b44', Flying: '#8ca8df', Ghost: '#6875ba', Grass: '#64bd64',
  Ground: '#d79b55', Ice: '#72c9bd', Normal: '#929aa4', Poison: '#a862bf', Psychic: '#ef6f76',
  Rock: '#baaa68', Steel: '#5f9aa9', Water: '#5393df', Crystal: '#7de4dc',
}

export const ELEMENT_ORDER = [
  'Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Fighting', 'Poison',
  'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark',
  'Steel', 'Fairy', 'Crystal',
]

export const TIER_ORDER = ['3', '2', '1H', '1C', '1B', '1A', 'TR', 'TM']

// The same official artwork used by the PXG element selector. Images remain
// remote URLs; the frontend never downloads or stores binary assets.
export const ELEMENT_ICON_URLS = {
  Normal: 'https://wiki.pokexgames.com/index.php?title=Especial:Redirecionar/file&wpvalue=normal1.png',
  Fire: 'https://wiki.pokexgames.com/index.php?title=Especial:Redirecionar/file&wpvalue=fire.png',
  Water: 'https://wiki.pokexgames.com/index.php?title=Especial:Redirecionar/file&wpvalue=water.png',
  Grass: 'https://wiki.pokexgames.com/index.php?title=Especial:Redirecionar/file&wpvalue=grass.png',
  Electric: 'https://wiki.pokexgames.com/index.php?title=Especial:Redirecionar/file&wpvalue=electric.png',
  Ice: 'https://wiki.pokexgames.com/index.php?title=Especial:Redirecionar/file&wpvalue=ice.png',
  Fighting: 'https://wiki.pokexgames.com/index.php?title=Especial:Redirecionar/file&wpvalue=fighting.png',
  Poison: 'https://wiki.pokexgames.com/index.php?title=Especial:Redirecionar/file&wpvalue=poison1.png',
  Ground: 'https://wiki.pokexgames.com/index.php?title=Especial:Redirecionar/file&wpvalue=ground.png',
  Flying: 'https://wiki.pokexgames.com/index.php?title=Especial:Redirecionar/file&wpvalue=flying.png',
  Psychic: 'https://wiki.pokexgames.com/index.php?title=Especial:Redirecionar/file&wpvalue=psychic.png',
  Bug: 'https://wiki.pokexgames.com/index.php?title=Especial:Redirecionar/file&wpvalue=bug.png',
  Rock: 'https://wiki.pokexgames.com/index.php?title=Especial:Redirecionar/file&wpvalue=rock.png',
  Ghost: 'https://wiki.pokexgames.com/index.php?title=Especial:Redirecionar/file&wpvalue=ghost1.png',
  Dragon: 'https://wiki.pokexgames.com/index.php?title=Especial:Redirecionar/file&wpvalue=dragon.png',
  Dark: 'https://wiki.pokexgames.com/index.php?title=Especial:Redirecionar/file&wpvalue=Dark1.png',
  Steel: 'https://wiki.pokexgames.com/index.php?title=Especial:Redirecionar/file&wpvalue=steel.png',
  Fairy: 'https://wiki.pokexgames.com/index.php?title=Especial:Redirecionar/file&wpvalue=Fairy.png',
  Crystal: 'https://wiki.pokexgames.com/index.php?title=Especial:Redirecionar/file&wpvalue=Crystal.png',
}

const ELEMENT_ALIASES = {
  electric: 'Electric', fire: 'Fire', fighting: 'Fighting', grass: 'Grass', leaf: 'Grass',
  metal: 'Steel', normal: 'Normal', water: 'Water', ice: 'Ice', poison: 'Poison',
  ground: 'Ground', flying: 'Flying', psychic: 'Psychic', bug: 'Bug', rock: 'Rock',
  ghost: 'Ghost', dragon: 'Dragon', dark: 'Dark', steel: 'Steel', fairy: 'Fairy', crystal: 'Crystal',
}

export function normalizedElement(value) {
  const key = String(value || '').trim().toLowerCase()
  return ELEMENT_ALIASES[key] || value
}

export function elementIconUrl(element) {
  return ELEMENT_ICON_URLS[normalizedElement(element)] || null
}

export const EMPTY_FILTERS = {
  query: '',
  clan: '',
  minLevel: '',
  maxLevel: '',
  elements: [],
  tier: '',
  pveRole: '',
  pvpRole: '',
  pvpAvailability: '',
  accessibility: '',
  form: '',
  pokelogCategory: '',
  experienceCategory: '',
  sort: 'name-asc',
}

export function pokemonId(pokemon) {
  const path = new URL(pokemon.source_url).pathname
  return decodeURIComponent(path.split('/index.php/').pop())
}

export function pokemonPath(pokemon) {
  return `/pokemon/${encodeURIComponent(pokemonId(pokemon))}`
}

export function displayName(pokemon) {
  return pokemon.general_info?.name || pokemon.page_title
}

export function pokemonImage(pokemon) {
  return pokemon.image_url
    || pokemon.level_entries?.find((entry) => entry.thumbnail_url)?.thumbnail_url
    || pokemon.clan_memberships?.find((entry) => entry.thumbnail_url)?.thumbnail_url
    || pokemon.pokelog?.image_url
    || null
}

export function pokemonLevels(pokemon) {
  const values = pokemon.level_entries?.map((entry) => Number(entry.level)).filter(Number.isFinite) ?? []
  if (!values.length && Number.isFinite(Number(pokemon.general_info?.level))) values.push(Number(pokemon.general_info.level))
  return [...new Set(values)].sort((a, b) => a - b)
}

export function primaryLevel(pokemon) {
  return pokemonLevels(pokemon)[0] ?? null
}

export function pokemonElements(pokemon) {
  const values = [
    ...(pokemon.general_info?.elements ?? []),
    ...(pokemon.pokelog?.elements ?? []),
    ...(pokemon.clan_memberships ?? []).flatMap((entry) => entry.elements ?? []),
  ]
  return [...new Set(values.filter(Boolean).map(normalizedElement))]
}

export function pokemonPokelog(pokemon) {
  return pokemon.pokelog || null
}

export function pokemonCapture(pokemon) {
  return pokemon.capture || null
}

export function captureBallEntries(pokemon, catalog = []) {
  const averages = pokemonCapture(pokemon)?.ball_averages ?? {}
  return catalog
    .map((ball) => ({ ...ball, average: averages[ball.id] }))
    .filter((ball) => Number.isFinite(Number(ball.average)) && Number(ball.average) > 0)
}

export function pokelogCategories(pokemon) {
  const entry = pokemonPokelog(pokemon)
  return entry ? [entry.category].filter(Boolean) : []
}

export function experienceCategories(pokemon) {
  const entry = pokemonPokelog(pokemon)
  return entry ? [entry.experience_category].filter(Boolean) : []
}

export function pokelogStages(pokemon) {
  return pokemonPokelog(pokemon)?.stages ?? []
}

export function pokemonClans(pokemon) {
  return [...new Set((pokemon.clan_memberships ?? []).map((entry) => entry.clan).filter(Boolean))]
}

export function membershipTier(entry) {
  if (entry.category === 'technical_machine') return 'TM'
  if (entry.category === 'technical_record') return 'TR'
  return entry.tier || null
}

export function pokemonTiers(pokemon) {
  return sortTiers([...new Set((pokemon.clan_memberships ?? []).map(membershipTier).filter(Boolean))])
}

export function sortTiers(values) {
  return [...values].sort((a, b) => (TIER_ORDER.indexOf(a) === -1 ? TIER_ORDER.length : TIER_ORDER.indexOf(a)) - (TIER_ORDER.indexOf(b) === -1 ? TIER_ORDER.length : TIER_ORDER.indexOf(b)) || String(a).localeCompare(String(b), 'pt-BR', { numeric: true }))
}

export function tierLabel(value) {
  const tier = String(value || '').toUpperCase()
  if (!tier) return ''
  return tier === 'TM' || tier === 'TR' ? tier : `T${tier}`
}

export function pokemonRoles(pokemon, mode) {
  return [...new Set(
    (pokemon.clan_memberships ?? [])
      .flatMap((entry) => entry.functions?.[mode]?.role_ids ?? [])
      .filter(Boolean),
  )]
}

export function isAccessible(pokemon) {
  return !pokemon.level_entries?.length || pokemon.level_entries.some((entry) => entry.accessible)
}

export function formType(pokemon) {
  const name = displayName(pokemon).toLowerCase()
  if (name.includes('(tm)')) return 'tm'
  if (name.includes('(tr)')) return 'tr'
  if (name.includes('shiny')) return 'shiny'
  if (name.includes('mega')) return 'mega'
  if (name.includes('baby')) return 'baby'
  return 'regular'
}

function normalizedSearch(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function matchesPokemon(pokemon, filters) {
  const query = normalizedSearch(filters.query)
  if (query) {
    const haystack = normalizedSearch([
      displayName(pokemon),
      pokemon.page_title,
      ...pokemonElements(pokemon),
      ...pokemonClans(pokemon),
      ...pokemonTiers(pokemon),
      ...pokelogCategories(pokemon),
      ...experienceCategories(pokemon),
    ].join(' '))
    if (!haystack.includes(query)) return false
  }

  if (filters.clan && !pokemonClans(pokemon).includes(filters.clan)) return false
  const selectedElements = filters.elements ?? (filters.element ? [filters.element] : [])
  if (selectedElements.length && !selectedElements.every((element) => pokemonElements(pokemon).includes(normalizedElement(element)))) return false
  if (filters.tier && !pokemonTiers(pokemon).includes(filters.tier)) return false
  if (filters.pveRole && !pokemonRoles(pokemon, 'pve').includes(filters.pveRole)) return false
  if (filters.pvpRole && !pokemonRoles(pokemon, 'pvp').includes(filters.pvpRole)) return false
  if (filters.form && formType(pokemon) !== filters.form) return false
  if (filters.pokelogCategory && !pokelogCategories(pokemon).includes(filters.pokelogCategory)) return false
  if (filters.experienceCategory && !experienceCategories(pokemon).includes(filters.experienceCategory)) return false

  const levels = pokemonLevels(pokemon)
  if (filters.minLevel !== '' || filters.maxLevel !== '') {
    const min = filters.minLevel === '' ? -Infinity : Number(filters.minLevel)
    const max = filters.maxLevel === '' ? Infinity : Number(filters.maxLevel)
    if (!levels.some((level) => level >= min && level <= max)) return false
  }

  if (filters.pvpAvailability) {
    const memberships = pokemon.clan_memberships ?? []
    const available = memberships.some((entry) => entry.functions?.pvp?.available)
    if (filters.pvpAvailability === 'available' && !available) return false
    if (filters.pvpAvailability === 'unavailable' && (!memberships.length || available)) return false
  }

  if (filters.accessibility === 'accessible' && !isAccessible(pokemon)) return false
  if (filters.accessibility === 'inaccessible' && isAccessible(pokemon)) return false
  return true
}

export function sortPokemon(pokemon, sort) {
  const items = [...pokemon]
  const byName = (a, b) => displayName(a).localeCompare(displayName(b), 'pt-BR')
  if (sort === 'name-desc') return items.sort((a, b) => byName(b, a))
  if (sort === 'level-asc') return items.sort((a, b) => (primaryLevel(a) ?? 9999) - (primaryLevel(b) ?? 9999) || byName(a, b))
  if (sort === 'level-desc') return items.sort((a, b) => (primaryLevel(b) ?? -1) - (primaryLevel(a) ?? -1) || byName(a, b))
  if (sort === 'dex-asc') return items.sort((a, b) => {
    const dexA = a.clan_memberships?.find((entry) => entry.dex_number)?.dex_number ?? 9999
    const dexB = b.clan_memberships?.find((entry) => entry.dex_number)?.dex_number ?? 9999
    return dexA - dexB || byName(a, b)
  })
  return items.sort(byName)
}

export function buildFilterOptions(pokemon) {
  const unique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true }))
  return {
    clans: unique(pokemon.flatMap(pokemonClans)),
    elements: ELEMENT_ORDER.filter((element) => pokemon.some((entry) => pokemonElements(entry).includes(element))),
    tiers: sortTiers(unique(pokemon.flatMap(pokemonTiers))),
    levels: unique(pokemon.flatMap(pokemonLevels)),
    pveRoles: unique(pokemon.flatMap((entry) => pokemonRoles(entry, 'pve'))),
    pvpRoles: unique(pokemon.flatMap((entry) => pokemonRoles(entry, 'pvp'))),
    pokelogCategories: unique(pokemon.flatMap(pokelogCategories)),
    experienceCategories: unique(pokemon.flatMap(experienceCategories)),
  }
}

export function activeFilterCount(filters) {
  return Object.entries(filters).filter(([key, value]) => {
    if (key === 'sort') return false
    return Array.isArray(value) ? value.length > 0 : value !== ''
  }).length
}
