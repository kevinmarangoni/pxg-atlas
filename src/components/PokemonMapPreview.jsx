import { ChevronLeft, ChevronRight, ExternalLink, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

const TILE_SIZE = 256
const PREVIEW_SCALE = 0.92

function locationKey(location, index) {
  return `${location.x}-${location.y}-${location.z}-${index}`
}

function tileKey(z, x, y) {
  return `${z},${x},${y}`
}

function visibleTiles(location, tilePositionSet, cdnHome) {
  if (!location || !cdnHome) return []
  const centerX = Math.floor(location.x / TILE_SIZE)
  const centerY = Math.floor(location.y / TILE_SIZE)
  const tiles = []

  for (let x = centerX - 3; x <= centerX + 3; x += 1) {
    for (let y = centerY - 2; y <= centerY + 2; y += 1) {
      if (tilePositionSet?.size && !tilePositionSet.has(tileKey(location.z, x, y))) continue
      tiles.push({
        x,
        y,
        src: `${cdnHome}/tile_${location.z}_${x}_${y}.png`,
      })
    }
  }

  return tiles
}

export function PokemonMapPreview({ name, locations, selectedIndex, onSelect, cdnHome, tilePositionSet }) {
  const selectedLocation = locations[selectedIndex] || locations[0]
  if (!selectedLocation) return null

  const tiles = visibleTiles(selectedLocation, tilePositionSet, cdnHome)
  const nearbyLocations = locations
    .map((location, index) => ({ location, index }))
    .filter(({ location }) => location.z === selectedLocation.z
      && Math.abs(location.x - selectedLocation.x) <= 900
      && Math.abs(location.y - selectedLocation.y) <= 600)
  const mapUrl = `/map?pokemon=${encodeURIComponent(name)}&x=${selectedLocation.x}&y=${selectedLocation.y}&z=${selectedLocation.z}`
  const selectPrevious = () => onSelect((selectedIndex - 1 + locations.length) % locations.length)
  const selectNext = () => onSelect((selectedIndex + 1) % locations.length)

  return (
    <div className="pokemon-map-explorer">
      <div className="pokemon-map-preview" role="group" aria-label={`Recorte do mapa para ${name} nas coordenadas ${selectedLocation.x}, ${selectedLocation.y}, andar ${selectedLocation.z}`}>
        <div className="pokemon-map-preview-canvas" style={{ '--preview-scale': PREVIEW_SCALE }}>
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
                aria-label={`Mostrar ponto ${index + 1}: ${location.x}, ${location.y}, andar ${location.z}`}
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
              </button>
            )
          })}
        </div>

        <span className="pokemon-map-region">{selectedLocation.region || 'Região não informada'} · Andar {selectedLocation.z}</span>
        {locations.length > 1 && (
          <div className="pokemon-map-navigation" aria-label="Navegar pelas posições mapeadas">
            <button type="button" onClick={selectPrevious} aria-label="Posição anterior"><ChevronLeft size={16} /></button>
            <span>{selectedIndex + 1} de {locations.length}</span>
            <button type="button" onClick={selectNext} aria-label="Próxima posição"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      <div className="pokemon-map-selected-location">
        <span className="pokemon-map-selected-icon"><MapPin size={18} /></span>
        <div>
          <small>Coordenadas selecionadas</small>
          <strong>{selectedLocation.x.toLocaleString('pt-BR')}, {selectedLocation.y.toLocaleString('pt-BR')}, {selectedLocation.z}</strong>
          <p>{selectedLocation.comment || `${selectedLocation.region || 'Localização'} · andar ${selectedLocation.z}`}</p>
        </div>
        <Link to={mapUrl}>Abrir no mapa <ExternalLink size={13} /></Link>
      </div>
    </div>
  )
}
