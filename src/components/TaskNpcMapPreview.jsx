import { Check, Copy, ExternalLink, MapPin } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../data/LanguageContext'
import { useMapData } from '../data/MapDataContext'
import { copyText } from '../lib/clipboard'
import { taskRegionLabel } from '../lib/tasks'

const TILE_SIZE = 256
const PREVIEW_SCALE = 0.92
function tileKey(z, x, y) {
  return `${z},${x},${y}`
}

function taskCoordinates(task) {
  const coordinates = task.npc?.coordinates
  if (!coordinates) return null
  const x = Number(coordinates.x)
  const y = Number(coordinates.y)
  const z = Number(coordinates.z)
  return [x, y, z].every(Number.isFinite) ? { x, y, z } : null
}

export function TaskNpcMapPreview({ task }) {
  const { t, locale } = useLanguage()
  const { data, loading, tilePositionSet, localTilePositionSet, localTileHome } = useMapData()
  const [copied, setCopied] = useState(false)
  const location = taskCoordinates(task)
  if (loading || !data || !location) return null

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
        src: local ? `${localTileHome}/tile_${location.z}_${x}_${y}.png` : `${data.metadata.cdn_home}/tile_${location.z}_${x}_${y}.png`,
      })
    }
  }

  const npcName = task.npc?.name || t('NPC da task')
  const mapUrl = `/map?npc=${encodeURIComponent(npcName)}&x=${location.x}&y=${location.y}&z=${location.z}`
  const copyCoordinates = () => {
    copyText(`${location.x}, ${location.y}, ${location.z}`, () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <section className="task-npc-map" aria-label={t('Mapa do NPC {name}', { name: npcName })}>
      <div className="task-npc-map-heading"><span><MapPin size={14} />{t('Localização do NPC')}</span><small>{taskRegionLabel(task)} · {task.location || t('Local não informado')}</small></div>
      <div className="pokemon-map-preview task-npc-map-preview">
        <div className="pokemon-map-preview-canvas" style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: '0 0' }}>
          {tiles.map((tile) => <img alt="" className="pokemon-map-preview-tile" draggable={false} height={TILE_SIZE} key={tileKey(location.z, tile.x, tile.y)} referrerPolicy="no-referrer" src={tile.src} style={{ left: (tile.x * TILE_SIZE) - location.x, top: (tile.y * TILE_SIZE) - location.y }} width={TILE_SIZE} />)}
          <span className="pokemon-map-preview-marker selected" aria-hidden="true" style={{ left: 0, top: 0 }}>
            {task.npc?.image_url ? <img alt="" draggable={false} referrerPolicy="no-referrer" src={task.npc.image_url} /> : <MapPin size={18} />}
          </span>
        </div>
        <span className="pokemon-map-region">{task.location || taskRegionLabel(task)} · {t('Andar {floor}', { floor: location.z })}</span>
      </div>
      <div className="pokemon-map-selected-location">
        <span className="pokemon-map-selected-icon"><MapPin size={18} /></span>
        <div><small>{npcName}</small><strong>{location.x.toLocaleString(locale)}, {location.y.toLocaleString(locale)}, {location.z}</strong><p>{task.location || taskRegionLabel(task)}</p></div>
        <button type="button" className="pokemon-map-copy-coordinates" onClick={copyCoordinates} title={t('Copiar coordenadas')} aria-label={t('Copiar coordenadas')}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
        <Link to={mapUrl}>{t('Abrir no mapa')} <ExternalLink size={13} /></Link>
      </div>
    </section>
  )
}
