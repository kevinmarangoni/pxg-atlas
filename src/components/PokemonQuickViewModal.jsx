import { CircleDot, ClipboardList, Clock3, Crown, Gauge, Layers3, MapPin, Maximize2, ShieldCheck, Swords, UserRound, X, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ElementBadge, PokemonImage } from './Common'
import { PokemonLocationOverlay } from './PokemonLocationOverlay'
import { PokemonMapPreview } from './PokemonMapPreview'
import { useLanguage } from '../data/LanguageContext'
import { normalizedMapName, useMapData } from '../data/MapDataContext'
import { usePokemonData } from '../data/PokemonDataContext'
import { useNpcObtainedData } from '../data/DomainData'
import { getAbilityInfo } from '../lib/abilities'
import {
  EFFECTIVENESS_LABELS,
  ELEMENT_COLORS,
  asList,
  captureBallEntries,
  displayMoveTag,
  displayName,
  effectivenessRows,
  moveTagIconUrl,
  normalizedElement,
  pokemonAnimatedImage,
  pokemonCapture,
  pokemonClans,
  pokemonElements,
  pokemonImage,
  pokemonLevels,
  pokemonPath,
  pokemonTiers,
  tierLabel,
} from '../lib/pokemon'

function effectivenessGroups(effectiveness) {
  return effectivenessRows(effectiveness)
    .map((row) => ({ ...row, values: row.values.filter((value) => Boolean(ELEMENT_COLORS[normalizedElement(value)])) }))
    .filter((row) => row.values.length)
}

function QuickViewMoves({ moves }) {
  const { t } = useLanguage()
  const availableTabs = ['default', 'pve', 'pvp'].filter((mode) => moves?.[mode]?.length)
  const [active, setActive] = useState(availableTabs[0] || 'default')

  useEffect(() => {
    if (!availableTabs.includes(active)) setActive(availableTabs[0] || 'default')
  }, [moves]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!availableTabs.length) return null
  const onlyDefault = availableTabs.length === 1 && availableTabs[0] === 'default'
  const labels = { default: onlyDefault ? t('Moveset') : t('Padrão'), pve: 'PvE', pvp: 'PvP' }
  const activeMoves = moves[active] || []

  return (
    <>
      <h3 className="quickview-section-title"><Zap size={14} />{t('Ataques')}</h3>
      {availableTabs.length > 1 && (
        <div className="tabs" role="tablist" aria-label={t('Versão do moveset')}>
          {availableTabs.map((mode) => (
            <button
              type="button"
              role="tab"
              aria-selected={active === mode}
              key={mode}
              className={active === mode ? 'active' : ''}
              onClick={() => setActive(mode)}
            >{labels[mode]}<b>{moves[mode].length}</b></button>
          ))}
        </div>
      )}
      <div className="quickview-moves-list">
        {activeMoves.map((move, index) => (
          <div className="quickview-move" key={`${move.slot}-${move.name}-${index}`}>
            <span className="quickview-move-name">{move.name}</span>
            <div className="quickview-move-meta">
              <b className="move-slot">{move.slot}</b>
              {move.element ? <ElementBadge element={move.element} compact /> : <span className="muted-value">—</span>}
              <small>{move.cooldown || ''}</small>
              <small>{move.required_level != null ? `Lv ${move.required_level}` : ''}</small>
              <div className="quickview-move-tags">
                {move.tags?.map((tag, tagIndex) => {
                  const iconUrl = moveTagIconUrl(tag)
                  const label = displayMoveTag(tag)
                  return (
                    <span key={`${tag}-${tagIndex}`} className="quickview-tag-icon" data-tooltip={label}>
                      {iconUrl
                        ? <img src={iconUrl} alt={label} loading="lazy" />
                        : <span className="quickview-move-tag-fallback">{label.slice(0, 1)}</span>}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function QuickViewEffectiveness({ groups }) {
  const { t } = useLanguage()
  return (
    <>
      <h3 className="quickview-section-title"><ShieldCheck size={14} />{t('Efetividades')}</h3>
      <div className="effectiveness-grid quickview-effectiveness-grid">
        {groups.map(({ key, values }) => {
          const meta = EFFECTIVENESS_LABELS[key] || { label: key, tone: 'special' }
          return (
            <article className={`effectiveness-group ${meta.tone}`} key={key}>
              <header><div><small>{t('Interação')}</small><strong>{t(meta.label)}</strong></div><b>{values.length}</b></header>
              <div>{values.map((element, index) => <ElementBadge key={`${element}-${index}`} element={element} compact />)}</div>
            </article>
          )
        })}
      </div>
    </>
  )
}

function npcEntriesFor(data, pokemonName) {
  const target = normalizedMapName(pokemonName)
  return (data?.groups || [])
    .flatMap((group) => (group.entries || []).map((entry) => ({
      ...group,
      ...entry,
      npc: entry.npc || group.npc,
      location: entry.location || group.location,
    })))
    .filter((entry) => normalizedMapName(entry.pokemon) === target)
}

function QuickViewAcquisition({ items }) {
  if (!items.length) return <p className="quickview-empty-note">Não há um modo de obtenção publicado para esta forma.</p>
  return (
    <div className="quickview-obtain-list">
      {items.map((item, index) => (
        <div className="quickview-obtain-item" key={`${item.label}-${index}`}>
          <span>{item.icon}</span>
          <div><strong>{item.label}</strong><small>{item.value}</small>{item.detail && <em>{item.detail}</em>}</div>
        </div>
      ))}
    </div>
  )
}

function QuickViewExtra({ name, mapLocations, mapData, tilePositionSet, localTilePositionSet, localTileHome, acquisitionItems }) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => setSelectedIndex(0), [name, mapLocations.length])

  return (
    <div className={`quickview-extra ${mapLocations.length ? '' : 'quickview-extra--without-map'}`}>
      {mapLocations.length > 0 && (
        <div className="quickview-extra-block quickview-map-block">
          <h3 className="quickview-section-title"><MapPin size={14} />Localização</h3>
          <PokemonMapPreview
            cdnHome={mapData?.metadata?.cdn_home}
            locations={mapLocations}
            name={name}
            onSelect={setSelectedIndex}
            previewScale={0.58}
            selectedIndex={selectedIndex}
            tilePositionSet={tilePositionSet}
            localTilePositionSet={localTilePositionSet}
            localTileHome={localTileHome}
            mapSources={mapData?.map_sources}
          />
        </div>
      )}
      <div className="quickview-extra-block quickview-obtain-block">
        <h3 className="quickview-section-title"><Layers3 size={14} />Como obter</h3>
        <QuickViewAcquisition items={acquisitionItems} />
      </div>
    </div>
  )
}

export function PokemonQuickViewModal({ pokemon, onClose }) {
  const { t, locale } = useLanguage()
  const { data: mapData, byPokemonName: mapLocationsByPokemon, tilePositionSet, localTilePositionSet, localTileHome } = useMapData()
  const { tasksById, captureBallCatalog } = usePokemonData()
  const { data: npcObtainedData } = useNpcObtainedData()
  const [locationTab, setLocationTab] = useState(null)
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      if (locationTab) setLocationTab(null)
      else onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose, locationTab])

  const name = displayName(pokemon)
  const clans = pokemonClans(pokemon)
  const elements = pokemonElements(pokemon)
  const levels = pokemonLevels(pokemon)
  const tiers = pokemonTiers(pokemon)
  const abilities = asList(pokemon.general_info?.abilities)
  const dex = pokemon.clan_memberships?.find((entry) => entry.dex_number)?.dex_number
  const staticImage = pokemonImage(pokemon)
  const animatedImage = pokemonAnimatedImage(pokemon)
  const accent = ELEMENT_COLORS[elements[0]] || '#62e6a7'
  const mapLocations = mapLocationsByPokemon.get(normalizedMapName(name)) ?? []
  const regions = [...new Set(mapLocations.map((location) => location.region).filter(Boolean))]
  const taskCount = new Set((pokemon.task_occurrences ?? []).map((occurrence) => occurrence.task_id)).size
  const capture = pokemonCapture(pokemon)
  const captureBalls = captureBallEntries(pokemon, captureBallCatalog)
  const referenceBall = captureBalls.find((ball) => ball.id === 'ultra_ball')
    || captureBalls.find((ball) => ['poke_ball', 'great_ball', 'super_ball'].includes(ball.id))

  const hasMoves = ['default', 'pve', 'pvp'].some((mode) => pokemon.moves?.[mode]?.length)
  const groups = effectivenessGroups(pokemon.effectiveness)
  const hasEffectiveness = groups.length > 0
  const taskOccurrences = pokemon.task_occurrences ?? []
  const averageBall = referenceBall || captureBalls[0]
  const npcEntries = useMemo(() => npcEntriesFor(npcObtainedData, name), [name, npcObtainedData])
  const acquisitionItems = [
    mapLocations.length > 0 && { label: 'Captura no mapa', value: `${mapLocations.length} ${mapLocations.length === 1 ? 'posição publicada' : 'posições publicadas'}`, detail: mapLocations[0]?.region || 'Localização disponível', icon: <MapPin size={14} /> },
    capture && { label: 'Captura', value: capture.difficulty?.label || 'Dificuldade não classificada', detail: averageBall ? `${averageBall.name}: ${Number(averageBall.average).toLocaleString('pt-BR')} em média` : 'Médias de balls não publicadas', icon: <Gauge size={14} /> },
    taskCount > 0 && { label: 'Tasks', value: `${taskCount} ${taskCount === 1 ? 'task relacionada' : 'tasks relacionadas'}`, detail: tasksById.get(taskOccurrences[0]?.task_id)?.title || tasksById.get(taskOccurrences[0]?.task_id)?.name || 'Objetivo publicado em tasks', icon: <ClipboardList size={14} /> },
    npcEntries.length > 0 && { label: 'Obtido via NPC', value: npcEntries[0].npc || npcEntries[0].title || 'NPC publicado', detail: npcEntries[0].location || 'Local não informado', icon: <UserRound size={14} /> },
    (pokemon.general_info?.evolution_stone || pokemon.general_info?.evolution_item) && { label: 'Evolução', value: pokemon.general_info.evolution_stone || pokemon.general_info.evolution_item, detail: 'Requisito de evolução publicado', icon: <Layers3 size={14} /> },
  ].filter(Boolean)
  const hasExtra = mapLocations.length > 0 || acquisitionItems.length > 0
  const columnCount = 1 + (hasMoves ? 1 : 0) + (hasEffectiveness ? 1 : 0)

  return (
    <div className="quickview-overlay" onClick={onClose}>
      <div
        className={`quickview-modal quickview-modal--cols-${columnCount} ${hasExtra ? 'quickview-modal--with-extra' : ''}`}
        style={{ '--detail-accent': accent }}
        role="dialog"
        aria-modal="true"
        aria-label={t('Detalhes rápidos de {name}', { name })}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="quickview-header-actions">
          <Link className="quickview-goto-link" to={pokemonPath(pokemon)} title={t('Ficha completa')} aria-label={t('Ir para a ficha completa')}>
            <Maximize2 size={16} />{t('Ficha completa')}
          </Link>
          <button type="button" className="icon-button" onClick={onClose} title={t('Fechar')} aria-label={t('Fechar')}>
            <X size={18} />
          </button>
        </div>

        <div className="quickview-identity">
          <PokemonImage src={animatedImage || staticImage} fallbackSrc={staticImage} name={name} className="quickview-image" />
          <h2>{name}</h2>
          <div className="quickview-identity-meta">
            {dex != null && <span>#{String(dex).padStart(3, '0')}</span>}
            {levels.length > 0 && <span><Clock3 size={13} />Lv {levels.join(' / ')}</span>}
          </div>
          <div className="badge-row">{elements.map((element) => <ElementBadge key={element} element={element} />)}</div>
          {abilities.length > 0 && (
            <div className="quickview-abilities">
              {abilities.map((ability) => {
                const info = getAbilityInfo(ability)
                const Icon = info.icon
                return (
                  <span key={ability} className="quickview-ability" title={`${ability} — ${t(info.description)}`}>
                    <Icon size={13} />{ability}
                  </span>
                )
              })}
            </div>
          )}
          {clans.length > 0 && <p className="quickview-fact"><Swords size={13} />{clans.join(' · ')}</p>}
          {tiers.length > 0 && <p className="quickview-fact"><Crown size={13} />{tiers.map(tierLabel).join(' · ')}</p>}
          {(regions.length > 0 || capture) && (
            <div className="quickview-extra-facts">
              {regions.length > 0 && <p className="quickview-fact"><MapPin size={13} />{regions.join(' · ')}</p>}
              {capture?.difficulty?.label && <p className="quickview-fact"><Gauge size={13} />{t('Captura {label}', { label: capture.difficulty.label })}</p>}
              {referenceBall && (
                <p className="quickview-fact">
                  <CircleDot size={13} />
                  {t('{ball}: {average} em média', { ball: referenceBall.name, average: Number(referenceBall.average).toLocaleString(locale) })}
                </p>
              )}
            </div>
          )}
          {(mapLocations.length > 0 || taskCount > 0) && (
            <div className="quickview-location-actions">
              {mapLocations.length > 0 && (
                <button type="button" onClick={() => setLocationTab('map')}>
                  <MapPin size={14} />{t('Ver no mapa')}
                </button>
              )}
              {taskCount > 0 && (
                <button type="button" onClick={() => setLocationTab('tasks')}>
                  <ClipboardList size={14} />{t('Ver tasks')}<b>{taskCount}</b>
                </button>
              )}
            </div>
          )}
        </div>

        {hasMoves && (
          <div className="quickview-column quickview-attacks">
            <QuickViewMoves moves={pokemon.moves} />
          </div>
        )}

        {hasEffectiveness && (
          <div className="quickview-column quickview-effectiveness">
            <QuickViewEffectiveness groups={groups} />
          </div>
        )}

        {hasExtra && <QuickViewExtra name={name} mapLocations={mapLocations} mapData={mapData} tilePositionSet={tilePositionSet} localTilePositionSet={localTilePositionSet} localTileHome={localTileHome} acquisitionItems={acquisitionItems} />}
      </div>

      {locationTab && (
        <PokemonLocationOverlay pokemon={pokemon} initialTab={locationTab} onClose={() => setLocationTab(null)} />
      )}
    </div>
  )
}
