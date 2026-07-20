import { HELD_BY_ID, heldTierValue, xBoostValue } from '../data/heldItems'
import { ELEMENT_ORDER, normalizedElement, primaryLevel } from './pokemon'

export const TEAM_SIZE = 6
export const TEAM_STORAGE_KEY = 'pxg-team-builder:v1'

export function activePveMoves(pokemon) {
  const moves = pokemon?.moves || {}
  const selected = moves.pve?.length ? moves.pve : moves.default?.length ? moves.default : moves.pvp || []
  return selected.filter((move) => {
    const tags = move.tags || []
    if (!move.element || String(move.slot).toUpperCase() === 'P' || tags.includes('Passive')) return false
    return !(tags.includes('Self') && !tags.some((tag) => ['Damage', 'Poison', 'Hellfire', 'Lifesteal'].includes(tag)))
  })
}

export function pokemonAttackElements(pokemon) {
  return [...new Set(activePveMoves(pokemon).map((move) => normalizedElement(move.element)).filter(Boolean))]
}

export function buildTypeChart(clans = []) {
  const chart = new Map()
  for (const clan of clans) {
    for (const entry of clan.effectiveness?.offensive || []) {
      const attack = normalizedElement(entry.element)
      const row = chart.get(attack) || new Map()
      for (const group of entry.groups || []) {
        const multiplier = Number.parseFloat(group.damage)
        if (!Number.isFinite(multiplier)) continue
        for (const target of group.elements || []) row.set(normalizedElement(target), multiplier)
      }
      chart.set(attack, row)
    }
  }
  return chart
}

export function typeMultiplier(chart, attack, target) {
  return chart.get(normalizedElement(attack))?.get(normalizedElement(target)) ?? 1
}

export function effectiveNaturalBoost(configuredBoost, pokemon, playerLevel) {
  const configured = Math.max(0, Math.min(80, Number(configuredBoost) || 0))
  const baseLevel = primaryLevel(pokemon) ?? Number(pokemon?.general_info?.level) ?? 0
  const level = Number(playerLevel)
  if (!Number.isFinite(level) || level <= 0 || !baseLevel) return configured
  return Math.min(configured, Math.max(0, level - baseLevel))
}

export function clanAttackBonus(clan, rank, attackElement) {
  const exact = clan?.bonuses?.find((bonus) => Number(bonus.rank) === Number(rank) && normalizedElement(bonus.element) === normalizedElement(attackElement))
  return Number(exact?.attack_percent) || 0
}

export function defensiveStatus(pokemon, incomingElement) {
  const effectiveness = pokemon?.effectiveness || {}
  const target = normalizedElement(incomingElement)
  const includes = (keys) => keys.some((key) => (effectiveness[key] || []).map(normalizedElement).includes(target))
  if (includes(['null', 'immune'])) return { id: 'immune', label: 'Imune', rank: 2 }
  if (includes(['very_ineffective', 'ineffective'])) return { id: 'resistant', label: 'Resiste', rank: 1 }
  if (includes(['very_effective', 'effective'])) return { id: 'vulnerable', label: 'Vulnerável', rank: -1 }
  return { id: 'neutral', label: 'Neutro', rank: 0 }
}

function candidateScore(candidate) {
  return [candidate.usable ? 1 : 0, candidate.multiplier, candidate.defense.rank, candidate.attackBoostEquivalent, candidate.attackBonus]
}

function compareCandidates(a, b) {
  const left = candidateScore(a)
  const right = candidateScore(b)
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return right[index] - left[index]
  }
  return a.name.localeCompare(b.name, 'pt-BR')
}

function coverageStatus(candidate) {
  if (!candidate) return 'empty'
  if (!candidate.usable || candidate.multiplier < 1) return 'weak'
  if (candidate.multiplier > 1) return 'strong'
  return 'neutral'
}

export function analyzeTeam({ slots, pokemonByUrl, clans, playerLevel, clanName, clanRank }) {
  const chart = buildTypeChart(clans)
  const clan = clans.find((entry) => entry.name === clanName)
  const candidates = []

  for (const slot of slots) {
    const pokemon = pokemonByUrl.get(slot.pokemonUrl)
    if (!pokemon) continue
    const baseLevel = primaryLevel(pokemon) ?? Number(pokemon.general_info?.level) ?? 0
    const naturalBoost = effectiveNaturalBoost(slot.boost, pokemon, playerLevel)
    const xBoost = xBoostValue(slot.heldXId, slot.heldXTier, playerLevel)
    const attackBoostEquivalent = naturalBoost + (xBoost * 2)
    const xAttack = slot.heldXId === 'x-attack' ? heldTierValue(slot.heldXId, slot.heldXTier) || 0 : 0
    const usable = !baseLevel || !Number(playerLevel) || Number(playerLevel) >= baseLevel
    for (const attackElement of pokemonAttackElements(pokemon)) {
      candidates.push({
        pokemon,
        name: pokemon.general_info?.name || pokemon.page_title,
        attackElement,
        naturalBoost,
        configuredBoost: Number(slot.boost) || 0,
        xBoost,
        attackBoostEquivalent,
        xAttack,
        baseLevel,
        usable,
        heldX: HELD_BY_ID.get(slot.heldXId) || null,
        slot,
      })
    }
  }

  return ELEMENT_ORDER.map((targetElement) => {
    const ranked = candidates.map((candidate) => {
      const clanBonus = clanAttackBonus(clan, clanRank, candidate.attackElement)
      return {
        ...candidate,
        targetElement,
        multiplier: typeMultiplier(chart, candidate.attackElement, targetElement),
        defense: defensiveStatus(candidate.pokemon, targetElement),
        clanBonus,
        attackBonus: candidate.xAttack + clanBonus,
      }
    }).sort(compareCandidates)
    const best = ranked[0] || null
    return { targetElement, status: coverageStatus(best), best, alternatives: ranked.slice(1, 4) }
  })
}

export function defaultTeamState() {
  return { playerLevel: 500, clanName: '', clanRank: 5, slots: [] }
}

export function safeTeamState(value) {
  const fallback = defaultTeamState()
  if (!value || typeof value !== 'object') return fallback
  return {
    playerLevel: Math.max(1, Number(value.playerLevel) || fallback.playerLevel),
    clanName: String(value.clanName || ''),
    clanRank: [5, 6].includes(Number(value.clanRank)) ? Number(value.clanRank) : 5,
    slots: Array.isArray(value.slots) ? value.slots.slice(0, TEAM_SIZE).filter((slot) => slot?.pokemonUrl).map((slot) => ({
      pokemonUrl: slot.pokemonUrl,
      boost: Math.max(0, Math.min(80, Number(slot.boost) || 0)),
      heldXId: String(slot.heldXId || ''),
      heldXTier: Number(slot.heldXTier) || null,
      heldYId: String(slot.heldYId || ''),
      heldYTier: Number(slot.heldYTier) || null,
    })) : [],
  }
}
