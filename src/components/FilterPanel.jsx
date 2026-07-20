import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { activeFilterCount, roleDefinition } from '../lib/pokemon'
import { ElementIcon, RoleIcon } from './Common'

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
    </label>
  )
}

function RolePicker({ label, mode, roles, value, onChange, roleCatalog }) {
  return (
    <fieldset className={`role-picker ${mode}`}>
      <legend>
        <span>{label}</span>
        {value && <button type="button" onClick={() => onChange('')} aria-label={`Limpar ${label}`}>Limpar</button>}
      </legend>
      <div className="role-picker-grid">
        {roles.map((role) => {
          const definition = roleDefinition(role, mode, roleCatalog)
          const selected = value === role
          return (
            <button
              type="button"
              className={selected ? 'selected' : ''}
              key={role}
              onClick={() => onChange(selected ? '' : role)}
              aria-pressed={selected}
              title={`${definition.label} — ${mode.toUpperCase()}`}
            >
              <RoleIcon role={role} mode={mode} roleCatalog={roleCatalog} decorative />
              <span>{definition.label}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function ElementPicker({ options, value, onChange }) {
  const selected = Array.isArray(value) ? value : value ? [value] : []
  const toggle = (element) => {
    if (selected.includes(element)) {
      onChange(selected.filter((item) => item !== element))
    } else if (selected.length < 2) {
      onChange([...selected, element])
    }
  }

  return (
    <fieldset className="element-picker">
      <legend>
        <span>Elementos</span>
        <small>{selected.length}/2</small>
        {selected.length > 0 && <button type="button" onClick={() => onChange([])}>Limpar</button>}
      </legend>
      <div className="element-picker-grid">
        {options.map((element) => {
          const active = selected.includes(element)
          const disabled = !active && selected.length >= 2
          return (
            <button type="button" className={active ? 'selected' : ''} disabled={disabled} key={element} onClick={() => toggle(element)} aria-pressed={active} title={disabled ? 'Selecione no máximo 2 elementos' : element}>
              <ElementIcon element={element} />
              <span>{element}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export default function FilterPanel({ filters, options, roleCatalog, onChange, onReset, mobileOpen, setMobileOpen }) {
  const count = activeFilterCount(filters)
  const set = (key) => (value) => onChange({ ...filters, [key]: value })

  return (
    <>
      <button className="mobile-filter-button button secondary" onClick={() => setMobileOpen(true)}>
        <SlidersHorizontal size={17} />Filtros{count > 0 && <b>{count}</b>}
      </button>
      <aside className={`filter-panel ${mobileOpen ? 'open' : ''}`}>
        <div className="filter-mobile-heading">
          <strong>Filtros</strong>
          <button className="icon-button" onClick={() => setMobileOpen(false)} aria-label="Fechar filtros"><X size={20} /></button>
        </div>
        <div className="search-field">
          <Search size={17} />
          <input value={filters.query} onChange={(event) => set('query')(event.target.value)} placeholder="Nome, elemento, clan…" aria-label="Pesquisar Pokémon" />
          {filters.query && <button onClick={() => set('query')('')} aria-label="Limpar pesquisa"><X size={15} /></button>}
        </div>

        <div className="filter-section">
          <div className="section-label">Progressão</div>
          <SelectField label="Clan" value={filters.clan} onChange={set('clan')}>
            <option value="">Todos os clans</option>
            {options.clans.map((value) => <option key={value}>{value}</option>)}
          </SelectField>
          <div className="field-pair">
            <SelectField label="Level mínimo" value={filters.minLevel} onChange={set('minLevel')}>
              <option value="">Qualquer</option>
              {options.levels.map((value) => <option key={value} value={value}>Level {value}</option>)}
            </SelectField>
            <SelectField label="Level máximo" value={filters.maxLevel} onChange={set('maxLevel')}>
              <option value="">Qualquer</option>
              {options.levels.map((value) => <option key={value} value={value}>Level {value}</option>)}
            </SelectField>
          </div>
          <SelectField label="Tier" value={filters.tier} onChange={set('tier')}>
            <option value="">Todos</option>
            {options.tiers.map((value) => <option key={value}>{value}</option>)}
          </SelectField>
          <ElementPicker options={options.elements} value={filters.elements} onChange={set('elements')} />
        </div>

        <div className="filter-section">
          <div className="section-label">Combate</div>
          <RolePicker label="Função PvE" mode="pve" roles={options.pveRoles} value={filters.pveRole} onChange={set('pveRole')} roleCatalog={roleCatalog} />
          <RolePicker label="Função PvP" mode="pvp" roles={options.pvpRoles} value={filters.pvpRole} onChange={set('pvpRole')} roleCatalog={roleCatalog} />
          <SelectField label="Disponibilidade PvP" value={filters.pvpAvailability} onChange={set('pvpAvailability')}>
            <option value="">Qualquer</option>
            <option value="available">Disponível no PvP</option>
            <option value="unavailable">Indisponível no PvP</option>
          </SelectField>
        </div>

        <div className="filter-section">
          <div className="section-label">Outros</div>
          <div className="field-pair">
            <SelectField label="Forma" value={filters.form} onChange={set('form')}>
              <option value="">Todas</option>
              <option value="regular">Regular</option>
              <option value="shiny">Shiny</option>
              <option value="mega">Mega</option>
              <option value="baby">Baby</option>
              <option value="tm">TM</option>
              <option value="tr">TR</option>
            </SelectField>
            <SelectField label="Acesso" value={filters.accessibility} onChange={set('accessibility')}>
              <option value="">Todos</option>
              <option value="accessible">Acessível</option>
              <option value="inaccessible">Não acessível</option>
            </SelectField>
          </div>
        </div>

        {(options.pokelogCategories.length > 0 || options.experienceCategories.length > 0) && (
          <div className="filter-section">
            <div className="section-label">Pokélog</div>
            <div className="field-pair">
              <SelectField label="Categoria" value={filters.pokelogCategory} onChange={set('pokelogCategory')}>
                <option value="">Todas</option>
                {options.pokelogCategories.map((value) => <option key={value}>{value}</option>)}
              </SelectField>
              <SelectField label="Experiência" value={filters.experienceCategory} onChange={set('experienceCategory')}>
                <option value="">Todas</option>
                {options.experienceCategories.map((value) => <option key={value}>{value}</option>)}
              </SelectField>
            </div>
          </div>
        )}

        <button className="button reset-button" onClick={onReset} disabled={count === 0}>
          <RotateCcw size={16} />Limpar {count > 0 ? `${count} filtros` : 'filtros'}
        </button>
      </aside>
      {mobileOpen && <button className="filter-backdrop" onClick={() => setMobileOpen(false)} aria-label="Fechar filtros" />}
    </>
  )
}
