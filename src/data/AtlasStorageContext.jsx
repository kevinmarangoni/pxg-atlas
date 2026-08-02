import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { hasStorageConsent } from '../lib/cookieConsent'
import { assertAtlasBackup, ATLAS_STORAGE_KEY, storageItemKey } from '../lib/storage'

const OLD_BOOST_KEY = 'pxg-atlas:boost-prices:v1'
export { ATLAS_STORAGE_KEY, storageItemKey } from '../lib/storage'

function id(prefix) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`
}

function emptyState() {
  const createdAt = new Date().toISOString()
  return {
    version: 2,
    activePriceProfileId: 'default',
    priceProfiles: [{ id: 'default', name: 'Padrão', prices: {}, createdAt, updatedAt: createdAt }],
    craftingProjects: [],
    progress: { pokelog: {}, quests: {}, bosses: {} },
    berryTimers: [],
    updatedAt: createdAt,
  }
}

function migrateLegacy(base) {
  try {
    const old = JSON.parse(localStorage.getItem(OLD_BOOST_KEY) || 'null')
    const profile = base.priceProfiles[0]
    if (old && !Object.keys(profile.prices).length) {
      for (const [name, value] of Object.entries({ ...(old.stones || {}), ...(old.materia || {}) })) {
        if (value !== '' && Number.isFinite(Number(value))) profile.prices[storageItemKey(name)] = Number(value)
      }
      for (const [name, value] of [['Boost Stone', old.boostStone], ['Powered Boost Stone', old.poweredBoostStone], ['Pink Star Piece', old.pinkStarPiece]]) {
        if (value !== '' && Number.isFinite(Number(value))) profile.prices[storageItemKey(name)] = Number(value)
      }
    }

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key?.startsWith('pxg-pokelog-progress:')) continue
      const sourceUrl = key.slice('pxg-pokelog-progress:'.length)
      const pokemonId = decodeURIComponent(sourceUrl.split('/index.php/').pop() || sourceUrl)
      const indexes = JSON.parse(localStorage.getItem(key) || '[]')
      if (Array.isArray(indexes) && !base.progress.pokelog[pokemonId]) {
        base.progress.pokelog[pokemonId] = indexes.map((value) => `legacy-index:${Number(value)}`).filter((value) => !value.endsWith('NaN'))
      }
    }
  } catch { /* legacy storage is optional */ }
  return base
}

function sanitize(value) {
  const fallback = emptyState()
  if (!value || value.version !== 2) return migrateLegacy(fallback)
  const profiles = Array.isArray(value.priceProfiles) && value.priceProfiles.length ? value.priceProfiles : fallback.priceProfiles
  const activeExists = profiles.some((profile) => profile.id === value.activePriceProfileId)
  return migrateLegacy({
    ...fallback,
    ...value,
    activePriceProfileId: activeExists ? value.activePriceProfileId : profiles[0].id,
    priceProfiles: profiles.map((profile) => ({ ...profile, prices: profile.prices || {} })),
    craftingProjects: Array.isArray(value.craftingProjects) ? value.craftingProjects : [],
    progress: {
      pokelog: value.progress?.pokelog || {},
      quests: value.progress?.quests || {},
      bosses: value.progress?.bosses || {},
    },
    berryTimers: Array.isArray(value.berryTimers) ? value.berryTimers : [],
  })
}

function readState() {
  if (typeof window === 'undefined') return emptyState()
  try { return sanitize(JSON.parse(localStorage.getItem(ATLAS_STORAGE_KEY) || 'null')) }
  catch { return migrateLegacy(emptyState()) }
}

const AtlasStorageContext = createContext(null)

export function AtlasStorageProvider({ children }) {
  const [state, setStateValue] = useState(readState)
  const commit = useCallback((updater) => {
    setStateValue((current) => {
      const next = sanitize(typeof updater === 'function' ? updater(current) : updater)
      next.updatedAt = new Date().toISOString()
      if (hasStorageConsent()) {
        try { localStorage.setItem(ATLAS_STORAGE_KEY, JSON.stringify(next)) } catch { /* storage is optional */ }
      }
      return next
    })
  }, [])

  const activePriceProfile = state.priceProfiles.find((profile) => profile.id === state.activePriceProfileId) || state.priceProfiles[0]
  const getPrice = useCallback((item) => activePriceProfile?.prices?.[storageItemKey(item)] ?? '', [activePriceProfile])
  const setPrice = useCallback((item, value) => commit((current) => ({
    ...current,
    priceProfiles: current.priceProfiles.map((profile) => profile.id === current.activePriceProfileId ? {
      ...profile,
      prices: { ...profile.prices, [storageItemKey(item)]: value === '' ? '' : Math.max(0, Number(value) || 0) },
      updatedAt: new Date().toISOString(),
    } : profile),
  })), [commit])

  const clearActivePrices = useCallback(() => commit((current) => ({ ...current, priceProfiles: current.priceProfiles.map((profile) => profile.id === current.activePriceProfileId ? { ...profile, prices: {}, updatedAt: new Date().toISOString() } : profile) })), [commit])
  const createPriceProfile = useCallback((name) => {
    const profileId = id('server')
    const createdAt = new Date().toISOString()
    commit((current) => ({ ...current, activePriceProfileId: profileId, priceProfiles: [...current.priceProfiles, { id: profileId, name: String(name || 'Novo servidor').trim() || 'Novo servidor', prices: {}, createdAt, updatedAt: createdAt }] }))
    return profileId
  }, [commit])
  const selectPriceProfile = useCallback((profileId) => commit((current) => current.priceProfiles.some((profile) => profile.id === profileId) ? { ...current, activePriceProfileId: profileId } : current), [commit])
  const deletePriceProfile = useCallback((profileId) => commit((current) => {
    if (current.priceProfiles.length <= 1) return current
    const profiles = current.priceProfiles.filter((profile) => profile.id !== profileId)
    return { ...current, priceProfiles: profiles, activePriceProfileId: current.activePriceProfileId === profileId ? profiles[0].id : current.activePriceProfileId }
  }), [commit])

  const saveCraftingProject = useCallback((project) => commit((current) => {
    const projectId = project.id || id('craft')
    const next = { ...project, id: projectId, updatedAt: new Date().toISOString() }
    return { ...current, craftingProjects: [...current.craftingProjects.filter((entry) => entry.id !== projectId), next] }
  }), [commit])
  const deleteCraftingProject = useCallback((projectId) => commit((current) => ({ ...current, craftingProjects: current.craftingProjects.filter((project) => project.id !== projectId) })), [commit])
  const setPokelogStages = useCallback((pokemonId, stages) => commit((current) => ({ ...current, progress: { ...current.progress, pokelog: { ...current.progress.pokelog, [pokemonId]: [...new Set(stages)] } } })), [commit])
  const setQuestComplete = useCallback((questId, complete) => commit((current) => ({ ...current, progress: { ...current.progress, quests: { ...current.progress.quests, [questId]: Boolean(complete) } } })), [commit])
  const setBossComplete = useCallback((bossId, weekKey, complete) => commit((current) => ({ ...current, progress: { ...current.progress, bosses: { ...current.progress.bosses, [`${bossId}:${weekKey}`]: Boolean(complete) } } })), [commit])
  const setBerryTimers = useCallback((timers) => commit((current) => ({ ...current, berryTimers: typeof timers === 'function' ? timers(current.berryTimers) : timers })), [commit])

  const importBackup = useCallback((payload, replace = false) => {
    assertAtlasBackup(payload)
    const incoming = sanitize(payload)
    commit((current) => replace ? incoming : ({
      ...current,
      priceProfiles: [...new Map([...current.priceProfiles, ...incoming.priceProfiles].map((profile) => [profile.id, profile])).values()],
      craftingProjects: [...new Map([...current.craftingProjects, ...incoming.craftingProjects].map((project) => [project.id, project])).values()],
      progress: {
        pokelog: { ...current.progress.pokelog, ...incoming.progress.pokelog },
        quests: { ...current.progress.quests, ...incoming.progress.quests },
        bosses: { ...current.progress.bosses, ...incoming.progress.bosses },
      },
      berryTimers: [...new Map([...current.berryTimers, ...incoming.berryTimers].map((timer) => [timer.id, timer])).values()],
    }))
  }, [commit])

  const value = useMemo(() => ({
    state, activePriceProfile, getPrice, setPrice, clearActivePrices,
    createPriceProfile, selectPriceProfile, deletePriceProfile,
    saveCraftingProject, deleteCraftingProject,
    setPokelogStages, setQuestComplete, setBossComplete, setBerryTimers,
    importBackup,
  }), [state, activePriceProfile, getPrice, setPrice, clearActivePrices, createPriceProfile, selectPriceProfile, deletePriceProfile, saveCraftingProject, deleteCraftingProject, setPokelogStages, setQuestComplete, setBossComplete, setBerryTimers, importBackup])

  return <AtlasStorageContext.Provider value={value}>{children}</AtlasStorageContext.Provider>
}

export function useAtlasStorage() {
  const context = useContext(AtlasStorageContext)
  if (!context) throw new Error('useAtlasStorage deve ser usado dentro de AtlasStorageProvider.')
  return context
}
