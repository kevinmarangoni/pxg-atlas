import { PackageSearch, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataStamp, DomainState, ToolHero } from '../components/ToolCommon'
import { useCatalogData, useCraftingData } from '../data/DomainData'

function itemPath(item) { return `/items/${encodeURIComponent(item.id)}` }

export default function ItemListPage() {
  const { data, loading, error } = useCatalogData()
  const crafting = useCraftingData()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [relationship, setRelationship] = useState('all')
  const [profession, setProfession] = useState('all')
  const [origin, setOrigin] = useState('all')
  const [limit, setLimit] = useState(72)
  const categories = useMemo(() => [...new Set((data?.items || []).flatMap((item) => item.categories || []))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [data])
  const professions = useMemo(() => [...new Set((crafting.data?.recipes || []).map((recipe) => recipe.profession).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [crafting.data])
  const professionsByItem = useMemo(() => {
    const result = new Map()
    for (const recipe of crafting.data?.recipes || []) result.set(recipe.output.item_id, new Set([...(result.get(recipe.output.item_id) || []), recipe.profession].filter(Boolean)))
    return result
  }, [crafting.data])
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('pt-BR')
    return (data?.items || []).filter((item) => {
      if (needle && ![item.name, item.description, ...(item.categories || [])].join(' ').toLocaleLowerCase('pt-BR').includes(needle)) return false
      if (category !== 'all' && !(item.categories || []).includes(category)) return false
      if (relationship === 'crafted' && !(item.produced_by_recipe_ids || []).length) return false
      if (relationship === 'ingredient' && !(item.used_in_recipe_ids || []).length) return false
      if (relationship === 'drop' && !(item.dropped_by || []).length) return false
      if (relationship === 'vendor' && !(item.vendors || []).length) return false
      if (profession !== 'all' && !professionsByItem.get(item.id)?.has(profession)) return false
      const originText = [...(item.origins || []), ...(item.sources || []).map((source) => `${source.type} ${source.label}`)].join(' ').toLocaleLowerCase('pt-BR')
      if (origin === 'npc' && !(item.vendors || []).length) return false
      if (origin === 'drop' && !(item.dropped_by || []).length) return false
      if (origin === 'quest' && !/quest/.test(originText)) return false
      if (origin === 'dimensional' && !/dimensional|\bdz\b/.test(originText)) return false
      if (origin === 'crafting' && !(item.produced_by_recipe_ids || []).length) return false
      return true
    })
  }, [data, query, category, relationship, profession, professionsByItem, origin])

  return (
    <DomainState loading={loading || crafting.loading} error={error || crafting.error}>
      <div className="catalog-page page-frame">
        <ToolHero eyebrow="CATÁLOGO OFICIAL" title="ItemDex" description="Encontre itens, veja como fabricar, onde são utilizados e quais Pokémon estão relacionados ao drop."><PackageSearch size={50} /></ToolHero>
        <DataStamp metadata={data?.metadata} />
        <section className="catalog-filters">
          <label className="catalog-search"><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setLimit(72) }} placeholder="Buscar item, efeito ou categoria" /></label>
          <select value={category} onChange={(event) => { setCategory(event.target.value); setLimit(72) }}><option value="all">Todas as categorias</option>{categories.map((entry) => <option key={entry}>{entry}</option>)}</select>
          <select value={origin} onChange={(event) => { setOrigin(event.target.value); setLimit(72) }}><option value="all">Qualquer origem</option><option value="npc">Vendido por NPC</option><option value="drop">Drop de Pokémon</option><option value="quest">Quest</option><option value="dimensional">Dimensional Zone</option><option value="crafting">Crafting</option></select>
          <select value={profession} onChange={(event) => { setProfession(event.target.value); setLimit(72) }}><option value="all">Todas as profissões</option>{professions.map((entry) => <option key={entry}>{entry}</option>)}</select>
          <select value={relationship} onChange={(event) => { setRelationship(event.target.value); setLimit(72) }}><option value="all">Qualquer uso</option><option value="crafted">Pode ser fabricado</option><option value="ingredient">Usado em receitas</option><option value="drop">Drop de Pokémon</option><option value="vendor">Vendido por NPC</option></select>
          <output><strong>{filtered.length}</strong> itens</output>
        </section>
        <div className="item-grid">
          {filtered.slice(0, limit).map((item) => (
            <Link to={itemPath(item)} className="item-card" key={item.id}>
              <span className="item-art">{item.image_url ? <img src={item.image_url} alt="" loading="lazy" /> : item.name.slice(0, 1)}</span>
              <div><strong>{item.name}</strong><small>{item.categories?.slice(0, 2).join(' · ') || 'Item'}</small><p>{item.description || 'Abra a ficha para consultar origens e receitas.'}</p></div>
              <footer>{item.produced_by_recipe_ids?.length > 0 && <b>Fabricável</b>}{item.used_in_recipe_ids?.length > 0 && <b>{item.used_in_recipe_ids.length} usos</b>}{item.dropped_by?.length > 0 && <b>{item.dropped_by.length} drops</b>}</footer>
            </Link>
          ))}
        </div>
        {!filtered.length && <div className="catalog-empty"><PackageSearch size={28} /><strong>Nenhum item encontrado</strong><p>Remova um filtro ou tente outro nome.</p></div>}
        {limit < filtered.length && <button className="load-more" type="button" onClick={() => setLimit((value) => value + 72)}>Mostrar mais {Math.min(72, filtered.length - limit)}</button>}
      </div>
    </DomainState>
  )
}
