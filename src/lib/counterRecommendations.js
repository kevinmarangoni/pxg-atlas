import { ELEMENT_COLORS, displayName, normalizedElement, pokemonElements, primaryLevel } from './pokemon'

const OFFENSIVE_EFFECTIVENESS = [
  { key: 'super_effective', strength: 3, label: 'Super efetivo' },
  { key: 'very_effective', strength: 2, label: 'Muito efetivo' },
  { key: 'effective', strength: 1, label: 'Efetivo' },
]

const DEFENSIVE_EFFECTIVENESS = [
  { keys: ['null', 'immune', 'imune'], score: 3 },
  { keys: ['super_ineffective'], score: 3 },
  { keys: ['very_ineffective'], score: 2 },
  { keys: ['ineffective'], score: 1 },
  { keys: ['super_effective'], score: -3 },
  { keys: ['very_effective'], score: -2 },
  { keys: ['effective'], score: -1 },
]

function moveCanDealDamage(move) {
  if (!move?.element || String(move.slot).toUpperCase() === 'P') return false
  const tags = move.tags || []
  if (tags.includes('Passive')) return false
  return !(tags.includes('Self') && !tags.some((tag) => ['Damage', 'Poison', 'Hellfire', 'Lifesteal'].includes(tag)))
}

export function activeCombatMoves(pokemon, mode = 'pve') {
  const moves = pokemon?.moves || {}
  const selected = moves[mode]?.length ? moves[mode] : moves.default?.length ? moves.default : []
  return selected.filter(moveCanDealDamage)
}

export function counterWeaknesses(target) {
  const strongestByElement = new Map()

  for (const definition of OFFENSIVE_EFFECTIVENESS) {
    for (const value of target?.effectiveness?.[definition.key] || []) {
      const element = normalizedElement(value)
      if (!element || !ELEMENT_COLORS[element] || strongestByElement.has(element)) continue
      strongestByElement.set(element, { element, ...definition })
    }
  }

  return [...strongestByElement.values()]
}

function defensiveScore(pokemon, incomingElement) {
  const target = normalizedElement(incomingElement)
  const effectiveness = pokemon?.effectiveness || {}

  for (const definition of DEFENSIVE_EFFECTIVENESS) {
    const matches = definition.keys.some((key) => (effectiveness[key] || [])
      .map(normalizedElement)
      .includes(target))
    if (matches) return definition.score
  }

  return 0
}

function defensiveMatchup(candidate, target, mode) {
  const moveElements = activeCombatMoves(target, mode).map((move) => normalizedElement(move.element))
  const incomingElements = [...new Set((moveElements.length ? moveElements : pokemonElements(target)).filter(Boolean))]
  const scores = incomingElements.map((element) => defensiveScore(candidate, element))
  const hasDisadvantage = scores.some((score) => score < 0)
  const resistantCount = scores.filter((score) => score > 0).length

  if (hasDisadvantage) return { id: 'vulnerable', label: 'Tem desvantagem defensiva', rank: 0, safe: false }
  if (scores.length && resistantCount === scores.length) return { id: 'resistant', label: 'Resiste aos ataques', rank: 3, safe: true }
  if (resistantCount > 0) return { id: 'partial', label: 'Resiste parcialmente', rank: 2, safe: true }
  return { id: 'neutral', label: 'Sem desvantagem', rank: 1, safe: true }
}

export function buildCounterRecommendations(target, pokemon, mode = 'pve') {
  const weaknesses = counterWeaknesses(target)
  const weaknessByElement = new Map(weaknesses.map((entry) => [entry.element, entry]))
  if (!weaknessByElement.size) return []

  return pokemon.flatMap((candidate) => {
    if (!candidate || candidate.source_url === target?.source_url) return []

    const opportunities = activeCombatMoves(candidate, mode)
      .map((move) => ({ move, weakness: weaknessByElement.get(normalizedElement(move.element)) }))
      .filter((entry) => entry.weakness)

    if (!opportunities.length) return []

    const bestStrength = Math.max(...opportunities.map((entry) => entry.weakness.strength))
    const bestOpportunities = opportunities.filter((entry) => entry.weakness.strength === bestStrength)
    const attackElements = [...new Set(bestOpportunities.map((entry) => entry.weakness.element))]
    const attackMoves = [...new Set(bestOpportunities.map((entry) => entry.move.name).filter(Boolean))]

    return [{
      pokemon: candidate,
      name: displayName(candidate),
      level: primaryLevel(candidate),
      group: bestStrength >= 2 ? 'strong' : 'indicated',
      strength: bestStrength,
      effectivenessLabel: bestOpportunities[0].weakness.label,
      attackElements,
      attackMoves,
      defense: defensiveMatchup(candidate, target, mode),
    }]
  }).sort((a, b) => (
    b.defense.rank - a.defense.rank
    || b.strength - a.strength
    || a.name.localeCompare(b.name, 'pt-BR')
  ))
}
