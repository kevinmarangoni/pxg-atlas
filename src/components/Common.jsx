import { ArrowLeft, ClipboardList, Database, ExternalLink, LoaderCircle, SearchX, Shield, Sparkles, Swords } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ELEMENT_COLORS, elementIconUrl, normalizedElement, roleDefinition } from '../lib/pokemon'

export function AppShell({ children, metadata }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="Ir para a Pokédex">
          <span className="brand-mark"><Sparkles size={18} /></span>
          <span>
            <strong>PXG Atlas</strong>
            <small>Pokédex avançada</small>
          </span>
        </Link>
        <nav className="topbar-nav" aria-label="Navegação principal">
          <NavLink to="/" end>Pokédex</NavLink>
          <NavLink to="/tasks"><ClipboardList size={14} />Tasks</NavLink>
          <NavLink to="/team-builder"><Swords size={14} />Montar time</NavLink>
        </nav>
        <div className="topbar-meta">
          <span className="status-dot" />
          {metadata?.total_pokemon_records ? `${metadata.total_pokemon_records.toLocaleString('pt-BR')} Pokémon` : 'Carregando base'}
        </div>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <span><Database size={14} /> Dados públicos da Wiki PokeXGames</span>
        <span>Imagens servidas pela fonte original</span>
      </footer>
    </div>
  )
}

export function DataLoading() {
  return (
    <section className="state-screen" aria-live="polite">
      <div className="loader-orbit"><LoaderCircle size={34} /></div>
      <h1>Preparando a Pokédex</h1>
      <p>Carregando Pokémon, tasks, clans, tiers e funções de combate…</p>
      <div className="loading-lines"><i /><i /><i /></div>
    </section>
  )
}

export function DataError({ error }) {
  return (
    <section className="state-screen error-state">
      <SearchX size={40} />
      <h1>Não foi possível carregar os dados</h1>
      <p>{error.message}</p>
      <button className="button primary" onClick={() => window.location.reload()}>Tentar novamente</button>
    </section>
  )
}

export function PokemonImage({ src, name, className = '' }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const canShowImage = Boolean(src) && failedSrc !== src
  return (
    <div className={`pokemon-image ${className}`}>
      {canShowImage ? (
        <img src={src} alt={name} loading="lazy" onError={() => setFailedSrc(src)} />
      ) : null}
      {!canShowImage && <span className="image-fallback">{name?.slice(0, 1) || '?'}</span>}
    </div>
  )
}

export function ElementIcon({ element }) {
  const normalized = normalizedElement(element)
  const src = elementIconUrl(normalized)
  return src ? <img className="element-icon" src={src} alt="" loading="lazy" /> : <i />
}

export function ElementBadge({ element, compact = false }) {
  const normalized = normalizedElement(element)
  const color = ELEMENT_COLORS[normalized] || '#7d8ba5'
  return (
    <span className={`element-badge ${compact ? 'compact' : ''}`} style={{ '--element': color }}>
      <ElementIcon element={normalized} />{normalized}
    </span>
  )
}

export function RoleIcon({ role, mode, iconUrl, roleCatalog, decorative = false }) {
  const definition = roleDefinition(role, mode, roleCatalog)
  const label = definition.label || role
  const resolvedIcon = iconUrl || definition.iconUrl
  const accessibleLabel = `${label} — ${mode?.toUpperCase() || 'função de combate'}`

  return (
    <span className={`role-icon ${mode || ''}`} title={accessibleLabel} aria-label={decorative ? undefined : accessibleLabel} aria-hidden={decorative || undefined}>
      {resolvedIcon ? <img src={resolvedIcon} alt="" /> : <Shield size={14} />}
    </span>
  )
}

export function RoleBadge({ role, iconUrl, mode, roleCatalog }) {
  const definition = roleDefinition(role, mode, roleCatalog)
  return (
    <span className={`role-badge ${mode || ''}`} title={definition.description || definition.label || role}>
      <RoleIcon role={role} mode={mode} iconUrl={iconUrl} roleCatalog={roleCatalog} decorative />
      <span>{definition.label || role}</span>
      {mode && <small>{mode.toUpperCase()}</small>}
    </span>
  )
}

export function SourceLink({ href, children = 'Ver na wiki' }) {
  if (!href) return null
  return <a className="source-link" href={href} target="_blank" rel="noreferrer">{children}<ExternalLink size={14} /></a>
}

export function BackLink() {
  return <Link className="back-link" to="/"><ArrowLeft size={17} />Voltar para a lista</Link>
}

export function EmptyState({ onReset }) {
  return (
    <div className="empty-results">
      <SearchX size={34} />
      <h2>Nenhum Pokémon por aqui</h2>
      <p>Tente remover alguns filtros ou pesquisar por outro nome.</p>
      <button className="button secondary" onClick={onReset}>Limpar filtros</button>
    </div>
  )
}
