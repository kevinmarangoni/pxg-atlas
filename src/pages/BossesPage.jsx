import { Check, Clock, ExternalLink, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DataStamp, DomainState, ToolHero } from '../components/ToolCommon'
import { useAtlasStorage } from '../data/AtlasStorageContext'
import { useGuidesData } from '../data/DomainData'

function saoPauloWeek() {
  const now = new Date()
  const shifted = new Date(now.getTime() - 3 * 3600000)
  const day = shifted.getUTCDay()
  const daysSinceMonday = (day + 6) % 7
  const monday = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() - daysSinceMonday, 10, 40))
  if (now < monday) monday.setUTCDate(monday.getUTCDate() - 7)
  const next = new Date(monday); next.setUTCDate(next.getUTCDate() + 7)
  return { key: monday.toISOString().slice(0, 10), next }
}
function countdown(target, now) {
  const minutes = Math.max(0, Math.ceil((target.getTime() - now) / 60000))
  return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h ${minutes % 60}min`
}

function OfficialBossDetails({ boss }) {
  return <>
    {boss.requirements?.length > 0 && <p><strong>Requisitos</strong>{boss.requirements.join(' · ')}</p>}
    {boss.official_recommendations?.length > 0 && <p><strong>Recomendações publicadas</strong>{boss.official_recommendations.join(' · ')}</p>}
    {boss.rotation?.length > 0 && <p><strong>Rotação publicada</strong>{boss.rotation.join(' · ')}</p>}
    {boss.mechanics?.length > 0 && <p><strong>Mecânicas</strong>{boss.mechanics.map((entry) => `${entry.title}: ${entry.content}`).join(' · ')}</p>}
  </>
}

export default function BossesPage() {
  const guides = useGuidesData()
  const { state, setBossComplete } = useAtlasStorage()
  const [now, setNow] = useState(Date.now())
  const week = useMemo(saoPauloWeek, [Math.floor(now / 3600000)])
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer) }, [])
  return (
    <DomainState loading={guides.loading} error={guides.error}>
      <div className="bosses-page page-frame">
        <ToolHero eyebrow="CONTEÚDO SEMANAL" title="Central de Bosses" description="Checklist semanal e acesso às mecânicas oficiais. Recomendações da Wiki ficam separadas das análises elementais do Atlas."><ShieldCheck size={50} /></ToolHero>
        <DataStamp metadata={guides.data?.metadata} />
        <section className="boss-reset"><Clock size={20} /><div><small>Próximo reset · segunda-feira 07:40 BRT</small><strong>{countdown(week.next, now)}</strong></div><span>Semana {week.key}</span></section>
        <div className="boss-grid">{(guides.data?.bosses || []).map((boss) => { const progressKey = `${boss.id}:${week.key}`; const done = Boolean(state.progress.bosses[progressKey]); return <article className={done ? 'completed' : ''} key={boss.id}><header><span><ShieldCheck size={23} /></span><div><small>Boss Fight oficial</small><h2>{boss.name.replace(/^Boss Fight\s*-\s*/i, '')}</h2></div><label><input type="checkbox" checked={done} onChange={(event) => setBossComplete(boss.id, week.key, event.target.checked)} /><span><Check size={14} /></span></label></header><div className="boss-source-separation"><div><strong>Publicado pela Wiki</strong><p>Requisitos, funções sugeridas, golpes restritos e mecânicas aparecem no spoiler oficial.</p></div><div><strong>Análise do Atlas</strong><p>Use a ficha do boss/Pokémon e o montador de time para consultar cobertura elemental sem misturar as fontes.</p></div></div><details><summary>Revelar mecânicas e estratégia</summary><OfficialBossDetails boss={boss} /><a href={boss.source_url} target="_blank" rel="noreferrer">Abrir guia oficial <ExternalLink size={13} /></a></details></article> })}</div>
      </div>
    </DomainState>
  )
}
