import { Database, LoaderCircle, Plus, Server, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { DataError } from './Common'
import { useAtlasStorage } from '../data/AtlasStorageContext'

export function DomainState({ loading, error, children }) {
  if (loading) return <section className="domain-state" aria-live="polite"><LoaderCircle className="spin" size={28} /><strong>Carregando este catálogo…</strong><span>O restante do Atlas continua disponível.</span></section>
  if (error) return <DataError error={error} />
  return children
}

export function DataStamp({ metadata }) {
  if (!metadata) return null
  const date = metadata.generated_at ? new Date(metadata.generated_at).toLocaleString('pt-BR') : 'não informada'
  return (
    <div className={`data-stamp ${metadata.complete ? 'complete' : 'partial'}`}>
      <Database size={14} />
      <span>Wiki oficial · atualização {date}</span>
      <b>{metadata.complete ? 'Completo' : 'Parcial'}</b>
    </div>
  )
}

export function PriceProfileBar({ compact = false }) {
  const { state, activePriceProfile, createPriceProfile, selectPriceProfile, deletePriceProfile } = useAtlasStorage()
  const [name, setName] = useState('')
  const add = () => {
    const value = name.trim()
    if (!value) return
    createPriceProfile(value)
    setName('')
  }
  return (
    <section className={`price-profile-bar ${compact ? 'compact' : ''}`}>
      <div className="price-profile-current"><Server size={16} /><span><small>Perfil de preços</small><strong>{activePriceProfile?.name}</strong></span></div>
      <select value={state.activePriceProfileId} onChange={(event) => selectPriceProfile(event.target.value)} aria-label="Selecionar perfil de preços">
        {state.priceProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
      </select>
      {!compact && <div className="price-profile-create"><input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') add() }} placeholder="Nome do servidor" /><button type="button" onClick={add} disabled={!name.trim()}><Plus size={14} />Criar</button></div>}
      {!compact && state.priceProfiles.length > 1 && <button className="price-profile-delete" type="button" onClick={() => deletePriceProfile(state.activePriceProfileId)}><Trash2 size={14} />Excluir</button>}
    </section>
  )
}

export function PriceField({ item, value, onChange, label }) {
  return (
    <label className="market-price-field">
      <span>{label || item}</span>
      <div><input type="number" min="0" step="0.01" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Preço" /><b>K</b></div>
    </label>
  )
}

export function ToolHero({ eyebrow, title, description, children }) {
  return (
    <section className="tool-hero">
      <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
      {children}
    </section>
  )
}
