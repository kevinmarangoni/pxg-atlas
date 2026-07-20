import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { activeTaskFilterCount } from '../lib/tasks'

export default function TaskFilterPanel({ filters, options, locations, onChange, onReset }) {
  const activeCount = activeTaskFilterCount(filters)
  const toggleRegion = (region) => {
    const selected = filters.regions.includes(region)
    onChange({ ...filters, regions: selected ? filters.regions.filter((item) => item !== region) : [...filters.regions, region] })
  }

  return (
    <aside className="task-filters" aria-label="Filtros de tasks">
      <header>
        <div><SlidersHorizontal size={16} /><strong>Filtrar tasks</strong></div>
        {activeCount > 0 && <span>{activeCount}</span>}
      </header>

      <label className="task-search-field">
        <span>Pesquisar</span>
        <div><Search size={16} /><input value={filters.query} onChange={(event) => onChange({ ...filters, query: event.target.value })} placeholder="NPC, Pokémon, item…" /></div>
      </label>

      <fieldset className="task-region-filter">
        <legend>Regiões</legend>
        <div>
          {options.regions.map((region) => {
            const selected = filters.regions.includes(region.id)
            return <button type="button" key={region.id} className={selected ? 'selected' : ''} aria-pressed={selected} onClick={() => toggleRegion(region.id)}><span>{region.label}</span><b>{region.count}</b></button>
          })}
        </div>
      </fieldset>

      <label className="task-filter-field">
        <span>Localidade</span>
        <select value={filters.location} onChange={(event) => onChange({ ...filters, location: event.target.value })}>
          <option value="">Todas as localidades</option>
          {locations.map((location) => <option value={location} key={location}>{location}</option>)}
        </select>
      </label>

      <div className="task-level-filter">
        <span>Level mínimo da task</span>
        <div>
          <label><small>De</small><input type="number" min="0" inputMode="numeric" value={filters.minLevel} onChange={(event) => onChange({ ...filters, minLevel: event.target.value })} placeholder="0" /></label>
          <label><small>Até</small><input type="number" min="0" inputMode="numeric" value={filters.maxLevel} onChange={(event) => onChange({ ...filters, maxLevel: event.target.value })} placeholder="500" /></label>
        </div>
      </div>

      <label className="task-filter-field">
        <span>Mundo exigido</span>
        <select value={filters.requirement} onChange={(event) => onChange({ ...filters, requirement: event.target.value })}>
          <option value="">Todos</option>
          <option value="standard">Mundo padrão</option>
          <option value="nightmare">Nightmare World</option>
        </select>
      </label>

      <label className="task-filter-field">
        <span>Tipo de objetivo</span>
        <select value={filters.action} onChange={(event) => onChange({ ...filters, action: event.target.value })}>
          <option value="">Qualquer objetivo</option>
          {options.actions.map((action) => <option value={action.id} key={action.id}>{action.label}</option>)}
        </select>
      </label>

      <label className="task-filter-field">
        <span>Tipo de recompensa</span>
        <select value={filters.rewardKind} onChange={(event) => onChange({ ...filters, rewardKind: event.target.value })}>
          <option value="">Qualquer recompensa</option>
          {options.rewards.map((reward) => <option value={reward.id} key={reward.id}>{reward.label}</option>)}
        </select>
      </label>

      <button type="button" className="task-filter-reset" onClick={onReset} disabled={!activeCount}><RotateCcw size={14} />Limpar filtros</button>
    </aside>
  )
}

