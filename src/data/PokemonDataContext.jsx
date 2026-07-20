import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { buildRoleCatalog, pokemonId } from '../lib/pokemon'

const PokemonDataContext = createContext(null)

export function PokemonDataProvider({ children }) {
  const [state, setState] = useState({ data: null, loading: true, error: null })

  useEffect(() => {
    const controller = new AbortController()
    const base = import.meta.env.BASE_URL || '/'

    const loadData = async () => {
      const filename = 'pxg_pokemon_capture.json'
      const response = await fetch(`${base}data/${filename}`, { signal: controller.signal })
      if (!response.ok) throw new Error(`Não foi possível carregar ${filename} (${response.status}).`)
      return response.json()
    }

    loadData()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, loading: false, error })
      })

    return () => controller.abort()
  }, [])

  const value = useMemo(() => {
    const pokemon = state.data?.pokemon ?? []
    const tasks = state.data?.tasks ?? []
    const byId = new Map(pokemon.map((entry) => [pokemonId(entry), entry]))
    const tasksById = new Map(tasks.map((task) => [task.id, task]))
    const roleCatalog = buildRoleCatalog(state.data?.combat_roles)
    const captureBallCatalog = state.data?.capture_ball_catalog ?? []
    return { ...state, pokemon, byId, tasks, tasksById, roleCatalog, captureBallCatalog }
  }, [state])

  return <PokemonDataContext.Provider value={value}>{children}</PokemonDataContext.Provider>
}

export function usePokemonData() {
  const context = useContext(PokemonDataContext)
  if (!context) throw new Error('usePokemonData deve ser usado dentro de PokemonDataProvider.')
  return context
}
