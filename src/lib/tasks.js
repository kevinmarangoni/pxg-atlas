const REGION_ORDER = ['kanto', 'johto', 'nightmare_world']

export const REGION_LABELS = {
  kanto: 'Kanto',
  johto: 'Johto',
  nightmare_world: 'Nightmare World',
}

export const REWARD_KIND_LABELS = {
  experience: 'Experiência',
  currency: 'Dinheiro',
  item: 'Item',
  access: 'Acesso',
  other: 'Outra recompensa',
}

export const TASK_ACTION_LABELS = {
  defeat: 'Derrotar',
  deliver: 'Entregar',
  capture: 'Capturar',
  collect: 'Coletar',
  duel: 'Duelo',
  pokedex: 'Pokédex',
  talk: 'Conversar',
  recover: 'Recuperar',
  find: 'Encontrar',
  answer: 'Responder',
  complete: 'Completar',
  trade: 'Trocar',
  capture_and_deliver: 'Capturar e entregar',
  use: 'Usar',
  register: 'Registrar',
  record: 'Gravar',
  sweep: 'Varrer',
  other: 'Outro objetivo',
}

export const EMPTY_TASK_FILTERS = {
  query: '',
  regions: [],
  location: '',
  minLevel: '',
  maxLevel: '',
  requirement: '',
  action: '',
  rewardKind: '',
  sort: 'region-location',
}

function normalizedSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function taskRegionLabel(task) {
  return task.region_label || REGION_LABELS[task.region] || task.region || 'Região não informada'
}

export function taskLevel(task) {
  const raw = task.requirements?.minimum_level
  if (raw === null || raw === undefined || raw === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export function taskNightmareLevel(task) {
  const raw = task.requirements?.nightmare_level
  if (raw === null || raw === undefined || raw === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export function taskCoordinates(task) {
  const coordinates = task.npc?.coordinates
  if (!coordinates) return ''
  return coordinates.raw || [coordinates.x, coordinates.y, coordinates.z].filter((value) => value !== null && value !== undefined).join(', ')
}

export function taskTargetCount(task) {
  return task.steps?.reduce((total, step) => total + (step.entities ?? []).filter((entity) => entity.kind === 'pokemon').reduce((entityTotal, entity) => entityTotal + Math.max(1, entity.pokemon_targets?.length || 0), 0), 0) ?? 0
}

export function formatTaskNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number.toLocaleString('pt-BR') : String(value)
}

export function taskActionLabel(stepOrAction) {
  if (typeof stepOrAction === 'object' && stepOrAction) {
    return stepOrAction.action_label || TASK_ACTION_LABELS[stepOrAction.action] || stepOrAction.action
  }
  return TASK_ACTION_LABELS[stepOrAction] || stepOrAction || 'Objetivo'
}

export function buildTaskFilterOptions(tasks) {
  const regionCounts = new Map()
  const locationSet = new Set()
  const actionLabels = new Map()
  const rewardKinds = new Set()

  tasks.forEach((task) => {
    if (task.region) regionCounts.set(task.region, (regionCounts.get(task.region) || 0) + 1)
    if (task.location) locationSet.add(task.location)
    task.steps?.forEach((step) => {
      if (step.action) actionLabels.set(step.action, taskActionLabel(step))
    })
    task.rewards?.forEach((reward) => reward.kind && rewardKinds.add(reward.kind))
  })

  const regions = [...regionCounts].map(([id, count]) => ({ id, label: REGION_LABELS[id] || id, count }))
    .sort((a, b) => (REGION_ORDER.indexOf(a.id) === -1 ? REGION_ORDER.length : REGION_ORDER.indexOf(a.id)) - (REGION_ORDER.indexOf(b.id) === -1 ? REGION_ORDER.length : REGION_ORDER.indexOf(b.id)))
  const locations = [...locationSet].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const actions = [...actionLabels].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  const rewards = [...rewardKinds].map((id) => ({ id, label: REWARD_KIND_LABELS[id] || id })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))

  return { regions, locations, actions, rewards }
}

function taskSearchText(task) {
  return [
    task.id,
    taskRegionLabel(task),
    task.location,
    task.npc?.name,
    taskCoordinates(task),
    ...(task.requirements?.additional ?? []),
    ...(task.steps ?? []).flatMap((step) => [
      step.action,
      step.action_label,
      step.raw_text,
      ...(step.entities ?? []).flatMap((entity) => [
        entity.name,
        entity.raw,
        ...(entity.pokemon_targets ?? []).map((target) => target.name),
      ]),
    ]),
    ...(task.rewards ?? []).flatMap((reward) => [reward.name, reward.raw]),
  ].filter(Boolean).join(' ')
}

export function matchesTask(task, filters) {
  const query = normalizedSearch(filters.query)
  if (query && !normalizedSearch(taskSearchText(task)).includes(query)) return false
  if (filters.regions?.length && !filters.regions.includes(task.region)) return false
  if (filters.location && task.location !== filters.location) return false

  const level = taskLevel(task)
  if (filters.minLevel !== '' && (level === null || level < Number(filters.minLevel))) return false
  if (filters.maxLevel !== '' && (level === null || level > Number(filters.maxLevel))) return false
  if (filters.requirement === 'nightmare' && taskNightmareLevel(task) === null) return false
  if (filters.requirement === 'standard' && taskNightmareLevel(task) !== null) return false
  if (filters.action && !(task.steps ?? []).some((step) => step.action === filters.action)) return false
  if (filters.rewardKind && !(task.rewards ?? []).some((reward) => reward.kind === filters.rewardKind)) return false
  return true
}

export function sortTasks(tasks, sort) {
  const regionIndex = (task) => {
    const index = REGION_ORDER.indexOf(task.region)
    return index === -1 ? REGION_ORDER.length : index
  }
  const byNpc = (a, b) => String(a.npc?.name || '').localeCompare(String(b.npc?.name || ''), 'pt-BR', { numeric: true })
  const byLocation = (a, b) => String(a.location || '').localeCompare(String(b.location || ''), 'pt-BR', { numeric: true })
  const byLevel = (a, b) => (taskLevel(a) ?? Number.MAX_SAFE_INTEGER) - (taskLevel(b) ?? Number.MAX_SAFE_INTEGER)

  return [...tasks].sort((a, b) => {
    if (sort === 'npc') return byNpc(a, b) || byLocation(a, b)
    if (sort === 'level-asc') return byLevel(a, b) || byNpc(a, b)
    if (sort === 'level-desc') return -byLevel(a, b) || byNpc(a, b)
    return regionIndex(a) - regionIndex(b) || byLocation(a, b) || byNpc(a, b)
  })
}

export function activeTaskFilterCount(filters) {
  return [
    filters.query,
    filters.regions?.length,
    filters.location,
    filters.minLevel,
    filters.maxLevel,
    filters.requirement,
    filters.action,
    filters.rewardKind,
  ].filter((value) => value !== '' && value !== 0 && value !== null && value !== undefined).length
}
