import { ArrowDownAZ, ClipboardList, MapPinned, SearchX, Sparkles, Target, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import TaskCard from '../components/TaskCard'
import TaskFilterPanel from '../components/TaskFilterPanel'
import { usePokemonData } from '../data/PokemonDataContext'
import { EMPTY_TASK_FILTERS, activeTaskFilterCount, buildTaskFilterOptions, matchesTask, sortTasks } from '../lib/tasks'

const PAGE_SIZE = 24
const TASK_STATE_KEY = 'pxg-task-catalog-state'

function freshFilters(saved = {}) {
  return { ...EMPTY_TASK_FILTERS, ...saved, regions: Array.isArray(saved.regions) ? saved.regions : [] }
}

function savedTaskState() {
  try {
    const state = JSON.parse(sessionStorage.getItem(TASK_STATE_KEY) || '{}')
    return state && typeof state === 'object' ? state : {}
  } catch { return {} }
}

export default function TaskListPage() {
  const { data, tasks } = usePokemonData()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedTaskId = searchParams.get('task') || ''
  const saved = useMemo(savedTaskState, [])
  const [filters, setFilters] = useState(() => freshFilters(saved.filters))
  const [visibleCount, setVisibleCount] = useState(() => Math.max(PAGE_SIZE, Number(saved.visibleCount) || PAGE_SIZE))
  const firstFilterRender = useRef(true)
  const options = useMemo(() => buildTaskFilterOptions(tasks), [tasks])
  const locations = useMemo(() => [...new Set(tasks.filter((task) => !filters.regions.length || filters.regions.includes(task.region)).map((task) => task.location).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [tasks, filters.regions])
  const filtered = useMemo(() => {
    if (selectedTaskId) return tasks.filter((task) => task.id === selectedTaskId)
    return sortTasks(tasks.filter((task) => matchesTask(task, filters)), filters.sort)
  }, [tasks, filters, selectedTaskId])

  useEffect(() => {
    if (firstFilterRender.current) firstFilterRender.current = false
    else setVisibleCount(PAGE_SIZE)
  }, [filters])
  useEffect(() => {
    try { sessionStorage.setItem(TASK_STATE_KEY, JSON.stringify({ filters, visibleCount })) } catch { /* storage is optional */ }
  }, [filters, visibleCount])
  useEffect(() => {
    if (!selectedTaskId || !filtered.length) return
    requestAnimationFrame(() => document.getElementById(`task-${selectedTaskId}`)?.scrollIntoView({ block: 'start', behavior: 'auto' }))
  }, [selectedTaskId, filtered.length])

  const updateFilters = (nextFilters) => {
    if (selectedTaskId) setSearchParams({}, { replace: true })
    setFilters(nextFilters)
  }
  const resetFilters = () => {
    setSearchParams({}, { replace: true })
    setFilters(freshFilters())
  }
  const taskMeta = data.metadata?.task_enrichment
  const activeCount = activeTaskFilterCount(filters)

  return (
    <div className="tasks-page">
      <section className="tasks-hero">
        <div>
          <div className="eyebrow"><Sparkles size={14} />Guia de progressão</div>
          <h1>Tasks do mundo PXG,<br /><span>sem perder nenhum passo.</span></h1>
          <p>Encontre NPCs, requisitos, coordenadas, objetivos e recompensas de Kanto, Johto e Nightmare World.</p>
        </div>
        <div className="tasks-hero-stats">
          <div><ClipboardList size={18} /><span><strong>{(taskMeta?.total_tasks ?? tasks.length).toLocaleString('pt-BR')}</strong>tasks</span></div>
          <div><MapPinned size={18} /><span><strong>{(taskMeta?.total_locations ?? options.locations.length).toLocaleString('pt-BR')}</strong>localidades</span></div>
          <div><Target size={18} /><span><strong>{(taskMeta?.matched_pokemon_target_labels ?? 0).toLocaleString('pt-BR')}</strong>alvos vinculados</span></div>
        </div>
      </section>

      {selectedTaskId && (
        <div className="selected-task-notice">
          <span><ClipboardList size={16} />Exibindo a task relacionada ao Pokémon selecionado.</span>
          <button type="button" onClick={() => setSearchParams({}, { replace: true })}><X size={15} />Ver todas</button>
        </div>
      )}

      <div className="tasks-layout">
        <TaskFilterPanel filters={filters} options={options} locations={locations} onChange={updateFilters} onReset={resetFilters} />

        <main className="tasks-results">
          <header className="tasks-toolbar">
            <div><span><ClipboardList size={15} />Catálogo de tasks</span><h2>{filtered.length.toLocaleString('pt-BR')} {filtered.length === 1 ? 'task encontrada' : 'tasks encontradas'}</h2>{!selectedTaskId && activeCount > 0 && <p>{activeCount} {activeCount === 1 ? 'grupo de filtros ativo' : 'grupos de filtros ativos'}</p>}</div>
            {!selectedTaskId && <label><ArrowDownAZ size={16} /><select value={filters.sort} onChange={(event) => updateFilters({ ...filters, sort: event.target.value })}><option value="region-location">Região e local</option><option value="npc">NPC A–Z</option><option value="level-asc">Menor level</option><option value="level-desc">Maior level</option></select></label>}
          </header>

          {filtered.length === 0 ? (
            <div className="task-empty-results"><SearchX size={34} /><h2>Nenhuma task encontrada</h2><p>{selectedTaskId ? 'A task vinculada não está disponível nesta base.' : 'Tente pesquisar outro NPC, Pokémon ou remover alguns filtros.'}</p><button type="button" className="button secondary" onClick={resetFilters}>Mostrar todas as tasks</button></div>
          ) : (
            <>
              <div className="task-list">{filtered.slice(0, visibleCount).map((task) => <TaskCard task={task} expanded={selectedTaskId === task.id} key={task.id} />)}</div>
              {visibleCount < filtered.length && <div className="load-more"><button className="button secondary" onClick={() => setVisibleCount((value) => value + PAGE_SIZE)}>Carregar mais {Math.min(PAGE_SIZE, filtered.length - visibleCount)}</button><span>Exibindo {visibleCount} de {filtered.length.toLocaleString('pt-BR')}</span></div>}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
