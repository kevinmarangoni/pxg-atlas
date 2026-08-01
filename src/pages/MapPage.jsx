import {
  ChevronDown,
  ChevronUp,
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
const MIN_SCALE = 0.12
const MAX_SCALE = 4
const MARKER_MIN_SCALE = 0.68
const MAX_RENDERED_MARKERS = 160
const ORB_STORAGE_KEY = 'pxg-atlas:collected-orbs'
const JOHTO_DEFAULT_FLOOR = 6
const JOHTO_TILES = { minX: 5, maxX: 15, minY: 115, maxY: 124 }
const JOHTO_BOUNDS = {
  minX: JOHTO_TILES.minX * TILE_SIZE,
  maxX: (JOHTO_TILES.maxX + 1) * TILE_SIZE,
  minY: JOHTO_TILES.minY * TILE_SIZE,
  maxY: (JOHTO_TILES.maxY + 1) * TILE_SIZE,
}
const PLACE_NAME_ALIASES = {
  'ecrutreak city': 'Ecruteak City',
  'new bark': 'New Bark Town',
  'new bark town': 'New Bark Town',
}
const PLACE_LABEL_OFFSETS = {
  'cherrygrove city': { x: 15, y: 65 },
  'violet city': { x: -20, y: -65 },
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function locationKey(location) {
  return location.map_uid || `${location.type}:${location.id}:${location.x}:${location.y}:${location.z}`
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

function locationFloor(location) {
  return Number.isFinite(Number(location?.floor)) ? Number(location.floor) : Number(location?.z) || 0
}

function insideJohto(location) {
  return location
    && location.x >= JOHTO_BOUNDS.minX
    && location.x < JOHTO_BOUNDS.maxX
    && location.y >= JOHTO_BOUNDS.minY
    && location.y < JOHTO_BOUNDS.maxY
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function buildJohtoPlaces(tasks) {
  const groups = new Map()
  for (const task of tasks) {
    const coordinates = task.npc?.coordinates
    if (task.region !== 'johto' || !task.location || !insideJohto(coordinates)) continue
    const normalizedName = normalizedMapName(task.location)
    const name = PLACE_NAME_ALIASES[normalizedName] || String(task.location).trim()
    const key = normalizedMapName(name)
    const group = groups.get(key) || { name, xs: [], ys: [], taskCount: 0 }
    group.xs.push(Number(coordinates.x))
    group.ys.push(Number(coordinates.y))
    group.taskCount += 1
    groups.set(key, group)
  }

  return [...groups.values()].map((group) => {
    const normalizedName = normalizedMapName(group.name)
    const offset = PLACE_LABEL_OFFSETS[normalizedName] || { x: 0, y: 0 }
    const x = median(group.xs)
    const y = median(group.ys)
    return {
      id: `place:${normalizedName.replace(/ /g, '-')}`,
      map_uid: `place:${normalizedName}`,
      name: group.name,
      region: 'Johto',
      x,
      y,
      label_x: x + offset.x,
      label_y: y + offset.y,
      z: JOHTO_DEFAULT_FLOOR,
      floor: JOHTO_DEFAULT_FLOOR,
      type: 'place',
      task_count: group.taskCount,
      comment: `${group.taskCount} ${group.taskCount === 1 ? 'NPC de task catalogado' : 'NPCs de task catalogados'}`,
    }
  }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

function constrainView(nextView, viewport) {
  if (!viewport.width || !viewport.height) return nextView
  const padding = 42
  const scale = clamp(nextView.scale, MIN_SCALE, MAX_SCALE)

  const constrainAxis = (position, minimum, maximum, viewportLength) => {
    const contentLength = (maximum - minimum) * scale
    if (contentLength <= viewportLength - (padding * 2)) {
      return (viewportLength - contentLength) / 2 - (minimum * scale)
    }
    return clamp(position, viewportLength - padding - (maximum * scale), padding - (minimum * scale))
  }

  return {
    scale,
    x: constrainAxis(nextView.x, JOHTO_BOUNDS.minX, JOHTO_BOUNDS.maxX, viewport.width),
    y: constrainAxis(nextView.y, JOHTO_BOUNDS.minY, JOHTO_BOUNDS.maxY, viewport.height),
  }
}

function fitJohtoView(viewport) {
  const width = JOHTO_BOUNDS.maxX - JOHTO_BOUNDS.minX
  const height = JOHTO_BOUNDS.maxY - JOHTO_BOUNDS.minY
  const scale = clamp(Math.min((viewport.width - 84) / width, (viewport.height - 84) / height), MIN_SCALE, 0.72)
  return constrainView({
    scale,
    x: (viewport.width / 2) - (((JOHTO_BOUNDS.minX + JOHTO_BOUNDS.maxX) / 2) * scale),
    y: (viewport.height / 2) - (((JOHTO_BOUNDS.minY + JOHTO_BOUNDS.maxY) / 2) * scale),
  }, viewport)
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

function PlaceLabel({ place, scale, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`atlas-map-place-label ${place.task_count >= 5 ? 'major' : ''} ${selected ? 'selected' : ''}`}
      style={{ left: place.label_x, top: place.label_y, '--label-scale': 1 / scale }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={() => onSelect(place)}
    >
      {place.name}
    </button>
  )
}

export default function MapPage() {
  const { data, loading, error, monsters, orbs, localTilePositionSet, localTileHome } = useMapData()
  const { pokemon, tasks } = usePokemonData()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('pokemon') || '')
  const [activeLayer, setActiveLayer] = useState('monster')
  const [floor, setFloor] = useState(JOHTO_DEFAULT_FLOOR)
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
  const availableFloors = useMemo(() => {
    const floors = new Set()
    for (const [tileFloor, tileX, tileY] of data?.metadata?.local_tile_positions || []) {
      if (tileX >= JOHTO_TILES.minX && tileX <= JOHTO_TILES.maxX && tileY >= JOHTO_TILES.minY && tileY <= JOHTO_TILES.maxY) {
        floors.add(tileFloor)
      }
    }
    return [...floors].sort((a, b) => a - b)
  }, [data])
  const johtoTileCount = useMemo(() => (data?.metadata?.local_tile_positions || []).filter(([, tileX, tileY]) => (
    tileX >= JOHTO_TILES.minX
    && tileX <= JOHTO_TILES.maxX
    && tileY >= JOHTO_TILES.minY
    && tileY <= JOHTO_TILES.maxY
  )).length, [data])
  const johtoMonsters = useMemo(() => monsters.filter((location) => location.region === 'Johto' && insideJohto(location)), [monsters])
  const johtoOrbs = useMemo(() => orbs.filter((location) => !String(location.region || '').startsWith('Mt Silver') && insideJohto(location)), [orbs])
  const johtoPlaces = useMemo(() => buildJohtoPlaces(tasks), [tasks])
  const regionLocations = useMemo(() => {
    const source = activeLayer === 'monster' ? johtoMonsters : johtoOrbs
    return source.map((location) => ({ ...location, type: activeLayer }))
  }, [activeLayer, johtoMonsters, johtoOrbs])
  const normalizedQuery = normalizedMapName(query)
  const matchingLocations = useMemo(() => {
    const layerMatches = regionLocations.filter((location) => matchesLocation(location, normalizedQuery))
    if (!normalizedQuery) return layerMatches
    return [...layerMatches, ...johtoPlaces.filter((place) => matchesLocation(place, normalizedQuery))]
  }, [johtoPlaces, normalizedQuery, regionLocations])
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
    const markers = normalizedQuery || view.scale >= MARKER_MIN_SCALE
      ? visibleFloorLocations.filter((location) => location.type !== 'place').slice(0, MAX_RENDERED_MARKERS)
      : []
    if (selectedLocation?.type !== 'place' && selectedLocation && locationFloor(selectedLocation) === floor) {
      const selectedKey = locationKey(selectedLocation)
      if (!markers.some((location) => locationKey(location) === selectedKey)) return [...markers, selectedLocation]
    }
    return markers
  }, [floor, normalizedQuery, selectedLocation, view.scale, visibleFloorLocations])
  const visiblePlaces = useMemo(() => {
    if (floor !== JOHTO_DEFAULT_FLOOR) return []
    return johtoPlaces.filter((place) => place.task_count >= 3 || view.scale >= 0.62 || selectedLocation?.map_uid === place.map_uid)
  }, [floor, johtoPlaces, selectedLocation, view.scale])

  useEffect(() => {
    if (availableFloors.length && !availableFloors.includes(floor)) {
      setFloor(availableFloors.includes(JOHTO_DEFAULT_FLOOR) ? JOHTO_DEFAULT_FLOOR : availableFloors[0])
    }
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

  useEffect(() => {
    if (!viewportSize.width || !viewportSize.height || !initialNavigationRef.current) return
    setView((current) => constrainView(current, viewportSize))
  }, [viewportSize])

  const navigateToLocation = useCallback((location, preferredScale) => {
    if (!location || !viewportSize.width || !viewportSize.height) return
    const scale = clamp(preferredScale ?? Math.max(view.scale, 0.9), MIN_SCALE, MAX_SCALE)
    setFloor(locationFloor(location))
    setView(constrainView({
      scale,
      x: (viewportSize.width / 2) - (location.x * scale),
      y: (viewportSize.height / 2) - (location.y * scale),
    }, viewportSize))
  }, [view.scale, viewportSize])

  const resetJohtoView = useCallback(() => {
    if (!viewportSize.width || !viewportSize.height) return
    setFloor(JOHTO_DEFAULT_FLOOR)
    setSelectedLocation(null)
    setQuery('')
    setView(fitJohtoView(viewportSize))
    setSearchParams({ region: 'Johto' }, { replace: true })
  }, [setSearchParams, viewportSize])

  useEffect(() => {
    if (!data || !viewportSize.width || initialNavigationRef.current) return
    initialNavigationRef.current = true
    const requestedXParam = searchParams.get('x')
    const requestedYParam = searchParams.get('y')
    const requestedZParam = searchParams.get('z')
    const hasRequestedCoordinates = [requestedXParam, requestedYParam, requestedZParam].every((value) => value !== null && value !== '')
    const requestedX = Number(requestedXParam)
    const requestedY = Number(requestedYParam)
    const requestedZ = Number(requestedZParam)
    const requestedPokemon = normalizedMapName(searchParams.get('pokemon'))
    const requestedPlace = normalizedMapName(searchParams.get('place'))
    const requestedLabel = searchParams.get('pokemon') || searchParams.get('npc') || searchParams.get('place')
    const pokemonLocation = requestedPokemon
      ? johtoMonsters.find((location) => normalizedMapName(location.name) === requestedPokemon)
      : null
    const placeLocation = requestedPlace
      ? johtoPlaces.find((location) => normalizedMapName(location.name) === requestedPlace)
      : null
    const coordinateLocation = hasRequestedCoordinates && Number.isFinite(requestedX) && Number.isFinite(requestedY) && Number.isFinite(requestedZ)
      ? { name: requestedLabel || 'Coordenada', x: requestedX, y: requestedY, z: requestedZ, floor: requestedZ, type: requestedPlace ? 'place' : 'coordinate', id: 'requested', region: 'Johto' }
      : null
    const requestedLocation = insideJohto(coordinateLocation) ? coordinateLocation : pokemonLocation || placeLocation

    if (requestedLocation) {
      setSelectedLocation({ ...requestedLocation, type: requestedLocation.type || 'monster' })
      navigateToLocation(requestedLocation, 1.15)
    } else {
      setFloor(JOHTO_DEFAULT_FLOOR)
      setView(fitJohtoView(viewportSize))
    }
  }, [data, johtoMonsters, johtoPlaces, navigateToLocation, searchParams, viewportSize])

  const visibleTiles = useMemo(() => {
    if (!localTileHome || !viewportSize.width || !viewportSize.height) return []
    const left = Math.max(JOHTO_BOUNDS.minX, -view.x / view.scale)
    const top = Math.max(JOHTO_BOUNDS.minY, -view.y / view.scale)
    const right = Math.min(JOHTO_BOUNDS.maxX, (viewportSize.width - view.x) / view.scale)
    const bottom = Math.min(JOHTO_BOUNDS.maxY, (viewportSize.height - view.y) / view.scale)
    const startX = Math.max(JOHTO_TILES.minX, Math.floor(left / TILE_SIZE) - 1)
    const endX = Math.min(JOHTO_TILES.maxX, Math.ceil(right / TILE_SIZE) + 1)
    const startY = Math.max(JOHTO_TILES.minY, Math.floor(top / TILE_SIZE) - 1)
    const endY = Math.min(JOHTO_TILES.maxY, Math.ceil(bottom / TILE_SIZE) + 1)
    const tiles = []

    for (let tileX = startX; tileX <= endX; tileX += 1) {
      for (let tileY = startY; tileY <= endY; tileY += 1) {
        const key = `${floor},${tileX},${tileY}`
        if (!localTilePositionSet.has(key)) continue
        tiles.push({ tileX, tileY, src: `${localTileHome}/tile_${floor}_${tileX}_${tileY}.png` })
      }
    }
    return tiles
  }, [floor, localTileHome, localTilePositionSet, view, viewportSize])

  const changeFloor = (direction) => {
    const index = availableFloors.indexOf(floor)
    const nextFloor = availableFloors[clamp(index + direction, 0, availableFloors.length - 1)]
    if (!Number.isFinite(nextFloor) || nextFloor === floor) return
    setFloor(nextFloor)
    setSelectedLocation(null)
  }

  const zoomAt = (factor, screenX = viewportSize.width / 2, screenY = viewportSize.height / 2) => {
    setView((current) => {
      const scale = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE)
      const worldX = (screenX - current.x) / current.scale
      const worldY = (screenY - current.y) / current.scale
      return constrainView({ scale, x: screenX - (worldX * scale), y: screenY - (worldY * scale) }, viewportSize)
    })
  }

  const selectLocation = (location) => {
    setSelectedLocation(location)
    navigateToLocation(location)
    const params = { region: 'Johto', x: String(location.x), y: String(location.y), z: String(locationFloor(location)) }
    if (location.type === 'monster') params.pokemon = location.name
    if (location.type === 'orb') params.orb = location.id
    if (location.type === 'place') params.place = location.name
    setSearchParams(params, { replace: true })
  }

  const selectLayer = (layer) => {
    if (layer === activeLayer) return
    setActiveLayer(layer)
    setQuery('')
    setSelectedLocation(null)
    setSearchParams({ region: 'Johto' }, { replace: true })
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
    setView((current) => constrainView({
      ...current,
      x: drag.x + event.clientX - drag.startX,
      y: drag.y + event.clientY - drag.startY,
    }, viewportSize))
  }

  const handlePointerUp = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }

  const selectedPokemon = selectedLocation?.type === 'monster' ? pokemonByName.get(normalizedMapName(selectedLocation.name)) : null
  const selectedKey = selectedLocation ? locationKey(selectedLocation) : ''
  const floorIndex = availableFloors.indexOf(floor)
  const markersHiddenAtOverview = !normalizedQuery && view.scale < MARKER_MIN_SCALE && floorLocations.length > 0

  if (loading) return <div className="map-state"><LoaderCircle className="spin" size={30} /><strong>Preparando Johto</strong><span>Carregando os tiles do minimap.otmm…</span></div>
  if (error || !data) return <div className="map-state error"><MapPin size={30} /><strong>Mapa indisponível</strong><span>{error?.message || 'A base do mapa não foi encontrada.'}</span></div>
  if (!localTileHome || !localTilePositionSet.size) return <div className="map-state error"><MapPin size={30} /><strong>OTMM indisponível</strong><span>Os tiles locais de Johto não foram encontrados. O mapa antigo não será usado como fallback.</span></div>

  return (
    <div className="atlas-map-page">
      <aside className="atlas-map-sidebar">
        <header>
          <span className="eyebrow"><MapIcon size={14} />Exploração</span>
          <h1>Mapa de Johto</h1>
          <p>Navegue pelo mapa real do jogo, com localidades cruzadas pelas coordenadas das tasks.</p>
        </header>

        <label className="map-search-field">
          <span>Buscar em Johto</span>
          <div><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pokémon, local ou coordenada" /></div>
        </label>

        <div className="map-layer-controls" role="group" aria-label="Camadas do mapa">
          <button type="button" className={activeLayer === 'monster' ? 'active monster' : ''} aria-pressed={activeLayer === 'monster'} onClick={() => selectLayer('monster')}><MapPin size={14} />Pokémon<b>{johtoMonsters.length}</b></button>
          <button type="button" className={activeLayer === 'orb' ? 'active orb' : 'orb'} aria-pressed={activeLayer === 'orb'} onClick={() => selectLayer('orb')}><Sparkles size={14} />Orbs<b>{johtoOrbs.length}</b></button>
        </div>

        <div className="map-region-card">
          <span><MapIcon size={16} /></span>
          <div><small>Região ativa</small><strong>Johto</strong></div>
          <b>OTMM</b>
        </div>

        <div className="map-results-heading">
          <div><strong>{resultCount}</strong><span>{normalizedQuery ? 'resultados em Johto' : `posições visíveis · andar ${floor}`}</span></div>
          {listLocations.length < resultCount && <small>Mostrando 120</small>}
        </div>
        <div className="map-results-list">
          {listLocations.map((location) => <LocationListItem key={locationKey(location)} location={location} selected={selectedKey === locationKey(location)} collected={location.type === 'orb' && collectedOrbs.has(String(location.id))} onSelect={selectLocation} />)}
          {!listLocations.length && (
            <div className="map-results-empty">
              <Search size={19} />
              <strong>Nenhum marcador encontrado</strong>
              <span>Tente outro termo, andar ou posição dentro de Johto.</span>
            </div>
          )}
        </div>

        <footer>
          <span>{johtoTileCount.toLocaleString('pt-BR')} tiles de Johto · {availableFloors.length} andares disponíveis</span>
          <strong>Fonte visual: minimap.otmm</strong>
        </footer>
      </aside>

      <section className="atlas-map-stage" aria-label={`Mapa OTMM de Johto no andar ${floor}`}>
        <div className="map-coordinate-hud"><span>X <b>{Math.round((-view.x + viewportSize.width / 2) / view.scale).toLocaleString('pt-BR')}</b></span><span>Y <b>{Math.round((-view.y + viewportSize.height / 2) / view.scale).toLocaleString('pt-BR')}</b></span><span>Z <b>{floor}</b></span></div>
        <div className="map-zoom-controls" aria-label="Controles do mapa">
          <button type="button" onClick={() => zoomAt(1.35)} aria-label="Aumentar zoom"><Plus size={18} /></button>
          <button type="button" onClick={() => zoomAt(0.74)} aria-label="Diminuir zoom"><Minus size={18} /></button>
          <button type="button" onClick={resetJohtoView} aria-label="Enquadrar Johto"><RotateCcw size={16} /></button>
        </div>
        <div className="map-floor-controls" aria-label="Controle de andar">
          <button type="button" disabled={floorIndex <= 0} onClick={() => changeFloor(-1)}><ChevronUp size={16} /><span>Subir</span></button>
          <b>Z {floor}</b>
          <button type="button" disabled={floorIndex < 0 || floorIndex >= availableFloors.length - 1} onClick={() => changeFloor(1)}><ChevronDown size={16} /><span>Descer</span></button>
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
            <div
              className="atlas-map-world"
              style={{
                left: JOHTO_BOUNDS.minX,
                top: JOHTO_BOUNDS.minY,
                width: JOHTO_BOUNDS.maxX - JOHTO_BOUNDS.minX,
                height: JOHTO_BOUNDS.maxY - JOHTO_BOUNDS.minY,
              }}
            />
            {visibleTiles.map((tile) => <img className="atlas-map-tile" src={tile.src} alt="" draggable={false} width={TILE_SIZE} height={TILE_SIZE} style={{ left: tile.tileX * TILE_SIZE, top: tile.tileY * TILE_SIZE }} key={`${floor}-${tile.tileX}-${tile.tileY}`} />)}
            {visiblePlaces.map((place) => <PlaceLabel key={place.map_uid} place={place} scale={view.scale} selected={selectedKey === place.map_uid} onSelect={selectLocation} />)}
            {markerLocations.map((location) => <MapMarker key={locationKey(location)} location={location} scale={view.scale} selected={selectedKey === locationKey(location)} collected={location.type === 'orb' && collectedOrbs.has(String(location.id))} onSelect={selectLocation} />)}
          </div>
        </div>

        {markersHiddenAtOverview && <div className="map-layer-hint"><Search size={13} />Aproxime ou pesquise para exibir os marcadores</div>}

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
