import test from 'node:test'
import assert from 'node:assert/strict'
import {
  EMPTY_FILTERS,
  buildFilterOptions,
  matchesPokemon,
  pokemonStrongAgainst,
  pokemonWeaknesses,
} from '../src/lib/pokemon.js'

const charizard = {
  page_title: 'Charizard',
  general_info: { name: 'Charizard', elements: ['Fire', 'Flying'] },
  moves: { default: [{ slot: 'M1', element: 'Fire', tags: ['Damage'] }] },
  clan_memberships: [{ functions: { pve: { role_ids: ['burst_damage_dealer', 'support'] } } }],
  effectiveness: {
    super_effective: ['Water', 'Rock'],
    effective: ['Electric'],
    very_ineffective: ['Grass'],
  },
}

const bulbasaur = {
  page_title: 'Bulbasaur',
  general_info: { name: 'Bulbasaur', elements: ['Grass', 'Poison'] },
  effectiveness: { super_effective: ['Fire', 'Ice', 'Flying', 'Psychic'] },
}

test('pokemonWeaknesses collects effective attack elements only', () => {
  assert.deepEqual(pokemonWeaknesses(charizard), ['Water', 'Rock', 'Electric'])
})

test('matchesPokemon filters by one or more weaknesses', () => {
  assert.equal(matchesPokemon(charizard, { ...EMPTY_FILTERS, weaknesses: ['Water'] }), true)
  assert.equal(matchesPokemon(charizard, { ...EMPTY_FILTERS, weaknesses: ['Water', 'Rock'] }), true)
  assert.equal(matchesPokemon(charizard, { ...EMPTY_FILTERS, weaknesses: ['Water', 'Grass'] }), false)
  assert.equal(matchesPokemon(charizard, { ...EMPTY_FILTERS, elements: ['Fire'] }), true)
})

test('pokemonStrongAgainst uses the elements of active attacks and the type chart', () => {
  const typeChart = new Map([
    ['Fire', new Map([['Grass', 2], ['Dragon', 0.5]])],
  ])
  assert.deepEqual(pokemonStrongAgainst(charizard, typeChart), ['Grass'])
  assert.equal(matchesPokemon(charizard, { ...EMPTY_FILTERS, strongAgainst: ['Grass'] }, typeChart), true)
  assert.equal(matchesPokemon(charizard, { ...EMPTY_FILTERS, strongAgainst: ['Water'] }, typeChart), false)
})

test('matchesPokemon accepts multiple PvE roles as an OR filter', () => {
  assert.equal(matchesPokemon(charizard, { ...EMPTY_FILTERS, pveRole: ['burst_damage_dealer', 'tank'] }), true)
  assert.equal(matchesPokemon(charizard, { ...EMPTY_FILTERS, pveRole: ['tank', 'support'] }), true)
  assert.equal(matchesPokemon(charizard, { ...EMPTY_FILTERS, pveRole: ['tank', 'speedster'] }), false)
})

test('buildFilterOptions exposes both own elements and weaknesses', () => {
  const typeChart = new Map([['Fire', new Map([['Grass', 2]])]])
  const options = buildFilterOptions([charizard, bulbasaur], typeChart)
  assert.deepEqual(options.elements, ['Fire', 'Grass', 'Poison', 'Flying'])
  assert.deepEqual(options.weaknesses, ['Fire', 'Water', 'Electric', 'Ice', 'Flying', 'Psychic', 'Rock'])
  assert.deepEqual(options.strongAgainst, ['Grass'])
})
