export const ATLAS_STORAGE_KEY = 'pxg-atlas:user-data:v2'

export function storageItemKey(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim()
}

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export function validateAtlasBackup(payload) {
  const errors = []
  if (!isRecord(payload)) return { valid: false, errors: ['O backup precisa ser um objeto JSON.'] }
  if (payload.version !== 2) errors.push('Versão de backup incompatível.')
  if (!Array.isArray(payload.priceProfiles) || payload.priceProfiles.length === 0) errors.push('Perfis de preço ausentes.')
  else {
    const profileIds = new Set()
    for (const profile of payload.priceProfiles) {
      if (!isRecord(profile) || typeof profile.id !== 'string' || !profile.id.trim() || typeof profile.name !== 'string' || !isRecord(profile.prices)) {
        errors.push('Há um perfil de preço inválido.')
        continue
      }
      if (profileIds.has(profile.id)) errors.push(`Perfil duplicado: ${profile.id}.`)
      profileIds.add(profile.id)
      if (Object.values(profile.prices).some((price) => price !== '' && (!Number.isFinite(Number(price)) || Number(price) < 0))) errors.push(`O perfil ${profile.name} contém preço inválido.`)
    }
    if (typeof payload.activePriceProfileId !== 'string' || !profileIds.has(payload.activePriceProfileId)) errors.push('O perfil de preço ativo não existe.')
  }
  if (!Array.isArray(payload.craftingProjects)) errors.push('A lista de projetos de crafting é inválida.')
  else {
    const projectIds = new Set()
    for (const project of payload.craftingProjects) {
      if (!isRecord(project) || typeof project.id !== 'string' || typeof project.targetItemId !== 'string' || !Number.isFinite(Number(project.quantity)) || Number(project.quantity) < 1 || !isRecord(project.inventory || {}) || !isRecord(project.selections || {})) errors.push('Há um projeto de crafting inválido.')
      else if (projectIds.has(project.id)) errors.push(`Projeto duplicado: ${project.id}.`)
      else projectIds.add(project.id)
    }
  }
  if (!isRecord(payload.progress) || !isRecord(payload.progress?.pokelog) || !isRecord(payload.progress?.quests) || !isRecord(payload.progress?.bosses)) errors.push('O progresso salvo é inválido.')
  if (!Array.isArray(payload.berryTimers) || payload.berryTimers.some((timer) => !isRecord(timer) || typeof timer.id !== 'string' || typeof timer.name !== 'string' || Number.isNaN(new Date(timer.endAt).getTime()))) errors.push('Há um timer de berry inválido.')
  return { valid: errors.length === 0, errors: [...new Set(errors)] }
}

export function assertAtlasBackup(payload) {
  const validation = validateAtlasBackup(payload)
  if (!validation.valid) throw new Error(validation.errors.join(' '))
  return payload
}
