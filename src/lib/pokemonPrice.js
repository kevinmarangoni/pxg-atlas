const GAME_CURRENCY_MULTIPLIERS = {
  '': 1_000,
  K: 1_000,
  KK: 1_000_000,
  KKK: 1_000_000_000,
}

function normalizeAmount(raw) {
  const value = String(raw || '').trim().replace(/\s+/g, '')
  if (value.includes(',') && value.includes('.')) return value.replace(/\./g, '').replace(',', '.')
  return value.replace(',', '.')
}

export function parseGameCurrency(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value * 1_000 : null

  const normalized = normalizeAmount(value)
  const match = normalized.match(/^([0-9]+(?:\.[0-9]+)?)(K{0,3})$/i)
  if (!match) return null

  const amount = Number(match[1])
  const suffix = match[2].toUpperCase()
  return Number.isFinite(amount) && amount >= 0 ? amount * GAME_CURRENCY_MULTIPLIERS[suffix] : null
}

export function calculatePokemonRealPrice({ diamondValue, diamondPriceBRL, pokemonPriceDollars }) {
  const value = parseGameCurrency(diamondValue)
  const diamondPrice = Number(diamondPriceBRL)
  const pokemonPrice = parseGameCurrency(pokemonPriceDollars)
  if (![value, diamondPrice, pokemonPrice].every((entry) => Number.isFinite(entry) && entry >= 0) || value <= 0) return null
  return (pokemonPrice / value) * diamondPrice
}
