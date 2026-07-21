import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Clock3,
  Crown,
  Gauge,
  Gift,
  Layers3,
  MapPin,
  Package,
  Route,
  Shield,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BackLink, ElementBadge, PokemonImage, RoleBadge, SourceLink } from '../components/Common'
import { PokemonModelViewer } from '../components/PokemonModelViewer'
import { usePokemonData } from '../data/PokemonDataContext'
import {
  ELEMENT_COLORS,
  captureBallEntries,
  displayName,
  pokemonClans,
  pokemonCapture,
  pokemonElements,
  pokemonImage,
  pokemonLevels,
  pokemonPath,
  pokemonPokelog,
  pokemonTiers,
  pokelogStages,
  normalizedElement,
  tierLabel,
} from '../lib/pokemon'
import { REGION_LABELS, formatTaskNumber, taskActionLabel, taskCoordinates, taskLevel, taskNightmareLevel, taskRegionLabel } from '../lib/tasks'
import { buildCounterRecommendations, counterWeaknesses } from '../lib/counterRecommendations'

const MODE_LABELS = { pve: 'PvE', pvp: 'PvP' }

const EFFECTIVENESS_LABELS = {
  super_effective: { label: 'Super efetivo', tone: 'danger-strong' },
  very_effective: { label: 'Muito efetivo', tone: 'danger' },
  effective: { label: 'Efetivo', tone: 'warning' },
  normal: { label: 'Dano normal', tone: 'neutral' },
  ineffective: { label: 'Pouco efetivo', tone: 'resistant' },
  very_ineffective: { label: 'Muito pouco efetivo', tone: 'resistant-strong' },
  super_ineffective: { label: 'Quase sem efeito', tone: 'resistant-strong' },
  null: { label: 'Imune', tone: 'immune' },
  imune: { label: 'Imune', tone: 'immune' },
}

function asList(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  return value === null || value === undefined || value === '' ? [] : [value]
}

function uniqueBy(items, key) {
  return [...new Map(items.filter(Boolean).map((item) => [key(item), item])).values()]
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '—'
  return typeof value === 'number' ? value.toLocaleString('pt-BR') : value
}

function humanizeKey(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function InfoItem({ label, children }) {
  if (children === null || children === undefined || children === '' || (Array.isArray(children) && !children.length)) return null
  return <div className="info-item"><span>{label}</span><strong>{Array.isArray(children) ? children.join(' · ') : children}</strong></div>
}

function Section({ id, title, icon, description, children, className = '' }) {
  return (
    <section id={id} className={`detail-section ${className}`}>
      <div className="detail-section-heading">
        <div className="detail-section-title">{icon}<h2>{title}</h2></div>
        {description && <p>{description}</p>}
      </div>
      {children}
    </section>
  )
}

function EmptyDetailState({ icon, title, children }) {
  return (
    <div className="detail-empty-state">
      <span>{icon}</span>
      <div><strong>{title}</strong><p>{children}</p></div>
    </div>
  )
}

function tierForMembership(membership) {
  if (membership.category === 'technical_machine') return 'TM'
  if (membership.category === 'technical_record') return 'TR'
  return membership.tier || null
}

function membershipLabel(membership) {
  return membership.section || membership.category_label || 'Classificação publicada'
}

function MembershipCard({ membership, roleCatalog }) {
  const tier = tierForMembership(membership)
  const modes = ['pve', 'pvp']

  return (
    <article className="membership-card">
      <div className="membership-heading">
        <div><span>{membership.clan}</span><strong>{membershipLabel(membership)}</strong></div>
        {tier && <b className="large-tier" title={`Tier ${tier}`}>{tier}</b>}
      </div>
      {membership.elements?.length > 0 && (
        <div className="membership-elements">
          {membership.elements.map((element) => <ElementBadge key={element} element={element} compact />)}
        </div>
      )}
      <div className="mode-grid">
        {modes.map((mode) => {
          const details = membership.functions?.[mode]
          const roles = details?.role_ids ?? []
          const unknownRoles = asList(details?.raw_labels ?? details?.unknown_labels)
          const available = Boolean(details?.available)
          return (
            <div className={`mode-block ${mode} ${available ? '' : 'unavailable'}`} key={mode}>
              <div className="mode-block-heading">
                <span>{MODE_LABELS[mode]}</span>
                <small>{available ? 'Disponível' : 'Indisponível'}</small>
              </div>
              {available ? (
                <div className="role-stack">
                  {roles.map((role, index) => (
                    <RoleBadge key={`${role}-${index}`} role={role} mode={mode} iconUrl={details.icon_urls?.[index]} roleCatalog={roleCatalog} />
                  ))}
                  {!roles.length && unknownRoles.length > 0 && <em>{unknownRoles.join(' · ')}</em>}
                  {!roles.length && !unknownRoles.length && <em>Função não catalogada</em>}
                </div>
              ) : <em>Não consta para este modo</em>}
              {available && membership.held_items?.[mode]?.length > 0 && (
                <div className="held-items">
                  <b>Held item</b>
                  {membership.held_items[mode].map((item, index) => (
                    <span key={`${mode}-${item.name}-${index}`}>
                      {item.icon_url && <img src={item.icon_url} alt="" />}{item.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {membership.pvp_exclusive && <div className="exclusive-note"><ShieldCheck size={14} />Exclusivo deste clan no PvP</div>}
    </article>
  )
}

function buildModeSummary(memberships, mode) {
  const availableMemberships = memberships.filter((membership) => membership.functions?.[mode]?.available)
  const roles = uniqueBy(availableMemberships.flatMap((membership) => {
    const details = membership.functions?.[mode]
    return (details?.role_ids ?? []).map((role, index) => ({ role, iconUrl: details.icon_urls?.[index] || null }))
  }), (item) => item.role)
  const rawLabels = [...new Set(availableMemberships.flatMap((membership) => membership.functions?.[mode]?.raw_labels ?? membership.functions?.[mode]?.unknown_labels ?? []).filter(Boolean))]
  const heldItems = uniqueBy(
    availableMemberships.flatMap((membership) => membership.held_items?.[mode] ?? []),
    (item) => `${item.name}|${item.icon_url || ''}`,
  )
  const clans = [...new Set(availableMemberships.map((membership) => membership.clan).filter(Boolean))]
  return { availableMemberships, roles, rawLabels, heldItems, clans }
}

function ClassificationCard({ memberships, clans, tiers }) {
  return (
    <article className="decision-card classification-card">
      <header><span className="decision-icon"><Crown size={19} /></span><div><small>Classificação</small><strong>Clan e tier</strong></div></header>
      {memberships.length > 0 ? (
        <>
          <div className="classification-tiers">{tiers.map((tier) => <b key={tier}>{tierLabel(tier)}</b>)}</div>
          <p>{clans.join(' · ')}</p>
          <span className="decision-footnote">{memberships.length} {memberships.length === 1 ? 'entrada publicada' : 'entradas publicadas'}</span>
        </>
      ) : (
        <div className="decision-empty"><strong>Sem classificação publicada</strong><p>Este Pokémon não aparece nas tabelas de clans da Wiki.</p></div>
      )}
    </article>
  )
}

function CombatDecisionCard({ mode, summary, hasMemberships, roleCatalog }) {
  const available = summary.availableMemberships.length > 0
  return (
    <article className={`decision-card combat-decision ${mode}`}>
      <header>
        <span className="decision-icon">{mode === 'pve' ? <Swords size={19} /> : <Shield size={19} />}</span>
        <div><small>Função {MODE_LABELS[mode]}</small><strong>{available ? 'Disponível' : hasMemberships ? 'Não disponível' : 'Sem dados de clan'}</strong></div>
        <i className={`availability-dot ${available ? 'on' : ''}`} />
      </header>
      {available ? (
        <>
          <div className="decision-role-list">
            {summary.roles.map(({ role, iconUrl }) => <RoleBadge key={role} role={role} mode={mode} iconUrl={iconUrl} roleCatalog={roleCatalog} />)}
            {!summary.roles.length && <span className="unknown-role">{summary.rawLabels.join(' · ') || 'Função não catalogada'}</span>}
          </div>
          {summary.heldItems.length > 0 && (
            <div className="decision-helds"><small>Held items publicados</small><div>{summary.heldItems.map((item, index) => <span key={`${item.name}-${index}`}>{item.icon_url && <img src={item.icon_url} alt="" />}<b>{item.name}</b></span>)}</div></div>
          )}
          <span className="decision-footnote">Em {summary.clans.join(' · ')}</span>
        </>
      ) : (
        <div className="decision-empty">
          <p>{hasMemberships ? `A tabela não marca este Pokémon como disponível no ${MODE_LABELS[mode]}.` : 'É preciso uma classificação de clan para avaliar este modo.'}</p>
        </div>
      )}
    </article>
  )
}

function PokelogDecisionCard({ pokemon }) {
  const pokelog = pokemonPokelog(pokemon)
  const stages = pokelogStages(pokemon)
  if (!pokelog || !stages.length) return null
  const finalStage = stages.at(-1)
  return (
    <article className="decision-card pokelog-decision">
      <header><span className="decision-icon"><ClipboardList size={19} /></span><div><small>Progressão</small><strong>Pokélog {pokelog.category}</strong></div></header>
      <div className="pokelog-decision-meta"><span>XP {pokelog.experience_category}</span><span>{stages.length} estágios</span></div>
      <p><small>Meta final</small><strong>{formatNumber(finalStage.quantity_raw || finalStage.required_quantity)}</strong></p>
      <span className="decision-footnote">{formatNumber(finalStage.points_raw || finalStage.points)} pontos no último estágio</span>
    </article>
  )
}

function UtilityDecisionCard({ abilities }) {
  if (!abilities.length) return null
  return (
    <article className="decision-card utility-decision">
      <header><span className="decision-icon"><Package size={19} /></span><div><small>Fora do combate</small><strong>Utilidade</strong></div></header>
      <div className="utility-chips">{abilities.map((ability) => <span key={ability}>{ability}</span>)}</div>
      <span className="decision-footnote">Habilidades publicadas na ficha</span>
    </article>
  )
}

function CaptureDecisionCard({ pokemon, captureBallCatalog }) {
  const capture = pokemonCapture(pokemon)
  if (!capture) return null
  const officialDifficulty = capture.difficulty
  const balls = captureBallEntries(pokemon, captureBallCatalog)
  const ultra = balls.find((ball) => ball.id === 'ultra_ball')
  const reference = ultra || balls.find((ball) => ['poke_ball', 'great_ball', 'super_ball'].includes(ball.id))

  return (
    <article className="decision-card capture-decision">
      <header><span className="decision-icon"><Gauge size={19} /></span><div><small>{officialDifficulty ? 'Dificuldade oficial' : 'Médias de captura'}</small><strong>{officialDifficulty?.label || 'Sem classificação oficial'}</strong></div></header>
      {reference ? (
        <div className="capture-decision-average">
          {reference.image_url ? <img src={reference.image_url} alt="" /> : <CircleDot size={28} />}
          <span><small>{reference.name}</small><strong>{formatNumber(reference.average)}</strong><em>balls em média</em></span>
        </div>
      ) : <div className="decision-empty"><p>Não há média positiva publicada para este registro.</p></div>}
      <span className="decision-footnote">{officialDifficulty ? 'Classificação do Gerenciamento de Captura · ' : ''}A média não representa garantia.</span>
    </article>
  )
}

function DecisionOverview({ pokemon, roleCatalog, captureBallCatalog }) {
  const memberships = pokemon.clan_memberships ?? []
  const clans = pokemonClans(pokemon)
  const tiers = pokemonTiers(pokemon)
  const abilities = asList(pokemon.general_info?.abilities)
  const pve = buildModeSummary(memberships, 'pve')
  const pvp = buildModeSummary(memberships, 'pvp')

  return (
    <Section id="overview" title="Resumo para decisão" icon={<Target size={18} />} description="Onde este Pokémon se encaixa, sem notas ou rankings inventados.">
      <div className="decision-grid">
        <ClassificationCard memberships={memberships} clans={clans} tiers={tiers} />
        <CombatDecisionCard mode="pve" summary={pve} hasMemberships={memberships.length > 0} roleCatalog={roleCatalog} />
        <CombatDecisionCard mode="pvp" summary={pvp} hasMemberships={memberships.length > 0} roleCatalog={roleCatalog} />
        <CaptureDecisionCard pokemon={pokemon} captureBallCatalog={captureBallCatalog} />
        <PokelogDecisionCard pokemon={pokemon} />
        <UtilityDecisionCard abilities={abilities} />
      </div>
    </Section>
  )
}

function normalizedBallName(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function publishedBallLabel(value, catalog) {
  return catalog.find((ball) => normalizedBallName(ball.name) === normalizedBallName(value))?.name || value
}

function CaptureBallGroup({ title, balls }) {
  if (!balls.length) return null
  return (
    <div className="capture-ball-group">
      <h3>{title}</h3>
      <div className="capture-ball-grid">
        {balls.map((ball) => (
          <article className="capture-ball-card" key={ball.id}>
            <span className="capture-ball-art">{ball.image_url ? <img src={ball.image_url} alt="" loading="lazy" /> : <CircleDot size={26} />}</span>
            <div><small>{ball.name}</small><strong>{formatNumber(ball.average)}</strong><span>{Number(ball.average) === 1 ? 'ball em média' : 'balls em média'}</span></div>
          </article>
        ))}
      </div>
    </div>
  )
}

function CaptureSection({ pokemon, catalog, metadata }) {
  const capture = pokemonCapture(pokemon)
  if (!capture) return null
  const balls = captureBallEntries(pokemon, catalog)
  const standardIds = new Set(['poke_ball', 'great_ball', 'super_ball', 'ultra_ball'])
  const standard = balls.filter((ball) => standardIds.has(ball.id))
  const special = balls.filter((ball) => !standardIds.has(ball.id))
  const recommended = capture.recommended_balls ?? []
  const difficultyId = capture.difficulty?.id || 'unknown'

  return (
    <Section id="capture" title="Médias de captura" icon={<Gauge size={18} />} description="Quantidade média de balls publicada pelo projeto comunitário media-pxg.">
      <div className="capture-summary">
        <div className="capture-classification">
          <small>Dificuldade oficial</small>
          <strong className={`capture-difficulty ${difficultyId}`}>{capture.difficulty?.label || 'Não identificada'}</strong>
          <span>{capture.difficulty ? 'Classificação exibida pelo Gerenciamento de Captura do PXG.' : 'Este registro não apareceu na transcrição das listas oficiais fornecidas.'}</span>
          {metadata?.official_difficulty?.documentation_url && <SourceLink href={metadata.official_difficulty.documentation_url}>Entender o sistema</SourceLink>}
        </div>
        <div className="capture-recommendation">
          <small>Balls recomendadas pela fonte</small>
          {recommended.length > 0 ? <div>{recommended.map((ball) => <b key={ball}>{publishedBallLabel(ball, catalog)}</b>)}</div> : <strong>Nenhuma recomendação</strong>}
        </div>
      </div>

      {balls.length > 0 ? (
        <div className="capture-groups">
          <CaptureBallGroup title="Balls padrão" balls={standard} />
          <CaptureBallGroup title="Balls especiais" balls={special} />
        </div>
      ) : (
        <EmptyDetailState icon={<CircleDot size={20} />} title="Sem médias positivas">A fonte preserva este Pokémon, mas não publica uma quantidade média utilizável.</EmptyDetailState>
      )}

      <div className="capture-source-note">
        <Gauge size={17} />
        <p><strong>Use como referência, não como promessa.</strong> {metadata?.warning || 'Os valores são estimativas históricas da comunidade e podem estar desatualizados.'}</p>
        <SourceLink href={metadata?.repository_url}>Ver fonte</SourceLink>
      </div>
    </Section>
  )
}

function PokelogSection({ pokemon }) {
  const pokelog = pokemonPokelog(pokemon)
  const stages = pokelogStages(pokemon)
  const storageKey = `pxg-pokelog-progress:${pokemon.source_url}`
  const [completed, setCompleted] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]')
      return Array.isArray(saved) ? saved : []
    } catch { return [] }
  })

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(completed)) } catch { /* storage is optional */ }
  }, [completed, storageKey])

  if (!pokelog || !stages.length) return null
  const done = stages.filter((_, index) => completed.includes(index)).length
  const percent = Math.round((done / stages.length) * 100)
  const toggle = (index) => setCompleted((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index].sort((a, b) => a - b))
  const rawOrValue = (raw, value) => raw || formatNumber(value)

  return (
    <Section id="pokelog" title="Progresso no Pokélog" icon={<ClipboardList size={18} />} description="Marque seus objetivos; o progresso fica salvo somente neste navegador.">
      <div className="pokelog-summary">
        <div><span>Categoria</span><strong>{pokelog.category}</strong></div>
        <div><span>Experiência</span><strong>{pokelog.experience_category}</strong></div>
        <div className="pokelog-progress-copy"><span>Seu progresso</span><strong>{done}/{stages.length} estágios · {percent}%</strong></div>
      </div>
      <div className="pokelog-progress" aria-label={`${percent}% concluído`}><i style={{ width: `${percent}%` }} /></div>
      {pokemon.scrape_status === 'not_published' && <p className="pokelog-note">Esta forma existe no compilado do Pokélog, mas ainda não possui uma ficha individual publicada na Wiki.</p>}
      <div className="pokelog-stage-grid">
        {stages.map((stage, index) => {
          const isDone = completed.includes(index)
          return (
            <article className={`pokelog-stage ${isDone ? 'completed' : ''}`} key={`${stage.stage}-${index}`}>
              <header>
                <div><small>Estágio</small><strong>{stage.stage}</strong></div>
                <label className="pokelog-check">
                  <input type="checkbox" checked={isDone} onChange={() => toggle(index)} aria-label={`Marcar estágio ${stage.stage} como concluído`} />
                  <span><Check size={15} /></span>
                </label>
              </header>
              <div className="stage-target"><small>Quantidade</small><strong>{rawOrValue(stage.quantity_raw, stage.required_quantity)}</strong></div>
              <footer><span><small>Pontos</small><b>{rawOrValue(stage.points_raw, stage.points)}</b></span><span><small>Experiência</small><b>{rawOrValue(stage.experience_raw, stage.experience)}</b></span></footer>
            </article>
          )
        })}
      </div>
      {done > 0 && <button type="button" className="text-action" onClick={() => setCompleted([])}>Limpar progresso</button>}
    </Section>
  )
}

function TaskOccurrencesSection({ occurrences, tasksById }) {
  const [regionFilter, setRegionFilter] = useState('all')
  if (!occurrences.length) return null
  const grouped = [...occurrences.reduce((groups, occurrence) => {
    const group = groups.get(occurrence.task_id) || { task: tasksById.get(occurrence.task_id), occurrences: [] }
    group.occurrences.push(occurrence)
    groups.set(occurrence.task_id, group)
    return groups
  }, new Map()).values()].sort((a, b) => {
    const region = String(a.task?.region || a.occurrences[0]?.region || '').localeCompare(String(b.task?.region || b.occurrences[0]?.region || ''), 'pt-BR')
    return region || String(a.task?.location || a.occurrences[0]?.location || '').localeCompare(String(b.task?.location || b.occurrences[0]?.location || ''), 'pt-BR')
  })
  const regionOrder = ['kanto', 'johto', 'nightmare_world']
  const regionCounts = grouped.reduce((regions, group) => {
    const region = group.task?.region || group.occurrences[0]?.region
    if (region) regions.set(region, (regions.get(region) || 0) + 1)
    return regions
  }, new Map())
  const regionOptions = regionOrder.map((id) => ({ id, count: regionCounts.get(id) || 0, label: REGION_LABELS[id] }))
  const effectiveRegion = regionFilter === 'all' || regionOptions.some((region) => region.id === regionFilter && region.count > 0) ? regionFilter : 'all'
  const visibleGroups = effectiveRegion === 'all' ? grouped : grouped.filter((group) => (group.task?.region || group.occurrences[0]?.region) === effectiveRegion)

  return (
    <Section id="tasks" title="Tasks relacionadas" icon={<ClipboardList size={18} />} description="Veja onde este Pokémon aparece como objetivo e abra a task completa para consultar todos os passos e recompensas.">
      <div className="pokemon-task-region-filter">
        <span>Filtrar por região</span>
        <div role="group" aria-label="Filtrar tasks relacionadas por região">
          <button type="button" className={effectiveRegion === 'all' ? 'active' : ''} aria-pressed={effectiveRegion === 'all'} onClick={() => setRegionFilter('all')}>Todas<b>{grouped.length}</b></button>
          {regionOptions.map((region) => <button type="button" className={`${effectiveRegion === region.id ? 'active' : ''} region-${region.id}`} aria-pressed={effectiveRegion === region.id} disabled={!region.count} onClick={() => setRegionFilter(region.id)} key={region.id}>{region.label}<b>{region.count}</b></button>)}
        </div>
        <small>{visibleGroups.length} de {grouped.length} {grouped.length === 1 ? 'task' : 'tasks'}</small>
      </div>
      <div className="pokemon-task-grid">
        {visibleGroups.map(({ task, occurrences: taskOccurrences }) => {
          const fallback = taskOccurrences[0]
          const coordinates = task && taskCoordinates(task)
          const level = task && taskLevel(task)
          const nightmareLevel = task && taskNightmareLevel(task)
          return (
            <article className={`pokemon-task-card region-${task?.region || fallback.region}`} key={fallback.task_id}>
              <header>
                <span className="pokemon-task-npc-art">{task?.npc?.image_url ? <img src={task.npc.image_url} alt="" loading="lazy" /> : <ClipboardList size={20} />}</span>
                <div><small>{task ? taskRegionLabel(task) : fallback.region} · {task?.location || fallback.location}</small><strong>{task?.npc?.name || fallback.npc}</strong>{coordinates && <span><MapPin size={11} />{coordinates}</span>}</div>
                <div className="pokemon-task-levels">{level != null && <b>Lv {level}</b>}{nightmareLevel != null && <b className="nightmare">NW {nightmareLevel}</b>}</div>
              </header>
              <div className="pokemon-task-occurrences">
                {taskOccurrences.map((occurrence, index) => (
                  <div key={`${occurrence.step_number}-${occurrence.raw_target}-${index}`}>
                    <span><Route size={13} />Passo {occurrence.step_number}</span>
                    <strong>{taskActionLabel(occurrence.action)}{occurrence.quantity ? ` ${formatTaskNumber(occurrence.quantity)}×` : ''}</strong>
                    <small>{occurrence.raw_target}</small>
                  </div>
                ))}
              </div>
              {task?.rewards?.length > 0 && <div className="pokemon-task-rewards"><span><Gift size={13} />Recompensas</span><p>{task.rewards.slice(0, 3).map((reward, index) => <b key={`${reward.name}-${index}`}>{reward.image_url && <img src={reward.image_url} alt="" loading="lazy" />}{reward.raw || reward.name}</b>)}{task.rewards.length > 3 && <em>+{task.rewards.length - 3}</em>}</p></div>}
              <Link to={`/tasks?task=${encodeURIComponent(fallback.task_id)}`}>Abrir task completa<ChevronRight size={14} /></Link>
            </article>
          )
        })}
      </div>
    </Section>
  )
}

function displayMoveTag(tag) {
  const cleaned = String(tag || '').replace(/\.png$/i, '').replaceAll('_', ' ').trim()
  const key = cleaned.toLowerCase().replaceAll(' ', '')
  const aliases = {
    damage: 'Damage',
    neverboost: 'Never Boost',
    stuck: 'Stuck',
    self: 'Self',
  }
  return aliases[key] || cleaned
}

function moveTagSummary(moves) {
  const counts = new Map()
  moves.flatMap((move) => move.tags ?? []).forEach((tag) => {
    const label = displayMoveTag(tag)
    if (label) counts.set(label, (counts.get(label) || 0) + 1)
  })
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR')).slice(0, 6)
}

function MoveElement({ element }) {
  return element ? <ElementBadge element={element} compact /> : <span className="muted-value">—</span>
}

function MovesSection({ moves }) {
  const availableTabs = ['default', 'pve', 'pvp'].filter((mode) => moves?.[mode]?.length)
  const [active, setActive] = useState(availableTabs[0] || 'default')
  useEffect(() => {
    if (!availableTabs.includes(active)) setActive(availableTabs[0] || 'default')
  }, [active, availableTabs])
  if (!availableTabs.length) return null
  const onlyDefault = availableTabs.length === 1 && availableTabs[0] === 'default'
  const labels = { default: onlyDefault ? 'Moveset compartilhado' : 'Padrão', pve: 'PvE', pvp: 'PvP' }
  const activeMoves = moves[active] || []
  const tagSummary = moveTagSummary(activeMoves)
  const handleTabKeyDown = (event, index) => {
    let nextIndex = null
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % availableTabs.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + availableTabs.length) % availableTabs.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = availableTabs.length - 1
    if (nextIndex === null) return
    event.preventDefault()
    const nextMode = availableTabs[nextIndex]
    setActive(nextMode)
    requestAnimationFrame(() => document.getElementById(`moves-tab-${nextMode}`)?.focus())
  }

  return (
    <Section id="moves" title="Kit de movimentos" icon={<Zap size={18} />} description="Compare slots, elemento, level necessário e cooldown; a Wiki não publica dano ou DPS.">
      <div className="tabs" role="tablist" aria-label="Versão do moveset">
        {availableTabs.map((mode) => (
          <button
            type="button"
            role="tab"
            id={`moves-tab-${mode}`}
            aria-controls="moves-panel"
            aria-selected={active === mode}
            tabIndex={active === mode ? 0 : -1}
            key={mode}
            className={active === mode ? 'active' : ''}
            onClick={() => setActive(mode)}
            onKeyDown={(event) => handleTabKeyDown(event, availableTabs.indexOf(mode))}
          >{labels[mode]}<b>{moves[mode].length}</b></button>
        ))}
      </div>
      <div className="move-kit-summary">
        <div><small>Moveset selecionado</small><strong>{activeMoves.length} movimentos</strong></div>
        {tagSummary.length > 0 && <div className="move-feature-list"><small>Características mais presentes</small><p>{tagSummary.map(([tag, count]) => <span key={tag}>{tag}<b>{count}</b></span>)}</p></div>}
      </div>
      <div id="moves-panel" role="tabpanel" aria-labelledby={`moves-tab-${active}`}>
        <div className="moves-table-wrap">
          <table className="moves-table">
            <thead><tr><th>Slot</th><th>Movimento</th><th>Elemento</th><th>Level</th><th>Cooldown</th><th>Características</th></tr></thead>
            <tbody>
              {activeMoves.map((move, index) => (
                <tr key={`${move.slot}-${move.name}-${index}`}>
                  <td><b className="move-slot">{move.slot}</b></td>
                  <td><strong>{move.name}</strong></td>
                  <td><MoveElement element={move.element} /></td>
                  <td>{move.required_level ?? '—'}</td>
                  <td>{move.cooldown || '—'}</td>
                  <td><div className="tag-list">{move.tags?.map((tag, tagIndex) => <span key={`${tag}-${tagIndex}`}>{displayMoveTag(tag)}</span>)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="move-card-list">
          {activeMoves.map((move, index) => (
            <article className="move-card" key={`${move.slot}-${move.name}-${index}`}>
              <header><b className="move-slot">{move.slot}</b><strong>{move.name}</strong><MoveElement element={move.element} /></header>
              <div className="move-card-facts"><span><small>Level</small><b>{move.required_level ?? '—'}</b></span><span><small>Cooldown</small><b>{move.cooldown || '—'}</b></span></div>
              {move.tags?.length > 0 && <div className="tag-list">{move.tags.map((tag, tagIndex) => <span key={`${tag}-${tagIndex}`}>{displayMoveTag(tag)}</span>)}</div>}
            </article>
          ))}
        </div>
      </div>
    </Section>
  )
}

function effectivenessRows(effectiveness) {
  return Object.entries(effectiveness || {}).flatMap(([key, values]) => {
    if (values && !Array.isArray(values) && typeof values === 'object') {
      return Object.entries(values).map(([nestedKey, nestedValues]) => ({ key: `${key}_${nestedKey}`, values: asList(nestedValues) }))
    }
    return [{ key, values: asList(values) }]
  }).filter((row) => row.values.length)
}

function EffectivenessSection({ name, effectiveness }) {
  const rows = effectivenessRows(effectiveness)
  if (!rows.length) return null
  return (
    <Section id="effectiveness" title="Efetividade elemental" icon={<ShieldCheck size={18} />} description={`Como a Wiki classifica ataques e interações elementais para ${name}.`}>
      <div className="effectiveness-legend"><span><i />Mais efetivo</span><span><i />Neutro</span><span><i />Mais resistente</span></div>
      <div className="effectiveness-grid">
        {rows.map(({ key, values }) => {
          const meta = EFFECTIVENESS_LABELS[key] || { label: humanizeKey(key), tone: 'special' }
          const elements = values.filter((value) => Boolean(ELEMENT_COLORS[normalizedElement(value)]))
          const rules = values.filter((value) => !ELEMENT_COLORS[normalizedElement(value)])
          return (
            <article className={`effectiveness-group ${meta.tone}`} key={key}>
              <header><div><small>Interação</small><strong>{meta.label}</strong></div><b>{values.length}</b></header>
              {elements.length > 0 && <div>{elements.map((element, index) => <ElementBadge key={`${element}-${index}`} element={element} compact />)}</div>}
              {rules.length > 0 && <ul className="effectiveness-rules">{rules.map((rule, index) => <li key={`${String(rule)}-${index}`}>{String(rule)}</li>)}</ul>}
              {!EFFECTIVENESS_LABELS[key] && <p>Regra especial preservada como publicada pela Wiki.</p>}
            </article>
          )
        })}
      </div>
    </Section>
  )
}

const COUNTER_PAGE_SIZE = 6

function normalizedCounterSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

function CounterCard({ recommendation }) {
  const { pokemon, name, level, effectivenessLabel, attackElements, attackMoves, defense } = recommendation
  return (
    <Link className="counter-card" to={pokemonPath(pokemon)} aria-label={`Abrir ficha de ${name}`}>
      <PokemonImage src={pokemonImage(pokemon)} name={name} className="counter-card-image" />
      <div className="counter-card-copy">
        <div className="counter-card-heading">
          <span>{level ? `Level ${level}` : 'Level não informado'}</span>
          <strong>{name}</strong>
        </div>
        <div className="counter-attack-row">
          <small>{effectivenessLabel}</small>
          <div>{attackElements.map((element) => <ElementBadge key={element} element={element} compact />)}</div>
        </div>
        <span className={`counter-defense ${defense.id}`}><i />{defense.label}</span>
        {attackMoves.length > 0 && <small className="counter-moves" title={attackMoves.join(' · ')}>{attackMoves.slice(0, 2).join(' · ')}</small>}
      </div>
      <ChevronRight className="counter-card-arrow" size={17} />
    </Link>
  )
}

function CounterGroup({ id, title, description, recommendations, visibleCount, onShowMore, onShowLess }) {
  const visible = recommendations.slice(0, visibleCount)
  return (
    <div className={`counter-group ${id}`}>
      <header>
        <div><span>{title}</span><p>{description}</p></div>
        <b>{recommendations.length}</b>
      </header>
      {visible.length > 0 ? (
        <>
          <div className="counter-grid">{visible.map((recommendation) => <CounterCard key={recommendation.pokemon.source_url} recommendation={recommendation} />)}</div>
          <div className="counter-group-actions">
            {visibleCount > COUNTER_PAGE_SIZE && <button type="button" onClick={onShowLess}>Mostrar menos</button>}
            {recommendations.length > visibleCount && <button type="button" onClick={onShowMore}>Mostrar mais {Math.min(COUNTER_PAGE_SIZE, recommendations.length - visibleCount)}</button>}
          </div>
        </>
      ) : <p className="counter-group-empty">Nenhum Pokémon desta categoria corresponde aos filtros.</p>}
    </div>
  )
}

function CounterRecommendationsSection({ target, pokemon }) {
  const weaknesses = useMemo(() => counterWeaknesses(target), [target])
  const [mode, setMode] = useState('pve')
  const [query, setQuery] = useState('')
  const [attackElement, setAttackElement] = useState('')
  const [maxLevel, setMaxLevel] = useState('')
  const [safeOnly, setSafeOnly] = useState(false)
  const [visibleCounts, setVisibleCounts] = useState({ strong: COUNTER_PAGE_SIZE, indicated: COUNTER_PAGE_SIZE })
  const recommendations = useMemo(() => buildCounterRecommendations(target, pokemon, mode), [target, pokemon, mode])
  const filtered = useMemo(() => {
    const normalizedQuery = normalizedCounterSearch(query)
    const parsedMaxLevel = maxLevel === '' ? null : Number(maxLevel)
    return recommendations.filter((recommendation) => {
      if (normalizedQuery && !normalizedCounterSearch(recommendation.name).includes(normalizedQuery)) return false
      if (attackElement && !recommendation.attackElements.includes(attackElement)) return false
      if (parsedMaxLevel !== null && (!Number.isFinite(parsedMaxLevel) || recommendation.level === null || recommendation.level > parsedMaxLevel)) return false
      if (safeOnly && !recommendation.defense.safe) return false
      return true
    })
  }, [attackElement, maxLevel, query, recommendations, safeOnly])

  useEffect(() => {
    setVisibleCounts({ strong: COUNTER_PAGE_SIZE, indicated: COUNTER_PAGE_SIZE })
  }, [attackElement, maxLevel, mode, query, safeOnly])

  const groups = {
    strong: filtered.filter((recommendation) => recommendation.group === 'strong'),
    indicated: filtered.filter((recommendation) => recommendation.group === 'indicated'),
  }
  const activeFilterCount = [query, attackElement, maxLevel, safeOnly].filter(Boolean).length
  const resetFilters = () => {
    setQuery('')
    setAttackElement('')
    setMaxLevel('')
    setSafeOnly(false)
  }
  const showMore = (group) => setVisibleCounts((current) => ({ ...current, [group]: current[group] + COUNTER_PAGE_SIZE }))
  const showLess = (group) => setVisibleCounts((current) => ({ ...current, [group]: COUNTER_PAGE_SIZE }))

  return (
    <Section id="counters" title="Pokémon indicados contra este alvo" icon={<Target size={18} />} description="Sugestões calculadas pelos elementos dos movimentos e pela sensibilidade publicada na ficha; a defesa ajuda a ordenar as opções, mas não muda a categoria.">
      {!weaknesses.length ? (
        <EmptyDetailState icon={<ShieldCheck size={20} />} title="Sem sensibilidades ofensivas publicadas">A ficha não informa elementos efetivos, muito efetivos ou super efetivos para montar esta lista.</EmptyDetailState>
      ) : (
        <>
          <div className="counter-method-note">
            <span>Como é calculado</span>
            <p><strong>Muito indicados</strong> usam movimentos muito ou super efetivos. <strong>Indicados</strong> usam movimentos efetivos. Dentro de cada grupo, quem lida melhor com os ataques do alvo aparece primeiro.</p>
          </div>
          <div className="counter-toolbar">
            <div className="counter-mode-switch" role="group" aria-label="Modo de combate">
              {['pve', 'pvp'].map((option) => <button type="button" className={mode === option ? 'active' : ''} aria-pressed={mode === option} onClick={() => setMode(option)} key={option}>{option.toUpperCase()}</button>)}
            </div>
            <label className="counter-search"><span>Buscar Pokémon</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex.: Charizard" /></label>
            <label><span>Elemento de ataque</span><select value={attackElement} onChange={(event) => setAttackElement(event.target.value)}><option value="">Todos</option>{weaknesses.map(({ element }) => <option value={element} key={element}>{element}</option>)}</select></label>
            <label className="counter-level"><span>Meu level</span><input type="number" min="1" max="999" inputMode="numeric" value={maxLevel} onChange={(event) => setMaxLevel(event.target.value)} placeholder="Todos" /></label>
            <button type="button" className={`counter-safe-filter ${safeOnly ? 'active' : ''}`} aria-pressed={safeOnly} onClick={() => setSafeOnly((value) => !value)}><ShieldCheck size={15} />Sem desvantagem</button>
            {activeFilterCount > 0 && <button type="button" className="counter-reset" onClick={resetFilters}>Limpar {activeFilterCount}</button>}
          </div>
          <div className="counter-result-summary"><strong>{filtered.length}</strong> {filtered.length === 1 ? 'opção encontrada' : 'opções encontradas'} para {mode.toUpperCase()}</div>
          <div className="counter-groups">
            <CounterGroup id="strong" title="Muito indicados" description="Movimentos muito ou super efetivos contra este Pokémon." recommendations={groups.strong} visibleCount={visibleCounts.strong} onShowMore={() => showMore('strong')} onShowLess={() => showLess('strong')} />
            <CounterGroup id="indicated" title="Indicados" description="Movimentos efetivos contra este Pokémon." recommendations={groups.indicated} visibleCount={visibleCounts.indicated} onShowMore={() => showMore('indicated')} onShowLess={() => showLess('indicated')} />
          </div>
        </>
      )}
    </Section>
  )
}

function DetailPager({ previous, next }) {
  return (
    <nav className="detail-pager" aria-label="Navegar entre Pokémon">
      {previous ? (
        <Link className="previous" to={pokemonPath(previous)} aria-label={`Pokémon anterior: ${displayName(previous)}`}>
          <ChevronLeft size={18} /><span><small>Anterior</small><strong>{displayName(previous)}</strong></span>
        </Link>
      ) : <span className="pager-placeholder" />}
      {next ? (
        <Link className="next" to={pokemonPath(next)} aria-label={`Próximo Pokémon: ${displayName(next)}`}>
          <span><small>Próximo</small><strong>{displayName(next)}</strong></span><ChevronRight size={18} />
        </Link>
      ) : <span className="pager-placeholder" />}
    </nav>
  )
}

export default function PokemonDetailPage() {
  const { pokemonId: routeId } = useParams()
  const { data, byId, pokemon, roleCatalog, tasksById, captureBallCatalog } = usePokemonData()
  const decodedId = useMemo(() => {
    try { return decodeURIComponent(routeId) } catch { return routeId }
  }, [routeId])
  const entry = byId.get(decodedId)
  const orderedPokemon = useMemo(() => [...pokemon].sort((a, b) => displayName(a).localeCompare(displayName(b), 'pt-BR')), [pokemon])
  const currentIndex = entry ? orderedPokemon.findIndex((candidate) => candidate.source_url === entry.source_url) : -1
  const previous = currentIndex > 0 ? orderedPokemon[currentIndex - 1] : null
  const next = currentIndex >= 0 && currentIndex < orderedPokemon.length - 1 ? orderedPokemon[currentIndex + 1] : null

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [decodedId])

  if (!entry) {
    return <div className="not-found"><BackLink /><h1>Pokémon não encontrado</h1><p>Este registro não existe na base atual.</p></div>
  }

  const name = displayName(entry)
  const levels = pokemonLevels(entry)
  const elements = pokemonElements(entry)
  const clans = pokemonClans(entry)
  const tiers = pokemonTiers(entry)
  const info = entry.general_info || {}
  const isPokelogOnly = entry.scrape_status === 'not_published'
  const versionRecords = (entry.other_versions || []).map((version) => {
    const match = pokemon.find((candidate) => candidate.source_url === version.url)
    return { ...version, match }
  })
  const evolutionRecords = (entry.evolutions || []).map((evolution) => {
    const match = pokemon.find((candidate) => candidate.source_url === evolution.url)
      || pokemon.find((candidate) => displayName(candidate).toLocaleLowerCase('pt-BR') === String(evolution.name || '').toLocaleLowerCase('pt-BR'))
    return { ...evolution, match }
  })
  const hasGeneralInfo = [info.name, info.level, info.boost, info.matter, info.evolution_stone, info.mega_stone, info.evolution_item].some((value) => asList(value).length)
  const hasSidebar = hasGeneralInfo || entry.level_entries?.length > 0 || entry.variants?.length > 0
  const hasMoves = ['default', 'pve', 'pvp'].some((mode) => entry.moves?.[mode]?.length)
  const hasEffectiveness = effectivenessRows(entry.effectiveness).length > 0
  const hasPokelog = pokelogStages(entry).length > 0
  const capture = pokemonCapture(entry)
  const taskOccurrences = entry.task_occurrences ?? []
  const hasTasks = taskOccurrences.length > 0
  const sectionLinks = [
    { id: 'overview', label: 'Resumo' },
    capture && { id: 'capture', label: 'Captura' },
    { id: 'combat', label: 'Clans e funções' },
    hasEffectiveness && { id: 'effectiveness', label: 'Efetividades' },
    hasEffectiveness && { id: 'counters', label: 'Indicações' },
    hasMoves && { id: 'moves', label: 'Movimentos' },
    hasPokelog && { id: 'pokelog', label: 'Pokélog' },
    hasTasks && { id: 'tasks', label: `Tasks (${new Set(taskOccurrences.map((occurrence) => occurrence.task_id)).size})` },
    evolutionRecords.length > 0 && { id: 'evolution', label: 'Evolução' },
    versionRecords.length > 0 && { id: 'versions', label: 'Versões' },
    entry.description && { id: 'description', label: 'Descrição' },
  ].filter(Boolean)
  const detailAccent = ELEMENT_COLORS[elements[0]] || '#62e6a7'

  return (
    <div className="detail-page" style={{ '--detail-accent': detailAccent }}>
      <div className="detail-topline"><BackLink /><DetailPager previous={previous} next={next} /></div>

      <section className={`detail-hero ${isPokelogOnly ? 'pokelog-only' : ''}`}>
        <div className="detail-art">
          <div className="detail-orbit one" /><div className="detail-orbit two" />
          {entry.animated_model ? (
            <PokemonModelViewer model={entry.animated_model} fallbackSrc={pokemonImage(entry)} name={name} />
          ) : (
            <PokemonImage src={pokemonImage(entry)} name={name} className="detail-pokemon-image" />
          )}
        </div>
        <div className="detail-intro">
          <div className="eyebrow"><Sparkles size={14} />{clans.join(' · ') || 'Sem classificação de clan'}</div>
          <h1>{name}</h1>
          {entry.page_title !== name && <p className="source-title">Página: {entry.page_title}</p>}
          <div className="badge-row large">{elements.map((element) => <ElementBadge key={element} element={element} />)}</div>
          <div className="hero-meta-row">
            {levels.length > 0 && <span><Clock3 size={16} />Level {levels.join(' / ')}</span>}
            {tiers.length > 0 && <span><Crown size={16} />Tier {tiers.join(' · ')}</span>}
            {clans.length > 0 && <span><Swords size={16} />{clans.length} {clans.length === 1 ? 'clan' : 'clans'}</span>}
            {capture?.difficulty?.label && <span><Gauge size={16} />Captura {capture.difficulty.label}</span>}
            {hasTasks && <span><ClipboardList size={16} />{new Set(taskOccurrences.map((occurrence) => occurrence.task_id)).size} {new Set(taskOccurrences.map((occurrence) => occurrence.task_id)).size === 1 ? 'task' : 'tasks'}</span>}
          </div>
          <div className="detail-source-row">
            <span className={`data-availability ${isPokelogOnly ? 'partial' : 'complete'}`}><i />{isPokelogOnly ? 'Somente no Pokélog' : 'Ficha publicada'}</span>
            {!isPokelogOnly && <SourceLink href={entry.source_url}>Abrir ficha original</SourceLink>}
            {entry.animated_model?.source_page_url && <SourceLink href={entry.animated_model.source_page_url}>Modelo animado</SourceLink>}
          </div>
        </div>
      </section>

      {isPokelogOnly && (
        <div className="availability-notice"><ClipboardList size={19} /><div><strong>Ficha individual ainda não publicada</strong><p>Esta forma foi catalogada no compilado oficial do Pokélog. Por isso, dados de clan, movimentos e efetividades podem não estar disponíveis.</p></div></div>
      )}

      <nav className="detail-section-nav" aria-label="Seções da ficha">
        <span>Nesta ficha</span>
        <div>{sectionLinks.map((section) => <button type="button" onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} key={section.id}>{section.label}</button>)}</div>
      </nav>

      <div className={`detail-grid ${hasSidebar ? '' : 'no-sidebar'}`}>
        <div className="detail-main">
          <DecisionOverview pokemon={entry} roleCatalog={roleCatalog} captureBallCatalog={captureBallCatalog} />

          <CaptureSection pokemon={entry} catalog={captureBallCatalog} metadata={data?.metadata?.capture_enrichment} />

          <Section id="combat" title="Clans e funções" icon={<Swords size={18} />} description="Cada card preserva a classificação e a disponibilidade publicadas para PvE e PvP.">
            {entry.clan_memberships?.length > 0 ? (
              <div className="membership-grid">{entry.clan_memberships.map((membership, index) => <MembershipCard key={`${membership.clan}-${membership.section}-${index}`} membership={membership} roleCatalog={roleCatalog} />)}</div>
            ) : (
              <EmptyDetailState icon={<Swords size={20} />} title="Sem classificação na tabela de clans">Isso não significa que o Pokémon seja inutilizável; apenas não há tier ou função competitiva publicada para ele.</EmptyDetailState>
            )}
          </Section>

          <EffectivenessSection name={name} effectiveness={entry.effectiveness} />

          {hasEffectiveness && <CounterRecommendationsSection key={entry.source_url} target={entry} pokemon={pokemon} />}

          <MovesSection key={entry.source_url} moves={entry.moves} />

          <PokelogSection key={entry.source_url} pokemon={entry} />

          <TaskOccurrencesSection key={entry.source_url} occurrences={taskOccurrences} tasksById={tasksById} />

          {evolutionRecords.length > 0 && (
            <Section id="evolution" title="Linha evolutiva" icon={<Layers3 size={18} />} description="Use os cards para navegar quando a forma também estiver na base.">
              <div className="evolution-line">
                {evolutionRecords.map((evolution, index) => {
                  const evolutionElements = evolution.match ? pokemonElements(evolution.match) : []
                  const evolutionLevel = evolution.level || (evolution.match && pokemonLevels(evolution.match)[0])
                  const content = <><PokemonImage src={evolution.image_url || (evolution.match && pokemonImage(evolution.match))} name={evolution.name} /><div className="evolution-info"><span>Estágio {String(index + 1).padStart(2, '0')}</span><strong>{evolution.name}</strong><small>{evolutionLevel ? `Level ${evolutionLevel}` : 'Level não informado'}</small>{evolutionElements.length > 0 && <div>{evolutionElements.slice(0, 2).map((element) => <ElementBadge key={element} element={element} compact />)}</div>}</div></>
                  return evolution.match
                    ? <Link className="evolution-item" to={pokemonPath(evolution.match)} key={`${evolution.name}-${index}`}>{content}</Link>
                    : <div className="evolution-item" key={`${evolution.name}-${index}`}>{content}</div>
                })}
              </div>
            </Section>
          )}

          {versionRecords.length > 0 && (
            <Section id="versions" title="Outras versões" icon={<Sparkles size={18} />} description="Compare rapidamente level, elementos e classificação de cada forma.">
              <div className="versions-grid">
                {versionRecords.map((version) => {
                  const versionElements = version.match ? pokemonElements(version.match) : []
                  const versionLevels = version.match ? pokemonLevels(version.match) : []
                  const versionTiers = version.match ? pokemonTiers(version.match) : []
                  const content = <><PokemonImage src={version.image_url || (version.match && pokemonImage(version.match))} name={version.name} /><div className="version-info"><strong>{version.name}</strong><span>{versionLevels.length ? `Lv ${versionLevels.join(' / ')}` : 'Level —'}{versionTiers.length ? ` · ${versionTiers.map(tierLabel).join(' · ')}` : ''}</span><div>{versionElements.slice(0, 2).map((element) => <ElementBadge key={element} element={element} compact />)}</div></div></>
                  return version.match
                    ? <Link className="version-card" to={pokemonPath(version.match)} key={version.url}>{content}</Link>
                    : <a className="version-card" href={version.url} target="_blank" rel="noreferrer" key={version.url}>{content}</a>
                })}
              </div>
            </Section>
          )}

          {entry.description && <Section id="description" title="Descrição da Wiki" icon={<BookOpen size={18} />}><p className="description-text">{entry.description}</p></Section>}

          <DetailPager previous={previous} next={next} />
        </div>

        {hasSidebar && (
          <aside className="detail-sidebar">
            {hasGeneralInfo && (
              <section className="side-card">
                <h2>Ficha rápida</h2>
                <InfoItem label="Nome">{info.name}</InfoItem>
                <InfoItem label="Level">{info.level}</InfoItem>
                <InfoItem label="Boost">{info.boost}</InfoItem>
                <InfoItem label="Matéria">{info.matter}</InfoItem>
                <InfoItem label="Pedra de evolução">{info.evolution_stone}</InfoItem>
                <InfoItem label="Mega Stone">{info.mega_stone}</InfoItem>
                <InfoItem label="Item de evolução">{info.evolution_item}</InfoItem>
              </section>
            )}

            {entry.level_entries?.length > 0 && (
              <section className="side-card">
                <h2>Ocorrências por level</h2>
                <div className="level-occurrences">
                  {entry.level_entries.map((level, index) => <div key={`${level.section}-${index}`}><strong>Level {level.level}</strong><span>{level.display_name}</span><small>{level.accessible ? 'Acessível' : level.note || 'Não acessível'}</small></div>)}
                </div>
              </section>
            )}

            {entry.variants?.length > 0 && (
              <section className="side-card">
                <h2>Variantes</h2>
                {entry.variants.map((variant, index) => <InfoItem key={`${variant.name}-${index}`} label={variant.name || `Variante ${index + 1}`}>Level {variant.level ?? '—'}</InfoItem>)}
              </section>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
