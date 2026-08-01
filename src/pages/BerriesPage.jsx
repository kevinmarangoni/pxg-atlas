import { Clock, Search, Sprout, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DataStamp, DomainState, ToolHero } from '../components/ToolCommon'
import { useAtlasStorage } from '../data/AtlasStorageContext'
import { useCatalogData } from '../data/DomainData'

const NUMBER_WORDS = { uma: 1, um: 1, one: 1, tres: 3, three: 3, seis: 6, six: 6, oito: 8, eight: 8, dez: 10, ten: 10, quatorze: 14, fourteen: 14, dezoito: 18, eighteen: 18, vinte: 20, twenty: 20, trinta: 30, thirty: 30, quarenta: 40, forty: 40 }
function hoursFrom(value) {
  const text = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const numeric = Number(text.match(/[\d.,]+/)?.[0]?.replace(',', '.'))
  if (Number.isFinite(numeric)) return /min/.test(text) ? numeric / 60 : numeric
  return Object.entries(NUMBER_WORDS).find(([word]) => text.includes(word))?.[1] || null
}
function remaining(endAt, now) {
  const milliseconds = new Date(endAt).getTime() - now
  if (milliseconds <= 0) return 'Pronta para colher'
  const minutes = Math.ceil(milliseconds / 60000)
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`
}

export default function BerriesPage() {
  const catalog = useCatalogData()
  const { state, setBerryTimers } = useAtlasStorage()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer) }, [])
  const categories = [...new Set((catalog.data?.berries || []).map((berry) => berry.category).filter(Boolean))]
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pt-BR')
    return (catalog.data?.berries || []).filter((berry) => (!needle || `${berry.name} ${berry.effect}`.toLocaleLowerCase('pt-BR').includes(needle)) && (category === 'all' || berry.category === category))
  }, [catalog.data, query, category])
  const addTimer = (berry) => {
    const hours = hoursFrom(berry.ripening)
    if (!hours) return
    const startedAt = new Date().toISOString()
    setBerryTimers((current) => [...current, { id: `berry-${Date.now()}-${berry.id}`, berryId: berry.id, name: berry.name, image_url: berry.image_url, startedAt, endAt: new Date(Date.now() + hours * 3600000).toISOString() }])
  }

  return (
    <DomainState loading={catalog.loading} error={catalog.error}>
      <div className="berries-page page-frame">
        <ToolHero eyebrow="PLANTIO E PROTEÇÃO" title="BerryDex" description="Consulte reduções elementais, imunidades, duração e acompanhe o amadurecimento das suas plantas."><Sprout size={50} /></ToolHero>
        <DataStamp metadata={catalog.data?.metadata} />
        <section className="berry-timers"><header><div><Clock size={18} /><span><small>Seus plantios</small><h2>{state.berryTimers.length} timers</h2></span></div></header><div>{state.berryTimers.map((timer) => <article className={new Date(timer.endAt).getTime() <= now ? 'ready' : ''} key={timer.id}>{timer.image_url && <img src={timer.image_url} alt="" />}<span><strong>{timer.name}</strong><small>{remaining(timer.endAt, now)}</small></span><button type="button" onClick={() => setBerryTimers((current) => current.filter((entry) => entry.id !== timer.id))}><Trash2 size={14} /></button></article>)}{!state.berryTimers.length && <p>Inicie um timer em uma berry abaixo.</p>}</div></section>
        <section className="berry-filters"><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar berry ou efeito" /></label><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Todas as categorias</option>{categories.map((entry) => <option key={entry}>{entry}</option>)}</select><output>{filtered.length}</output></section>
        <div className="berry-grid">{filtered.map((berry) => <article key={berry.id}>{berry.image_url && <img src={berry.image_url} alt="" />}<div><small>{berry.category}</small><h2>{berry.name}</h2><p>{berry.effect}</p></div><dl><div><dt>Efeito</dt><dd>{berry.duration || '—'}</dd></div><div><dt>Amadurece</dt><dd>{berry.ripening || '—'}</dd></div><div><dt>Apodrece</dt><dd>{berry.rotting || '—'}</dd></div></dl><button type="button" onClick={() => addTimer(berry)} disabled={!hoursFrom(berry.ripening)}><Clock size={14} />Iniciar plantio</button></article>)}</div>
      </div>
    </DomainState>
  )
}

