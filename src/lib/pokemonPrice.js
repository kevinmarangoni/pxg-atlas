export function calculatePokemonRealPrice({ diamondValue, diamondPriceBRL, pokemonPriceDollars }) {
  const value = Number(diamondValue)
  const diamondPrice = Number(diamondPriceBRL)
  const pokemonPrice = Number(pokemonPriceDollars)
  if (![value, diamondPrice, pokemonPrice].every((entry) => Number.isFinite(entry) && entry >= 0) || value <= 0) return null
  return (pokemonPrice / value) * diamondPrice
}
