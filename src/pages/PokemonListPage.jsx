import { ArrowDownAZ, Image as ImageIcon, LayoutGrid, List } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import FilterPanel from '../components/FilterPanel'
import { EmptyState } from '../components/Common'
import PokemonCard from '../components/PokemonCard'
import { PokemonQuickViewModal } from '../components/PokemonQuickViewModal'
import { usePokemonData } from '../data/PokemonDataContext'
import { useLanguage } from '../data/LanguageContext'
import { hasStorageConsent } from '../lib/cookieConsent'
import {
  EMPTY_FILTERS,
  activeFilterCount,
  buildFilterOptions,
  matchesPokemon,
  sortPokemon,
} from '../lib/pokemon'

const PAGE_SIZE = 36
const CATALOG_STATE_KEY = 'pxg-catalog-state'
const CATALOG_SCROLL_KEY = 'pxg-catalog-scroll'

function savedCatalogState() {
  try {
    const value = JSON.parse(sessionStorage.getItem(CATALOG_STATE_KEY) || '{}')
    return value && typeof value === 'object' ? value : {}
  } catch { return {} }
}

export default function PokemonListPage() {
  const { t, locale } = useLanguage()
  const { pokemon, roleCatalog } = usePokemonData()
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS, ...(savedCatalogState().filters || {}) }))
  const [visibleCount, setVisibleCount] = useState(() => Math.max(PAGE_SIZE, Number(savedCatalogState().visibleCount) || PAGE_SIZE))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [quickViewPokemon, setQuickViewPokemon] = useState(null)
  const firstFilterRender = useRef(true)
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem('pxg-view-mode') || 'grid' } catch { return 'grid' }
  })
  const options = useMemo(() => buildFilterOptions(pokemon), [pokemon])
  const filtered = useMemo(
    () => sortPokemon(pokemon.filter((entry) => matchesPokemon(entry, filters)), filters.sort),
    [pokemon, filters],
  )

  useEffect(() => {
    if (firstFilterRender.current) {
      firstFilterRender.current = false
      return
    }
    setVisibleCount(PAGE_SIZE)
  }, [filters])
  useEffect(() => {
    try { sessionStorage.setItem(CATALOG_STATE_KEY, JSON.stringify({ filters, visibleCount })) } catch { /* storage is optional */ }
  }, [filters, visibleCount])
  useEffect(() => {
    let frame = null
    try {
      const savedScroll = Number(sessionStorage.getItem(CATALOG_SCROLL_KEY)) || 0
      frame = requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: savedScroll, behavior: 'auto' })))
    } catch { /* storage is optional */ }
    const rememberScroll = () => {
      try { sessionStorage.setItem(CATALOG_SCROLL_KEY, String(window.scrollY)) } catch { /* storage is optional */ }
    }
    window.addEventListener('scroll', rememberScroll, { passive: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      rememberScroll()
      window.removeEventListener('scroll', rememberScroll)
    }
  }, [])
  useEffect(() => {
    if (!hasStorageConsent()) return
    try { localStorage.setItem('pxg-view-mode', viewMode) } catch { /* storage is optional */ }
  }, [viewMode])

  const count = activeFilterCount(filters)

  return (
    <>
      <div className="catalog-layout">
        <FilterPanel
          filters={filters}
          options={options}
          roleCatalog={roleCatalog}
          onChange={setFilters}
          onReset={() => setFilters(EMPTY_FILTERS)}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        <section className="catalog-content">
          <div className="catalog-toolbar">
            <div>
              <span className="toolbar-kicker"><LayoutGrid size={15} />{t('Catálogo')}</span>
              <h2>{filtered.length === 1 ? t('{count} Pokémon encontrado', { count: 1 }) : t('{count} Pokémon encontrados', { count: filtered.length.toLocaleString(locale) })}</h2>
              {count > 0 && <p>{count === 1 ? t('{count} filtro ativo', { count }) : t('{count} filtros ativos', { count })}</p>}
            </div>
            <div className="toolbar-actions">
              <div className="view-switch" role="group" aria-label={t('Modo de visualização')}>
                <button type="button" className={viewMode === 'grid' ? 'active' : ''} aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')} title={t('Grade com cartões')}><LayoutGrid size={15} /><span>{t('Cartões')}</span></button>
                <button type="button" className={viewMode === 'image-list' ? 'active' : ''} aria-pressed={viewMode === 'image-list'} onClick={() => setViewMode('image-list')} title={t('Lista com imagens')}><ImageIcon size={15} /><span>{t('Imagens')}</span></button>
                <button type="button" className={viewMode === 'simple-list' ? 'active' : ''} aria-pressed={viewMode === 'simple-list'} onClick={() => setViewMode('simple-list')} title={t('Lista simples')}><List size={15} /><span>{t('Simples')}</span></button>
              </div>
              <label className="sort-control">
                <ArrowDownAZ size={17} />
                <select value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })}>
                  <option value="name-asc">{t('Nome A–Z')}</option>
                  <option value="name-desc">{t('Nome Z–A')}</option>
                  <option value="level-asc">{t('Menor level')}</option>
                  <option value="level-desc">{t('Maior level')}</option>
                  <option value="dex-asc">{t('Número Dex')}</option>
                </select>
              </label>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState onReset={() => setFilters(EMPTY_FILTERS)} />
          ) : (
            <>
              <div className={`pokemon-grid view-${viewMode}`}>
                {filtered.slice(0, visibleCount).map((entry) => (
                  <PokemonCard key={entry.source_url} pokemon={entry} roleCatalog={roleCatalog} viewMode={viewMode} onSelect={setQuickViewPokemon} />
                ))}
              </div>
              {visibleCount < filtered.length && (
                <div className="load-more">
                  <button className="button secondary" onClick={() => setVisibleCount((value) => value + PAGE_SIZE)}>
                    {t('Carregar mais {count}', { count: Math.min(PAGE_SIZE, filtered.length - visibleCount) })}
                  </button>
                  <span>{t('Exibindo {visible} de {total}', { visible: visibleCount, total: filtered.length.toLocaleString(locale) })}</span>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {quickViewPokemon && (
        <PokemonQuickViewModal pokemon={quickViewPokemon} onClose={() => setQuickViewPokemon(null)} onSelect={setQuickViewPokemon} />
      )}
    </>
  )
}
