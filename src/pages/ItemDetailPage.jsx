import { ArrowLeft, ExternalLink, Package, Wrench } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { DataStamp, DomainState } from '../components/ToolCommon'
import { useCatalogData, useCraftingData, useLootData } from '../data/DomainData'
import { buildLootItemIndex, lootRelationsForItem, normalizeLootName } from '../lib/loot'

function ItemLink({ item, quantity }) {
  const quantityLabel = quantity === undefined || quantity === null || quantity === '' ? '' : `${quantity}x `
  return <Link className="relation-item" to={`/items/${encodeURIComponent(item.id)}`}>{item.image_url && <img src={item.image_url} alt="" />}<span><strong>{quantityLabel}{item.name}</strong><small>{item.categories?.[0] || 'Item'}</small></span></Link>
}

export default function ItemDetailPage() {
  const { itemId } = useParams()
  const catalog = useCatalogData()
  const crafting = useCraftingData()
  const loot = useLootData()
  const loading = catalog.loading || crafting.loading || loot.loading
  const error = catalog.error || crafting.error || loot.error
  const item = catalog.data?.items?.find((entry) => entry.id === itemId)
  const itemById = new Map((catalog.data?.items || []).map((entry) => [entry.id, entry]))
  const recipes = crafting.data?.recipes || []
  const producedBy = recipes.filter((recipe) => recipe.output.item_id === itemId)
  const usedIn = recipes.filter((recipe) => recipe.ingredients.some((ingredient) => ingredient.item_id === itemId))
  const lootItemIndex = useMemo(() => buildLootItemIndex(loot.data), [loot.data])
  const lootRelations = useMemo(() => lootRelationsForItem(loot.data, item, lootItemIndex), [loot.data, item, lootItemIndex])
  const officialDroppers = item?.dropped_by || []
  const dropperCount = new Set([...officialDroppers.map((name) => `official:${normalizeLootName(name)}`), ...lootRelations.map((relation) => `loot:${relation.pokemon.id}`)]).size

  return (
    <DomainState loading={loading} error={error}>
      {!item ? <div className="catalog-empty page-frame"><Package size={34} /><strong>Item não encontrado</strong><Link to="/items">Voltar ao ItemDex</Link></div> : (
        <div className="item-detail-page page-frame">
          <Link className="back-link" to="/items"><ArrowLeft size={16} />Voltar ao ItemDex</Link>
          <section className="item-detail-hero">
            <span className="item-detail-art">{item.image_url ? <img src={item.image_url} alt="" /> : item.name.slice(0, 1)}</span>
            <div><small>{item.categories?.join(' · ') || 'Item'}</small><h1>{item.name}</h1><p>{item.description || 'A Wiki não publica uma descrição adicional para este item.'}</p><div>{item.source_url && <a href={item.source_url} target="_blank" rel="noreferrer">Abrir na Wiki <ExternalLink size={14} /></a>}{producedBy.length > 0 && <Link to={`/crafting?item=${encodeURIComponent(item.id)}`}>Planejar crafting <Wrench size={14} /></Link>}</div></div>
          </section>
          <DataStamp metadata={catalog.data?.metadata} />
          <div className="item-detail-grid">
            <section className="relation-panel"><header><h2>Como fabricar</h2><b>{producedBy.length}</b></header>{producedBy.map((recipe) => <article className="recipe-card" key={recipe.id}><div><strong>{recipe.output.quantity}x {recipe.output.name}</strong><small>{recipe.profession} · Rank {recipe.rank || '—'} · {recipe.time_raw}</small></div><div className="recipe-ingredients">{recipe.ingredients.map((ingredient) => { const linked = itemById.get(ingredient.item_id); return linked ? <ItemLink item={linked} quantity={ingredient.quantity} key={ingredient.item_id} /> : <span key={ingredient.item_id}>{ingredient.quantity}x {ingredient.name}</span> })}</div></article>)}{!producedBy.length && <p className="relation-empty">Nenhuma receita publicada.</p>}</section>
            <section className="relation-panel"><header><h2>Usado em</h2><b>{usedIn.length}</b></header><div className="relation-list">{usedIn.slice(0, 80).map((recipe) => { const output = itemById.get(recipe.output.item_id); return output ? <ItemLink item={output} key={recipe.id} /> : null })}</div>{!usedIn.length && <p className="relation-empty">Este item não aparece como ingrediente.</p>}</section>
            <section className="relation-panel"><header><h2>Dropado por</h2><b>{dropperCount}</b></header><div className="drop-links">{officialDroppers.map((name) => <Link to={`/pokemon/${encodeURIComponent(name.replace(/\s+/g, '_'))}`} key={`official:${name}`}>{name}<small>Wiki</small></Link>)}{lootRelations.map((relation) => { const name = relation.pokemon.name; const detail = relation.contexts.length ? `${relation.contexts.length} contexto(s)` : 'Relação de loot'; return <span key={`loot:${relation.pokemon.id}`}>{name}<small>{detail}</small></span> })}</div>{!dropperCount && <p className="relation-empty">Nenhuma relação direta de drop publicada.</p>}</section>
            <section className="relation-panel"><header><h2>NPCs e origens</h2><b>{(item.vendors?.length || 0) + (item.origins?.length || 0)}</b></header><ul>{item.vendors?.map((vendor) => <li key={`vendor:${vendor}`}><strong>{vendor}</strong><span>Vendedor</span></li>)}{item.npc_buy && <li><strong>{item.npc_buy}</strong><span>Compra no NPC</span></li>}{item.npc_sell && <li><strong>{item.npc_sell}</strong><span>Venda no NPC</span></li>}{item.origins?.map((origin) => <li key={`origin:${origin}`}><strong>{origin}</strong><span>Origem publicada</span></li>)}</ul>{!item.vendors?.length && !item.origins?.length && !item.npc_buy && !item.npc_sell && <p className="relation-empty">A Wiki não publica vendedor ou preço de NPC para este item.</p>}</section>
            <section className="relation-panel"><header><h2>Fontes</h2><b>{item.sources?.length || 0}</b></header><ul>{item.sources?.map((source, index) => <li key={`${source.type}-${index}`}><strong>{source.label}</strong><span>{source.type.replaceAll('_', ' ')}</span></li>)}</ul></section>
          </div>
        </div>
      )}
    </DomainState>
  )
}
