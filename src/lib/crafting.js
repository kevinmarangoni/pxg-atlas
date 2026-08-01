export function recipesByOutput(recipes = []) {
  const result = new Map()
  for (const recipe of recipes) {
    const list = result.get(recipe.output.item_id) || []
    list.push(recipe)
    result.set(recipe.output.item_id, list)
  }
  for (const list of result.values()) list.sort((a, b) => String(a.profession || '').localeCompare(String(b.profession || ''), 'pt-BR') || String(a.rank || '').localeCompare(String(b.rank || ''), 'pt-BR') || a.id.localeCompare(b.id))
  return result
}

function selectedRecipe(itemId, byOutput, selections) {
  const options = byOutput.get(itemId) || []
  return options.find((recipe) => recipe.id === selections?.[itemId]) || options[0] || null
}

function buildGraph(targetItemId, byOutput, selections) {
  const recipeForItem = new Map()
  const visiting = new Set()
  const visited = new Set()
  const postOrder = []
  const cycles = new Set()

  function visit(itemId) {
    if (visiting.has(itemId)) { cycles.add(itemId); return }
    if (visited.has(itemId)) return
    visiting.add(itemId)
    const recipe = selectedRecipe(itemId, byOutput, selections)
    if (recipe) {
      recipeForItem.set(itemId, recipe)
      for (const ingredient of recipe.ingredients || []) {
        if (visiting.has(ingredient.item_id)) {
          cycles.add(itemId)
          cycles.add(ingredient.item_id)
          continue
        }
        visit(ingredient.item_id)
      }
    }
    visiting.delete(itemId)
    visited.add(itemId)
    postOrder.push(itemId)
  }

  visit(targetItemId)
  return { order: postOrder.reverse(), recipeForItem, cycles }
}

export function calculateCraftingPlan({ targetItemId, targetQuantity = 1, recipes = [], inventory = {}, selections = {}, prices = {} }) {
  const byOutput = recipesByOutput(recipes)
  const { order, recipeForItem, cycles } = buildGraph(targetItemId, byOutput, selections)
  const demand = new Map([[targetItemId, Math.max(1, Number(targetQuantity) || 1)]])
  const crafts = []
  const purchases = []
  const inventoryUsed = {}
  let totalTimeSeconds = 0
  let totalCost = 0
  let missingPrice = false

  for (const itemId of order) {
    const required = demand.get(itemId) || 0
    if (required <= 0) continue
    const available = Math.max(0, Number(inventory[itemId]) || 0)
    const used = Math.min(required, available)
    if (used > 0) inventoryUsed[itemId] = used
    const net = Math.max(0, required - used)
    if (net <= 0) continue

    const recipe = recipeForItem.get(itemId)
    if (!recipe || cycles.has(itemId)) {
      const rawPrice = prices[itemId]
      const price = rawPrice === '' || rawPrice === undefined || rawPrice === null ? null : Number(rawPrice)
      const cost = Number.isFinite(price) ? price * net : null
      purchases.push({ item_id: itemId, quantity: net, unit_price: Number.isFinite(price) ? price : null, cost, reason: cycles.has(itemId) ? 'cycle' : 'leaf' })
      if (cost === null) missingPrice = true
      else totalCost += cost
      continue
    }

    const outputQuantity = Math.max(1, Number(recipe.output.quantity) || 1)
    const batches = Math.ceil(net / outputQuantity)
    const produced = batches * outputQuantity
    crafts.push({ item_id: itemId, recipe_id: recipe.id, required: net, batches, produced, surplus: produced - net, profession: recipe.profession, rank: recipe.rank, time_seconds: (Number(recipe.time_seconds) || 0) * batches })
    totalTimeSeconds += (Number(recipe.time_seconds) || 0) * batches
    for (const ingredient of recipe.ingredients || []) demand.set(ingredient.item_id, (demand.get(ingredient.item_id) || 0) + (Number(ingredient.quantity) || 0) * batches)
  }

  return {
    targetItemId,
    targetQuantity: Math.max(1, Number(targetQuantity) || 1),
    demand: Object.fromEntries(demand),
    inventoryUsed,
    crafts,
    purchases,
    cycles: [...cycles],
    totalTimeSeconds,
    totalCost,
    missingPrice,
  }
}

export function recipeCostOptions(itemId, recipes = [], prices = {}) {
  return (recipesByOutput(recipes).get(itemId) || []).map((recipe) => {
    let cost = 0
    let known = true
    for (const ingredient of recipe.ingredients || []) {
      const rawPrice = prices[ingredient.item_id]
      const price = rawPrice === '' || rawPrice === undefined || rawPrice === null ? null : Number(rawPrice)
      if (!Number.isFinite(price)) known = false
      else cost += price * (Number(ingredient.quantity) || 0)
    }
    return { recipe, known, batchCost: known ? cost : null, unitCost: known ? cost / Math.max(1, Number(recipe.output.quantity) || 1) : null }
  }).sort((a, b) => (a.known === b.known ? (a.unitCost ?? Infinity) - (b.unitCost ?? Infinity) : a.known ? -1 : 1))
}

