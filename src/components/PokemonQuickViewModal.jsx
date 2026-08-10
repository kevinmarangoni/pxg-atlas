import { Calculator, CircleDot, ClipboardList, Clock3, Crown, DollarSign, Gauge, Layers3, MapPin, Maximize2, Package, ShieldCheck, Swords, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BoostCalculator } from './BoostCalculator'
import { ElementBadge, PokemonImage } from './Common'
import { ExpansionPanel } from './ExpansionPanel'
import { PokemonLocationOverlay } from './PokemonLocationOverlay'
import { PokemonPriceCalculator } from './PokemonPriceCalculator'
import { useLanguage } from '../data/LanguageContext'
import { normalizedMapName, useMapData } from '../data/MapDataContext'
import { usePokemonData } from '../data/PokemonDataContext'
import { useCatalogData, useLootData } from '../data/DomainData'
import { getAbilityInfo } from '../lib/abilities'
import { findLootPokemon, hasLootRecord, lootChanceLabel, lootChanceWithLucky, lootConfidenceLabel, lootContextLabel, lootLuckyTiers, lootQuantityLabel, lootRateRowsForItem, lootRatesForPokemon, normalizeLootName } from '../lib/loot'
import { parseBoostProfile } from '../lib/boostCalculator'
import {
  EFFECTIVENESS_LABELS,
  ELEMENT_COLORS,
  asList,
  captureBallEntries,
  displayMoveTag,
  displayName,
  effectivenessRows,
  moveTagIconUrl,
  moveTagSummary,
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

function QuickViewMoves({ moves, isOpen, onToggle }) {
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
  const tagSummary = moveTagSummary(activeMoves)

  return (
    <ExpansionPanel
      icon={<Swords size={13} />}
      title={t('Moveset')}
      badge={activeMoves.length}
      headerExtra={tagSummary.length > 0 && (
        <div className="expansion-panel-chip-row">
          {tagSummary.map(([tag, count]) => <span key={tag}>{tag}<b>{count}</b></span>)}
        </div>
      )}
      open={isOpen}
      onToggle={onToggle}
    >
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
    </ExpansionPanel>
  )
}

function QuickViewEvolution({ pokemon, allPokemon, onSelect, isOpen, onToggle }) {
  const { t } = useLanguage()
  const evolutionRecords = useMemo(() => (pokemon.evolutions || []).map((evolution) => {
    const match = allPokemon.find((candidate) => candidate.source_url === evolution.url)
      || allPokemon.find((candidate) => displayName(candidate).toLocaleLowerCase('pt-BR') === String(evolution.name || '').toLocaleLowerCase('pt-BR'))
    return { ...evolution, match }
  }), [pokemon, allPokemon])

  if (!evolutionRecords.length) return null

  return (
    <ExpansionPanel icon={<Layers3 size={13} />} title={t('Linha evolutiva')} badge={evolutionRecords.length} open={isOpen} onToggle={onToggle}>
      <div className="quickview-evolution-line">
        {evolutionRecords.map((evolution, index) => {
          const evolutionLevel = evolution.level || (evolution.match && pokemonLevels(evolution.match)[0])
          const content = (
            <>
              <PokemonImage src={evolution.image_url || (evolution.match && pokemonImage(evolution.match))} name={evolution.name} />
              <div className="quickview-evolution-info">
                <span>{t('Estágio {index}', { index: String(index + 1).padStart(2, '0') })}</span>
                <strong>{evolution.name}</strong>
                <small>{evolutionLevel ? t('Level {level}', { level: evolutionLevel }) : t('Level não informado')}</small>
              </div>
            </>
          )
          return evolution.match ? (
            <button type="button" className="quickview-evolution-item" key={`${evolution.name}-${index}`} onClick={() => onSelect(evolution.match)}>
              {content}
            </button>
          ) : (
            <div className="quickview-evolution-item" key={`${evolution.name}-${index}`}>{content}</div>
          )
        })}
      </div>
    </ExpansionPanel>
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

function QuickViewLoot({ entry, contexts, catalogItems = [], lootData }) {
  const { t } = useLanguage()
  const [selectedContextId, setSelectedContextId] = useState(() => contexts.find((context) => context.context_id === 'normal_world')?.context_id || contexts[0]?.context_id || '')
  const [luckyTier, setLuckyTier] = useState('')
  const catalogById = new Map(catalogItems.map((item) => [item.id, item]))
  const catalogByName = new Map(catalogItems.map((item) => [normalizeLootName(item.name), item]))
  const resolve = (drop) => catalogById.get(drop.item_id) || catalogByName.get(normalizeLootName(drop.item))
  const drops = new Map()
  for (const drop of entry?.drops || []) {
    const key = drop.item_id || normalizeLootName(drop.item)
    drops.set(key, { ...drop, key, rates: [] })
  }
  for (const context of contexts) {
    for (const drop of context.drops || []) {
      const key = drop.item_id || normalizeLootName(drop.item)
      const current = drops.get(key) || { ...drop, key, rates: [] }
      current.rates.push({ context, drop })
      drops.set(key, current)
    }
  }
  const unique = [...drops.values()].slice(0, 10)
  useEffect(() => {
    setSelectedContextId(contexts.find((context) => context.context_id === 'normal_world')?.context_id || contexts[0]?.context_id || '')
  }, [entry, contexts])
  const activeContexts = selectedContextId ? contexts.filter((context) => context.context_id === selectedContextId) : contexts
  const luckyTiers = lootLuckyTiers(lootData)
  const selectedLucky = luckyTiers.find((tier) => tier.tier === Number(luckyTier))
  if (!entry) return <p className="quickview-empty-note">Não há relações de loot publicadas para esta forma.</p>
  return (
    <div className="quickview-loot-browser">
      <div className="quickview-loot-controls">
        <label><span>{t('Local selecionado')}</span><select value={selectedContextId} onChange={(event) => setSelectedContextId(event.target.value)}><option value="">{t('Todos os locais')}</option>{contexts.map((context) => <option value={context.context_id} key={context.context_id}>{lootContextLabel(context.context_id)}</option>)}</select></label>
        <label><span>{t('Held de sorte')}</span><select value={luckyTier} onChange={(event) => setLuckyTier(event.target.value)}><option value="">{t('Sem X-Lucky · taxa base')}</option>{luckyTiers.map((tier) => <option value={tier.tier} key={tier.tier}>{t('X-Lucky T{tier} · +{bonus}%', { tier: tier.tier, bonus: tier.bonus_percent })}</option>)}</select></label>
      </div>
      <div className="quickview-loot-list">
      {unique.map((drop) => {
        const item = resolve(drop)
        const rates = lootRateRowsForItem(activeContexts, drop)
        const meta = rates.length ? rates.map(({ context, drop: rateDrop }) => {
          const calculated = selectedLucky ? lootChanceWithLucky(rateDrop.chance, lootData, selectedLucky.tier) : null
          const effective = calculated ? lootChanceLabel({ type: 'exact_percent', percent: calculated.percent }) : lootChanceLabel(rateDrop.chance)
          const base = calculated ? `${lootChanceLabel(rateDrop.chance)} base` : ''
          const contextLabel = selectedContextId ? '' : lootContextLabel(context.context_id)
          return [effective, base, lootQuantityLabel(rateDrop.quantity), contextLabel].filter(Boolean).join(' · ')
        }).join(' / ') : (selectedContextId || contexts.length ? t('Taxa não publicada') : lootConfidenceLabel(drop.confidence))
        const content = <><span className="quickview-loot-art">{item?.image_url ? <img src={item.image_url} alt="" loading="lazy" /> : <Package size={13} />}</span><span><strong>{drop.item}</strong><small>{meta}</small></span></>
        return item ? <Link to={`/items/${encodeURIComponent(item.id)}`} key={drop.key}>{content}</Link> : <div key={drop.key}>{content}</div>
      })}
      {!unique.length && <p className="quickview-empty-note">Não há itens de loot detalhados para esta forma.</p>}
      </div>
    </div>
  )
}

export function PokemonQuickViewModal({ pokemon, onClose, onSelect = () => {} }) {
  const { t, locale } = useLanguage()
  const { byPokemonName: mapLocationsByPokemon } = useMapData()
  const { pokemon: allPokemon, captureBallCatalog } = usePokemonData()
  const { data: catalogData } = useCatalogData()
  const { data: lootData } = useLootData()
  const [locationTab, setLocationTab] = useState(null)
  const [openPanel, setOpenPanel] = useState('evolution')
  const togglePanel = (panel) => (next) => setOpenPanel(next ? panel : null)
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

  useEffect(() => setLocationTab(null), [pokemon])

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
  const hasBoost = parseBoostProfile(pokemon.general_info?.boost).valid
  const hasEvolution = (pokemon.evolutions || []).length > 0
  const hasPriceCalculator = true
  const hasMiddleColumn = hasMoves || hasBoost || hasEvolution || hasPriceCalculator
  const groups = effectivenessGroups(pokemon.effectiveness)
  const hasEffectiveness = groups.length > 0
  const lootEntry = useMemo(() => findLootPokemon(lootData, [name, pokemon.page_title]), [lootData, name, pokemon.page_title])
  const lootContexts = useMemo(() => lootRatesForPokemon(lootData, lootEntry), [lootData, lootEntry])
  const hasLoot = hasLootRecord(lootEntry, lootContexts)
  const columnCount = 1 + (hasMiddleColumn ? 1 : 0) + (hasEffectiveness ? 1 : 0)

  return (
    <div className="quickview-overlay" onClick={onClose}>
      <div
        className={`quickview-modal quickview-modal--cols-${columnCount}`}
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
                  <span key={ability} className="quickview-ability" data-tooltip={`${ability} — ${t(info.description)}`} aria-label={`${ability} — ${t(info.description)}`}>
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

        {hasMiddleColumn && (
          <div className="quickview-column quickview-attacks">
            {hasMoves && <QuickViewMoves moves={pokemon.moves} isOpen={openPanel === 'moves'} onToggle={togglePanel('moves')} />}
            {hasBoost && (
              <ExpansionPanel icon={<Calculator size={13} />} title={t('Custo para upar')} open={openPanel === 'boost'} onToggle={togglePanel('boost')}>
                <BoostCalculator boost={pokemon.general_info?.boost} matter={pokemon.general_info?.matter} compact />
              </ExpansionPanel>
            )}
            {hasPriceCalculator && (
              <ExpansionPanel icon={<DollarSign size={13} />} title={t('Preço do Pokémon')} open={openPanel === 'pokemon-price'} onToggle={togglePanel('pokemon-price')}>
                <PokemonPriceCalculator pokemonName={name} />
              </ExpansionPanel>
            )}
            {hasEvolution && <QuickViewEvolution pokemon={pokemon} allPokemon={allPokemon} onSelect={onSelect} isOpen={openPanel === 'evolution'} onToggle={togglePanel('evolution')} />}
          </div>
        )}

        {hasEffectiveness && (
          <div className="quickview-column quickview-effectiveness">
            <QuickViewEffectiveness groups={groups} />
          </div>
        )}

        {hasLoot && (
          <div className="quickview-loot-footer">
            <h3 className="quickview-section-title"><Package size={14} />{t('Loot relacionado')}</h3>
            <QuickViewLoot entry={lootEntry} contexts={lootContexts} catalogItems={catalogData?.items} lootData={lootData} />
          </div>
        )}
      </div>

      {locationTab && (
        <PokemonLocationOverlay pokemon={pokemon} initialTab={locationTab} onClose={() => setLocationTab(null)} />
      )}
    </div>
  )
}
