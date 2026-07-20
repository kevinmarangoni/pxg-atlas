import { ExternalLink, Gauge, Info, Plus, RotateCcw, Search, Sparkles, Swords, Trash2, Users } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ElementBadge, ElementIcon, PokemonImage, RoleBadge } from '../components/Common'
import { HELD_ITEMS, HELD_ITEMS_SOURCE, HELD_BY_ID, heldEffectLabel, heldTierOptions } from '../data/heldItems'
import { usePokemonData } from '../data/PokemonDataContext'
import { displayName, pokemonElements, pokemonImage, pokemonPath, pokemonRoles, primaryLevel } from '../lib/pokemon'
import {
  TEAM_SIZE,
  TEAM_STORAGE_KEY,
  analyzeTeam,
  defaultTeamState,
  effectiveNaturalBoost,
  pokemonAttackElements,
  safeTeamState,
} from '../lib/teamBuilder'

const BOOST_SOURCE = 'https://wiki.pokexgames.com/index.php/Tabela_de_Boost'
const STATUS = {
  strong: { label: 'Forte contra', description: 'O time possui pelo menos um movimento PvE com dano 2x.' },
  neutral: { label: 'Neutro contra', description: 'O melhor movimento disponível causa dano normal, 1x.' },
  weak: { label: 'Fraco contra', description: 'A melhor cobertura causa 0,5x, 0x ou exige um level maior.' },
}

function HeldIcon({ item, tier, label }) {
  if (!item?.iconUrl) return null
  const options = heldTierOptions(item.id)
  const count = Math.max(1, options.length)
  const foundIndex = options.findIndex((entry) => entry.tier === Number(tier))
  const index = foundIndex >= 0 ? foundIndex : 0
  return (
    <span
      className="held-art"
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      style={{
        backgroundImage: `url("${item.iconUrl}")`,
        backgroundSize: `${count * 100}% 100%`,
        backgroundPosition: count > 1 ? `${(index / (count - 1)) * 100}% center` : 'center',
      }}
    />
  )
}

function loadTeam() {
  try { return safeTeamState(JSON.parse(localStorage.getItem(TEAM_STORAGE_KEY))) } catch { return defaultTeamState() }
}

function HeldControl({ type, itemId, tier, playerLevel, onChange }) {
  const items = HELD_ITEMS.filter((item) => item.slot === type)
  const selected = HELD_BY_ID.get(itemId)
  const tiers = heldTierOptions(itemId)
  const menuRef = useRef(null)
  const setItem = (nextId) => {
    const firstTier = heldTierOptions(nextId)[0]?.tier ?? null
    onChange({ id: nextId, tier: firstTier })
    menuRef.current?.removeAttribute('open')
  }

  return (
    <div className={`held-control ${type}`}>
      <div className="held-label"><strong>{type.toUpperCase()}</strong><span>{selected ? heldEffectLabel(itemId, tier, playerLevel) : 'Sem held'}</span></div>
      <div className="held-fields">
        <details className="held-dropdown" ref={menuRef}>
          <summary aria-label={`Selecionar Held ${type.toUpperCase()}`}>
            {selected?.iconUrl ? <HeldIcon item={selected} tier={tier} /> : <span className="held-empty-icon">{type.toUpperCase()}</span>}
            <span>{selected?.name || `Sem held ${type.toUpperCase()}`}</span>
            <i />
          </summary>
          <div className="held-menu">
            <button type="button" className={!selected ? 'selected' : ''} onClick={() => setItem('')}>
              <span className="held-empty-icon">—</span><span>Sem held {type.toUpperCase()}</span>
            </button>
            {[...new Set(items.map((item) => item.category))].map((category) => (
              <section key={category}>
                <small>{category}</small>
                {items.filter((item) => item.category === category).map((item) => (
                  <button type="button" key={item.id} className={item.id === itemId ? 'selected' : ''} onClick={() => setItem(item.id)}>
                    <HeldIcon item={item} tier={heldTierOptions(item.id)[0]?.tier} />
                    <span><strong>{item.name}</strong><em>{item.description}</em></span>
                  </button>
                ))}
              </section>
            ))}
          </div>
        </details>
        {selected && tiers.length > 0 && (
          <select className="held-tier" aria-label={`Tier de ${selected.name}`} value={tier || tiers[0].tier} onChange={(event) => onChange({ id: itemId, tier: Number(event.target.value) })}>
            {tiers.map((entry) => <option key={entry.tier} value={entry.tier}>T{entry.tier}</option>)}
          </select>
        )}
      </div>
      {selected && <small title={selected.description}>{selected.description}</small>}
    </div>
  )
}

function TeamSlot({ index, slot, pokemon, playerLevel, onChange, onRemove, onFind }) {
  if (!slot || !pokemon) {
    return (
      <button className="team-slot empty" type="button" onClick={onFind}>
        <span><Plus size={20} /></span>
        <strong>Slot {index + 1}</strong>
        <small>Adicionar Pokémon</small>
      </button>
    )
  }

  const baseLevel = primaryLevel(pokemon)
  const effective = effectiveNaturalBoost(slot.boost, pokemon, playerLevel)
  const capped = effective < slot.boost
  const attacks = pokemonAttackElements(pokemon)

  return (
    <article className="team-slot filled">
      <div className="team-slot-heading">
        <Link to={pokemonPath(pokemon)} className="team-slot-pokemon">
          <PokemonImage src={pokemonImage(pokemon)} name={displayName(pokemon)} />
          <span><small>Slot {index + 1} · Lv. {baseLevel ?? '—'}</small><strong>{displayName(pokemon)}</strong></span>
        </Link>
        <button className="remove-slot" type="button" onClick={onRemove} aria-label={`Remover ${displayName(pokemon)}`}><Trash2 size={15} /></button>
      </div>

      <div className="slot-elements">{pokemonElements(pokemon).map((element) => <ElementBadge key={element} element={element} compact />)}</div>
      <div className="attack-elements"><span>Ataca no PvE com</span><div>{attacks.map((element) => <span key={element} title={element}><ElementIcon element={element} /></span>)}{!attacks.length && <small>Sem movimentos mapeados</small>}</div></div>

      <label className="boost-control">
        <span><strong>Boost configurado</strong><output>+{slot.boost}</output></span>
        <input type="range" min="0" max="80" step="1" value={slot.boost} onChange={(event) => onChange({ boost: Number(event.target.value) })} />
        <span className={capped ? 'boost-cap warning' : 'boost-cap'}>
          <Gauge size={12} /> Efetivo no seu level: +{effective}{capped ? ` (limite Lv. ${playerLevel})` : ''}
        </span>
      </label>

      <div className="slot-helds">
        <HeldControl type="x" itemId={slot.heldXId} tier={slot.heldXTier} playerLevel={playerLevel} onChange={({ id, tier }) => onChange({ heldXId: id, heldXTier: tier })} />
        <HeldControl type="y" itemId={slot.heldYId} tier={slot.heldYTier} playerLevel={playerLevel} onChange={({ id, tier }) => onChange({ heldYId: id, heldYTier: tier })} />
      </div>
    </article>
  )
}

function CoverageGroup({ status, entries }) {
  const meta = STATUS[status]
  return (
    <article className={`coverage-group ${status}`}>
      <header>
        <div><span>{meta.label}</span><strong>{entries.length}</strong></div>
        <p>{meta.description}</p>
      </header>
      <div className="coverage-element-list">
        {entries.map((entry) => {
          const best = entry.best
          const detail = best.usable ? `${best.name} · ${best.attackElement}` : `Requer level ${best.baseLevel}`
          return (
            <Link
              key={entry.targetElement}
              className="coverage-element-row"
              to={pokemonPath(best.pokemon)}
              title={`${entry.targetElement}: ${detail}. ${best.defense.label} ao receber ataques desse elemento.`}
            >
              <ElementIcon element={entry.targetElement} />
              <span><strong>{entry.targetElement}</strong><small>{detail}</small></span>
              <b>{best.multiplier}x</b>
            </Link>
          )
        })}
        {!entries.length && <p className="coverage-group-empty">Nenhum elemento nesta categoria.</p>}
      </div>
    </article>
  )
}

function TeamRoleColumn({ mode, roles, roleCatalog }) {
  return (
    <article className={`team-role-column ${mode}`}>
      <header><span>{mode.toUpperCase()}</span><strong>{roles.length} {roles.length === 1 ? 'função' : 'funções'}</strong></header>
      <div>
        {roles.map(({ role, members }) => (
          <div className="team-role-row" key={role}>
            <RoleBadge role={role} mode={mode} roleCatalog={roleCatalog} />
            <span><b>{members.length}</b><small>{members.join(', ')}</small></span>
          </div>
        ))}
        {!roles.length && <p>Nenhuma função {mode.toUpperCase()} mapeada no time.</p>}
      </div>
    </article>
  )
}

export default function TeamBuilderPage() {
  const { data, pokemon, roleCatalog } = usePokemonData()
  const [team, setTeam] = useState(loadTeam)
  const [query, setQuery] = useState('')
  const pickerRef = useRef(null)
  const pokemonByUrl = useMemo(() => new Map(pokemon.map((entry) => [entry.source_url, entry])), [pokemon])
  const chosenUrls = useMemo(() => new Set(team.slots.map((slot) => slot.pokemonUrl)), [team.slots])

  useEffect(() => {
    try { localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team)) } catch { /* storage is optional */ }
  }, [team])

  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
  const candidates = useMemo(() => pokemon
    .filter((entry) => !normalizedQuery || [displayName(entry), entry.page_title, ...pokemonElements(entry)].join(' ').toLocaleLowerCase('pt-BR').includes(normalizedQuery))
    .sort((a, b) => displayName(a).localeCompare(displayName(b), 'pt-BR'))
    .slice(0, 24), [pokemon, normalizedQuery])

  const coverage = useMemo(() => analyzeTeam({
    slots: team.slots,
    pokemonByUrl,
    clans: data.clans || [],
    playerLevel: team.playerLevel,
    clanName: team.clanName,
    clanRank: team.clanRank,
  }), [team, pokemonByUrl, data.clans])
  const hasCoverage = coverage.some((entry) => entry.status !== 'empty')
  const coverageGroups = Object.fromEntries(Object.keys(STATUS).map((status) => [status, coverage.filter((entry) => entry.status === status)]))
  const teamRoles = useMemo(() => Object.fromEntries(['pve', 'pvp'].map((mode) => {
    const roles = new Map()
    for (const slot of team.slots) {
      const entry = pokemonByUrl.get(slot.pokemonUrl)
      if (!entry) continue
      for (const role of pokemonRoles(entry, mode)) {
        const members = roles.get(role) || []
        members.push(displayName(entry))
        roles.set(role, members)
      }
    }
    return [mode, [...roles.entries()].map(([role, members]) => ({ role, members })).sort((a, b) => a.role.localeCompare(b.role, 'pt-BR'))]
  })), [team.slots, pokemonByUrl])

  const addPokemon = (entry) => {
    if (team.slots.length >= TEAM_SIZE || chosenUrls.has(entry.source_url)) return
    setTeam((current) => ({ ...current, slots: [...current.slots, { pokemonUrl: entry.source_url, boost: 0, heldXId: '', heldXTier: null, heldYId: '', heldYTier: null }] }))
  }
  const updateSlot = (index, patch) => setTeam((current) => ({ ...current, slots: current.slots.map((slot, slotIndex) => slotIndex === index ? { ...slot, ...patch } : slot) }))
  const findPokemon = () => pickerRef.current?.focus()

  return (
    <div className="team-builder-page">
      <section className="team-builder-hero">
        <div>
          <div className="eyebrow"><Sparkles size={14} />Planejador de hunt PvE</div>
          <h1>Monte o time.<br /><span>Encontre a hunt certa.</span></h1>
          <p>Configure Pokémon, boost, helds e clan. O Atlas cruza os elementos dos movimentos PvE com resistências e bônus oficiais.</p>
        </div>
        <div className="builder-global-controls">
          <label><span>Seu level</span><input type="number" min="1" max="999" value={team.playerLevel} onChange={(event) => setTeam({ ...team, playerLevel: Math.max(1, Number(event.target.value) || 1) })} /></label>
          <label><span>Seu clan</span><select value={team.clanName} onChange={(event) => setTeam({ ...team, clanName: event.target.value })}><option value="">Sem bônus</option>{(data.clans || []).map((clan) => <option key={clan.name} value={clan.name}>{clan.name}</option>)}</select></label>
          <label><span>Rank do clan</span><select value={team.clanRank} disabled={!team.clanName} onChange={(event) => setTeam({ ...team, clanRank: Number(event.target.value) })}><option value="5">Rank 5</option><option value="6">Rank 6</option></select></label>
          <button className="reset-team" type="button" onClick={() => setTeam(defaultTeamState())}><RotateCcw size={15} />Limpar</button>
        </div>
      </section>

      <div className="builder-source-note">
        <Info size={16} />
        <p>O resultado é um guia comparativo, não uma simulação de DPS. Boost melhora força e vida, mas a wiki não publica uma fórmula completa de dano.</p>
        <a href={BOOST_SOURCE} target="_blank" rel="noreferrer">Tabela de Boost <ExternalLink size={13} /></a>
        <a href={HELD_ITEMS_SOURCE} target="_blank" rel="noreferrer">Held Itens <ExternalLink size={13} /></a>
      </div>

      <div className="builder-layout">
        <aside className="pokemon-picker">
          <div className="picker-title"><span><Users size={16} />Pokémon</span><strong>{team.slots.length}/{TEAM_SIZE}</strong></div>
          <label className="picker-search"><Search size={16} /><input ref={pickerRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome ou elemento…" /></label>
          <div className="picker-results">
            {candidates.map((entry) => {
              const selected = chosenUrls.has(entry.source_url)
              return (
                <button type="button" key={entry.source_url} disabled={selected || team.slots.length >= TEAM_SIZE} onClick={() => addPokemon(entry)}>
                  <PokemonImage src={pokemonImage(entry)} name={displayName(entry)} />
                  <span><strong>{displayName(entry)}</strong><small>Lv. {primaryLevel(entry) ?? '—'} · {pokemonAttackElements(entry).length} elementos de ataque</small></span>
                  {selected ? <i>No time</i> : <Plus size={15} />}
                </button>
              )
            })}
          </div>
          <small className="picker-limit">Mostrando os primeiros {candidates.length} resultados. Refine a busca para encontrar formas específicas.</small>
        </aside>

        <main className="builder-main">
          <section className="team-section">
            <div className="builder-section-title"><div><span><Users size={15} />Seu time</span><h2>Configure cada slot</h2></div><p>Um held X e um held Y por Pokémon.</p></div>
            <div className="team-grid">
              {Array.from({ length: TEAM_SIZE }, (_, index) => {
                const slot = team.slots[index]
                return <TeamSlot key={slot?.pokemonUrl || `empty-${index}`} index={index} slot={slot} pokemon={slot ? pokemonByUrl.get(slot.pokemonUrl) : null} playerLevel={team.playerLevel} onChange={(patch) => updateSlot(index, patch)} onRemove={() => setTeam((current) => ({ ...current, slots: current.slots.filter((_, slotIndex) => slotIndex !== index) }))} onFind={findPokemon} />
              })}
            </div>
          </section>

          <section className="team-roles-section">
            <div className="builder-section-title"><div><span><Users size={15} />Funções de combate</span><h2>Funções presentes no time</h2></div><p>Consolidadas a partir das classificações dos clans.</p></div>
            <div className="team-role-grid">
              <TeamRoleColumn mode="pve" roles={teamRoles.pve} roleCatalog={roleCatalog} />
              <TeamRoleColumn mode="pvp" roles={teamRoles.pvp} roleCatalog={roleCatalog} />
            </div>
          </section>

          <section className="coverage-section">
            <div className="builder-section-title"><div><span><Swords size={15} />Mapa de hunts</span><h2>Forças e fraquezas do time</h2></div><p>Classificação pelo melhor multiplicador dos movimentos PvE.</p></div>
            {hasCoverage ? (
              <div className="coverage-simple-grid">
                {Object.keys(STATUS).map((status) => <CoverageGroup key={status} status={status} entries={coverageGroups[status]} />)}
              </div>
            ) : (
              <div className="coverage-simple-empty"><Swords size={24} /><strong>Monte o time para analisar</strong><span>Os elementos fortes, neutros e fracos aparecerão aqui.</span></div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
