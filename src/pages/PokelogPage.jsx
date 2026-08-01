import { Check, ClipboardList, MapPin, Search, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ElementBadge, PokemonImage } from '../components/Common'
import { ToolHero } from '../components/ToolCommon'
import { useAtlasStorage } from '../data/AtlasStorageContext'
import { normalizedMapName, useMapData } from '../data/MapDataContext'
import { usePokemonData } from '../data/PokemonDataContext'
import { displayName, migratePokelogStageProgress, pokemonElements, pokemonId, pokemonImage, pokemonPath, pokemonPokelog, pokelogStageId, pokelogStages } from '../lib/pokemon'
import { groupNearbyRespawns } from '../lib/mapLocations'

export default function PokelogPage() {
  const { pokemon } = usePokemonData()
  const { byPokemonName } = useMapData()
  const { state, setPokelogStages } = useAtlasStorage()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [element, setElement] = useState('all')
  const [status, setStatus] = useState('all')
  const [limit, setLimit] = useState(60)
  const entries = useMemo(() => pokemon.filter((entry) => pokelogStages(entry).length > 0), [pokemon])
  const categories = [...new Set(entries.map((entry) => pokemonPokelog(entry)?.category).filter(Boolean))].sort()
  const elements = [...new Set(entries.flatMap(pokemonElements))].sort()
  const progress = (entry) => {
    const stages = pokelogStages(entry)
    const stored = state.progress.pokelog[pokemonId(entry)] || []
    const completed = migratePokelogStageProgress(stored, stages)
    return { stages, completed, done: stages.filter((stage, index) => completed.includes(pokelogStageId(stage, index))).length }
  }
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pt-BR')
    return entries.map((entry) => {
      const locations = byPokemonName.get(normalizedMapName(displayName(entry))) || []
      return { entry, locations, groups: groupNearbyRespawns(locations), progress: progress(entry) }
    }).filter(({ entry, progress: current }) => {
      if (needle && !displayName(entry).toLocaleLowerCase('pt-BR').includes(needle)) return false
      if (category !== 'all' && pokemonPokelog(entry)?.category !== category) return false
      if (element !== 'all' && !pokemonElements(entry).includes(element)) return false
      if (status === 'pending' && current.done !== 0) return false
      if (status === 'started' && (current.done === 0 || current.done >= current.stages.length)) return false
      if (status === 'done' && current.done < current.stages.length) return false
      return true
    }).sort((a, b) => b.locations.length - a.locations.length || displayName(a.entry).localeCompare(displayName(b.entry), 'pt-BR'))
  }, [entries, byPokemonName, state.progress.pokelog, query, category, element, status])
  const totalStages = entries.reduce((sum, entry) => sum + pokelogStages(entry).length, 0)
  const completedStages = entries.reduce((sum, entry) => sum + progress(entry).done, 0)

  return (
    <div className="pokelog-page page-frame">
      <ToolHero eyebrow="PROGRESSÃO GLOBAL" title="Planejador de Pokélog" description="Acompanhe todos os estágios no mesmo lugar e priorize Pokémon com respawns mapeados."><ClipboardList size={50} /></ToolHero>
      <section className="pokelog-global-summary"><div><small>Pokémon publicados</small><strong>{entries.length}</strong></div><div><small>Estágios concluídos</small><strong>{completedStages}/{totalStages}</strong></div><div><small>Progresso geral</small><strong>{totalStages ? Math.round((completedStages / totalStages) * 100) : 0}%</strong></div></section>
      <section className="pokelog-filters"><label><Search size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setLimit(60) }} placeholder="Buscar Pokémon" /></label><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Todas as categorias</option>{categories.map((entry) => <option key={entry}>{entry}</option>)}</select><select value={element} onChange={(event) => setElement(event.target.value)}><option value="all">Todos os elementos</option>{elements.map((entry) => <option key={entry}>{entry}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Qualquer progresso</option><option value="pending">Não iniciado</option><option value="started">Em andamento</option><option value="done">Concluído</option></select><output>{filtered.length}</output></section>
      <div className="pokelog-global-list">{filtered.slice(0, limit).map(({ entry, locations, groups, progress: current }) => {
        const percent = Math.round((current.done / current.stages.length) * 100)
        return <details key={pokemonId(entry)} className={percent === 100 ? 'completed' : ''}><summary><PokemonImage src={pokemonImage(entry)} name={displayName(entry)} /><div><small>{pokemonPokelog(entry)?.category} · {pokemonPokelog(entry)?.experience_category}</small><strong>{displayName(entry)}</strong><span>{pokemonElements(entry).map((value) => <ElementBadge key={value} element={value} compact />)}</span></div><div className="pokelog-location-summary"><MapPin size={14} /><strong>{groups.length}</strong><small>grupos · {locations.length} pontos</small></div><div className="pokelog-entry-progress"><strong>{current.done}/{current.stages.length}</strong><span><i style={{ width: `${percent}%` }} /></span><small>{percent}%</small></div></summary><div className="pokelog-global-stages">{current.stages.map((stage, index) => { const stageId = pokelogStageId(stage, index); const checked = current.completed.includes(stageId); return <label key={stageId} className={checked ? 'checked' : ''}><input type="checkbox" checked={checked} onChange={() => setPokelogStages(pokemonId(entry), checked ? current.completed.filter((value) => value !== stageId) : [...current.completed, stageId])} /><span><Check size={13} /></span><div><strong>Estágio {stage.stage}</strong><small>{stage.quantity_raw || stage.required_quantity} derrotas · {stage.points_raw || stage.points} pontos</small></div></label>})}<div className="pokelog-entry-actions"><Link to={pokemonPath(entry)}><Target size={14} />Abrir ficha</Link>{locations.length > 0 && <Link to={`/map?pokemon=${encodeURIComponent(displayName(entry))}&region=${encodeURIComponent(groups[0]?.region || locations[0]?.region || '')}`}><MapPin size={14} />Melhor grupo mapeado</Link>}</div></div></details>
      })}</div>
      {limit < filtered.length && <button className="load-more" type="button" onClick={() => setLimit((value) => value + 60)}>Mostrar mais</button>}
    </div>
  )
}
