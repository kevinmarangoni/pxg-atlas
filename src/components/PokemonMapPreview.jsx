import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Copy, ExternalLink, MapPin, Minus, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../data/LanguageContext'
import { copyText } from '../lib/clipboard'

const TILE_SIZE = 256
const MIN_SCALE = 0.3
const MAX_SCALE = 3
const TILE_PADDING = 1

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function locationFloor(location) {
  return Number.isFinite(Number(location?.floor)) ? Number(location.floor) : Number(location?.z) || 0
}

function mapSourceFor(location, mapSources) {
  return mapSources?.[String(location?.region || '').trim().toLowerCase()] || null
}

function locationKey(location, index) {
  return `${location.x}-${location.y}-${location.z}-${index}`
}

function tileKey(z, x, y) {
  return `${z},${x},${y}`
}

function visibleTiles(view, viewportSize, floor, cdnHome, tilePositionSet, localTilePositionSet, localTileHome) {
  if (!cdnHome || !viewportSize.width || !viewportSize.height) return []
  const padding = TILE_SIZE * TILE_PADDING
  const left = (-view.x / view.scale) - padding
  const top = (-view.y / view.scale) - padding
  const right = ((viewportSize.width - view.x) / view.scale) + padding
  const bottom = ((viewportSize.height - view.y) / view.scale) + padding
  const startX = Math.floor(left / TILE_SIZE)
  const endX = Math.ceil(right / TILE_SIZE)
  const startY = Math.floor(top / TILE_SIZE)
  const endY = Math.ceil(bottom / TILE_SIZE)
  const tiles = []

  for (let x = startX; x <= endX; x += 1) {
    for (let y = startY; y <= endY; y += 1) {
      const key = tileKey(floor, x, y)
      if (tilePositionSet?.size && !tilePositionSet.has(key)) continue
      const local = localTileHome && localTilePositionSet?.has(key)
      tiles.push({
        x,
        y,
        src: local ? `${localTileHome}/tile_${floor}_${x}_${y}.png` : `${cdnHome}/tile_${floor}_${x}_${y}.png`,
      })
    }
  }

  return tiles
}

export function PokemonMapPreview({ name, locations, selectedIndex, onSelect, cdnHome, tilePositionSet, localTilePositionSet, localTileHome, mapSources }) {
  const { t, locale } = useLanguage()
  const selectedLocation = locations[selectedIndex] || locations[0]
  const viewportRef = useRef(null)
  const dragRef = useRef(null)
  const recenterRef = useRef(null)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })
  const [copied, setCopied] = useState(false)
  const [floorOverride, setFloorOverride] = useState(null)

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
  }, [])

  useEffect(() => {
    if (!selectedLocation || !viewportSize.width || !viewportSize.height) return
    if (recenterRef.current === selectedIndex) return
    recenterRef.current = selectedIndex
    setView((current) => ({
      scale: current.scale || 1,
      x: (viewportSize.width / 2) - (selectedLocation.x * (current.scale || 1)),
      y: (viewportSize.height / 2) - (selectedLocation.y * (current.scale || 1)),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, viewportSize.width, viewportSize.height])

  useEffect(() => {
    setCopied(false)
    setFloorOverride(null)
  }, [selectedIndex])

  if (!selectedLocation) return null

  const mapSource = mapSourceFor(selectedLocation, mapSources)
  const locationFloorValue = locationFloor(selectedLocation)
  const floor = floorOverride ?? locationFloorValue
  const tiles = visibleTiles(view, viewportSize, floor, cdnHome, tilePositionSet, localTilePositionSet, localTileHome)
  // Keep the Pokémon-sheet preview on the original high-definition tiles. The
  // full PXGMap image is only a fallback for regions without tile coverage.
  const useFullMapFallback = tiles.length === 0 && Boolean(mapSource)
  const nearbyLocations = locations
    .map((location, index) => ({ location, index }))
    .filter(({ location }) => locationFloor(location) === floor)
  const changeFloor = (delta) => setFloorOverride(clamp(floor + delta, 0, 20))
  const mapUrl = `/map?region=${encodeURIComponent(selectedLocation.region || '')}&pokemon=${encodeURIComponent(name)}&x=${selectedLocation.x}&y=${selectedLocation.y}&z=${selectedLocation.z}`
  const selectPrevious = () => onSelect((selectedIndex - 1 + locations.length) % locations.length)
  const selectNext = () => onSelect((selectedIndex + 1) % locations.length)

  const zoomAt = (factor, screenX = viewportSize.width / 2, screenY = viewportSize.height / 2) => {
    setView((current) => {
      const scale = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE)
      const worldX = (screenX - current.x) / current.scale
      const worldY = (screenY - current.y) / current.scale
      return { scale, x: screenX - (worldX * scale), y: screenY - (worldY * scale) }
    })
  }

  const handleWheel = (event) => {
    event.preventDefault()
    const viewport = viewportRef.current
    if (!viewport) return
    const rect = viewport.getBoundingClientRect()
    zoomAt(event.deltaY < 0 ? 1.15 : 0.87, event.clientX - rect.left, event.clientY - rect.top)
  }

  const handlePointerDown = (event) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: view.x, y: view.y, moved: false }
  }

  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) drag.moved = true
    setView((current) => ({ ...current, x: drag.x + deltaX, y: drag.y + deltaY }))
  }

  const handlePointerUp = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }

  const copyCoordinates = () => {
    copyText(`${selectedLocation.x}, ${selectedLocation.y}, ${selectedLocation.z}`, () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="pokemon-map-explorer">
      <div className="pokemon-map-preview" role="group" aria-label={t('Recorte do mapa para {name} nas coordenadas {x}, {y}, andar {z}', { name, x: selectedLocation.x, y: selectedLocation.y, z: selectedLocation.z })}>
        <div
          ref={viewportRef}
          className="pokemon-map-preview-viewport"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="pokemon-map-preview-canvas" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
            {useFullMapFallback && (
              <img
                alt=""
                className="pokemon-map-preview-image"
                draggable={false}
                height={mapSource.image_height}
                referrerPolicy="no-referrer"
                src={floor === 0 ? mapSource.image_url : mapSource.floor_image_template.replace('{floor}', String(floor))}
                style={{ left: mapSource.world_origin[0], top: mapSource.world_origin[1] }}
                width={mapSource.image_width}
              />
            )}
            {tiles.map((tile) => (
              <img
                alt=""
                className="pokemon-map-preview-tile"
                draggable={false}
                height={TILE_SIZE}
                key={tileKey(floor, tile.x, tile.y)}
                referrerPolicy="no-referrer"
                src={tile.src}
                style={{ left: tile.x * TILE_SIZE, top: tile.y * TILE_SIZE }}
                width={TILE_SIZE}
              />
            ))}
            {nearbyLocations.map(({ location, index }) => {
              const selected = index === selectedIndex
              return (
                <button
                  aria-label={t('Mostrar ponto {index}: {x}, {y}, andar {z}', { index: index + 1, x: location.x, y: location.y, z: location.z })}
                  aria-pressed={selected}
                  className={`pokemon-map-preview-marker ${selected ? 'selected' : ''}`}
                  key={locationKey(location, index)}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => { if (!dragRef.current?.moved) onSelect(index) }}
                  style={{ left: location.x, top: location.y, '--marker-scale': 1 / view.scale }}
                  type="button"
                >
                  {selected && selectedLocation.sprite_url
                    ? <img alt="" draggable={false} referrerPolicy="no-referrer" src={selectedLocation.sprite_url} />
                    : <MapPin size={selected ? 18 : 12} />}
                  {location.point_count > 1 && <b>{location.point_count}</b>}
                </button>
              )
            })}
          </div>

          <div className="pokemon-map-preview-floor-controls" onPointerDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => changeFloor(-1)} aria-label={t('Subir andar')}><ChevronUp size={14} /></button>
            <b>Z {floor}</b>
            <button type="button" onClick={() => changeFloor(1)} aria-label={t('Descer andar')}><ChevronDown size={14} /></button>
          </div>

          <div className="pokemon-map-preview-zoom-controls" onPointerDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => zoomAt(1.3)} aria-label={t('Aumentar zoom')}><Plus size={15} /></button>
            <button type="button" onClick={() => zoomAt(0.77)} aria-label={t('Diminuir zoom')}><Minus size={15} /></button>
          </div>
        </div>

        <span className="pokemon-map-region">{selectedLocation.region || t('Região não informada')} · {t('Andar {floor}', { floor })}</span>
        {locations.length > 1 && (
          <div className="pokemon-map-navigation" aria-label={t('Navegar pelas posições mapeadas')}>
            <button type="button" onClick={selectPrevious} aria-label={t('Posição anterior')}><ChevronLeft size={16} /></button>
            <span>{t('{current} de {total}', { current: selectedIndex + 1, total: locations.length })}</span>
            <button type="button" onClick={selectNext} aria-label={t('Próxima posição')}><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      <div className="pokemon-map-selected-location">
        <span className="pokemon-map-selected-icon"><MapPin size={18} /></span>
        <div>
          <small>{t('Coordenadas selecionadas')}</small>
          <strong>{selectedLocation.x.toLocaleString(locale)}, {selectedLocation.y.toLocaleString(locale)}, {selectedLocation.z}</strong>
          <p>{selectedLocation.comment || `${selectedLocation.region || t('Localização')} · ${t('andar {floor}', { floor })}`}</p>
        </div>
        <button type="button" className="pokemon-map-copy-coordinates" onClick={copyCoordinates} title={t('Copiar coordenadas')} aria-label={t('Copiar coordenadas')}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
        <Link to={mapUrl}>{t('Abrir no mapa')} <ExternalLink size={13} /></Link>
      </div>
    </div>
  )
}
