import {
  ChevronDown,
  ChevronUp,
  Clock3,
  LoaderCircle,
  Map as MapIcon,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  ClipboardList,
  Package,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ElementBadge } from '../components/Common'
import { normalizedMapName, useMapData } from '../data/MapDataContext'
import { usePokemonData } from '../data/PokemonDataContext'
import { useGuidesData, useWorldContentData } from '../data/DomainData'
import { hasStorageConsent } from '../lib/cookieConsent'
import { ELEMENT_COLORS, displayName, normalizedElement, pokemonElements, pokemonPath, primaryLevel } from '../lib/pokemon'

const TILE_SIZE = 256
const MIN_SCALE = 0.12
const MAX_SCALE = 4
const MAX_RENDERED_MARKERS = 160
const MAP_LAYERS = new Set(['monster', 'orb', 'npc', 'quest', 'boss', 'resource'])
const ORB_STORAGE_KEY = 'pxg-atlas:collected-orbs'
const REGION_CONFIGS = {
  Kanto: { key: 'Kanto', label: 'Kanto', defaultFloor: 7, tiles: { minX: 13, maxX: 18, minY: 12, maxY: 24 } },
  Johto: { key: 'Johto', label: 'Johto', defaultFloor: 6, tiles: { minX: 5, maxX: 15, minY: 115, maxY: 124 } },
  Nightmare: { key: 'Nightmare', label: 'Nightmare World', defaultFloor: 5, tiles: null },
}
const REGION_OPTIONS = Object.values(REGION_CONFIGS)
const DEFAULT_REGION = 'Johto'
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

function regionFromQuery(value) {
  const normalized = normalizedMapName(value)
  if (normalized === 'kanto') return 'Kanto'
  if (normalized === 'nightmare' || normalized === 'nightmare world') return 'Nightmare'
  return DEFAULT_REGION
}

function effectivenessElements(pokemon, key) {
  return [...new Set((pokemon?.effectiveness?.[key] || [])
    .map(normalizedElement)
    .filter((element) => Boolean(ELEMENT_COLORS[element])))]
}

function pokemonLevel(pokemon) {
  return pokemon ? primaryLevel(pokemon) : null
}

function PokemonElementSummary({ pokemon }) {
  const elements = pokemonElements(pokemon)
  const strong = effectivenessElements(pokemon, 'very_effective')
  const weak = effectivenessElements(pokemon, 'very_ineffective')
  return (
    <div className="map-selection-pokemon-details">
      <span><small>Tipos do Pokémon</small><div>{elements.length ? elements.map((element) => <ElementBadge key={element} element={element} compact />) : <em>Não informado</em>}</div></span>
      <span><small>Elementos fortes contra ele</small><div>{strong.length ? strong.map((element) => <ElementBadge key={element} element={element} compact />) : <em>Não informado</em>}</div></span>
      <span><small>Elementos fracos contra ele</small><div>{weak.length ? weak.map((element) => <ElementBadge key={element} element={element} compact />) : <em>Não informado</em>}</div></span>
    </div>
  )
}

function locationFloor(location) {
  return Number.isFinite(Number(location?.floor)) ? Number(location.floor) : Number(location?.z) || 0
}

function regionBounds(regionConfig) {
  const tiles = regionConfig?.tiles
  if (!tiles) return null
  return {
    minX: tiles.minX * TILE_SIZE,
    maxX: (tiles.maxX + 1) * TILE_SIZE,
    minY: tiles.minY * TILE_SIZE,
    maxY: (tiles.maxY + 1) * TILE_SIZE,
  }
}

function insideRegion(location, regionConfig) {
  const bounds = regionBounds(regionConfig)
  return Boolean(location && bounds
    && location.x >= bounds.minX
    && location.x < bounds.maxX
    && location.y >= bounds.minY
    && location.y < bounds.maxY)
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

function buildRegionPlaces(tasks, regionConfig) {
  const groups = new Map()
  for (const task of tasks) {
    const coordinates = task.npc?.coordinates
    if (task.region !== regionConfig.key.toLocaleLowerCase('pt-BR') || !task.location || !insideRegion(coordinates, regionConfig)) continue
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
      region: regionConfig.label,
      x,
      y,
      label_x: x + offset.x,
      label_y: y + offset.y,
      z: regionConfig.defaultFloor,
      floor: regionConfig.defaultFloor,
      type: 'place',
      task_count: group.taskCount,
      comment: `${group.taskCount} ${group.taskCount === 1 ? 'NPC de task catalogado' : 'NPCs de task catalogados'}`,
    }
  }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

function constrainView(nextView, viewport, bounds) {
  if (!viewport.width || !viewport.height) return nextView
  if (!bounds) return { ...nextView, scale: clamp(nextView.scale, MIN_SCALE, MAX_SCALE) }
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
    x: constrainAxis(nextView.x, bounds.minX, bounds.maxX, viewport.width),
    y: constrainAxis(nextView.y, bounds.minY, bounds.maxY, viewport.height),
  }
}

function fitRegionView(viewport, bounds) {
  if (!bounds) return { scale: 1, x: 0, y: 0 }
  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY
  const scale = clamp(Math.min((viewport.width - 84) / width, (viewport.height - 84) / height), MIN_SCALE, 0.72)
  return constrainView({
    scale,
    x: (viewport.width / 2) - (((bounds.minX + bounds.maxX) / 2) * scale),
    y: (viewport.height / 2) - (((bounds.minY + bounds.maxY) / 2) * scale),
  }, viewport, bounds)
}

function MapMarker({ location, scale, selected, collected, onSelect, pokemonEntry, activeFloor }) {
  const [imageFailed, setImageFailed] = useState(false)
  const isMonster = location.type === 'monster'
  const markerFloor = locationFloor(location)
  const hasFloor = Number.isFinite(markerFloor) && location.type !== 'place'
  const floorRelation = hasFloor && markerFloor !== activeFloor
    ? markerFloor < activeFloor ? 'upper' : 'lower'
    : ''
  return (
    <button
      type="button"
      className={`atlas-map-marker ${location.type} ${floorRelation ? `wrong-floor ${floorRelation}` : ''} ${selected ? 'selected' : ''} ${collected ? 'collected' : ''}`}
      style={{ left: location.x, top: location.y, '--marker-scale': 1 / scale }}
      aria-label={`${location.name}${pokemonEntry && primaryLevel(pokemonEntry) ? `, Level ${primaryLevel(pokemonEntry)}` : ''}, coordenadas ${coordinates(location)}`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={() => onSelect(location)}
    >
      {isMonster && location.sprite_url && !imageFailed
        ? <img src={location.sprite_url} alt="" loading="lazy" draggable={false} referrerPolicy="no-referrer" onError={() => setImageFailed(true)} />
        : location.type === 'orb' ? <Sparkles size={17} /> : location.type === 'npc' ? <UserRound size={17} /> : location.type === 'quest' ? <ClipboardList size={17} /> : location.type === 'boss' ? <ShieldCheck size={17} /> : location.type === 'resource' ? <Package size={17} /> : <MapPin size={17} />}
      <span className="atlas-map-marker-label">{location.name}{pokemonEntry && primaryLevel(pokemonEntry) ? ` · Lv. ${primaryLevel(pokemonEntry)}` : ''}</span>
      {floorRelation && <span className={`atlas-map-marker-floor-indicator ${floorRelation}`} aria-label={floorRelation === 'upper' ? `Marcador no andar ${markerFloor}, suba` : `Marcador no andar ${markerFloor}, desça`}>{floorRelation === 'upper' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>}
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
          : location.type === 'orb' ? <Sparkles size={16} /> : location.type === 'npc' ? <UserRound size={16} /> : location.type === 'quest' ? <ClipboardList size={16} /> : location.type === 'boss' ? <ShieldCheck size={16} /> : location.type === 'resource' ? <Package size={16} /> : <MapPin size={16} />}
      </span>
      <span><strong>{location.name}</strong><small>{location.region} · {coordinates(location)}</small></span>
      <Target size={14} />
    </button>
  )
}

function PokemonLocationGroupItem({ group, selectedKey, onSelect, pokemonEntry }) {
  const [expanded, setExpanded] = useState(false)
  const selected = group.locations.some((location) => locationKey(location) === selectedKey)
  const level = pokemonLevel(pokemonEntry)
  // Map data can include Pokémon that are not present in the current Pokédex
  // export. Keep the grouped result usable instead of trying to read
  // `general_info` from a missing entry and taking down the whole map.
  const elements = pokemonEntry ? pokemonElements(pokemonEntry) : []
  const firstLocation = group.locations[0]
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <div className={`map-result-group ${selected ? 'selected' : ''}`}>
      <div className="map-result-group-header">
        <button type="button" className={`map-result-item map-result-pokemon ${selected ? 'selected' : ''}`} onClick={() => onSelect(firstLocation)}>
          <span className="map-result-art monster">
            {firstLocation.sprite_url && !imageFailed
              ? <img src={firstLocation.sprite_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} />
              : <MapPin size={16} />}
          </span>
          <span className="map-result-copy">
            <strong>{group.name}</strong>
            <small>{level ? `Lv. ${level}` : 'Level não informado'}{elements.length ? ` · ${elements.join(' · ')}` : ''}</small>
            <small className="map-result-location-count">{group.locations.length} {group.locations.length === 1 ? 'localização' : 'localizações'}</small>
          </span>
          <Target size={14} />
        </button>
        {group.locations.length > 1 && (
          <button type="button" className="map-result-dropdown-toggle" aria-label={`${expanded ? 'Ocultar' : 'Mostrar'} localizações de ${group.name}`} aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>
            <ChevronDown size={15} />
          </button>
        )}
      </div>
      {expanded && group.locations.length > 1 && (
        <div className="map-result-location-dropdown">
          {group.locations.map((location, index) => (
            <button type="button" className={selectedKey === locationKey(location) ? 'selected' : ''} onClick={() => onSelect(location)} key={locationKey(location)}>
              <MapPin size={13} />
              <span><strong>{coordinates(location)}</strong><small>Andar {locationFloor(location)}</small></span>
              <em>{index + 1}</em>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function buildPokemonGroups(locations, pokemonByName) {
  const groups = new Map()
  for (const location of locations) {
    if (location.type !== 'monster') continue
    const key = normalizedMapName(location.name)
    const group = groups.get(key) || {
      key: `pokemon:${key}`,
      name: location.name,
      locations: [],
      pokemon: pokemonByName.get(key) || null,
    }
    group.locations.push(location)
    groups.set(key, group)
  }
  return [...groups.values()].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
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
  const guides = useGuidesData()
  const world = useWorldContentData()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryRegion = regionFromQuery(searchParams.get('region'))
  const [selectedRegion, setSelectedRegion] = useState(queryRegion)
  const regionKey = selectedRegion
  const regionConfig = REGION_CONFIGS[regionKey]
  const activeBounds = regionBounds(regionConfig)
  const [query, setQuery] = useState(searchParams.get('pokemon') || '')
  const [activeLayer, setActiveLayer] = useState(() => MAP_LAYERS.has(searchParams.get('layer')) ? searchParams.get('layer') : 'monster')
  const [levelFilter, setLevelFilter] = useState('all')
  const [floor, setFloor] = useState(regionConfig.defaultFloor)
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
    if (!regionConfig.tiles) return []
    for (const [tileFloor, tileX, tileY] of data?.metadata?.local_tile_positions || []) {
      if (tileX >= regionConfig.tiles.minX && tileX <= regionConfig.tiles.maxX && tileY >= regionConfig.tiles.minY && tileY <= regionConfig.tiles.maxY) {
        floors.add(tileFloor)
      }
    }
    return [...floors].sort((a, b) => a - b)
  }, [data, regionConfig])
  const regionTileCount = useMemo(() => (data?.metadata?.local_tile_positions || []).filter(([, tileX, tileY]) => (
    regionConfig.tiles
    && tileX >= regionConfig.tiles.minX
    && tileX <= regionConfig.tiles.maxX
    && tileY >= regionConfig.tiles.minY
    && tileY <= regionConfig.tiles.maxY
  )).length, [data, regionConfig])
  const respawnByPokemon = useMemo(() => new Map((world.data?.respawn?.pokemon || []).map((entry) => [normalizedMapName(entry.name), entry])), [world.data])
  const defaultRespawn = respawnByPokemon.get('tempo padrao') || null
  const regionMonsters = useMemo(() => monsters.filter((location) => location.region === regionConfig.key && insideRegion(location, regionConfig)).map((location) => {
    const explicit = respawnByPokemon.get(normalizedMapName(location.name))
    return { ...location, respawn_time: explicit?.time_raw || defaultRespawn?.time_raw || null, respawn_source: explicit ? 'specific' : defaultRespawn ? 'default' : null }
  }), [monsters, respawnByPokemon, defaultRespawn, regionConfig])
  const regionOrbs = useMemo(() => orbs.filter((location) => !String(location.region || '').startsWith('Mt Silver') && insideRegion(location, regionConfig)), [orbs, regionConfig])
  const regionPlaces = useMemo(() => buildRegionPlaces(tasks, regionConfig), [tasks, regionConfig])
  const taskPoints = useMemo(() => tasks.flatMap((task) => {
    const point = task.npc?.coordinates
    if (task.region !== regionConfig.key.toLocaleLowerCase('pt-BR') || !point || !insideRegion(point, regionConfig)) return []
    const base = { id: task.id, region: regionConfig.label, x: Number(point.x), y: Number(point.y), z: Number(point.z), floor: Number(point.z), npc_name: task.npc.name, task_id: task.id, task_location: task.location }
    return [
      { ...base, map_uid: `npc:${task.id}`, type: 'npc', name: task.npc.name, comment: `NPC de task · ${task.location}` },
      { ...base, map_uid: `quest:${task.id}`, type: 'quest', name: `${task.npc.name} · ${task.location}`, comment: `Task publicada em ${task.region_label || regionConfig.label}` },
    ]
  }), [tasks, regionConfig])
  const regionNpcs = useMemo(() => [...new Map(taskPoints.filter((point) => point.type === 'npc').map((point) => [`${normalizedMapName(point.name)}:${point.x}:${point.y}:${point.z}`, point])).values()], [taskPoints])
  const regionQuests = useMemo(() => taskPoints.filter((point) => point.type === 'quest'), [taskPoints])
  const worldPoints = useMemo(() => (world.data?.points || []).filter((point) => normalizedMapName(point.region) === normalizedMapName(regionConfig.label) && insideRegion(point, regionConfig)).map((point) => ({ ...point, type: point.kind || point.type })), [world.data, regionConfig])
  const regionBosses = useMemo(() => worldPoints.filter((point) => point.type === 'boss'), [worldPoints])
  const regionResources = useMemo(() => worldPoints.filter((point) => point.type === 'resource'), [worldPoints])
  const pokemonLevelByName = useMemo(() => {
    const levels = new Map()
    for (const location of regionMonsters) {
      const key = normalizedMapName(location.name)
      if (!levels.has(key)) levels.set(key, pokemonLevel(pokemonByName.get(key)))
    }
    return levels
  }, [regionMonsters, pokemonByName])
  const levelOptions = useMemo(() => [...new Set([...pokemonLevelByName.values()].filter((level) => Number.isFinite(level)))].sort((left, right) => left - right), [pokemonLevelByName])
  const hasUnknownLevel = useMemo(() => [...pokemonLevelByName.values()].some((level) => !Number.isFinite(level)), [pokemonLevelByName])
  const regionLocations = useMemo(() => {
    const sources = { monster: regionMonsters, orb: regionOrbs, npc: regionNpcs, quest: regionQuests, boss: regionBosses, resource: regionResources }
    return (sources[activeLayer] || []).map((location) => ({ ...location, type: activeLayer }))
  }, [activeLayer, regionMonsters, regionOrbs, regionNpcs, regionQuests, regionBosses, regionResources])
  const levelFilteredLocations = useMemo(() => {
    if (activeLayer !== 'monster' || levelFilter === 'all') return regionLocations
    return regionLocations.filter((location) => {
      const level = pokemonLevelByName.get(normalizedMapName(location.name))
      return levelFilter === 'unknown' ? !Number.isFinite(level) : level === Number(levelFilter)
    })
  }, [activeLayer, levelFilter, pokemonLevelByName, regionLocations])
  const normalizedQuery = normalizedMapName(query)
  const matchingLocations = useMemo(() => {
    const layerMatches = levelFilteredLocations.filter((location) => matchesLocation(location, normalizedQuery))
    if (!normalizedQuery) return layerMatches
    return [...layerMatches, ...(activeLayer === 'monster' ? regionPlaces.filter((place) => matchesLocation(place, normalizedQuery)) : [])]
  }, [activeLayer, regionPlaces, levelFilteredLocations, normalizedQuery])
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
  const visibleMapLocations = useMemo(() => {
    if (!viewportSize.width || !viewportSize.height) return []
    const padding = 30 / view.scale
    const left = (-view.x / view.scale) - padding
    const top = (-view.y / view.scale) - padding
    const right = ((viewportSize.width - view.x) / view.scale) + padding
    const bottom = ((viewportSize.height - view.y) / view.scale) + padding
    const source = matchingLocations
    return source.filter((location) => location.type !== 'place'
      && location.x >= left && location.x <= right && location.y >= top && location.y <= bottom)
  }, [matchingLocations, view, viewportSize])
  const listSourceLocations = normalizedQuery ? matchingLocations : activeLayer === 'monster' ? floorLocations : visibleFloorLocations
  const listEntries = useMemo(() => {
    if (activeLayer !== 'monster') return listSourceLocations
    const groups = buildPokemonGroups(listSourceLocations, pokemonByName)
    const places = listSourceLocations
      .filter((location) => location.type === 'place')
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
    return [...groups, ...places]
  }, [activeLayer, listSourceLocations, pokemonByName])
  const listLocations = listEntries.slice(0, 120)
  const resultCount = listEntries.length
  const markerLocations = useMemo(() => {
    const markers = visibleMapLocations.slice(0, MAX_RENDERED_MARKERS)
    if (selectedLocation?.type !== 'place' && selectedLocation && matchingLocations.some((location) => locationKey(location) === locationKey(selectedLocation))) {
      const selectedKey = locationKey(selectedLocation)
      if (!markers.some((location) => locationKey(location) === selectedKey)) return [...markers, selectedLocation]
    }
    return markers
  }, [matchingLocations, selectedLocation, visibleMapLocations])
  const visiblePlaces = useMemo(() => {
    if (floor !== regionConfig.defaultFloor) return []
    return regionPlaces.filter((place) => place.task_count >= 3 || view.scale >= 0.62 || selectedLocation?.map_uid === place.map_uid)
  }, [floor, regionConfig.defaultFloor, regionPlaces, selectedLocation, view.scale])

  useEffect(() => {
    if (!selectedLocation || selectedLocation.type === 'place') return
    if (!matchingLocations.some((location) => locationKey(location) === locationKey(selectedLocation))) setSelectedLocation(null)
  }, [matchingLocations, selectedLocation])

  useEffect(() => {
    if (availableFloors.length && !availableFloors.includes(floor)) {
      setFloor(availableFloors.includes(regionConfig.defaultFloor) ? regionConfig.defaultFloor : availableFloors[0])
    }
  }, [availableFloors, floor, regionConfig.defaultFloor])

  useEffect(() => {
    if (!hasStorageConsent()) return
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
    setView((current) => constrainView(current, viewportSize, activeBounds))
  }, [activeBounds, viewportSize])

  const previousRegionRef = useRef(regionKey)
  useEffect(() => {
    if (previousRegionRef.current === regionKey) return
    previousRegionRef.current = regionKey
    setFloor(regionConfig.defaultFloor)
    setSelectedLocation(null)
    setQuery('')
    setLevelFilter('all')
    if (viewportSize.width && viewportSize.height) setView(fitRegionView(viewportSize, activeBounds))
  }, [activeBounds, regionConfig.defaultFloor, regionKey, viewportSize])

  const navigateToLocation = useCallback((location, preferredScale) => {
    if (!location || !viewportSize.width || !viewportSize.height) return
    const scale = clamp(preferredScale ?? Math.max(view.scale, 0.9), MIN_SCALE, MAX_SCALE)
    setFloor(locationFloor(location))
    setView(constrainView({
      scale,
      x: (viewportSize.width / 2) - (location.x * scale),
      y: (viewportSize.height / 2) - (location.y * scale),
    }, viewportSize, activeBounds))
  }, [activeBounds, view.scale, viewportSize])

  const resetRegionView = useCallback(() => {
    if (!viewportSize.width || !viewportSize.height) return
    setFloor(regionConfig.defaultFloor)
    setSelectedLocation(null)
    setQuery('')
    setLevelFilter('all')
    setView(fitRegionView(viewportSize, activeBounds))
    setSearchParams({ region: regionKey }, { replace: true })
  }, [activeBounds, regionConfig.defaultFloor, regionKey, setSearchParams, viewportSize])

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
    const requestedLayer = MAP_LAYERS.has(searchParams.get('layer')) ? searchParams.get('layer') : null
    const pokemonLocation = requestedPokemon
      ? regionMonsters.find((location) => normalizedMapName(location.name) === requestedPokemon)
      : null
    const placeLocation = requestedPlace
      ? regionPlaces.find((location) => normalizedMapName(location.name) === requestedPlace)
      : null
    const coordinateLocation = hasRequestedCoordinates && Number.isFinite(requestedX) && Number.isFinite(requestedY) && Number.isFinite(requestedZ)
      ? { name: requestedLabel || 'Coordenada', x: requestedX, y: requestedY, z: requestedZ, floor: requestedZ, type: requestedPlace ? 'place' : requestedLayer || 'coordinate', id: 'requested', region: regionConfig.label }
      : null
    const requestedLocation = insideRegion(coordinateLocation, regionConfig) ? coordinateLocation : pokemonLocation || placeLocation

    if (requestedLocation) {
      setSelectedLocation({ ...requestedLocation, type: requestedLocation.type || 'monster' })
      navigateToLocation(requestedLocation, 1.15)
    } else {
      setFloor(regionConfig.defaultFloor)
      setView(fitRegionView(viewportSize, activeBounds))
    }
  }, [activeBounds, data, navigateToLocation, regionConfig, regionMonsters, regionPlaces, searchParams, viewportSize])

  const visibleTiles = useMemo(() => {
    if (!localTileHome || !viewportSize.width || !viewportSize.height) return []
    if (!activeBounds || !regionConfig.tiles) return []
    const left = Math.max(activeBounds.minX, -view.x / view.scale)
    const top = Math.max(activeBounds.minY, -view.y / view.scale)
    const right = Math.min(activeBounds.maxX, (viewportSize.width - view.x) / view.scale)
    const bottom = Math.min(activeBounds.maxY, (viewportSize.height - view.y) / view.scale)
    const startX = Math.max(regionConfig.tiles.minX, Math.floor(left / TILE_SIZE) - 1)
    const endX = Math.min(regionConfig.tiles.maxX, Math.ceil(right / TILE_SIZE) + 1)
    const startY = Math.max(regionConfig.tiles.minY, Math.floor(top / TILE_SIZE) - 1)
    const endY = Math.min(regionConfig.tiles.maxY, Math.ceil(bottom / TILE_SIZE) + 1)
    const tiles = []

    for (let tileX = startX; tileX <= endX; tileX += 1) {
      for (let tileY = startY; tileY <= endY; tileY += 1) {
        const key = `${floor},${tileX},${tileY}`
        if (!localTilePositionSet.has(key)) continue
        tiles.push({ tileX, tileY, src: `${localTileHome}/tile_${floor}_${tileX}_${tileY}.png` })
      }
    }
    return tiles
  }, [activeBounds, floor, localTileHome, localTilePositionSet, regionConfig.tiles, view, viewportSize])

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
      return constrainView({ scale, x: screenX - (worldX * scale), y: screenY - (worldY * scale) }, viewportSize, activeBounds)
    })
  }

  const handleMapWheel = (event) => {
    event.preventDefault()
    const viewport = viewportRef.current
    if (!viewport) return
    const rect = viewport.getBoundingClientRect()
    zoomAt(event.deltaY < 0 ? 1.12 : 0.89, event.clientX - rect.left, event.clientY - rect.top)
  }

  const selectLocation = (location) => {
    setSelectedLocation(location)
    navigateToLocation(location)
    const params = { region: regionKey, x: String(location.x), y: String(location.y), z: String(locationFloor(location)) }
    if (location.type === 'monster') params.pokemon = location.name
    if (location.type === 'orb') params.orb = location.id
    if (location.type === 'place') params.place = location.name
    if (['npc', 'quest', 'boss', 'resource'].includes(location.type)) params.layer = location.type
    setSearchParams(params, { replace: true })
  }

  const selectLayer = (layer) => {
    if (layer === activeLayer) return
    setActiveLayer(layer)
    setQuery('')
    setLevelFilter('all')
    setSelectedLocation(null)
    setSearchParams({ region: regionKey }, { replace: true })
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
    }, viewportSize, activeBounds))
  }

  const handlePointerUp = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }

  const selectedPokemon = selectedLocation?.type === 'monster' ? pokemonByName.get(normalizedMapName(selectedLocation.name)) : null
  const selectedKey = selectedLocation ? locationKey(selectedLocation) : ''
  const floorIndex = availableFloors.indexOf(floor)
  if (loading) return <div className="map-state"><LoaderCircle className="spin" size={30} /><strong>Preparando o mapa</strong><span>Carregando os tiles do minimap.otmm…</span></div>
  if (error || !data) return <div className="map-state error"><MapPin size={30} /><strong>Mapa indisponível</strong><span>{error?.message || 'A base do mapa não foi encontrada.'}</span></div>
  if (!regionConfig.tiles) return <div className="map-state error"><MapPin size={30} /><strong>Nightmare World sem tiles locais</strong><span>O snapshot atual não possui coordenadas ou tiles OTMM canônicos para esta região. Os registros continuam disponíveis nas páginas de quests e Pokélog.</span></div>
  if (!localTileHome || !localTilePositionSet.size) return <div className="map-state error"><MapPin size={30} /><strong>OTMM indisponível</strong><span>Os tiles locais de {regionConfig.label} não foram encontrados. O mapa antigo não será usado como fallback.</span></div>

  return (
    <div className="atlas-map-page">
      <aside className="atlas-map-sidebar">
        <header>
          <span className="eyebrow"><MapIcon size={14} />Exploração</span>
          <h1>Mapa de {regionConfig.label}</h1>
          <p>Navegue pelo mapa real do jogo, com localidades cruzadas pelas coordenadas das tasks.</p>
        </header>

        <label className="map-search-field">
          <span>Buscar em {regionConfig.label}</span>
          <div><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pokémon, local ou coordenada" /></div>
        </label>

        <div className="map-layer-controls" role="group" aria-label="Camadas do mapa">
          <button type="button" className={activeLayer === 'monster' ? 'active monster' : ''} aria-pressed={activeLayer === 'monster'} onClick={() => selectLayer('monster')}><MapPin size={14} />Pokémon<b>{pokemonLevelByName.size}</b></button>
          <button type="button" className={activeLayer === 'orb' ? 'active orb' : 'orb'} aria-pressed={activeLayer === 'orb'} onClick={() => selectLayer('orb')}><Sparkles size={14} />Orbs<b>{regionOrbs.length}</b></button>
          <button type="button" className={activeLayer === 'npc' ? 'active npc' : 'npc'} aria-pressed={activeLayer === 'npc'} onClick={() => selectLayer('npc')}><UserRound size={14} />NPCs<b>{regionNpcs.length}</b></button>
          <button type="button" className={activeLayer === 'quest' ? 'active quest' : 'quest'} aria-pressed={activeLayer === 'quest'} onClick={() => selectLayer('quest')}><ClipboardList size={14} />Tasks<b>{regionQuests.length}</b></button>
          <button type="button" className={activeLayer === 'boss' ? 'active boss' : 'boss'} aria-pressed={activeLayer === 'boss'} onClick={() => selectLayer('boss')}><ShieldCheck size={14} />Bosses<b>{regionBosses.length}</b></button>
          <button type="button" className={activeLayer === 'resource' ? 'active resource' : 'resource'} aria-pressed={activeLayer === 'resource'} onClick={() => selectLayer('resource')}><Package size={14} />Recursos<b>{regionResources.length}</b></button>
        </div>

        <label className="map-level-filter">
          <span>Filtrar Pokémon por level</span>
          <select value={activeLayer === 'monster' ? levelFilter : 'all'} disabled={activeLayer !== 'monster'} onChange={(event) => setLevelFilter(event.target.value)}>
            <option value="all">Todos os levels</option>
            {levelOptions.map((level) => <option value={level} key={level}>Level {level}</option>)}
            {hasUnknownLevel && <option value="unknown">Level não informado</option>}
          </select>
        </label>

        <div className="map-region-card">
          <span><MapIcon size={16} /></span>
          <div><small>Região ativa</small><strong>{regionConfig.label}</strong></div>
          <b>OTMM</b>
        </div>
        <div className="map-region-switcher" role="group" aria-label="Selecionar região do mapa">
          {REGION_OPTIONS.map((option) => <button type="button" key={option.key} className={regionKey === option.key ? 'active' : ''} disabled={!option.tiles} aria-pressed={regionKey === option.key} onClick={() => { if (option.tiles) { setSelectedRegion(option.key); setSearchParams({ region: option.key }, { replace: true }) } }}>{option.label}{!option.tiles && <small>sem tiles</small>}</button>)}
        </div>

        <div className="map-results-heading">
          <div><strong>{resultCount}</strong><span>{activeLayer === 'monster' ? (normalizedQuery ? 'Pokémon encontrados' : `Pokémon no andar ${floor}`) : (normalizedQuery ? `resultados em ${regionConfig.label}` : `posições no andar ${floor}`)}</span></div>
          {listLocations.length < resultCount && <small>Mostrando 120</small>}
        </div>
        <div className="map-results-list">
          {listLocations.map((entry) => entry.locations
            ? <PokemonLocationGroupItem key={entry.key} group={entry} selectedKey={selectedKey} onSelect={selectLocation} pokemonEntry={entry.pokemon} />
            : <LocationListItem key={locationKey(entry)} location={entry} selected={selectedKey === locationKey(entry)} collected={entry.type === 'orb' && collectedOrbs.has(String(entry.id))} onSelect={selectLocation} />)}
          {!listLocations.length && (
            <div className="map-results-empty">
              <Search size={19} />
              <strong>Nenhum marcador encontrado</strong>
              <span>{activeLayer === 'boss' && guides.data?.bosses?.length ? `${guides.data.bosses.length} bosses estão catalogados, mas a Wiki não publicou coordenadas compatíveis com o OTMM.` : activeLayer === 'resource' && world.data?.respawn?.resources?.length ? `${world.data.respawn.resources.length} recursos têm timer publicado, mas não coordenadas confiáveis.` : `Tente outro termo, andar ou posição dentro de ${regionConfig.label}.`}</span>
            </div>
          )}
        </div>

        <footer>
          <span>{regionTileCount.toLocaleString('pt-BR')} tiles de {regionConfig.label} · {availableFloors.length} andares disponíveis</span>
          <strong>Fonte visual: minimap.otmm</strong>
          {world.data?.metadata && <span>Wiki oficial: {world.data.metadata.complete ? 'snapshot completo' : 'snapshot parcial'} · {new Date(world.data.metadata.generated_at).toLocaleDateString('pt-BR')}</span>}
        </footer>
      </aside>

      <section className="atlas-map-stage" aria-label={`Mapa OTMM de ${regionConfig.label} no andar ${floor}`} onWheelCapture={handleMapWheel}>
        <div className="map-coordinate-hud"><span>X <b>{Math.round((-view.x + viewportSize.width / 2) / view.scale).toLocaleString('pt-BR')}</b></span><span>Y <b>{Math.round((-view.y + viewportSize.height / 2) / view.scale).toLocaleString('pt-BR')}</b></span><span>Z <b>{floor}</b></span></div>
        <div className="map-zoom-controls" aria-label="Controles do mapa">
          <button type="button" onClick={() => zoomAt(1.35)} aria-label="Aumentar zoom"><Plus size={18} /></button>
          <button type="button" onClick={() => zoomAt(0.74)} aria-label="Diminuir zoom"><Minus size={18} /></button>
          <button type="button" onClick={resetRegionView} aria-label={`Enquadrar ${regionConfig.label}`}><RotateCcw size={16} /></button>
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
        >
          <div className="atlas-map-canvas" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
            <div
              className="atlas-map-world"
              style={{
                left: activeBounds.minX,
                top: activeBounds.minY,
                width: activeBounds.maxX - activeBounds.minX,
                height: activeBounds.maxY - activeBounds.minY,
              }}
            />
            {visibleTiles.map((tile) => <img className="atlas-map-tile" src={tile.src} alt="" draggable={false} width={TILE_SIZE} height={TILE_SIZE} style={{ left: tile.tileX * TILE_SIZE, top: tile.tileY * TILE_SIZE }} key={`${floor}-${tile.tileX}-${tile.tileY}`} />)}
            {visiblePlaces.map((place) => <PlaceLabel key={place.map_uid} place={place} scale={view.scale} selected={selectedKey === place.map_uid} onSelect={selectLocation} />)}
            {markerLocations.map((location) => <MapMarker key={locationKey(location)} location={location} scale={view.scale} activeFloor={floor} selected={selectedKey === locationKey(location)} collected={location.type === 'orb' && collectedOrbs.has(String(location.id))} onSelect={selectLocation} pokemonEntry={location.type === 'monster' ? pokemonByName.get(normalizedMapName(location.name)) : null} />)}
          </div>
        </div>

        {selectedLocation && (
          <div className={`map-selection ${selectedLocation.type}`}>
            <span className="map-selection-icon">{selectedLocation.type === 'orb' ? <Sparkles size={18} /> : selectedLocation.type === 'npc' ? <UserRound size={18} /> : selectedLocation.type === 'quest' ? <ClipboardList size={18} /> : selectedLocation.type === 'boss' ? <ShieldCheck size={18} /> : selectedLocation.type === 'resource' ? <Package size={18} /> : <MapPin size={18} />}</span>
            <div><small>{selectedLocation.region || 'Coordenada selecionada'}</small><strong>{selectedLocation.name}</strong><span>{coordinates(selectedLocation)}{selectedLocation.comment ? ` · ${selectedLocation.comment}` : ''}</span></div>
            {selectedLocation.type === 'orb' && <button type="button" className={collectedOrbs.has(String(selectedLocation.id)) ? 'collected' : ''} onClick={() => toggleCollectedOrb(selectedLocation.id)}>{collectedOrbs.has(String(selectedLocation.id)) ? 'Coletada' : 'Marcar coletada'}</button>}
            {selectedPokemon && <Link to={pokemonPath(selectedPokemon)}>Abrir ficha</Link>}
            {selectedLocation.type === 'npc' && <Link to="/npcs">Abrir diretório</Link>}
            {selectedLocation.type === 'quest' && <Link to={`/tasks?task=${encodeURIComponent(selectedLocation.task_id || '')}`}>Abrir task</Link>}
            {selectedLocation.type === 'boss' && <Link to="/bosses">Abrir bosses</Link>}
            {selectedLocation.respawn_time && <span className={`map-respawn-time ${selectedLocation.respawn_source || ''}`}><Clock3 size={13} />Respawn {selectedLocation.respawn_time} · {selectedLocation.respawn_source === 'specific' ? 'específico' : 'tempo padrão'}</span>}
            {selectedPokemon && <PokemonElementSummary pokemon={selectedPokemon} />}
          </div>
        )}
      </section>
    </div>
  )
}
