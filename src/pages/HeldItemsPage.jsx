import { Check, Gem, Search, Shield, Swords } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DataStamp, DomainState, ToolHero } from '../components/ToolCommon'
import { HELD_ITEMS, HELD_ITEMS_SOURCE, heldEffectLabel } from '../data/heldItems'
import { useCatalogData } from '../data/DomainData'

const REMOVAL_COSTS = { 1: 10, 2: 25, 3: 50, 4: 200, 5: 900, 6: 2500, 7: 5000, 8: 15000, 9: 30000 }
const FUSION_COSTS = { 1: 60, 2: 150, 3: 300, 4: 700, 5: 1000, 6: 1500, 7: 1500 }
const GOALS = {
  all: { label: 'Qualquer objetivo', ids: [] },
  damage: { label: 'Mais dano', ids: ['x-attack', 'x-critical', 'x-boost', 'x-elemental', 'x-poison', 'x-hellfire'] },
  survival: { label: 'Sobrevivência', ids: ['x-defense', 'x-block', 'x-vitality', 'x-harden', 'y-regeneration', 'y-cure'] },
  hunt: { label: 'Hunt e progressão', ids: ['x-lucky', 'x-experience', 'x-return'] },
  utility: { label: 'Controle e mobilidade', ids: ['x-accuracy', 'x-cooldown', 'y-control', 'y-teleport', 'y-wing'] },
}

const heldKey = (value) => String(value || '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-')
const tiersFor = (item) => (item?.tiers || []).filter((entry) => entry.value != null)

function effectLabel(item, tier) {
  const official = tiersFor(item).find((entry) => entry.tier === Number(tier))
  if (official) return `${official.value}${String(item.unit || '').startsWith('%') ? '%' : item.unit ? ` ${item.unit}` : ''}`
  return heldEffectLabel(item.id, tier, 400)
}

function HeldArt({ item }) {
  return item.iconUrl
    ? <span className="held-page-art" style={{ backgroundImage: `url("${item.iconUrl}")` }} />
    : <span className="held-page-art">{item.slot.toUpperCase()}</span>
}

function synchronizeHeldItems(officialItems = []) {
  if (!officialItems.length) return HELD_ITEMS
  const staticByKey = new Map(HELD_ITEMS.map((item) => [heldKey(item.name), item]))
  const synchronized = officialItems.map((entry) => {
    const base = staticByKey.get(heldKey(entry.name))
    return {
      ...base,
      id: base?.id || heldKey(entry.name),
      name: entry.name,
      slot: entry.slot || base?.slot || 'x',
      category: entry.category || base?.category || 'Held Item',
      iconUrl: entry.image_url || base?.iconUrl || null,
      tiers: entry.tiers?.length ? entry.tiers : (base?.tiers || []),
      unit: entry.unit || base?.unit || '',
      description: entry.description || entry.values?.at(-1) || base?.description || 'Efeito publicado na Wiki oficial.',
      source_url: entry.source_url,
      revision_id: entry.revision_id,
    }
  })
  const synchronizedKeys = new Set(synchronized.map((item) => heldKey(item.name)))
  return [...synchronized, ...HELD_ITEMS.filter((item) => !synchronizedKeys.has(heldKey(item.name)))]
}

export default function HeldItemsPage() {
  const catalog = useCatalogData()
  const [query, setQuery] = useState('')
  const [slot, setSlot] = useState('all')
  const [goal, setGoal] = useState('all')
  const [compare, setCompare] = useState([])
  const heldItems = useMemo(() => synchronizeHeldItems(catalog.data?.held_items), [catalog.data])
  const categories = [...new Set(heldItems.map((item) => item.category))]
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pt-BR')
    return heldItems.filter((item) => (
      (!needle || `${item.name} ${item.description} ${item.category}`.toLocaleLowerCase('pt-BR').includes(needle))
      && (slot === 'all' || item.slot === slot)
      && (goal === 'all' || GOALS[goal].ids.includes(item.id))
    ))
  }, [heldItems, query, slot, goal])
  const toggleCompare = (item) => setCompare((current) => (
    current.some((entry) => entry.id === item.id)
      ? current.filter((entry) => entry.id !== item.id)
      : current.length < 3 ? [...current, { id: item.id, tier: tiersFor(item).at(-1)?.tier || 1 }] : current
  ))

  return (
    <DomainState loading={catalog.loading} error={catalog.error}>
      <div className="held-page page-frame">
        <ToolHero eyebrow="EQUIPAMENTOS" title="Held Items" description="Compare efeitos, tiers e custos oficiais. As indicações são regras explicáveis por objetivo, não uma simulação de DPS."><Gem size={50} /></ToolHero>
        <DataStamp metadata={catalog.data?.metadata} />
        <section className="held-filters">
          <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar held ou efeito" /></label>
          <select value={slot} onChange={(event) => setSlot(event.target.value)}><option value="all">Held X e Y</option><option value="x">Somente X</option><option value="y">Somente Y</option></select>
          <select value={goal} onChange={(event) => setGoal(event.target.value)}>{Object.entries(GOALS).map(([id, entry]) => <option value={id} key={id}>{entry.label}</option>)}</select>
        </section>
        {compare.length > 0 && (
          <section className="held-compare">
            <header><div><small>Comparação</small><h2>{compare.length}/3 Helds</h2></div><button type="button" onClick={() => setCompare([])}>Limpar</button></header>
            <div>{compare.map((selected) => {
              const item = heldItems.find((entry) => entry.id === selected.id)
              if (!item) return null
              const tiers = tiersFor(item)
              return <article key={item.id}><HeldArt item={item} /><h3>{item.name}</h3><select value={selected.tier} onChange={(event) => setCompare((current) => current.map((entry) => entry.id === item.id ? { ...entry, tier: Number(event.target.value) } : entry))}>{tiers.length ? tiers.map((tier) => <option value={tier.tier} key={tier.tier}>Tier {tier.tier}</option>) : <option value="1">Sem tier</option>}</select><strong>{effectLabel(item, selected.tier)}</strong><p>{item.description}</p><dl><div><dt>Remoção no Apolo</dt><dd>{REMOVAL_COSTS[selected.tier] ? `${REMOVAL_COSTS[selected.tier].toLocaleString('pt-BR')}K` : 'Não publicado'}</dd></div><div><dt>Fusão</dt><dd>{FUSION_COSTS[selected.tier] ? `3 Helds + ${FUSION_COSTS[selected.tier].toLocaleString('pt-BR')}K` : 'Tier sem avanço comum'}</dd></div></dl></article>
            })}</div>
          </section>
        )}
        <div className="held-category-list">{categories.map((category) => {
          const entries = filtered.filter((item) => item.category === category)
          if (!entries.length) return null
          return <section key={category}><header><h2>{category}</h2><b>{entries.length}</b></header><div>{entries.map((item) => {
            const selected = compare.some((entry) => entry.id === item.id)
            const recommended = goal !== 'all' && GOALS[goal].ids.includes(item.id)
            const tiers = tiersFor(item)
            return <article className={selected ? 'selected' : ''} key={item.id}><HeldArt item={item} /><div><span>{item.slot.toUpperCase()}</span><h3>{item.name}</h3><p>{item.description}</p><small>{tiers.length ? `Tiers ${tiers.map((entry) => entry.tier).join(', ')}` : 'Sem tier numérico'}</small>{recommended && <b className="held-recommended"><Check size={12} />Indicado para {GOALS[goal].label.toLowerCase()}</b>}</div><button type="button" onClick={() => toggleCompare(item)} disabled={!selected && compare.length >= 3}>{selected ? <><Check size={14} />Comparando</> : 'Comparar'}</button></article>
          })}</div></section>
        })}</div>
        <section className="held-rules"><Swords size={18} /><div><strong>Fusão oficial</strong><p>São necessários três Held Items do mesmo tier e a taxa correspondente. O resultado é aleatório e X-Block/X-Upgrade não entram em fusões.</p></div><Shield size={18} /><div><strong>Equipamento seguro</strong><p>Substituir diretamente um Held do mesmo tipo destrói o anterior; remova primeiro no NPC Apolo.</p></div><a href={HELD_ITEMS_SOURCE} target="_blank" rel="noreferrer">Ver regras completas na Wiki</a></section>
      </div>
    </DomainState>
  )
}
