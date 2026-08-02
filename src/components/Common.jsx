import { ArrowLeft, ClipboardList, Database, ExternalLink, Languages, LoaderCircle, Map, Moon, SearchX, Shield, Sparkles, Sun, Swords, Wrench } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { CookieConsentBanner } from './CookieConsentBanner'
import { useLanguage } from '../data/LanguageContext'
import { ELEMENT_COLORS, elementIconUrl, normalizedElement, roleDefinition } from '../lib/pokemon'
import { applyTheme, getStoredTheme } from '../lib/theme'

function ThemeToggle() {
  const { t } = useLanguage()
  const [theme, setTheme] = useState(getStoredTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const isDark = theme === 'dark'
  const label = isDark ? t('Ativar modo claro') : t('Ativar modo escuro')
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={label}
      aria-label={label}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

function LanguageSwitcher() {
  const { t, locale, setLocale, locales } = useLanguage()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const current = locales.find((entry) => entry.id === locale) || locales[0]

  return (
    <div className="language-switcher" ref={containerRef}>
      <button
        type="button"
        className="theme-toggle language-switcher-trigger"
        onClick={() => setOpen((value) => !value)}
        title={t('Idioma')}
        aria-label={t('Idioma')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Languages size={18} />
      </button>
      {open && (
        <ul className="language-switcher-menu" role="listbox" aria-label={t('Idioma')}>
          {locales.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                role="option"
                aria-selected={entry.id === locale}
                className={entry.id === locale ? 'active' : ''}
                onClick={() => { setLocale(entry.id); setOpen(false) }}
              >
                {entry.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function AppShell({ children, metadata }) {
  const { t } = useLanguage()
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label={t('Ir para a Pokédex')}>
          <span className="brand-mark"><Sparkles size={18} /></span>
          <span>
            <strong>PXG Atlas</strong>
            <small>{t('Pokédex avançada')}</small>
          </span>
        </Link>
        <nav className="topbar-nav" aria-label={t('Navegação principal')}>
          <NavLink to="/" end>{t('Pokédex')}</NavLink>
          <NavLink to="/tasks"><ClipboardList size={14} />{t('Tasks')}</NavLink>
          <NavLink to="/map"><Map size={14} />{t('Mapa')}</NavLink>
          <NavLink to="/team-builder"><Swords size={14} />{t('Montar time')}</NavLink>
          <NavLink to="/tools"><Wrench size={14} />{t('Ferramentas')}</NavLink>
        </nav>
        <LanguageSwitcher />
        <ThemeToggle />
      </header>
      <main>{children}</main>
      <footer className="footer">
        <span><Database size={14} /> {t('Dados públicos da Wiki PokeXGames')}</span>
        <nav aria-label={t('Informações e atribuições')}>
          <Link to="/legal">{t('Avisos legais')}</Link>
          <a href="https://projectpokemon.org/home/docs/spriteindex_148/" target="_blank" rel="noreferrer">{t('Modelos animados: Project Pokémon')}</a>
        </nav>
      </footer>
      <CookieConsentBanner />
    </div>
  )
}

export function DataLoading() {
  const { t } = useLanguage()
  return (
    <section className="state-screen" aria-live="polite">
      <div className="loader-orbit"><LoaderCircle size={34} /></div>
      <h1>{t('Preparando a Pokédex')}</h1>
      <p>{t('Carregando Pokémon, tasks, clans, tiers e funções de combate…')}</p>
      <div className="loading-lines"><i /><i /><i /></div>
    </section>
  )
}

export function DataError({ error }) {
  const { t } = useLanguage()
  return (
    <section className="state-screen error-state">
      <SearchX size={40} />
      <h1>{t('Não foi possível carregar os dados')}</h1>
      <p>{error.message}</p>
      <button className="button primary" onClick={() => window.location.reload()}>{t('Tentar novamente')}</button>
    </section>
  )
}

export function PokemonImage({ src, fallbackSrc, name, className = '' }) {
  const [failedSources, setFailedSources] = useState([])
  const sources = [...new Set([src, fallbackSrc].filter(Boolean))]
  const activeSrc = sources.find((candidate) => !failedSources.includes(candidate)) || null
  return (
    <div className={`pokemon-image ${className}`}>
      {activeSrc ? (
        <img src={activeSrc} alt={name} loading="lazy" draggable={false} onError={() => setFailedSources((current) => current.includes(activeSrc) ? current : [...current, activeSrc])} />
      ) : null}
      {!activeSrc && <span className="image-fallback">{name?.slice(0, 1) || '?'}</span>}
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
  const { t } = useLanguage()
  const definition = roleDefinition(role, mode, roleCatalog)
  const label = definition.label || role
  const resolvedIcon = iconUrl || definition.iconUrl
  const accessibleLabel = `${label} — ${mode?.toUpperCase() || t('função de combate')}`

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

export function SourceLink({ href, children }) {
  const { t } = useLanguage()
  if (!href) return null
  return <a className="source-link" href={href} target="_blank" rel="noreferrer">{children || t('Ver na wiki')}<ExternalLink size={14} /></a>
}

export function BackLink() {
  const { t } = useLanguage()
  return <Link className="back-link" to="/"><ArrowLeft size={17} />{t('Voltar para a lista')}</Link>
}

export function EmptyState({ onReset }) {
  const { t } = useLanguage()
  return (
    <div className="empty-results">
      <SearchX size={34} />
      <h2>{t('Nenhum Pokémon por aqui')}</h2>
      <p>{t('Tente remover alguns filtros ou pesquisar por outro nome.')}</p>
      <button className="button secondary" onClick={onReset}>{t('Limpar filtros')}</button>
    </div>
  )
}
