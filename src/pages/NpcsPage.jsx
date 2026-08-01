import { ExternalLink, MapPin, Search, Store, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataStamp, DomainState, ToolHero } from '../components/ToolCommon'
import { useGuidesData } from '../data/DomainData'
import { usePokemonData } from '../data/PokemonDataContext'

const normalized = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim()

export default function NpcsPage() {
  const guides = useGuidesData()
  const { tasks } = usePokemonData()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const categories = [...new Set((guides.data?.npcs || []).map((npc) => npc.category).filter(Boolean))]
  const locationsByNpc = useMemo(() => {
    const map = new Map()
    for (const task of tasks) {
      const coordinates = task.npc?.coordinates
      if (!task.npc?.name || !coordinates) continue
      const key = normalized(task.npc.name)
      const entries = map.get(key) || []
      entries.push({ task, coordinates })
      map.set(key, entries)
    }
    return map
  }, [tasks])
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pt-BR')
    return (guides.data?.npcs || []).filter((npc) => (!needle || `${npc.name} ${npc.description} ${npc.category}`.toLocaleLowerCase('pt-BR').includes(needle)) && (category === 'all' || npc.category === category))
  }, [guides.data, query, category])

  return (
    <DomainState loading={guides.loading} error={guides.error}>
      <div className="npcs-page page-frame">
        <ToolHero eyebrow="DIRETÓRIO DO MUNDO" title="NPCs importantes" description="Consulte funções oficiais e abra no mapa quando uma task publica coordenadas válidas para o NPC."><UserRound size={50} /></ToolHero>
        <DataStamp metadata={guides.data?.metadata} />
        <section className="npc-filters"><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar NPC ou função" /></label><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Todas as categorias</option>{categories.map((entry) => <option key={entry}>{entry}</option>)}</select><output>{filtered.length}</output></section>
        <div className="npc-grid">{filtered.map((npc) => { const locations = locationsByNpc.get(normalized(npc.name)) || []; return <article key={npc.id}>{npc.image_url ? <img src={npc.image_url} alt="" loading="lazy" /> : <span><UserRound size={22} /></span>}<div><small><Store size={12} />{npc.category}</small><h2>{npc.name}</h2><p>{npc.description || 'Função listada no diretório oficial de NPCs.'}</p><details><summary>Ver função e loja</summary>{npc.functions?.length > 0 && <p>{npc.functions.join(' · ')}</p>}{npc.shop?.length > 0 && <p>{npc.shop.join(' · ')}</p>}{npc.regions?.length > 0 && <p>{npc.regions.join(' · ')}</p>}</details></div><footer>{locations.slice(0, 2).map(({ task, coordinates }) => <Link key={task.id} to={`/map?region=${encodeURIComponent(task.region_label || task.region)}&layer=npc&npc=${encodeURIComponent(npc.name)}&x=${coordinates.x}&y=${coordinates.y}&z=${coordinates.z}`}><MapPin size={13} />{task.location} · {coordinates.raw}</Link>)}{npc.source_url && <a href={npc.source_url} target="_blank" rel="noreferrer">Wiki <ExternalLink size={12} /></a>}</footer></article> })}</div>
      </div>
    </DomainState>
  )
}
