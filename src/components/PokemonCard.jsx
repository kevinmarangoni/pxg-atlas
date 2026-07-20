import { ChevronRight, Crown } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  displayName,
  pokemonClans,
  pokemonElements,
  pokemonAnimatedImage,
  pokemonImage,
  pokemonLevels,
  pokemonPath,
  pokemonPokelog,
  pokemonRoles,
  pokemonTiers,
  roleDefinition,
  tierLabel,
} from '../lib/pokemon'
import { ElementBadge, PokemonImage, RoleIcon } from './Common'

function RoleSummary({ mode, roles, roleCatalog }) {
  if (!roles.length) return null
  const labels = roles.map((role) => roleDefinition(role, mode, roleCatalog).label)
  return (
    <div className={`card-role-mode ${mode}`} title={`${mode.toUpperCase()}: ${labels.join(', ')}`}>
      <strong>{mode.toUpperCase()}</strong>
      <div>{roles.slice(0, 3).map((role) => <RoleIcon key={role} role={role} mode={mode} roleCatalog={roleCatalog} />)}</div>
      <span>{labels.join(' · ')}</span>
    </div>
  )
}

function PokelogBadge({ pokemon }) {
  const pokelog = pokemonPokelog(pokemon)
  if (!pokelog) return null
  return <span className="pokelog-badge" title={`Pokélog ${pokelog.category} · Experiência ${pokelog.experience_category}`}>PK {pokelog.category} · XP {pokelog.experience_category}</span>
}

function PokemonListRow({ pokemon, roleCatalog, withImage }) {
  const name = displayName(pokemon)
  const clans = pokemonClans(pokemon)
  const elements = pokemonElements(pokemon)
  const levels = pokemonLevels(pokemon)
  const tiers = pokemonTiers(pokemon)
  const pveRoles = pokemonRoles(pokemon, 'pve')
  const pvpRoles = pokemonRoles(pokemon, 'pvp')
  const dex = pokemon.clan_memberships?.find((entry) => entry.dex_number)?.dex_number
  const staticImage = pokemonImage(pokemon)
  const animatedImage = pokemonAnimatedImage(pokemon)
  const identityLabel = `${dex ? `#${dex} · ` : ''}${clans.join(' · ') || 'Sem clan publicado'}`

  if (!withImage) {
    return (
      <Link className="pokemon-list-row simple" to={pokemonPath(pokemon)}>
        <div className="simple-row-identity">
          <span className="card-kicker" title={identityLabel}>{identityLabel}</span>
          <h2>{name}</h2>
        </div>
        <div className="simple-row-elements">
          {elements.slice(0, 4).map((element) => <ElementBadge key={element} element={element} compact />)}
          <PokelogBadge pokemon={pokemon} />
        </div>
        <div className="list-row-fact simple-level"><small>Level</small><strong>{levels.length ? levels.join(' / ') : '—'}</strong></div>
        <div className="list-row-fact simple-tier"><small>Tier</small><strong>{tiers.length ? tiers.join(' · ') : '—'}</strong></div>
        <div className="simple-row-combat">
          <RoleSummary mode="pve" roles={pveRoles} roleCatalog={roleCatalog} />
          <RoleSummary mode="pvp" roles={pvpRoles} roleCatalog={roleCatalog} />
          {!pveRoles.length && !pvpRoles.length && <span className="no-role">Sem função registrada</span>}
        </div>
        <ChevronRight className="card-arrow" size={18} />
      </Link>
    )
  }

  return (
    <Link className="pokemon-list-row with-image" to={pokemonPath(pokemon)}>
      <PokemonImage src={animatedImage || staticImage} fallbackSrc={staticImage} name={name} className="list-row-image" />
      <div className="list-row-identity">
        <span className="card-kicker">{identityLabel}</span>
        <h2>{name}</h2>
        <div className="badge-row">
          {elements.slice(0, 4).map((element) => <ElementBadge key={element} element={element} compact />)}
          <PokelogBadge pokemon={pokemon} />
        </div>
      </div>
      <div className="list-row-facts">
        <div className="list-row-fact"><small>Level</small><strong>{levels.length ? levels.join(' / ') : '—'}</strong></div>
        <div className="list-row-fact"><small>Tier</small><strong>{tiers.length ? tiers.join(' · ') : '—'}</strong></div>
        <div className="list-row-combat">
          <RoleSummary mode="pve" roles={pveRoles} roleCatalog={roleCatalog} />
          <RoleSummary mode="pvp" roles={pvpRoles} roleCatalog={roleCatalog} />
          {!pveRoles.length && !pvpRoles.length && <span className="no-role">Sem função registrada</span>}
        </div>
      </div>
      <ChevronRight className="card-arrow" size={20} />
    </Link>
  )
}

export default function PokemonCard({ pokemon, roleCatalog, viewMode = 'grid' }) {
  if (viewMode === 'image-list') return <PokemonListRow pokemon={pokemon} roleCatalog={roleCatalog} withImage />
  if (viewMode === 'simple-list') return <PokemonListRow pokemon={pokemon} roleCatalog={roleCatalog} withImage={false} />

  const name = displayName(pokemon)
  const clans = pokemonClans(pokemon)
  const elements = pokemonElements(pokemon)
  const levels = pokemonLevels(pokemon)
  const tiers = pokemonTiers(pokemon)
  const pveRoles = pokemonRoles(pokemon, 'pve')
  const pvpRoles = pokemonRoles(pokemon, 'pvp')
  const staticImage = pokemonImage(pokemon)
  const animatedImage = pokemonAnimatedImage(pokemon)

  return (
    <Link className="pokemon-card" to={pokemonPath(pokemon)}>
      <div className="card-visual">
        <div className="dex-orbit" />
        <PokemonImage src={animatedImage || staticImage} fallbackSrc={staticImage} name={name} className="card-pokemon-image" />
        <div className="card-topline">
          {levels.length > 0 && <span className="level-chip">LV {levels.join(' / ')}</span>}
          {tiers.length > 0 && <span className="tier-chip"><Crown size={12} />{tiers.map(tierLabel).join(' · ')}</span>}
        </div>
      </div>
      <div className="card-body">
        <div className="card-heading">
          <div>
            <span className="card-kicker">{clans.join(' · ') || 'Sem clan publicado'}</span>
            <h2>{name}</h2>
          </div>
          <ChevronRight className="card-arrow" size={20} />
        </div>
        <div className="badge-row">
          {elements.slice(0, 3).map((element) => <ElementBadge key={element} element={element} compact />)}
          <PokelogBadge pokemon={pokemon} />
        </div>
        {(pveRoles.length > 0 || pvpRoles.length > 0) && (
          <div className="card-roles">
            <RoleSummary mode="pve" roles={pveRoles} roleCatalog={roleCatalog} />
            <RoleSummary mode="pvp" roles={pvpRoles} roleCatalog={roleCatalog} />
          </div>
        )}
      </div>
    </Link>
  )
}
