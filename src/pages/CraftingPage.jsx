import { AlertTriangle, Boxes, Clock, Coins, Save, Search, Trash2, Wrench } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DataStamp, DomainState, PriceField, PriceProfileBar, ToolHero } from '../components/ToolCommon'
import { useAtlasStorage } from '../data/AtlasStorageContext'
import { useCatalogData, useCraftingData, useLootData } from '../data/DomainData'
import { calculateCraftingPlan, recipeCostOptions, recipesByOutput } from '../lib/crafting'
import { buildLootItemIndex, lootRelationsForItem } from '../lib/loot'

const formatNumber = (value) => Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
const formatDuration = (seconds) => seconds >= 3600 ? `${formatNumber(seconds / 3600)} h` : seconds >= 60 ? `${formatNumber(seconds / 60)} min` : `${seconds || 0} s`

export default function CraftingPage() {
  const catalog = useCatalogData()
  const crafting = useCraftingData()
  const loot = useLootData()
  const { state, activePriceProfile, getPrice, setPrice, saveCraftingProject, deleteCraftingProject } = useAtlasStorage()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [inventory, setInventory] = useState({})
  const [selections, setSelections] = useState({})
  const [message, setMessage] = useState('')
  const itemById = useMemo(() => new Map((catalog.data?.items || []).map((item) => [item.id, item])), [catalog.data])
  const byOutput = useMemo(() => recipesByOutput(crafting.data?.recipes || []), [crafting.data])
  const craftable = useMemo(() => [...byOutput.keys()].map((itemId) => itemById.get(itemId)).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [byOutput, itemById])
  const selectedId = params.get('item') || craftable[0]?.id || ''
  const selectedItem = itemById.get(selectedId)
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pt-BR')
    return craftable.filter((item) => !needle || item.name.toLocaleLowerCase('pt-BR').includes(needle)).slice(0, 30)
  }, [craftable, query])
  const priceMap = useMemo(() => Object.fromEntries((catalog.data?.items || []).map((item) => [item.id, getPrice(item.id)])), [catalog.data, getPrice, activePriceProfile])
  const plan = useMemo(() => selectedId ? calculateCraftingPlan({ targetItemId: selectedId, targetQuantity: quantity, recipes: crafting.data?.recipes || [], inventory, selections, prices: priceMap }) : null, [selectedId, quantity, crafting.data, inventory, selections, priceMap])
  const lootItemIndex = useMemo(() => buildLootItemIndex(loot.data), [loot.data])
  const lootSources = useMemo(() => (plan?.purchases || []).map((purchase) => {
    const item = itemById.get(purchase.item_id)
    return { purchase, item, relations: lootRelationsForItem(loot.data, item, lootItemIndex) }
  }).filter((entry) => entry.item && entry.relations.length), [itemById, loot.data, lootItemIndex, plan])

  const chooseItem = (itemId) => { setParams({ item: itemId }); setQuery(''); setInventory({}); setSelections({}); setMessage('') }
  const save = () => {
    if (!selectedItem) return
    saveCraftingProject({ name: `${quantity}x ${selectedItem.name}`, targetItemId: selectedId, quantity, inventory, selections, priceProfileId: state.activePriceProfileId })
    setMessage('Projeto salvo no navegador.')
  }
  const loadProject = (project) => {
    setParams({ item: project.targetItemId }); setQuantity(project.quantity); setInventory(project.inventory || {}); setSelections(project.selections || {}); setMessage(`Projeto “${project.name}” carregado.`)
  }

  return (
    <DomainState loading={catalog.loading || crafting.loading || loot.loading} error={catalog.error || crafting.error || loot.error}>
      <div className="crafting-page page-frame">
        <ToolHero eyebrow="PLANEJADOR DE PRODUÇÃO" title="Crafting sem desperdício" description="Escolha o item final, desconte seu inventário e veja receitas, lotes, compras e custo no perfil ativo."><Wrench size={50} /></ToolHero>
        <DataStamp metadata={crafting.data?.metadata} />
        <PriceProfileBar compact />
        <div className="crafting-layout">
          <aside className="crafting-picker">
            <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar item fabricável" /></label>
            <div>{filtered.map((item) => <button type="button" className={item.id === selectedId ? 'selected' : ''} key={item.id} onClick={() => chooseItem(item.id)}>{item.image_url && <img src={item.image_url} alt="" />}<span><strong>{item.name}</strong><small>{byOutput.get(item.id)?.length || 0} receita(s)</small></span></button>)}</div>
          </aside>
          <main className="crafting-workspace">
            {selectedItem && <section className="crafting-target"><div>{selectedItem.image_url && <img src={selectedItem.image_url} alt="" />}<span><small>Produzir</small><h2>{selectedItem.name}</h2></span></div><label><span>Quantidade</span><input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} /></label><button type="button" onClick={save}><Save size={15} />Salvar projeto</button></section>}
            {message && <output className="crafting-message">{message}</output>}
            {plan && <>
              <section className="crafting-summary"><div><Boxes size={18} /><span><small>Etapas</small><strong>{plan.crafts.length}</strong></span></div><div><Coins size={18} /><span><small>Custo conhecido</small><strong>{formatNumber(plan.totalCost)}K</strong></span></div><div><Clock size={18} /><span><small>Tempo de craft</small><strong>{formatDuration(plan.totalTimeSeconds)}</strong></span></div>{plan.missingPrice && <div className="warning"><AlertTriangle size={18} /><span><small>Preços faltando</small><strong>{plan.purchases.filter((entry) => entry.cost === null).length}</strong></span></div>}</section>
              {plan.cycles.length > 0 && <p className="craft-cycle-warning"><AlertTriangle size={15} /> Ciclo detectado em {plan.cycles.map((id) => itemById.get(id)?.name || id).join(', ')}; esses materiais foram tratados como compra.</p>}
              <section className="crafting-demand"><header><h3>Inventário considerado</h3><p>O mesmo item é descontado uma única vez, mesmo quando aparece em mais de um ramo.</p></header><div>{Object.entries(plan.demand).filter(([itemId]) => itemId !== selectedId).map(([itemId, required]) => { const item = itemById.get(itemId); return <label key={itemId}>{item?.image_url && <img src={item.image_url} alt="" />}<span><strong>{item?.name || itemId}</strong><small>Necessário: {formatNumber(required)}</small></span><input type="number" min="0" value={inventory[itemId] || ''} onChange={(event) => setInventory((current) => ({ ...current, [itemId]: Math.max(0, Number(event.target.value) || 0) }))} placeholder="Tenho" /></label> })}</div></section>
              <section className="crafting-steps">
                <header><h3>Etapas de fabricação</h3><b>{plan.crafts.length}</b></header>
                {plan.crafts.map((craft) => {
                  const item = itemById.get(craft.item_id)
                  const options = byOutput.get(craft.item_id) || []
                  const costs = recipeCostOptions(craft.item_id, crafting.data?.recipes || [], priceMap)
                  const allKnown = costs.length > 1 && costs.every((option) => option.known)
                  const cheapestId = allKnown ? costs[0].recipe.id : null
                  return <article key={craft.item_id}><div>{item?.image_url && <img src={item.image_url} alt="" />}<span><strong>{craft.batches} craft(s) de {item?.name || craft.item_id}</strong><small>Produz {formatNumber(craft.produced)} · sobra {formatNumber(craft.surplus)} · {craft.profession} {craft.rank && `Rank ${craft.rank}`}</small></span></div>{options.length > 1 && <select value={selections[craft.item_id] || craft.recipe_id} onChange={(event) => setSelections((current) => ({ ...current, [craft.item_id]: event.target.value }))}>{options.map((recipe) => { const cost = costs.find((option) => option.recipe.id === recipe.id); return <option key={recipe.id} value={recipe.id}>{recipe.profession} · Rank {recipe.rank || '—'} · {recipe.output.quantity} por lote{recipe.id === cheapestId ? ` · mais barata (${formatNumber(cost.unitCost)}K/un)` : ''}</option> })}</select>}</article>
                })}
              </section>
              <section className="crafting-purchases"><header><h3>Lista de compras</h3><b>{plan.purchases.length}</b></header><div>{plan.purchases.map((purchase) => { const item = itemById.get(purchase.item_id); return <article key={purchase.item_id}>{item?.image_url && <img src={item.image_url} alt="" />}<span><strong>{formatNumber(purchase.quantity)}x {item?.name || purchase.item_id}</strong><small>{purchase.cost === null ? 'Informe o preço' : `${formatNumber(purchase.cost)}K`}</small></span><PriceField item={item?.name || purchase.item_id} value={getPrice(purchase.item_id)} onChange={(value) => setPrice(purchase.item_id, value)} /></article>})}</div>{!plan.purchases.length && <p>Seu inventário e as receitas cobrem todos os materiais.</p>}</section>
              {lootSources.length > 0 && <section className="crafting-loot-sources"><header><h3>Fontes de loot dos materiais</h3><span>Pokémon relacionados ao que falta comprar</span></header>{lootSources.map(({ item, purchase, relations }) => <article key={item.id}><div><strong>{item.name}</strong><small>{formatNumber(purchase.quantity)}x necessário</small></div><div className="drop-links">{relations.slice(0, 20).map((relation) => { const name = relation.pokemon.name; return <span key={relation.pokemon.id}>{name}<small>{relation.contexts.length ? `${relation.contexts.length} contexto(s)` : 'Loot relacionado'}</small></span> })}</div></article>)}</section>}
            </>}
          </main>
          <aside className="saved-projects"><header><h3>Projetos salvos</h3><b>{state.craftingProjects.length}</b></header>{state.craftingProjects.map((project) => <article key={project.id}><button type="button" onClick={() => loadProject(project)}><strong>{project.name}</strong><small>{itemById.get(project.targetItemId)?.name || project.targetItemId}</small></button><button type="button" onClick={() => deleteCraftingProject(project.id)} aria-label={`Excluir ${project.name}`}><Trash2 size={14} /></button></article>)}{!state.craftingProjects.length && <p>Salve um projeto para continuar depois.</p>}<Link to="/items">Abrir ItemDex</Link></aside>
        </div>
      </div>
    </DomainState>
  )
}
