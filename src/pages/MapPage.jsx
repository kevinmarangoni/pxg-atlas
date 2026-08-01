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
const MIN_SCALE = 0.4
const MAX_SCALE = 3
const LEGACY_FLOORS = Array.from({ length: 16 }, (_, index) => index)
const ORB_STORAGE_KEY = 'pxg-atlas:collected-orbs'
const ORB_DESTINATIONS = new Set(['Johto', 'Mt Silver'])

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function locationKey(location) {
  return location.map_uid || `${location.type}:${location.id}:${location.x}:${location.y}:${location.z}`
}

function nearestDestination(destinations, location) {
  if (!destinations?.length || !location) return null
  return destinations.reduce((nearest, destination) => {
    const distance = ((destination.x - location.x) ** 2) + ((destination.y - location.y) ** 2)
    return !nearest || distance < nearest.distance ? { name: destination.name, distance } : nearest
  }, null)?.name
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

function locationBelongsToDestination(location, destination, type) {
  if (type === 'monster') return location.region === destination
  const isMtSilver = String(location.region || '').startsWith('Mt Silver')
  return destination === 'Mt Silver' ? isMtSilver : destination === 'Johto' && !isMtSilver
}

function coordinates(location) {
  return `${location.x.toLocaleString('pt-BR')}, ${location.y.toLocaleString('pt-BR')}, ${location.z}`
}

function locationFloor(location) {
  return Number.isFinite(Number(location?.floor)) ? Number(location.floor) : Number(location?.z) || 0
}

function mapSourceFor(destination, mapSources) {
  return mapSources?.[String(destination || '').trim().toLowerCase()] || null
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
  const { data, loading, error, monsters, orbs, tilePositionSet: tileSet, localTilePositionSet, localTileHome, mapSources } = useMapData()
  const { pokemon } = usePokemonData()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialPokemon = searchParams.get('pokemon') || ''
  const [query, setQuery] = useState(initialPokemon)
  const [activeLayer, setActiveLayer] = useState('monster')
  const [floor, setFloor] = useState(0)
  const [selectedDestination, setSelectedDestination] = useState('Johto')
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })
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
  const destinationOptions = useMemo(
    () => (data?.destinations || []).filter((destination) => activeLayer === 'monster' || ORB_DESTINATIONS.has(destination.name)),
    [activeLayer, data],
  )
  const activeMapSource = useMemo(() => mapSourceFor(selectedDestination, mapSources), [mapSources, selectedDestination])
  const localFocusKey = selectedLocation ? `${floor},${Math.floor(selectedLocation.x / TILE_SIZE)},${Math.floor(selectedLocation.y / TILE_SIZE)}` : null
  const renderFullMap = Boolean(activeMapSource && !(localTileHome && localFocusKey && localTilePositionSet?.has(localFocusKey)))
  const availableFloors = useMemo(() => activeMapSource?.available_floors || LEGACY_FLOORS, [activeMapSource])
  const monsterCount = useMemo(
    () => monsters.filter((location) => locationBelongsToDestination(location, selectedDestination, 'monster')).length,
    [monsters, selectedDestination],
  )
  const orbCount = useMemo(
    () => orbs.filter((location) => locationBelongsToDestination(location, selectedDestination, 'orb')).length,
    [orbs, selectedDestination],
  )
  const regionLocations = useMemo(() => {
    const source = activeLayer === 'monster' ? monsters : orbs
    return source
      .filter((location) => locationBelongsToDestination(location, selectedDestination, activeLayer))
      .map((location) => ({ ...location, type: activeLayer }))
  }, [activeLayer, monsters, orbs, selectedDestination])
  const normalizedQuery = normalizedMapName(query)
  const matchingLocations = useMemo(
    () => regionLocations.filter((location) => matchesLocation(location, normalizedQuery)),
    [normalizedQuery, regionLocations],
  )
  const floorLocations = useMemo(
    () => matchingLocations.filter((location) => locationFloor(location) === floor),
    [floor, matchingLocations],
  )
  const visibleFloorLocations = useMemo(() => {
    if (!viewportSize.width || !viewportSize.height) return []
    const padding = 30 / view.scale
    const left = (-view.x / view.scale) - padding
    const top = (-view.y / view.scale) - padding
    const right = ((viewportSize.width - view.x) / view.scale) + padding
    const bottom = ((viewportSize.height - view.y) / view.scale) + padding
    return floorLocations.filter((location) => location.x >= left && location.x <= right && location.y >= top && location.y <= bottom)
  }, [floorLocations, view, viewportSize])
  const listLocations = useMemo(
    () => (normalizedQuery ? matchingLocations : visibleFloorLocations).slice(0, 120),
    [matchingLocations, normalizedQuery, visibleFloorLocations],
  )
  const resultCount = normalizedQuery ? matchingLocations.length : visibleFloorLocations.length
  const markerLocations = useMemo(() => {
    if (activeLayer === 'orb') {
      const selectedAnchor = selectedLocation
        && locationFloor(selectedLocation) === floor
        && ['destination', 'coordinate'].includes(selectedLocation.type)
        ? selectedLocation
        : null
      return selectedAnchor ? [...visibleFloorLocations, selectedAnchor] : visibleFloorLocations
    }
    if (selectedLocation && locationFloor(selectedLocation) === floor && ['monster', 'destination', 'coordinate'].includes(selectedLocation.type)) {
      return [selectedLocation]
    }
    return []
  }, [activeLayer, floor, selectedLocation, visibleFloorLocations])

  useEffect(() => {
    if (!availableFloors.includes(floor)) setFloor(availableFloors.includes(0) ? 0 : availableFloors[0])
  }, [availableFloors, floor])

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
    setFloor(locationFloor(location))
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
    const requestedLabel = searchParams.get('pokemon') || searchParams.get('npc')
    const requestedRegion = searchParams.get('region')
    const pokemonLocation = requestedPokemon
      ? monsters.find((location) => normalizedMapName(location.name) === requestedPokemon)
      : null
    const regionDestination = data.destinations?.find((entry) => entry.name === requestedRegion)
    const requestedSource = mapSourceFor(requestedRegion || 'Johto', mapSources)
    const defaultDestination = data.destinations?.find((entry) => entry.name === 'Johto')
    const fallbackDestination = regionDestination || defaultDestination
    const defaultFloor = requestedSource?.available_floors?.includes(0) ? 0 : fallbackDestination?.z
    const requestedLocation = hasRequestedCoordinates && Number.isFinite(requestedX) && Number.isFinite(requestedY) && Number.isFinite(requestedZ)
      ? { name: requestedLabel || 'Coordenada', x: requestedX, y: requestedY, z: requestedZ, type: 'coordinate', id: 'requested' }
      : pokemonLocation
        ? { ...pokemonLocation, type: 'monster' }
        : { ...(regionDestination || defaultDestination), z: defaultFloor, floor: defaultFloor, type: 'destination' }
    if (requestedLocation) {
      setSelectedLocation(requestedLocation)
      setSelectedDestination(regionDestination?.name || nearestDestination(data.destinations, requestedLocation) || 'Johto')
      navigateToLocation(requestedLocation, 1)
    }
  }, [data, mapSources, monsters, navigateToLocation, searchParams, viewportSize.width])

  const visibleTiles = useMemo(() => {
    if (renderFullMap || !viewportSize.width || !viewportSize.height) return []
    const left = -view.x / view.scale
    const top = -view.y / view.scale
    const right = (viewportSize.width - view.x) / view.scale
    const bottom = (viewportSize.height - view.y) / view.scale
    const tiles = []
    for (let x = Math.floor(left / TILE_SIZE) - 1; x <= Math.ceil(right / TILE_SIZE) + 1; x += 1) {
      for (let y = Math.floor(top / TILE_SIZE) - 1; y <= Math.ceil(bottom / TILE_SIZE) + 1; y += 1) {
        const key = `${floor},${x},${y}`
        if (!tileSet.has(key)) continue
        const local = localTileHome && localTilePositionSet?.has(key)
        tiles.push({ x, y, src: local ? `${localTileHome}/tile_${floor}_${x}_${y}.png` : `${data.metadata.cdn_home}/tile_${floor}_${x}_${y}.png` })
      }
    }
    return tiles
  }, [data, floor, localTileHome, localTilePositionSet, renderFullMap, tileSet, view, viewportSize])

  const changeFloor = (direction) => {
    const index = availableFloors.indexOf(floor)
    const nextIndex = Math.min(availableFloors.length - 1, Math.max(0, index + direction))
    setFloor(availableFloors[nextIndex] ?? floor)
  }

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
    setSelectedDestination(nearestDestination(data.destinations, location) || selectedDestination)
    navigateToLocation(location)
    const params = { x: String(location.x), y: String(location.y), z: String(location.z) }
    if (location.type === 'monster') params.pokemon = location.name
    if (location.type === 'orb') params.orb = location.id
    setSearchParams(params, { replace: true })
  }

  const selectDestination = (name) => {
    const destination = data.destinations.find((entry) => entry.name === name)
    if (!destination) return
    const source = mapSourceFor(name, mapSources)
    const destinationFloor = source?.available_floors?.includes(0) ? 0 : destination.z
    const destinationLocation = { ...destination, z: destinationFloor, floor: destinationFloor, type: 'destination', id: `destination:${name}`, region: name }
    setSelectedDestination(name)
    setSelectedLocation(destinationLocation)
    setQuery('')
    navigateToLocation(destinationLocation, 1)
    setSearchParams({ region: name }, { replace: true })
  }

  const selectLayer = (layer) => {
    if (layer === activeLayer) return
    setActiveLayer(layer)
    setQuery('')
    if (layer === 'orb' && !ORB_DESTINATIONS.has(selectedDestination)) {
      selectDestination('Johto')
      return
    }
    const destination = data.destinations.find((entry) => entry.name === selectedDestination)
    if (destination) {
      const source = mapSourceFor(destination.name, mapSources)
      const destinationFloor = source?.available_floors?.includes(0) ? 0 : destination.z
      setSelectedLocation({ ...destination, z: destinationFloor, floor: destinationFloor, type: 'destination', id: `destination:${destination.name}`, region: destination.name })
    }
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
          <button type="button" className={activeLayer === 'monster' ? 'active monster' : ''} aria-pressed={activeLayer === 'monster'} onClick={() => selectLayer('monster')}><MapPin size={14} />Pokémon<b>{monsterCount}</b></button>
          <button type="button" className={activeLayer === 'orb' ? 'active orb' : 'orb'} aria-pressed={activeLayer === 'orb'} onClick={() => selectLayer('orb')}><Sparkles size={14} />Orbs<b>{ORB_DESTINATIONS.has(selectedDestination) ? orbCount : 0}</b></button>
        </div>

        <label className="map-destination-field">
          <span>Ir para</span>
          <select value={selectedDestination} onChange={(event) => selectDestination(event.target.value)}>{destinationOptions.map((destination) => <option key={destination.name}>{destination.name}</option>)}</select>
        </label>

        <div className="map-results-heading">
          <div><strong>{resultCount}</strong><span>{normalizedQuery ? 'resultados nesta região' : `posições nesta área · andar ${floor}`}</span></div>
          {listLocations.length < resultCount && <small>Mostrando 120</small>}
        </div>
        <div className="map-results-list">
          {listLocations.map((location) => <LocationListItem key={locationKey(location)} location={location} selected={selectedKey === locationKey(location)} collected={location.type === 'orb' && collectedOrbs.has(String(location.id))} onSelect={selectLocation} />)}
          {!listLocations.length && (
            <div className="map-results-empty">
              <Search size={19} />
              <strong>{regionLocations.length ? 'Nenhum marcador encontrado' : `Sem dados de ${activeLayer === 'monster' ? 'Pokémon' : 'orbs'} em ${selectedDestination}`}</strong>
              <span>{regionLocations.length
                ? 'Tente outro termo, andar ou posição no mapa.'
                : activeLayer === 'monster'
                  ? 'O PXGMap ainda não publica posições de Pokémon para esta região. O mapa e os andares continuam disponíveis.'
                  : 'A fonte publica orbs apenas em Johto e Mt Silver.'}</span>
            </div>
          )}
        </div>

        <footer>
          <span>{data.metadata.counts.tiles.toLocaleString('pt-BR')} tiles · atualização {new Date(data.metadata.synced_at).toLocaleDateString('pt-BR')}</span>
          <a href={activeMapSource?.source_home || data.metadata.source_home} target="_blank" rel="noreferrer">Dados do {activeMapSource ? 'PXGMap Brasil' : 'PXGMap'}<ExternalLink size={12} /></a>
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
          <button type="button" disabled={availableFloors.indexOf(floor) >= availableFloors.length - 1} onClick={() => changeFloor(1)}><ChevronUp size={16} /><span>Subir</span></button>
          <b>Z {floor}</b>
          <button type="button" disabled={availableFloors.indexOf(floor) <= 0} onClick={() => changeFloor(-1)}><ChevronDown size={16} /><span>Descer</span></button>
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
            {renderFullMap && (
              <img
                alt=""
                className="atlas-map-image"
                draggable={false}
                height={activeMapSource.image_height}
                referrerPolicy="no-referrer"
                src={floor === 0 ? activeMapSource.image_url : activeMapSource.floor_image_template.replace('{floor}', String(floor))}
                style={{ left: activeMapSource.world_origin[0], top: activeMapSource.world_origin[1] }}
                width={activeMapSource.image_width}
              />
            )}
            {visibleTiles.map((tile) => <img className="atlas-map-tile" src={tile.src} alt="" draggable={false} referrerPolicy="no-referrer" width={TILE_SIZE} height={TILE_SIZE} style={{ left: tile.x * TILE_SIZE, top: tile.y * TILE_SIZE }} key={`${floor}-${tile.x}-${tile.y}`} />)}
            {markerLocations.map((location) => <MapMarker key={locationKey(location)} location={location} scale={view.scale} selected={selectedKey === locationKey(location)} collected={location.type === 'orb' && collectedOrbs.has(String(location.id))} onSelect={selectLocation} />)}
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
