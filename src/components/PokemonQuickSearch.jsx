import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../data/LanguageContext'
import { displayName, pokemonImage, pokemonPath } from '../lib/pokemon'
import { PokemonImage } from './Common'

const MAX_RESULTS = 8

function normalizedSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toLowerCase()
    .trim()
}

export function PokemonQuickSearch({ pokemonList }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef(null)

  const results = useMemo(() => {
    const normalized = normalizedSearch(query)
    if (!normalized) return []
    return pokemonList
      .filter((candidate) => normalizedSearch(displayName(candidate)).includes(normalized))
      .slice(0, MAX_RESULTS)
  }, [pokemonList, query])

  useEffect(() => { setActiveIndex(-1) }, [query])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function goTo(candidate) {
    setQuery('')
    setOpen(false)
    navigate(pokemonPath(candidate))
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') { setOpen(false); return }
    if (!results.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index - 1 + results.length) % results.length)
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      goTo(results[activeIndex])
    }
  }

  return (
    <div className="pokemon-quick-search" ref={containerRef}>
      <div className="search-field">
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true) }}
          onFocus={() => query && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t('Buscar outro Pokémon…')}
          aria-label={t('Buscar outro Pokémon')}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        {query && <button type="button" onClick={() => { setQuery(''); setOpen(false) }} aria-label={t('Limpar pesquisa')}><X size={14} /></button>}
      </div>
      {open && query && (
        <ul className="pokemon-quick-search-results" role="listbox">
          {results.length > 0 ? results.map((candidate, index) => (
            <li key={candidate.source_url}>
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={index === activeIndex ? 'active' : ''}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => goTo(candidate)}
              >
                <PokemonImage src={pokemonImage(candidate)} name={displayName(candidate)} className="pokemon-quick-search-thumb" />
                <span>{displayName(candidate)}</span>
              </button>
            </li>
          )) : (
            <li className="pokemon-quick-search-empty">{t('Nenhum Pokémon encontrado.')}</li>
          )}
        </ul>
      )}
    </div>
  )
}
