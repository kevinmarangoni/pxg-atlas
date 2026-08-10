import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../data/LanguageContext'
import { activeFilterCount, displayName, roleDefinition } from '../lib/pokemon'
import { ElementIcon, RoleIcon } from './Common'

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
    </label>
  )
}

function MatchupPicker({ pokemon, target, relations, onTargetChange, onRelationsChange }) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selectedTarget = useMemo(() => pokemon.find((entry) => entry.source_url === target) || null, [pokemon, target])

  useEffect(() => {
    setQuery(selectedTarget ? displayName(selectedTarget) : '')
  }, [selectedTarget])

  const suggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return pokemon
      .filter((entry) => {
        if (!normalizedQuery) return true
        return `${displayName(entry)} ${entry.page_title || ''}`.toLocaleLowerCase().includes(normalizedQuery)
      })
      .slice(0, 18)
  }, [pokemon, query])

  const chooseTarget = (entry) => {
    onTargetChange(entry.source_url)
    setQuery(displayName(entry))
    setOpen(false)
  }

  const clearTarget = () => {
    onTargetChange('')
    onRelationsChange([])
    setQuery('')
    setOpen(false)
  }

  const toggleRelation = (relation) => {
    onRelationsChange(relations.includes(relation)
      ? relations.filter((item) => item !== relation)
      : [...relations, relation])
  }

  return (
    <fieldset className="matchup-picker">
      <legend>
        <span>{t('Comparar contra Pokémon')}</span>
        {selectedTarget && <button type="button" onClick={clearTarget}>{t('Limpar')}</button>}
      </legend>
      <div className="matchup-combobox">
        <div className="search-field matchup-search">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            placeholder={t('Buscar um Pokémon…')}
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-controls="pokemon-matchup-options"
          />
          {query && <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={clearTarget} aria-label={t('Limpar Pokémon selecionado')}><X size={14} /></button>}
        </div>
        {open && (
          <div className="matchup-results" id="pokemon-matchup-options" role="listbox">
            {suggestions.length > 0 ? suggestions.map((entry) => (
              <button
                type="button"
                role="option"
                aria-selected={selectedTarget?.source_url === entry.source_url}
                key={entry.source_url}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseTarget(entry)}
              >
                <strong>{displayName(entry)}</strong>
                {entry.page_title && entry.page_title !== displayName(entry) && <small>{entry.page_title}</small>}
              </button>
            )) : <span className="matchup-empty">{t('Nenhum Pokémon encontrado')}</span>}
          </div>
        )}
      </div>
      <div className="matchup-relations" role="group" aria-label={t('Relação com o alvo')}>
        {[
          ['strong', t('Forte contra')],
          ['weak', t('Fraco contra')],
        ].map(([relation, label]) => (
          <label key={relation} className={`${!selectedTarget ? 'disabled' : ''} ${relations.includes(relation) ? 'selected' : ''}`}>
            <input type="checkbox" checked={relations.includes(relation)} onChange={() => toggleRelation(relation)} disabled={!selectedTarget} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      {selectedTarget && relations.length === 0 && <small className="filter-hint">{t('Selecione pelo menos uma relação')}</small>}
    </fieldset>
  )
}

function RolePicker({ label, mode, roles, value, onChange, roleCatalog }) {
  const { t } = useLanguage()
  const selected = Array.isArray(value) ? value : value ? [value] : []
  return (
    <fieldset className={`role-picker ${mode}`}>
      <legend>
        <span>{label}</span>
        <span className="picker-legend-actions">
          {selected.length > 0 && <small>{selected.length}</small>}
          {selected.length > 0 && <button type="button" onClick={() => onChange([])} aria-label={t('Limpar {label}', { label })}>{t('Limpar')}</button>}
        </span>
      </legend>
      <div className="role-picker-grid">
        {roles.map((role) => {
          const definition = roleDefinition(role, mode, roleCatalog)
          const active = selected.includes(role)
          return (
            <button
              type="button"
              className={active ? 'selected' : ''}
              key={role}
              onClick={() => onChange(active ? selected.filter((item) => item !== role) : [...selected, role])}
              aria-pressed={active}
              title={`${definition.label} — ${mode.toUpperCase()}`}
            >
              <RoleIcon role={role} mode={mode} roleCatalog={roleCatalog} decorative />
              <span>{definition.label}</span>
            </button>
          )
        })}
      </div>
      {selected.length > 1 && <small className="filter-hint">{t('Ao marcar mais de uma função, o Pokémon precisa ter pelo menos uma.')}</small>}
    </fieldset>
  )
}

function ElementPicker({ options, value, onChange, label }) {
  const { t } = useLanguage()
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
        <span>{label || t('Elementos')}</span>
        <small>{selected.length}/2</small>
        {selected.length > 0 && <button type="button" onClick={() => onChange([])}>{t('Limpar')}</button>}
      </legend>
      <div className="element-picker-grid">
        {options.map((element) => {
          const active = selected.includes(element)
          const disabled = !active && selected.length >= 2
          return (
            <button type="button" className={active ? 'selected' : ''} disabled={disabled} key={element} onClick={() => toggle(element)} aria-pressed={active} title={disabled ? t('Selecione no máximo 2 elementos') : element}>
              <ElementIcon element={element} />
              <span>{element}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function ControlEffectPicker({ options, value, onChange }) {
  const { t } = useLanguage()
  const selected = Array.isArray(value) ? value : value ? [value] : []
  const toggle = (effectId) => {
    onChange(selected.includes(effectId)
      ? selected.filter((item) => item !== effectId)
      : [...selected, effectId])
  }

  if (!options.length) return null
  return (
    <fieldset className="control-effect-picker">
      <legend>
        <span>{t('Efeitos de controle')}</span>
        {selected.length > 0 && <small>{selected.length === 1 ? t('{count} marcado', { count: selected.length }) : t('{count} marcados', { count: selected.length })}</small>}
        {selected.length > 0 && <button type="button" onClick={() => onChange([])}>{t('Limpar')}</button>}
      </legend>
      <div className="control-effect-grid">
        {options.map((effect) => {
          const active = selected.includes(effect.id)
          return (
            <button type="button" className={active ? 'selected' : ''} key={effect.id} onClick={() => toggle(effect.id)} aria-pressed={active}>
              <i aria-hidden="true">{active ? '✓' : ''}</i>
              <span>{effect.label}</span>
            </button>
          )
        })}
      </div>
      <small className="filter-hint">{t('Ao marcar mais de um, o Pokémon precisa ter todos.')}</small>
    </fieldset>
  )
}

export default function FilterPanel({ filters, options, roleCatalog, pokemon = [], onChange, onReset, mobileOpen, setMobileOpen }) {
  const { t } = useLanguage()
  const count = activeFilterCount(filters)
  const set = (key) => (value) => onChange({ ...filters, [key]: value })

  return (
    <>
      <button className="mobile-filter-button button secondary" onClick={() => setMobileOpen(true)}>
        <SlidersHorizontal size={17} />{t('Filtros')}{count > 0 && <b>{count}</b>}
      </button>
      <aside className={`filter-panel ${mobileOpen ? 'open' : ''}`}>
        <div className="filter-mobile-heading">
          <strong>{t('Filtros')}</strong>
          <button className="icon-button" onClick={() => setMobileOpen(false)} aria-label={t('Fechar filtros')}><X size={20} /></button>
        </div>
        <div className="filter-top-row">
          <div className="search-field">
            <Search size={17} />
            <input value={filters.query} onChange={(event) => set('query')(event.target.value)} placeholder={t('Nome, elemento, clan…')} aria-label={t('Pesquisar Pokémon')} />
            {filters.query && <button onClick={() => set('query')('')} aria-label={t('Limpar pesquisa')}><X size={15} /></button>}
          </div>
          <button
            type="button"
            className="filter-reset-mini"
            onClick={onReset}
            disabled={count === 0}
            title={count > 0 ? t('Limpar {count} filtros', { count }) : t('Limpar filtros')}
            aria-label={count > 0 ? t('Limpar {count} filtros', { count }) : t('Limpar filtros')}
          >
            <RotateCcw size={15} />
            {count > 0 && <b>{count}</b>}
          </button>
        </div>

        <div className="filter-section">
          <div className="section-label">{t('Progressão')}</div>
          <MatchupPicker
            pokemon={pokemon}
            target={filters.matchupPokemon}
            relations={Array.isArray(filters.matchupRelations) ? filters.matchupRelations : []}
            onTargetChange={set('matchupPokemon')}
            onRelationsChange={set('matchupRelations')}
          />
          <SelectField label={t('Clan')} value={filters.clan} onChange={set('clan')}>
            <option value="">{t('Todos os clans')}</option>
            {options.clans.map((value) => <option key={value}>{value}</option>)}
          </SelectField>
          <div className="field-pair">
            <SelectField label={t('Level mínimo')} value={filters.minLevel} onChange={set('minLevel')}>
              <option value="">{t('Qualquer')}</option>
              {options.levels.map((value) => <option key={value} value={value}>{t('Level {value}', { value })}</option>)}
            </SelectField>
            <SelectField label={t('Level máximo')} value={filters.maxLevel} onChange={set('maxLevel')}>
              <option value="">{t('Qualquer')}</option>
              {options.levels.map((value) => <option key={value} value={value}>{t('Level {value}', { value })}</option>)}
            </SelectField>
          </div>
          <SelectField label={t('Tier')} value={filters.tier} onChange={set('tier')}>
            <option value="">{t('Todos')}</option>
            {options.tiers.map((value) => <option key={value}>{value}</option>)}
          </SelectField>
          <ElementPicker options={options.elements} value={filters.elements} onChange={set('elements')} />
          <ElementPicker label={t('Tipo fraco contra')} options={options.weaknesses} value={filters.weaknesses} onChange={set('weaknesses')} />
          <ElementPicker label={t('Tipo forte contra')} options={options.strongAgainst} value={filters.strongAgainst} onChange={set('strongAgainst')} />
        </div>

        <div className="filter-section">
          <div className="section-label">{t('Combate')}</div>
          <RolePicker label={t('Função PvE')} mode="pve" roles={options.pveRoles} value={filters.pveRole} onChange={set('pveRole')} roleCatalog={roleCatalog} />
          <RolePicker label={t('Função PvP')} mode="pvp" roles={options.pvpRoles} value={filters.pvpRole} onChange={set('pvpRole')} roleCatalog={roleCatalog} />
          <SelectField label={t('Disponibilidade PvP')} value={filters.pvpAvailability} onChange={set('pvpAvailability')}>
            <option value="">{t('Qualquer')}</option>
            <option value="available">{t('Disponível no PvP')}</option>
            <option value="unavailable">{t('Indisponível no PvP')}</option>
          </SelectField>
          <ControlEffectPicker options={options.controlEffects} value={filters.controlEffects} onChange={set('controlEffects')} />
        </div>

        <div className="filter-section">
          <div className="section-label">{t('Outros')}</div>
          <div className="field-pair">
            <SelectField label={t('Forma')} value={filters.form} onChange={set('form')}>
              <option value="">{t('Todas')}</option>
              <option value="regular">{t('Regular')}</option>
              <option value="shiny">Shiny</option>
              <option value="mega">Mega</option>
              <option value="baby">{t('Baby')}</option>
              <option value="tm">TM</option>
              <option value="tr">TR</option>
            </SelectField>
            <SelectField label={t('Acesso')} value={filters.accessibility} onChange={set('accessibility')}>
              <option value="">{t('Todos')}</option>
              <option value="accessible">{t('Acessível')}</option>
              <option value="inaccessible">{t('Não acessível')}</option>
            </SelectField>
          </div>
        </div>

        {(options.pokelogCategories.length > 0 || options.experienceCategories.length > 0) && (
          <div className="filter-section">
            <div className="section-label">Pokélog</div>
            <div className="field-pair">
              <SelectField label={t('Categoria')} value={filters.pokelogCategory} onChange={set('pokelogCategory')}>
                <option value="">{t('Todas')}</option>
                {options.pokelogCategories.map((value) => <option key={value}>{value}</option>)}
              </SelectField>
              <SelectField label={t('Experiência')} value={filters.experienceCategory} onChange={set('experienceCategory')}>
                <option value="">{t('Todas')}</option>
                {options.experienceCategories.map((value) => <option key={value}>{value}</option>)}
              </SelectField>
            </div>
          </div>
        )}

      </aside>
      {mobileOpen && <button className="filter-backdrop" onClick={() => setMobileOpen(false)} aria-label={t('Fechar filtros')} />}
    </>
  )
}
