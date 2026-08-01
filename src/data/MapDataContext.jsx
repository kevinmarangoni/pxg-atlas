import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const MapDataContext = createContext(null)

const REGION_SURFACE_FLOOR = {
  kanto: 7,
  johto: 6,
}

export function normalizedMapName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeMonsterLocation(location, index) {
  const sourceFloor = Number.isFinite(Number(location.floor))
    ? Number(location.floor)
    : Number(location.z) || 0
  const surfaceFloor = REGION_SURFACE_FLOOR[normalizedMapName(location.region)]
  // `world_floor` is already the absolute OTMM Z. Only the raw pxgmap.br
  // `andar` value needs to be converted from its surface-relative scale.
  const inferredWorldFloor = Number(location.world_floor)
  const floor = Number.isFinite(inferredWorldFloor)
    ? inferredWorldFloor
    : location.source === 'pxgmap.com.br' && Number.isFinite(surfaceFloor)
    ? surfaceFloor - sourceFloor
    : sourceFloor

  return {
    ...location,
    source_floor: sourceFloor,
    z: floor,
    floor,
    map_uid: `monster:${index}`,
  }
}

export function MapDataProvider({ children }) {
  const [state, setState] = useState({ data: null, loading: true, error: null })

  useEffect(() => {
    const controller = new AbortController()
    const base = import.meta.env.BASE_URL || '/'

    fetch(`${base}data/pxg_map.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Não foi possível carregar o mapa (${response.status}).`)
        return response.json()
      })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, loading: false, error })
      })

    return () => controller.abort()
  }, [])

  const value = useMemo(() => {
    const monsters = (state.data?.monsters ?? []).map(normalizeMonsterLocation)
    const orbs = (state.data?.orbs ?? []).map((location, index) => ({ ...location, map_uid: `orb:${index}` }))
    const tilePositionSet = new Set((state.data?.tile_positions ?? []).map((position) => position.join(',')))
    const localTilePositionSet = new Set((state.data?.metadata?.local_tile_positions ?? []).map((position) => position.join(',')))
    const byPokemonName = new Map()
    for (const location of monsters) {
      const key = normalizedMapName(location.name)
      const locations = byPokemonName.get(key) || []
      locations.push(location)
      byPokemonName.set(key, locations)
    }
    return {
      ...state,
      monsters,
      orbs,
      byPokemonName,
      tilePositionSet,
      localTilePositionSet,
      localTileHome: state.data?.metadata?.local_tile_home || null,
      mapSources: state.data?.map_sources ?? {},
    }
  }, [state])

  return <MapDataContext.Provider value={value}>{children}</MapDataContext.Provider>
}

export function useMapData() {
  const context = useContext(MapDataContext)
  if (!context) throw new Error('useMapData deve ser usado dentro de MapDataProvider.')
  return context
}
