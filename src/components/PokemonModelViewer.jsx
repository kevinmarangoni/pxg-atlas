import { ChevronLeft, ChevronRight, RotateCw, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PokemonImage } from './Common'

const VARIANT_LABELS = {
  normal: 'Normal',
  shiny: 'Shiny',
}

const SIDE_LABELS = {
  front: 'Frente',
  back: 'Costas',
}

function availableModelViews(model) {
  return {
    normal: {
      front: model?.normal_front_url || (model?.variant === 'normal' ? model?.front_url : null),
      back: model?.normal_back_url || (model?.variant === 'normal' ? model?.back_url : null),
    },
    shiny: {
      front: model?.shiny_front_url || (model?.variant === 'shiny' ? model?.front_url : null),
      back: model?.shiny_back_url || (model?.variant === 'shiny' ? model?.back_url : null),
    },
  }
}

export function PokemonModelViewer({ model, fallbackSrc, name }) {
  const views = useMemo(() => availableModelViews(model), [model])
  const availableVariants = Object.keys(views).filter((variant) => Object.values(views[variant]).some(Boolean))
  const preferredVariant = availableVariants.includes(model?.variant) ? model.variant : availableVariants[0] || 'normal'
  const [variant, setVariant] = useState(preferredVariant)
  const [side, setSide] = useState('front')
  const [dragging, setDragging] = useState(false)
  const pointerStart = useRef(null)

  const availableSides = Object.keys(views[variant] || {}).filter((candidate) => views[variant]?.[candidate])
  const activeSide = availableSides.includes(side) ? side : availableSides[0] || 'front'
  const activeSrc = views[variant]?.[activeSide] || fallbackSrc
  const canRotate = availableSides.length > 1

  useEffect(() => {
    setVariant(preferredVariant)
    setSide('front')
    pointerStart.current = null
    setDragging(false)
  }, [model?.asset_slug, model?.variant, preferredVariant])

  function selectVariant(nextVariant) {
    setVariant(nextVariant)
    const nextSides = Object.keys(views[nextVariant] || {}).filter((candidate) => views[nextVariant]?.[candidate])
    setSide(nextSides.includes(activeSide) ? activeSide : nextSides[0] || 'front')
  }

  function rotate(direction) {
    if (!canRotate) return
    const currentIndex = availableSides.indexOf(activeSide)
    const nextIndex = (currentIndex + direction + availableSides.length) % availableSides.length
    setSide(availableSides[nextIndex])
  }

  function handlePointerDown(event) {
    if (!canRotate || event.button !== 0) return
    pointerStart.current = { id: event.pointerId, x: event.clientX }
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setDragging(true)
  }

  function finishPointerGesture(event) {
    if (!pointerStart.current || pointerStart.current.id !== event.pointerId) return
    const distance = event.clientX - pointerStart.current.x
    if (Math.abs(distance) >= 28) rotate(distance < 0 ? 1 : -1)
    pointerStart.current = null
    setDragging(false)
  }

  function cancelPointerGesture() {
    pointerStart.current = null
    setDragging(false)
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      rotate(-1)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      rotate(1)
    }
  }

  return (
    <div className="pokemon-model-viewer">
      <div
        className={`model-drag-surface ${canRotate ? 'rotatable' : ''} ${dragging ? 'dragging' : ''}`}
        role="group"
        tabIndex={canRotate ? 0 : undefined}
        aria-label={`${name}: ${SIDE_LABELS[activeSide]}, versão ${VARIANT_LABELS[variant]}`}
        onKeyDown={canRotate ? handleKeyDown : undefined}
        onPointerDown={handlePointerDown}
        onPointerUp={finishPointerGesture}
        onPointerCancel={cancelPointerGesture}
      >
        <PokemonImage key={activeSrc} src={activeSrc} fallbackSrc={activeSide === 'front' ? fallbackSrc : null} name={`${name} — ${SIDE_LABELS[activeSide]}`} className="detail-pokemon-image" />
      </div>

      {availableVariants.length > 1 && (
        <div className="model-variant-switch" aria-label="Variação visual">
          {availableVariants.map((candidate) => (
            <button
              type="button"
              className={candidate === variant ? 'active' : ''}
              aria-pressed={candidate === variant}
              onClick={() => selectVariant(candidate)}
              key={candidate}
            >
              {candidate === 'shiny' && <Sparkles size={13} />}
              {VARIANT_LABELS[candidate]}
            </button>
          ))}
        </div>
      )}

      {canRotate && (
        <>
          <div className="model-rotation-controls">
            <button type="button" onClick={() => rotate(-1)} aria-label="Mostrar vista anterior"><ChevronLeft size={17} /></button>
            <span aria-live="polite"><RotateCw size={14} />{SIDE_LABELS[activeSide]}</span>
            <button type="button" onClick={() => rotate(1)} aria-label="Mostrar próxima vista"><ChevronRight size={17} /></button>
          </div>
          <small className="model-gesture-hint">Arraste para girar</small>
        </>
      )}
    </div>
  )
}
