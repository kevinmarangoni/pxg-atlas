import { Clock3, Crown, Maximize2, ShieldCheck, Swords, X, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ElementBadge, PokemonImage } from './Common'
import { getAbilityInfo } from '../lib/abilities'
import {
  EFFECTIVENESS_LABELS,
  ELEMENT_COLORS,
  asList,
  displayMoveTag,
  displayName,
  effectivenessRows,
  moveTagIconUrl,
  normalizedElement,
  pokemonAnimatedImage,
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
  const availableTabs = ['default', 'pve', 'pvp'].filter((mode) => moves?.[mode]?.length)
  const [active, setActive] = useState(availableTabs[0] || 'default')

  useEffect(() => {
    if (!availableTabs.includes(active)) setActive(availableTabs[0] || 'default')
  }, [moves]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!availableTabs.length) return null
  const onlyDefault = availableTabs.length === 1 && availableTabs[0] === 'default'
  const labels = { default: onlyDefault ? 'Moveset' : 'Padrão', pve: 'PvE', pvp: 'PvP' }
  const activeMoves = moves[active] || []

  return (
    <>
      <h3 className="quickview-section-title"><Zap size={14} />Ataques</h3>
      {availableTabs.length > 1 && (
        <div className="tabs" role="tablist" aria-label="Versão do moveset">
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
  return (
    <>
      <h3 className="quickview-section-title"><ShieldCheck size={14} />Efetividades</h3>
      <div className="effectiveness-grid quickview-effectiveness-grid">
        {groups.map(({ key, values }) => {
          const meta = EFFECTIVENESS_LABELS[key] || { label: key, tone: 'special' }
          return (
            <article className={`effectiveness-group ${meta.tone}`} key={key}>
              <header><div><small>Interação</small><strong>{meta.label}</strong></div><b>{values.length}</b></header>
              <div>{values.map((element, index) => <ElementBadge key={`${element}-${index}`} element={element} compact />)}</div>
            </article>
          )
        })}
      </div>
    </>
  )
}

export function PokemonQuickViewModal({ pokemon, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

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

  const hasMoves = ['default', 'pve', 'pvp'].some((mode) => pokemon.moves?.[mode]?.length)
  const groups = effectivenessGroups(pokemon.effectiveness)
  const hasEffectiveness = groups.length > 0
  const columnCount = 1 + (hasMoves ? 1 : 0) + (hasEffectiveness ? 1 : 0)

  return (
    <div className="quickview-overlay" onClick={onClose}>
      <div
        className={`quickview-modal quickview-modal--cols-${columnCount}`}
        style={{ '--detail-accent': accent }}
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes rápidos de ${name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="quickview-header-actions">
          <Link className="quickview-goto-link" to={pokemonPath(pokemon)} title="Ficha completa" aria-label="Ir para a ficha completa">
            <Maximize2 size={16} />Ficha completa
          </Link>
          <button type="button" className="icon-button" onClick={onClose} title="Fechar" aria-label="Fechar">
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
                  <span key={ability} className="quickview-ability" title={`${ability} — ${info.description}`}>
                    <Icon size={13} />{ability}
                  </span>
                )
              })}
            </div>
          )}
          {clans.length > 0 && <p className="quickview-fact"><Swords size={13} />{clans.join(' · ')}</p>}
          {tiers.length > 0 && <p className="quickview-fact"><Crown size={13} />{tiers.map(tierLabel).join(' · ')}</p>}
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
      </div>
    </div>
  )
}
