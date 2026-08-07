import { useEffect, useState } from 'react'

const cache = new Map()

function resource(filename) {
  if (!cache.has(filename)) cache.set(filename, { data: null, error: null, promise: null })
  return cache.get(filename)
}

function load(filename) {
  const entry = resource(filename)
  if (entry.data || entry.error) return Promise.resolve(entry)
  if (!entry.promise) {
    const base = import.meta.env.BASE_URL || '/'
    entry.promise = fetch(`${base}data/${filename}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Não foi possível carregar ${filename} (${response.status}).`)
        return response.json()
      })
      .then((data) => { entry.data = data; return entry })
      .catch((error) => { entry.error = error; return entry })
  }
  return entry.promise
}

export function useDomainData(filename) {
  const initial = resource(filename)
  const [state, setState] = useState({ data: initial.data, error: initial.error, loading: !initial.data && !initial.error })

  useEffect(() => {
    let active = true
    load(filename).then((entry) => {
      if (active) setState({ data: entry.data, error: entry.error, loading: false })
    })
    return () => { active = false }
  }, [filename])

  return state
}

export const useCatalogData = () => useDomainData('pxg_catalog.json')
export const useCraftingData = () => useDomainData('pxg_crafting.json')
export const useGuidesData = () => useDomainData('pxg_guides.json')
export const useProgressionData = () => useDomainData('pxg_progression.json')
export const useWorldContentData = () => useDomainData('pxg_world_content.json')
export const useNpcObtainedData = () => useDomainData('pxg_npc_obtained.json')
export const useLootData = () => useDomainData('pokemon_loot.json')
export const usePokemonCatalogData = () => useDomainData('pxg_pokemon_capture.json')
