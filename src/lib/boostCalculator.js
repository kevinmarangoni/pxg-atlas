const BOOST_PROFILE_PATTERN = /^(.*?)(?:\s*\((\d+)\))?\s*$/

function cleanLabel(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function splitAlternatives(value) {
  const values = Array.isArray(value) ? value : [value]
  return [...new Set(values
    .flatMap((item) => cleanLabel(item).split(/\s+ou\s+/i))
    .map(cleanLabel)
    .filter(Boolean))]
}

function numberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function parseBoostProfile(rawBoost) {
  const raw = cleanLabel(rawBoost)
  if (!raw || raw === '?') return { raw, valid: false, materialText: '', materials: [], boostType: null, special: false }

  const match = raw.match(BOOST_PROFILE_PATTERN)
  const parsedMatch = match?.[2] ? match : raw.match(/^(.*)\s*\((\d+)\s*$/)
  const materialText = cleanLabel(parsedMatch?.[1] || raw)
  const boostType = Number(parsedMatch?.[2])
  const materials = splitAlternatives(materialText)
  const special = materials.some((material) => /(?:ancient|metal|crystal) stone/i.test(material))

  return {
    raw,
    valid: materials.length > 0 && Number.isFinite(boostType) && boostType > 0,
    materialText,
    materials,
    boostType: Number.isFinite(boostType) && boostType > 0 ? boostType : null,
    special,
  }
}

export function materiaNamesFromMatter(matter) {
  const values = splitAlternatives(matter)
  if (!values.length) return ['Materia do clã/tier']
  return values.map((value) => /materia/i.test(value) ? value : `${value} Materia`)
}

function cheapestPrice(materials, prices = {}) {
  const options = materials
    .map((material) => ({ material, price: numberOrNull(prices[material]) }))
    .filter((option) => option.price !== null)
    .sort((a, b) => a.price - b.price)
  return options[0] || { material: materials[0] || 'Stone', price: null }
}

function initialStoneCount(startBoost, boostType) {
  let count = 0
  for (let boost = 0; boost <= startBoost; boost += 1) {
    if (boost % boostType === 0) count += 1
  }
  return count
}

function initialSpecialStoneCount(startBoost, boostType) {
  let count = 1
  for (let boost = 1; boost <= startBoost; boost += 1) {
    if (boost < 10) continue
    if (boost % boostType === 0) count += 1
  }
  return count
}

function addPricedBoost({ state, stonesForBoost, normalPrice, boostStonePrice, material }) {
  const canUseBoostStone = boostStonePrice !== null
  const useNormal = normalPrice !== null && (!canUseBoostStone || stonesForBoost * normalPrice < boostStonePrice)

  if (useNormal) {
    state.normalStones += stonesForBoost
    state.totalCost += stonesForBoost * normalPrice
    state.costKnown = true
    state.material = material
  } else if (canUseBoostStone) {
    state.boostStones += 1
    state.totalCost += boostStonePrice
    state.costKnown = true
  } else {
    state.normalStones += stonesForBoost
    state.costKnown = false
    state.missingPrice = true
    state.material = material
  }
}

function calculateBaseRange({ startBoost, targetBoost, boostType, special, normalPrice, boostStonePrice, material }) {
  const state = {
    normalStones: 0,
    boostStones: 0,
    totalCost: 0,
    costKnown: normalPrice !== null || boostStonePrice !== null,
    missingPrice: false,
    material,
  }

  let stonesForBoost = special
    ? initialSpecialStoneCount(startBoost, boostType)
    : initialStoneCount(startBoost, boostType)

  for (let boost = startBoost + 1; boost <= targetBoost; boost += 1) {
    if (special && boost < 10 && boost % 2 === 1) continue
    addPricedBoost({ state, stonesForBoost, normalPrice, boostStonePrice, material })
    if (special && boost >= 10 && boost % boostType === 0 && boost !== startBoost) stonesForBoost += 1
    if (!special && boost % boostType === 0 && boost !== startBoost) stonesForBoost += 1
  }

  return state
}

function addExtendedCosts({ state, startBoost, targetBoost, materiaPrice, poweredBoostStonePrice, pinkStarPiecePrice }) {
  const materiaStart = Math.max(startBoost + 1, 51)
  const materiaEnd = Math.min(targetBoost, 70)
  const materiaPriceValue = materiaPrice
  const poweredPriceValue = poweredBoostStonePrice
  const materiaStepPrice = materiaPriceValue !== null && poweredPriceValue !== null
    ? Math.min(materiaPriceValue, poweredPriceValue)
    : materiaPriceValue ?? poweredPriceValue
  const materiaSteps = Math.max(0, materiaEnd - materiaStart + 1)

  if (materiaSteps > 0) {
    state.materia += materiaSteps
    state.extendedCostKnown = materiaStepPrice !== null
    if (materiaStepPrice !== null) state.totalCost += materiaSteps * materiaStepPrice
    else state.missingPrice = true
    state.materiaChoice = materiaPriceValue !== null && (poweredPriceValue === null || materiaPriceValue <= poweredPriceValue) ? 'Materia' : 'Powered Boost Stone'
  }

  const pinkStart = Math.max(startBoost + 1, 71)
  const pinkEnd = Math.min(targetBoost, 80)
  const pinkSteps = Math.max(0, pinkEnd - pinkStart + 1)
  if (pinkSteps > 0) {
    state.materia += pinkSteps * 5
    state.pinkStarPieces += pinkSteps
    if (materiaPriceValue !== null) state.totalCost += pinkSteps * 5 * materiaPriceValue
    else state.missingPrice = true
    if (pinkStarPiecePrice !== null) state.totalCost += pinkSteps * pinkStarPiecePrice
    else state.missingPrice = true
    state.extendedCostKnown = state.extendedCostKnown && materiaPriceValue !== null && pinkStarPiecePrice !== null
  }
}

export function calculateBoostCost({
  profile,
  startBoost = 0,
  targetBoost = 50,
  materialPrices = {},
  materiaPrices = {},
  boostStonePrice,
  poweredBoostStonePrice,
  pinkStarPiecePrice,
}) {
  const parsed = typeof profile === 'string' ? parseBoostProfile(profile) : profile
  const start = Math.max(0, Math.min(80, Math.floor(Number(startBoost) || 0)))
  const target = Math.max(start, Math.min(80, Math.floor(Number(targetBoost) || 0)))
  if (!parsed?.valid) return { valid: false, startBoost: start, targetBoost: target, normalStones: 0, boostStones: 0, materia: 0, pinkStarPieces: 0, totalCost: 0, costKnown: false, missingPrice: false }

  const selected = cheapestPrice(parsed.materials, materialPrices)
  const normalPrice = selected.price
  const boostPrice = numberOrNull(boostStonePrice)
  const state = {
    valid: true,
    startBoost: start,
    targetBoost: target,
    normalStones: 0,
    boostStones: 0,
    materia: 0,
    pinkStarPieces: 0,
    totalCost: 0,
    costKnown: false,
    extendedCostKnown: true,
    missingPrice: false,
    material: selected.material,
    materiaChoice: null,
  }

  if (start < 50 && target > start) {
    const base = calculateBaseRange({
      startBoost: start,
      targetBoost: Math.min(target, 50),
      boostType: parsed.boostType,
      special: parsed.special,
      normalPrice,
      boostStonePrice: boostPrice,
      material: selected.material,
    })
    Object.assign(state, base)
  }

  const materiaNames = Object.keys(materiaPrices)
  const materiaCandidates = materiaNames.length ? materiaNames : ['Materia do clã/tier']
  const materia = cheapestPrice(materiaCandidates, materiaPrices)
  addExtendedCosts({
    state,
    startBoost: start,
    targetBoost: target,
    materiaPrice: materia.price,
    poweredBoostStonePrice: numberOrNull(poweredBoostStonePrice),
    pinkStarPiecePrice: numberOrNull(pinkStarPiecePrice),
  })

  state.costKnown = !state.missingPrice && (state.normalStones + state.boostStones === 0 || state.costKnown) && (state.materia + state.pinkStarPieces === 0 || state.extendedCostKnown)
  state.materiaMaterial = materia.material
  state.materialOptions = parsed.materials
  return state
}

export function formatK(value) {
  if (!Number.isFinite(Number(value))) return '—'
  const amount = Number(value)
  if (amount >= 1000) return `${(amount / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} KK`
  return `${amount.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} K`
}
