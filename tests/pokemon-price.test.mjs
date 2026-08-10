import test from 'node:test'
import assert from 'node:assert/strict'
import { calculatePokemonRealPrice } from '../src/lib/pokemonPrice.js'

test('calculatePokemonRealPrice converts in-game dollars to BRL by Diamond rate', () => {
  assert.equal(calculatePokemonRealPrice({ diamondValue: 1000, diamondPriceBRL: 2.5, pokemonPriceDollars: 5000 }), 12.5)
})

test('calculatePokemonRealPrice rejects an invalid Diamond value', () => {
  assert.equal(calculatePokemonRealPrice({ diamondValue: 0, diamondPriceBRL: 2.5, pokemonPriceDollars: 5000 }), null)
  assert.equal(calculatePokemonRealPrice({ diamondValue: '', diamondPriceBRL: 2.5, pokemonPriceDollars: 5000 }), null)
})
