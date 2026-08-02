import { ClipboardList, Gift, MapPin, Route, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../data/LanguageContext'
import { normalizedMapName, useMapData } from '../data/MapDataContext'
import { usePokemonData } from '../data/PokemonDataContext'
import { displayName } from '../lib/pokemon'
import { formatTaskNumber, taskActionLabel, taskRegionLabel } from '../lib/tasks'
import { PokemonMapPreview } from './PokemonMapPreview'
import { TaskNpcMapPreview } from './TaskNpcMapPreview'

function groupTaskOccurrences(occurrences, tasksById) {
  const groups = new Map()
  for (const occurrence of occurrences) {
    const group = groups.get(occurrence.task_id) || { task: tasksById.get(occurrence.task_id), occurrences: [] }
    group.occurrences.push(occurrence)
    groups.set(occurrence.task_id, group)
  }
  return [...groups.values()]
}

export function PokemonLocationOverlay({ pokemon, initialTab = 'map', onClose }) {
  const { t } = useLanguage()
  const [tab, setTab] = useState(initialTab)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { data: mapData, byPokemonName: mapLocationsByPokemon, tilePositionSet, localTilePositionSet, localTileHome } = useMapData()
  const { tasksById } = usePokemonData()
  const name = displayName(pokemon)
  const mapLocations = mapLocationsByPokemon.get(normalizedMapName(name)) ?? []
  const taskGroups = useMemo(
    () => groupTaskOccurrences(pokemon.task_occurrences ?? [], tasksById),
    [pokemon, tasksById],
  )

  return (
    <div className="pokemon-location-overlay" onClick={(event) => { event.stopPropagation(); onClose() }}>
      <div
        className="pokemon-location-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t('Localização e tasks de {name}', { name })}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="pokemon-location-header">
          <div className="pokemon-location-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'map'} className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}>
              <MapPin size={14} />{t('Mapa')}{mapLocations.length > 0 && <b>{mapLocations.length}</b>}
            </button>
            <button type="button" role="tab" aria-selected={tab === 'tasks'} className={tab === 'tasks' ? 'active' : ''} onClick={() => setTab('tasks')}>
              <ClipboardList size={14} />{t('Tasks')}{taskGroups.length > 0 && <b>{taskGroups.length}</b>}
            </button>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title={t('Fechar')} aria-label={t('Fechar')}>
            <X size={18} />
          </button>
        </header>

        <div className="pokemon-location-body">
          {tab === 'map' ? (
            mapLocations.length > 0 ? (
              <PokemonMapPreview
                name={name}
                locations={mapLocations}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
                cdnHome={mapData?.metadata?.cdn_home}
                tilePositionSet={tilePositionSet}
                localTilePositionSet={localTilePositionSet}
                localTileHome={localTileHome}
                mapSources={mapData?.map_sources}
              />
            ) : (
              <div className="pokemon-location-empty">
                <MapPin size={22} />
                <strong>{t('Sem localização mapeada')}</strong>
                <span>{t('Este Pokémon ainda não tem coordenadas publicadas no mapa interativo.')}</span>
              </div>
            )
          ) : taskGroups.length > 0 ? (
            <div className="pokemon-location-task-list">
              {taskGroups.map(({ task, occurrences }) => {
                const fallback = occurrences[0]
                return (
                  <article className="pokemon-location-task-card" key={fallback.task_id}>
                    <header>
                      <span className="pokemon-task-npc-art">{task?.npc?.image_url ? <img src={task.npc.image_url} alt="" loading="lazy" /> : <ClipboardList size={18} />}</span>
                      <div><small>{task ? taskRegionLabel(task) : fallback.region} · {task?.location || fallback.location}</small><strong>{task?.npc?.name || fallback.npc}</strong></div>
                    </header>
                    <div className="pokemon-location-task-steps">
                      {occurrences.map((occurrence, index) => (
                        <span key={`${occurrence.step_number}-${index}`}>
                          <Route size={12} />{t('Passo {step}', { step: occurrence.step_number })} · <strong>{taskActionLabel(occurrence.action)}{occurrence.quantity ? ` ${formatTaskNumber(occurrence.quantity)}×` : ''}</strong>
                        </span>
                      ))}
                    </div>
                    {task?.rewards?.length > 0 && (
                      <div className="pokemon-location-task-rewards">
                        <Gift size={12} />
                        {task.rewards.slice(0, 3).map((reward, index) => <b key={`${reward.name}-${index}`}>{reward.raw || reward.name}</b>)}
                      </div>
                    )}
                    {task && <TaskNpcMapPreview task={task} />}
                    <Link to={`/tasks?task=${encodeURIComponent(fallback.task_id)}`} onClick={onClose}>{t('Abrir task completa')}</Link>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="pokemon-location-empty">
              <ClipboardList size={22} />
              <strong>{t('Nenhuma task encontrada')}</strong>
              <span>{t('Este Pokémon não aparece como objetivo em nenhuma task publicada.')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
