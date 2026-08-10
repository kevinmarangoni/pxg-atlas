import test from 'node:test'
import assert from 'node:assert/strict'
import { calculatePokemonRealPrice, parseGameCurrency } from '../src/lib/pokemonPrice.js'

test('parseGameCurrency accepts K, KK and KKK notation', () => {
  assert.equal(parseGameCurrency('187K'), 187_000)
  assert.equal(parseGameCurrency('1,5KK'), 1_500_000)
  assert.equal(parseGameCurrency('2KKK'), 2_000_000_000)
})

test('calculatePokemonRealPrice converts mixed K values to BRL by Diamond rate', () => {
  assert.equal(calculatePokemonRealPrice({ diamondValue: '187K', diamondPriceBRL: 2.5, pokemonPriceDollars: '150KK' }), 2005.3475935828876)
})

test('calculatePokemonRealPrice rejects an invalid Diamond value', () => {
  assert.equal(calculatePokemonRealPrice({ diamondValue: 0, diamondPriceBRL: 2.5, pokemonPriceDollars: 5000 }), null)
  assert.equal(calculatePokemonRealPrice({ diamondValue: '', diamondPriceBRL: 2.5, pokemonPriceDollars: 5000 }), null)
})
