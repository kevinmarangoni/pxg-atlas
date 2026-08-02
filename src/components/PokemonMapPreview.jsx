import { ChevronLeft, ChevronRight, ExternalLink, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../data/LanguageContext'

const TILE_SIZE = 256
const PREVIEW_SCALE = 0.92

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

function visibleTiles(location, tilePositionSet, cdnHome, localTilePositionSet, localTileHome) {
  if (!location || !cdnHome) return []
  const centerX = Math.floor(location.x / TILE_SIZE)
  const centerY = Math.floor(location.y / TILE_SIZE)
  const tiles = []

  for (let x = centerX - 3; x <= centerX + 3; x += 1) {
    for (let y = centerY - 2; y <= centerY + 2; y += 1) {
      if (tilePositionSet?.size && !tilePositionSet.has(tileKey(location.z, x, y))) continue
      const key = tileKey(location.z, x, y)
      const local = localTileHome && localTilePositionSet?.has(key)
      tiles.push({
        x,
        y,
        src: local ? `${localTileHome}/tile_${location.z}_${x}_${y}.png` : `${cdnHome}/tile_${location.z}_${x}_${y}.png`,
      })
    }
  }

  return tiles
}

export function PokemonMapPreview({ name, locations, selectedIndex, onSelect, cdnHome, tilePositionSet, localTilePositionSet, localTileHome, mapSources }) {
  const { t, locale } = useLanguage()
  const selectedLocation = locations[selectedIndex] || locations[0]
  if (!selectedLocation) return null

  const mapSource = mapSourceFor(selectedLocation, mapSources)
  const floor = locationFloor(selectedLocation)
  const tiles = visibleTiles(selectedLocation, tilePositionSet, cdnHome, localTilePositionSet, localTileHome)
  // Keep the Pokémon-sheet preview on the original high-definition tiles. The
  // full PXGMap image is only a fallback for regions without tile coverage.
  const useFullMapFallback = tiles.length === 0 && Boolean(mapSource)
  const nearbyLocations = locations
    .map((location, index) => ({ location, index }))
    .filter(({ location }) => locationFloor(location) === floor
      && Math.abs(location.x - selectedLocation.x) <= 900
      && Math.abs(location.y - selectedLocation.y) <= 600)
  const mapUrl = `/map?region=${encodeURIComponent(selectedLocation.region || '')}&pokemon=${encodeURIComponent(name)}&x=${selectedLocation.x}&y=${selectedLocation.y}&z=${selectedLocation.z}`
  const selectPrevious = () => onSelect((selectedIndex - 1 + locations.length) % locations.length)
  const selectNext = () => onSelect((selectedIndex + 1) % locations.length)

  return (
    <div className="pokemon-map-explorer">
      <div className="pokemon-map-preview" role="group" aria-label={t('Recorte do mapa para {name} nas coordenadas {x}, {y}, andar {z}', { name, x: selectedLocation.x, y: selectedLocation.y, z: selectedLocation.z })}>
        <div className="pokemon-map-preview-canvas" style={{ '--preview-scale': PREVIEW_SCALE }}>
          {useFullMapFallback && (
            <img
              alt=""
              className="pokemon-map-preview-image"
              draggable={false}
              height={mapSource.image_height}
              referrerPolicy="no-referrer"
              src={floor === 0 ? mapSource.image_url : mapSource.floor_image_template.replace('{floor}', String(floor))}
              style={{ left: mapSource.world_origin[0] - selectedLocation.x, top: mapSource.world_origin[1] - selectedLocation.y }}
              width={mapSource.image_width}
            />
          )}
          {tiles.map((tile) => (
            <img
              alt=""
              className="pokemon-map-preview-tile"
              draggable={false}
              height={TILE_SIZE}
              key={tileKey(selectedLocation.z, tile.x, tile.y)}
              referrerPolicy="no-referrer"
              src={tile.src}
              style={{ left: (tile.x * TILE_SIZE) - selectedLocation.x, top: (tile.y * TILE_SIZE) - selectedLocation.y }}
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
                onClick={() => onSelect(index)}
                style={{ left: location.x - selectedLocation.x, top: location.y - selectedLocation.y }}
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
        <Link to={mapUrl}>{t('Abrir no mapa')} <ExternalLink size={13} /></Link>
      </div>
    </div>
  )
}
