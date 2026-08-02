import { Check, CircleCheck, RotateCcw, Search, Sparkles, Target } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PokemonImage } from '../components/Common'
import { DataStamp, ToolHero } from '../components/ToolCommon'
import { usePokemonData } from '../data/PokemonDataContext'
import { hasStorageConsent } from '../lib/cookieConsent'
import { displayName, pokemonAnimatedImage, pokemonId, pokemonImage, pokemonPath, pokemonPokelog } from '../lib/pokemon'

const STORAGE_KEY = 'pxg-atlas:unown-capture:v1'
const UNOWN_SYMBOLS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '!', '?']
const SYMBOL_ORDER = new Map(UNOWN_SYMBOLS.map((symbol, index) => [symbol, index]))

function unownSymbol(entry) {
  const name = displayName(entry)
  return name.replace(/^Unown\s*/i, '').trim().toUpperCase()
}

function isUnownForm(entry) {
  const name = displayName(entry)
  return /^Unown\s(?:[A-Za-z]|!|\?)$/i.test(name) && Boolean(pokemonPokelog(entry))
}

function readCaptured() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return new Set(Array.isArray(value) ? value.map(String) : [])
  } catch {
    return new Set()
  }
}

export default function UnownTrackerPage() {
  const { pokemon, data } = usePokemonData()
  const [captured, setCaptured] = useState(readCaptured)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('alphabetical')

  const unowns = useMemo(() => pokemon
    .filter(isUnownForm)
    .sort((left, right) => (SYMBOL_ORDER.get(unownSymbol(left)) ?? 99) - (SYMBOL_ORDER.get(unownSymbol(right)) ?? 99)), [pokemon])
  const capturedCount = unowns.filter((entry) => captured.has(pokemonId(entry))).length
  const progress = unowns.length ? Math.round((capturedCount / unowns.length) * 100) : 0
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pt-BR')
    return [...unowns]
      .filter((entry) => {
        const id = pokemonId(entry)
        if (status === 'captured' && !captured.has(id)) return false
        if (status === 'missing' && captured.has(id)) return false
        return !needle || displayName(entry).toLocaleLowerCase('pt-BR').includes(needle) || unownSymbol(entry).toLocaleLowerCase('pt-BR') === needle
      })
      .sort((left, right) => {
        if (sort === 'status') return Number(captured.has(pokemonId(left))) - Number(captured.has(pokemonId(right))) || (SYMBOL_ORDER.get(unownSymbol(left)) ?? 99) - (SYMBOL_ORDER.get(unownSymbol(right)) ?? 99)
        return (SYMBOL_ORDER.get(unownSymbol(left)) ?? 99) - (SYMBOL_ORDER.get(unownSymbol(right)) ?? 99)
      })
  }, [captured, query, sort, status, unowns])

  useEffect(() => {
    if (!hasStorageConsent()) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...captured])) } catch { /* armazenamento local é opcional */ }
  }, [captured])

  const toggle = (entry) => {
    const id = pokemonId(entry)
    setCaptured((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const markAll = () => setCaptured((current) => new Set([...current, ...unowns.map(pokemonId)]))
  const clearAll = () => setCaptured(new Set())

  return (
    <div className="unown-tracker-page page-frame">
      <ToolHero eyebrow="COLEÇÃO ESPECIAL" title="Tracker de Unowns" description="Marque cada forma capturada e acompanhe sua coleção completa sem perder o progresso. Os dados ficam salvos somente neste navegador."><Sparkles size={50} /></ToolHero>
      <DataStamp metadata={data?.metadata} />

      <section className="unown-progress-summary" aria-label="Resumo da coleção de Unowns">
        <div><small>Unowns publicados</small><strong>{unowns.length}</strong></div>
        <div><small>Capturados</small><strong>{capturedCount}/{unowns.length}</strong></div>
        <div><small>Faltam</small><strong>{Math.max(0, unowns.length - capturedCount)}</strong></div>
        <div className="unown-progress-percent"><small>Progresso</small><strong>{progress}%</strong><span><i style={{ width: `${progress}%` }} /></span></div>
      </section>

      <section className="unown-tracker-toolbar">
        <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por letra ou Unown" /></label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar status"><option value="all">Todos</option><option value="missing">Faltando</option><option value="captured">Capturados</option></select>
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Ordenar Unowns"><option value="alphabetical">Ordem alfabética</option><option value="status">Faltantes primeiro</option></select>
        <output>{filtered.length} exibidos</output>
        <div className="unown-tracker-actions"><button type="button" onClick={markAll}><CircleCheck size={14} />Marcar todos</button><button type="button" onClick={clearAll}><RotateCcw size={14} />Limpar</button></div>
      </section>

      <p className="unown-storage-note">O progresso é salvo automaticamente no <code>localStorage</code> deste navegador.</p>

      <div className="unown-grid">
        {filtered.map((entry) => {
          const id = pokemonId(entry)
          const checked = captured.has(id)
          const symbol = unownSymbol(entry)
          return <article className={`unown-card ${checked ? 'captured' : ''}`} key={id}>
            <PokemonImage src={pokemonAnimatedImage(entry) || pokemonImage(entry)} fallbackSrc={pokemonImage(entry)} name={displayName(entry)} className="list-row-image" />
            <div className="unown-card-copy"><span className="unown-card-form">Forma {symbol}</span><strong>{displayName(entry)}</strong><small>Pokélog {pokemonPokelog(entry)?.category || '—'}</small></div>
            <label className="unown-capture-toggle"><input type="checkbox" checked={checked} onChange={() => toggle(entry)} /><span>{checked && <Check size={14} />}</span><b>{checked ? 'Capturado' : 'Marcar captura'}</b></label>
            <footer><Link to={pokemonPath(entry)}><Target size={13} />Abrir ficha</Link></footer>
          </article>
        })}
      </div>
      {!filtered.length && <div className="unown-empty"><Sparkles size={28} /><strong>Nenhum Unown encontrado</strong><p>Remova o filtro ou tente outra letra.</p></div>}
    </div>
  )
}
