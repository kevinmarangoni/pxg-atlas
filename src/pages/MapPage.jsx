import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  LoaderCircle,
  Map as MapIcon,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Target,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { normalizedMapName, useMapData } from '../data/MapDataContext'
import { usePokemonData } from '../data/PokemonDataContext'
import { displayName, pokemonPath } from '../lib/pokemon'

const TILE_SIZE = 256
const MIN_SCALE = 0.35
const MAX_SCALE = 3
const MIN_FLOOR = 0
const MAX_FLOOR = 15
const ORB_STORAGE_KEY = 'pxg-atlas:collected-orbs'

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function locationKey(location) {
  return `${location.type}:${location.id}:${location.x}:${location.y}:${location.z}`
}

function matchesLocation(location, query) {
  if (!query) return true
  return normalizedMapName([
    location.name,
    location.region,
    location.comment,
    location.id,
    location.x,
    location.y,
    location.z,
  ].filter(Boolean).join(' ')).includes(query)
}

function coordinates(location) {
  return `${location.x.toLocaleString('pt-BR')}, ${location.y.toLocaleString('pt-BR')}, ${location.z}`
}

function MapMarker({ location, scale, selected, collected, onSelect }) {
  const [imageFailed, setImageFailed] = useState(false)
  const isMonster = location.type === 'monster'
  return (
    <button
      type="button"
      className={`atlas-map-marker ${location.type} ${selected ? 'selected' : ''} ${collected ? 'collected' : ''}`}
      style={{ left: location.x, top: location.y, '--marker-scale': 1 / scale }}
      aria-label={`${location.name}, coordenadas ${coordinates(location)}`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={() => onSelect(location)}
    >
      {isMonster && location.sprite_url && !imageFailed
        ? <img src={location.sprite_url} alt="" loading="lazy" draggable={false} referrerPolicy="no-referrer" onError={() => setImageFailed(true)} />
        : location.type === 'orb' ? <Sparkles size={17} /> : <MapPin size={17} />}
      <span>{location.name}</span>
    </button>
  )
}

function LocationListItem({ location, selected, collected, onSelect }) {
  const [imageFailed, setImageFailed] = useState(false)
  return (
    <button type="button" className={`map-result-item ${selected ? 'selected' : ''}`} onClick={() => onSelect(location)}>
      <span className={`map-result-art ${location.type} ${collected ? 'collected' : ''}`}>
        {location.type === 'monster' && location.sprite_url && !imageFailed
          ? <img src={location.sprite_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} />
          : location.type === 'orb' ? <Sparkles size={16} /> : <MapPin size={16} />}
      </span>
      <span><strong>{location.name}</strong><small>{location.region} · {coordinates(location)}</small></span>
      <Target size={14} />
    </button>
  )
}

export default function MapPage() {
  const { data, loading, error, monsters, orbs, tilePositionSet: tileSet } = useMapData()
  const { pokemon } = usePokemonData()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialPokemon = searchParams.get('pokemon') || ''
  const [query, setQuery] = useState(initialPokemon)
  const [showMonsters, setShowMonsters] = useState(true)
  const [showOrbs, setShowOrbs] = useState(true)
  const [floor, setFloor] = useState(6)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [view, setView] = useState({ scale: 0.8, x: 0, y: 0 })
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [collectedOrbs, setCollectedOrbs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(ORB_STORAGE_KEY) || '[]')
      return new Set(Array.isArray(saved) ? saved.map(String) : [])
    } catch {
      return new Set()
    }
  })
  const viewportRef = useRef(null)
  const dragRef = useRef(null)
  const initialNavigationRef = useRef(false)

  const pokemonByName = useMemo(() => new Map(pokemon.map((entry) => [normalizedMapName(displayName(entry)), entry])), [pokemon])
  const allLocations = useMemo(() => [
    ...(showMonsters ? monsters.map((location) => ({ ...location, type: 'monster' })) : []),
    ...(showOrbs ? orbs.map((location) => ({ ...location, type: 'orb' })) : []),
  ], [monsters, orbs, showMonsters, showOrbs])
  const normalizedQuery = normalizedMapName(query)
  const matchingLocations = useMemo(
    () => allLocations.filter((location) => matchesLocation(location, normalizedQuery)),
    [allLocations, normalizedQuery],
  )
  const floorLocations = useMemo(
    () => matchingLocations.filter((location) => location.z === floor),
    [floor, matchingLocations],
  )
  const listLocations = useMemo(
    () => (normalizedQuery ? matchingLocations : floorLocations).slice(0, 120),
    [floorLocations, matchingLocations, normalizedQuery],
  )

  useEffect(() => {
    try { localStorage.setItem(ORB_STORAGE_KEY, JSON.stringify([...collectedOrbs])) } catch { /* storage is optional */ }
  }, [collectedOrbs])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return undefined
    const updateSize = () => {
      const rect = viewport.getBoundingClientRect()
      setViewportSize({ width: rect.width, height: rect.height })
    }
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [loading])

  const navigateToLocation = useCallback((location, preferredScale) => {
    if (!location || !viewportSize.width || !viewportSize.height) return
    const scale = clamp(preferredScale ?? Math.max(view.scale, 0.8), MIN_SCALE, MAX_SCALE)
    setFloor(location.z)
    setView({
      scale,
      x: (viewportSize.width / 2) - (location.x * scale),
      y: (viewportSize.height / 2) - (location.y * scale),
    })
  }, [view.scale, viewportSize])

  useEffect(() => {
    if (!data || !viewportSize.width || initialNavigationRef.current) return
    initialNavigationRef.current = true
    const requestedXParam = searchParams.get('x')
    const requestedYParam = searchParams.get('y')
    const requestedZParam = searchParams.get('z')
    const hasRequestedCoordinates = [requestedXParam, requestedYParam, requestedZParam]
      .every((value) => value !== null && value !== '')
    const requestedX = Number(requestedXParam)
    const requestedY = Number(requestedYParam)
    const requestedZ = Number(requestedZParam)
    const requestedPokemon = normalizedMapName(searchParams.get('pokemon'))
    const pokemonLocation = requestedPokemon
      ? monsters.find((location) => normalizedMapName(location.name) === requestedPokemon)
      : null
    const requestedLocation = hasRequestedCoordinates && Number.isFinite(requestedX) && Number.isFinite(requestedY) && Number.isFinite(requestedZ)
      ? { name: searchParams.get('pokemon') || 'Coordenada', x: requestedX, y: requestedY, z: requestedZ, type: 'coordinate', id: 'requested' }
      : pokemonLocation ? { ...pokemonLocation, type: 'monster' } : data.destinations?.find((entry) => entry.name === 'Johto')
    if (requestedLocation) {
      if (requestedLocation.type) setSelectedLocation(requestedLocation)
      navigateToLocation(requestedLocation, 0.9)
    }
  }, [data, monsters, navigateToLocation, searchParams, viewportSize.width])

  const visibleTiles = useMemo(() => {
    if (!viewportSize.width || !viewportSize.height) return []
    const left = -view.x / view.scale
    const top = -view.y / view.scale
    const right = (viewportSize.width - view.x) / view.scale
    const bottom = (viewportSize.height - view.y) / view.scale
    const tiles = []
    for (let x = Math.floor(left / TILE_SIZE) - 1; x <= Math.ceil(right / TILE_SIZE) + 1; x += 1) {
      for (let y = Math.floor(top / TILE_SIZE) - 1; y <= Math.ceil(bottom / TILE_SIZE) + 1; y += 1) {
        if (!tileSet.has(`${floor},${x},${y}`)) continue
        tiles.push({ x, y, src: `${data.metadata.cdn_home}/tile_${floor}_${x}_${y}.png` })
      }
    }
    return tiles
  }, [data, floor, tileSet, view, viewportSize])

  const zoomAt = (factor, screenX = viewportSize.width / 2, screenY = viewportSize.height / 2) => {
    setView((current) => {
      const scale = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE)
      const worldX = (screenX - current.x) / current.scale
      const worldY = (screenY - current.y) / current.scale
      return { scale, x: screenX - (worldX * scale), y: screenY - (worldY * scale) }
    })
  }

  const selectLocation = (location) => {
    setSelectedLocation(location)
    navigateToLocation(location)
    const params = { x: String(location.x), y: String(location.y), z: String(location.z) }
    if (location.type === 'monster') params.pokemon = location.name
    if (location.type === 'orb') params.orb = location.id
    setSearchParams(params, { replace: true })
  }

  const selectDestination = (name) => {
    const destination = data.destinations.find((entry) => entry.name === name)
    if (!destination) return
    setSelectedLocation(null)
    navigateToLocation(destination, 0.75)
  }

  const toggleCollectedOrb = (id) => {
    setCollectedOrbs((current) => {
      const next = new Set(current)
      const key = String(id)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handlePointerDown = (event) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: view.x, y: view.y }
  }

  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setView((current) => ({ ...current, x: drag.x + event.clientX - drag.startX, y: drag.y + event.clientY - drag.startY }))
  }

  const handlePointerUp = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }

  const selectedPokemon = selectedLocation?.type === 'monster' ? pokemonByName.get(normalizedMapName(selectedLocation.name)) : null
  const selectedKey = selectedLocation ? locationKey(selectedLocation) : ''

  if (loading) return <div className="map-state"><LoaderCircle className="spin" size={30} /><strong>Preparando o mapa</strong><span>Carregando tiles, Pokémon e orbs…</span></div>
  if (error || !data) return <div className="map-state error"><MapPin size={30} /><strong>Mapa indisponível</strong><span>{error?.message || 'A base do mapa não foi encontrada.'}</span></div>

  return (
    <div className="atlas-map-page">
      <aside className="atlas-map-sidebar">
        <header>
          <span className="eyebrow"><MapIcon size={14} />Exploração</span>
          <h1>Mapa PXG</h1>
          <p>Encontre Pokémon, acompanhe orbs e navegue pelas coordenadas do jogo.</p>
        </header>

        <label className="map-search-field">
          <span>Buscar no mapa</span>
          <div><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pokémon, região ou coordenada" /></div>
        </label>

        <div className="map-layer-controls" role="group" aria-label="Camadas do mapa">
          <button type="button" className={showMonsters ? 'active monster' : ''} aria-pressed={showMonsters} onClick={() => setShowMonsters((value) => !value)}><MapPin size={14} />Pokémon<b>{monsters.length}</b></button>
          <button type="button" className={showOrbs ? 'active orb' : ''} aria-pressed={showOrbs} onClick={() => setShowOrbs((value) => !value)}><Sparkles size={14} />Orbs<b>{orbs.length}</b></button>
        </div>

        <label className="map-destination-field">
          <span>Ir para</span>
          <select defaultValue="Johto" onChange={(event) => selectDestination(event.target.value)}>{data.destinations.map((destination) => <option key={destination.name}>{destination.name}</option>)}</select>
        </label>

        <div className="map-results-heading">
          <div><strong>{normalizedQuery ? matchingLocations.length : floorLocations.length}</strong><span>{normalizedQuery ? 'resultados' : `marcadores no andar ${floor}`}</span></div>
          {listLocations.length < (normalizedQuery ? matchingLocations.length : floorLocations.length) && <small>Mostrando 120</small>}
        </div>
        <div className="map-results-list">
          {listLocations.map((location) => <LocationListItem key={locationKey(location)} location={location} selected={selectedKey === locationKey(location)} collected={location.type === 'orb' && collectedOrbs.has(String(location.id))} onSelect={selectLocation} />)}
          {!listLocations.length && <div className="map-results-empty"><Search size={19} /><span>Nenhum marcador encontrado.</span></div>}
        </div>

        <footer>
          <span>{data.metadata.counts.tiles.toLocaleString('pt-BR')} tiles · atualização {new Date(data.metadata.synced_at).toLocaleDateString('pt-BR')}</span>
          <a href={data.metadata.source_home} target="_blank" rel="noreferrer">Dados do PXGMap<ExternalLink size={12} /></a>
        </footer>
      </aside>

      <section className="atlas-map-stage" aria-label={`Mapa do andar ${floor}`}>
        <div className="map-coordinate-hud"><span>X <b>{Math.round((-view.x + viewportSize.width / 2) / view.scale).toLocaleString('pt-BR')}</b></span><span>Y <b>{Math.round((-view.y + viewportSize.height / 2) / view.scale).toLocaleString('pt-BR')}</b></span><span>Z <b>{floor}</b></span></div>
        <div className="map-zoom-controls" aria-label="Controles do mapa">
          <button type="button" onClick={() => zoomAt(1.35)} aria-label="Aumentar zoom"><Plus size={18} /></button>
          <button type="button" onClick={() => zoomAt(0.74)} aria-label="Diminuir zoom"><Minus size={18} /></button>
          <button type="button" onClick={() => selectDestination('Johto')} aria-label="Centralizar em Johto"><RotateCcw size={16} /></button>
        </div>
        <div className="map-floor-controls" aria-label="Controle de andar">
          <button type="button" disabled={floor <= MIN_FLOOR} onClick={() => setFloor((value) => Math.max(MIN_FLOOR, value - 1))}><ChevronUp size={16} /><span>Subir</span></button>
          <b>Z {floor}</b>
          <button type="button" disabled={floor >= MAX_FLOOR} onClick={() => setFloor((value) => Math.min(MAX_FLOOR, value + 1))}><ChevronDown size={16} /><span>Descer</span></button>
        </div>

        <div
          ref={viewportRef}
          className="atlas-map-viewport"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={(event) => {
            event.preventDefault()
            const rect = event.currentTarget.getBoundingClientRect()
            zoomAt(event.deltaY < 0 ? 1.12 : 0.89, event.clientX - rect.left, event.clientY - rect.top)
          }}
        >
          <div className="atlas-map-canvas" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
            {visibleTiles.map((tile) => <img className="atlas-map-tile" src={tile.src} alt="" draggable={false} referrerPolicy="no-referrer" width={TILE_SIZE} height={TILE_SIZE} style={{ left: tile.x * TILE_SIZE, top: tile.y * TILE_SIZE }} key={`${floor}-${tile.x}-${tile.y}`} />)}
            {floorLocations.map((location) => <MapMarker key={locationKey(location)} location={location} scale={view.scale} selected={selectedKey === locationKey(location)} collected={location.type === 'orb' && collectedOrbs.has(String(location.id))} onSelect={selectLocation} />)}
          </div>
        </div>

        {selectedLocation && (
          <div className={`map-selection ${selectedLocation.type}`}>
            <span className="map-selection-icon">{selectedLocation.type === 'orb' ? <Sparkles size={18} /> : <MapPin size={18} />}</span>
            <div><small>{selectedLocation.region || 'Coordenada selecionada'}</small><strong>{selectedLocation.name}</strong><span>{coordinates(selectedLocation)}{selectedLocation.comment ? ` · ${selectedLocation.comment}` : ''}</span></div>
            {selectedLocation.type === 'orb' && <button type="button" className={collectedOrbs.has(String(selectedLocation.id)) ? 'collected' : ''} onClick={() => toggleCollectedOrb(selectedLocation.id)}>{collectedOrbs.has(String(selectedLocation.id)) ? 'Coletada' : 'Marcar coletada'}</button>}
            {selectedPokemon && <Link to={pokemonPath(selectedPokemon)}>Abrir ficha</Link>}
          </div>
        )}
      </section>
    </div>
  )
}
