import { ChevronDown, Crosshair, Gift, MapPin, PackageOpen, Route, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { pokemonPath } from '../lib/pokemon'
import {
  REWARD_KIND_LABELS,
  formatTaskNumber,
  taskActionLabel,
  taskCoordinates,
  taskLevel,
  taskNightmareLevel,
  taskRegionLabel,
  taskTargetCount,
} from '../lib/tasks'

function Artwork({ src, name, className = '' }) {
  return (
    <span className={`task-artwork ${className}`}>
      {src ? <img src={src} alt="" loading="lazy" /> : <UserRound size={20} />}
      <span className="sr-only">{name}</span>
    </span>
  )
}

function PokemonTarget({ target }) {
  const match = target.matches?.[0]
  return match
    ? <Link to={pokemonPath({ source_url: match.source_url })}>{target.name}</Link>
    : <span>{target.name}</span>
}

function TaskEntity({ entity }) {
  const quantity = formatTaskNumber(entity.quantity)
  const targets = entity.pokemon_targets ?? []
  return (
    <div className={`task-entity kind-${entity.kind || 'other'}`}>
      <Artwork src={entity.image_url} name={entity.name} />
      <div>
        <strong>{quantity && <b>{quantity}×</b>}{entity.name}</strong>
        {targets.length > 0 && <span className="task-target-links">{targets.map((target, index) => <PokemonTarget key={`${target.name}-${index}`} target={target} />)}</span>}
        {entity.coordinates?.length > 0 && <small><MapPin size={11} />{entity.coordinates.map((coordinate) => coordinate.raw || [coordinate.x, coordinate.y, coordinate.z].filter((value) => value !== null && value !== undefined).join(', ')).join(' · ')}</small>}
      </div>
    </div>
  )
}

function TaskStep({ step }) {
  return (
    <article className="task-step">
      <header><b>Passo {step.published_number ?? step.number}</b><span>{taskActionLabel(step)}</span></header>
      {step.entities?.length > 0 ? <div className="task-entity-grid">{step.entities.map((entity, index) => <TaskEntity entity={entity} key={`${entity.name}-${index}`} />)}</div> : <p>{step.raw_text}</p>}
      {step.raw_text && <details className="task-source-text"><summary>Texto publicado</summary><p>{step.raw_text}</p></details>}
    </article>
  )
}

function TaskReward({ reward }) {
  const amount = formatTaskNumber(reward.amount)
  const quantity = formatTaskNumber(reward.quantity)
  const value = reward.kind === 'experience' && amount ? `${amount} XP` : quantity ? `${quantity}×` : null
  return (
    <div className={`task-reward kind-${reward.kind || 'other'}`}>
      <Artwork src={reward.image_url} name={reward.name} className="reward" />
      <div><small>{REWARD_KIND_LABELS[reward.kind] || 'Recompensa'}</small><strong>{value && <b>{value}</b>}{reward.name}</strong>{reward.step_number && <span>Após o passo {reward.step_number}</span>}</div>
    </div>
  )
}

export default function TaskCard({ task, expanded = false }) {
  const level = taskLevel(task)
  const nightmareLevel = taskNightmareLevel(task)
  const coordinates = taskCoordinates(task)
  const targetCount = taskTargetCount(task)

  return (
    <article className={`task-card region-${task.region}`} id={`task-${task.id}`}>
      <header className="task-card-heading">
        <Artwork src={task.npc?.image_url} name={task.npc?.name} className="npc" />
        <div className="task-card-title">
          <span><b>{taskRegionLabel(task)}</b>{task.location}</span>
          <h2>{task.npc?.name || 'NPC não informado'}</h2>
          {coordinates && <small><MapPin size={12} />{coordinates}</small>}
        </div>
        <div className="task-requirement-badges">
          {level !== null && <span><small>Level</small><b>{level}</b></span>}
          {nightmareLevel !== null && <span className="nightmare"><small>NW level</small><b>{nightmareLevel}</b></span>}
        </div>
      </header>

      <div className="task-card-facts">
        <span><Route size={15} /><b>{task.steps?.length || 0}</b>{task.steps?.length === 1 ? 'passo' : 'passos'}</span>
        <span><Crosshair size={15} /><b>{targetCount}</b>{targetCount === 1 ? 'alvo Pokémon' : 'alvos Pokémon'}</span>
        <span><Gift size={15} /><b>{task.rewards?.length || 0}</b>{task.rewards?.length === 1 ? 'recompensa' : 'recompensas'}</span>
      </div>

      {task.requirements?.additional?.length > 0 && <div className="task-extra-requirements">{task.requirements.additional.map((requirement, index) => <span key={`${requirement}-${index}`}>{requirement}</span>)}</div>}

      <details className="task-card-details" open={expanded || undefined}>
        <summary><span><PackageOpen size={15} />Ver objetivos e recompensas</span><ChevronDown size={16} /></summary>
        <div className="task-card-content">
          <section className="task-steps"><h3>Objetivos</h3>{task.steps?.map((step, index) => <TaskStep step={step} key={`${step.number}-${index}`} />)}</section>
          <section className="task-rewards"><h3>Recompensas</h3><div>{task.rewards?.map((reward, index) => <TaskReward reward={reward} key={`${reward.name}-${index}`} />)}</div></section>
        </div>
      </details>
    </article>
  )
}

