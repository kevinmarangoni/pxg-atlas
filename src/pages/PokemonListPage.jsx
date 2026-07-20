import { ArrowDownAZ, Dices, Image as ImageIcon, LayoutGrid, List, Sparkles, Swords } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import FilterPanel from '../components/FilterPanel'
import { EmptyState } from '../components/Common'
import PokemonCard from '../components/PokemonCard'
import { usePokemonData } from '../data/PokemonDataContext'
import {
  EMPTY_FILTERS,
  activeFilterCount,
  buildFilterOptions,
  matchesPokemon,
  pokemonPath,
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
  const { data, pokemon, roleCatalog } = usePokemonData()
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS, ...(savedCatalogState().filters || {}) }))
  const [visibleCount, setVisibleCount] = useState(() => Math.max(PAGE_SIZE, Number(savedCatalogState().visibleCount) || PAGE_SIZE))
  const [mobileOpen, setMobileOpen] = useState(false)
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
    try { localStorage.setItem('pxg-view-mode', viewMode) } catch { /* storage is optional */ }
  }, [viewMode])

  const randomPokemon = useMemo(() => pokemon[Math.floor(Math.random() * pokemon.length)], [pokemon])
  const clanMeta = data.metadata.clan_enrichment
  const count = activeFilterCount(filters)

  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={14} />Base completa PXG</div>
          <h1>Encontre o Pokémon certo<br /><span>para cada batalha.</span></h1>
          <p>Explore levels, clans, tiers, elementos e funções PvE/PvP em uma única Pokédex.</p>
          <div className="hero-actions">
            {randomPokemon && <Link className="button primary" to={pokemonPath(randomPokemon)}><Dices size={17} />Descobrir um Pokémon</Link>}
            <Link className="button secondary" to="/team-builder"><Swords size={17} />Montar meu time</Link>
          </div>
        </div>
        <div className="hero-stats">
          <div><strong>{data.metadata.total_pokemon_records.toLocaleString('pt-BR')}</strong><span>Pokémon</span></div>
          <div><strong>{clanMeta.total_clans}</strong><span>Clans</span></div>
          <div><strong>{clanMeta.total_tier_entries.toLocaleString('pt-BR')}</strong><span>Entradas de tier</span></div>
        </div>
      </section>

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
              <span className="toolbar-kicker"><LayoutGrid size={15} />Catálogo</span>
              <h2>{filtered.length.toLocaleString('pt-BR')} Pokémon encontrados</h2>
              {count > 0 && <p>{count} {count === 1 ? 'filtro ativo' : 'filtros ativos'}</p>}
            </div>
            <div className="toolbar-actions">
              <div className="view-switch" role="group" aria-label="Modo de visualização">
                <button type="button" className={viewMode === 'grid' ? 'active' : ''} aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')} title="Grade com cartões"><LayoutGrid size={15} /><span>Cartões</span></button>
                <button type="button" className={viewMode === 'image-list' ? 'active' : ''} aria-pressed={viewMode === 'image-list'} onClick={() => setViewMode('image-list')} title="Lista com imagens"><ImageIcon size={15} /><span>Imagens</span></button>
                <button type="button" className={viewMode === 'simple-list' ? 'active' : ''} aria-pressed={viewMode === 'simple-list'} onClick={() => setViewMode('simple-list')} title="Lista simples"><List size={15} /><span>Simples</span></button>
              </div>
              <label className="sort-control">
                <ArrowDownAZ size={17} />
                <select value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })}>
                  <option value="name-asc">Nome A–Z</option>
                  <option value="name-desc">Nome Z–A</option>
                  <option value="level-asc">Menor level</option>
                  <option value="level-desc">Maior level</option>
                  <option value="dex-asc">Número Dex</option>
                </select>
              </label>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState onReset={() => setFilters(EMPTY_FILTERS)} />
          ) : (
            <>
              <div className={`pokemon-grid view-${viewMode}`}>
                {filtered.slice(0, visibleCount).map((entry) => <PokemonCard key={entry.source_url} pokemon={entry} roleCatalog={roleCatalog} viewMode={viewMode} />)}
              </div>
              {visibleCount < filtered.length && (
                <div className="load-more">
                  <button className="button secondary" onClick={() => setVisibleCount((value) => value + PAGE_SIZE)}>
                    Carregar mais {Math.min(PAGE_SIZE, filtered.length - visibleCount)}
                  </button>
                  <span>Exibindo {visibleCount} de {filtered.length.toLocaleString('pt-BR')}</span>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  )
}
