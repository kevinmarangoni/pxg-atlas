import { Check, ExternalLink, Gift, MapPinned, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DataStamp, DomainState, ToolHero } from '../components/ToolCommon'
import { useAtlasStorage } from '../data/AtlasStorageContext'
import { useGuidesData } from '../data/DomainData'

function PublishedDetails({ quest }) {
  return <>
    <p><strong>Recompensas publicadas</strong>{quest.rewards_raw || 'Não informadas.'}</p>
    {quest.requirements?.length > 0 && <p><strong>Requisitos</strong>{quest.requirements.join(' · ')}</p>}
    {quest.dependencies?.length > 0 && <p><strong>Dependências</strong>{quest.dependencies.join(' · ')}</p>}
    {quest.steps?.length > 0 && <p><strong>Etapas</strong>{quest.steps.map((step) => `${step.title}: ${step.content}`).join(' · ')}</p>}
  </>
}

export default function QuestsPage() {
  const guides = useGuidesData()
  const { state, setQuestComplete } = useAtlasStorage()
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('all')
  const [access, setAccess] = useState('all')
  const [maxLevel, setMaxLevel] = useState(600)
  const regions = [...new Set((guides.data?.quests || []).flatMap((quest) => quest.regions || []))].sort()
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pt-BR')
    return (guides.data?.quests || []).filter((quest) => (!needle || `${quest.name} ${quest.rewards_raw} ${quest.category}`.toLocaleLowerCase('pt-BR').includes(needle)) && (region === 'all' || quest.regions.includes(region)) && (access === 'all' || (access === 'vip') === quest.vip) && quest.level <= maxLevel)
  }, [guides.data, query, region, access, maxLevel])
  const completed = filtered.filter((quest) => state.progress.quests[quest.id]).length

  return (
    <DomainState loading={guides.loading} error={guides.error}>
      <div className="quests-page page-frame">
        <ToolHero eyebrow="GUIA DE PROGRESSÃO" title="Quests do mundo PXG" description="Filtre por região e level, acompanhe o que concluiu e revele recompensas ou spoilers somente quando quiser."><MapPinned size={50} /></ToolHero>
        <DataStamp metadata={guides.data?.metadata} />
        <section className="quest-filters"><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar quest ou recompensa" /></label><select value={region} onChange={(event) => setRegion(event.target.value)}><option value="all">Todas as regiões</option>{regions.map((entry) => <option key={entry}>{entry}</option>)}</select><select value={access} onChange={(event) => setAccess(event.target.value)}><option value="all">VIP e Free</option><option value="free">Somente Free</option><option value="vip">Somente VIP</option></select><label className="quest-level"><span>Level máximo <b>{maxLevel}</b></span><input type="range" min="0" max="600" step="10" value={maxLevel} onChange={(event) => setMaxLevel(Number(event.target.value))} /></label><output>{completed}/{filtered.length}</output></section>
        <div className="quest-grid">{filtered.map((quest) => { const done = Boolean(state.progress.quests[quest.id]); return <article className={done ? 'completed' : ''} key={quest.id}><header>{quest.image_url && <img src={quest.image_url} alt="" loading="lazy" />}<div><small>{quest.regions.join(' · ')} · {quest.vip ? 'VIP' : 'Free'}</small><h2>{quest.name}</h2><span>Level {quest.level || 'livre'}</span></div><label><input type="checkbox" checked={done} onChange={(event) => setQuestComplete(quest.id, event.target.checked)} /><span><Check size={14} /></span></label></header><details><summary><Gift size={14} />Mostrar recompensas e spoiler</summary><PublishedDetails quest={quest} /><a href={quest.guide_url} target="_blank" rel="noreferrer">Abrir spoiler oficial <ExternalLink size={13} /></a></details></article> })}</div>
      </div>
    </DomainState>
  )
}
