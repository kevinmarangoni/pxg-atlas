import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateCraftingPlan, recipeCostOptions } from '../src/lib/crafting.js'

const recipe = (id, output, quantity, ingredients, time = 0) => ({ id, output: { item_id: output, quantity }, ingredients: ingredients.map(([item_id, amount]) => ({ item_id, quantity: amount })), profession: 'Engineer', rank: 'C', time_seconds: time })

test('arredonda cada receita por lote', () => {
  const plan = calculateCraftingPlan({ targetItemId: 'ball', targetQuantity: 11, recipes: [recipe('ball-r', 'ball', 10, [['iron', 3]], 60)] })
  assert.equal(plan.crafts[0].batches, 2)
  assert.equal(plan.crafts[0].surplus, 9)
  assert.equal(plan.purchases[0].quantity, 6)
  assert.equal(plan.totalTimeSeconds, 120)
})

test('consolida ramos e aplica inventario compartilhado uma unica vez', () => {
  const recipes = [
    recipe('target-r', 'target', 1, [['left', 1], ['right', 1]]),
    recipe('left-r', 'left', 1, [['ore', 3]]),
    recipe('right-r', 'right', 1, [['ore', 4]]),
  ]
  const plan = calculateCraftingPlan({ targetItemId: 'target', recipes, inventory: { ore: 5 }, prices: { ore: 2 } })
  assert.equal(plan.demand.ore, 7)
  assert.equal(plan.inventoryUsed.ore, 5)
  assert.equal(plan.purchases[0].quantity, 2)
  assert.equal(plan.totalCost, 4)
})

test('detecta ciclos e transforma o elo em compra explicita', () => {
  const recipes = [recipe('a-r', 'a', 1, [['b', 1]]), recipe('b-r', 'b', 1, [['a', 1]])]
  const plan = calculateCraftingPlan({ targetItemId: 'a', recipes, prices: { a: 10, b: 5 } })
  assert.ok(plan.cycles.length > 0)
  assert.ok(plan.purchases.some((entry) => entry.reason === 'cycle'))
})

test('mantem preco ausente distinto de preco zero', () => {
  const unknown = calculateCraftingPlan({ targetItemId: 'ore', prices: {} })
  const free = calculateCraftingPlan({ targetItemId: 'ore', prices: { ore: 0 } })
  assert.equal(unknown.missingPrice, true)
  assert.equal(unknown.purchases[0].cost, null)
  assert.equal(free.missingPrice, false)
  assert.equal(free.purchases[0].cost, 0)
})

test('ordena alternativas conhecidas sem alterar a selecao do jogador', () => {
  const recipes = [recipe('expensive', 'ball', 1, [['iron', 4]]), recipe('cheap', 'ball', 1, [['wood', 2]])]
  const options = recipeCostOptions('ball', recipes, { iron: 3, wood: 2 })
  assert.equal(options[0].recipe.id, 'cheap')
  const selected = calculateCraftingPlan({ targetItemId: 'ball', recipes, selections: { ball: 'expensive' }, prices: { iron: 3, wood: 2 } })
  assert.equal(selected.crafts[0].recipe_id, 'expensive')
})
