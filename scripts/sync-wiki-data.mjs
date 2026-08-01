import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { load } from 'cheerio'
import { HELD_ITEMS as atlasHeldItems } from '../src/data/heldItems.js'

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cacheDirectory = resolve(projectDirectory, '.cache/pxg-wiki')
const dataDirectory = resolve(projectDirectory, 'public/data')
const wikiHome = 'https://wiki.pokexgames.com'
const apiHome = `${wikiHome}/api.php`
const userAgent = 'PXG-Atlas-Wiki-Sync/1.0 (static community reference; respectful cached requests)'
const force = process.argv.includes('--force')
const allowPartial = process.argv.includes('--allow-partial')
const domainArg = process.argv.find((entry) => entry.startsWith('--domain='))?.split('=')[1] || 'all'
const requestedDomains = new Set(domainArg.split(',').map((entry) => entry.trim()).filter(Boolean))
const includesDomain = (domain) => requestedDomains.has('all') || requestedDomains.has(domain)

const SOURCE_PAGES = {
  catalog: ['Itens_Gerais', 'Itens_de_Loot', 'Dimensional_Zone_Itens', 'Nightmare_Itens', 'Itens:Outros', 'Mega_Evoluções', 'Held_Itens', 'Berries', 'Pokébolas'],
  crafting: ['Sistema_de_Crafting'],
  guides: ['Quests', "NPC's", 'Boss_Fight'],
  progression: ['Experience', 'Sistema_de_Catch', 'Pokébolas', 'Pokélog', 'Pokélog_Explorer'],
  world: ['Tempo_de_Respawn'],
}

const sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds))
const cleanText = (value) => String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
const canonicalId = (value) => cleanText(value).replace(/\s+/g, '_')
const normalizedName = (value) => cleanText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim()
const sourceUrl = (title) => `${wikiHome}/index.php/${encodeURIComponent(canonicalId(title)).replace(/%2F/gi, '/')}`
const absoluteUrl = (value) => value ? new URL(value, wikiHome).href : null
const fileUrl = (filename) => filename ? `${wikiHome}/index.php/Special:Redirect/file/${encodeURIComponent(filename.replace(/^Arquivo:/i, ''))}` : null
const nowIso = () => new Date().toISOString()

async function requestJson(url, attempts = 3) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': userAgent, accept: 'application/json' } })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      return await response.json()
    } catch (error) {
      lastError = error
      if (attempt < attempts) await sleep(350 * attempt)
    }
  }
  throw lastError
}

function cachePathFor(title) {
  const hash = createHash('sha1').update(title).digest('hex').slice(0, 12)
  return resolve(cacheDirectory, `${canonicalId(title).replace(/[^a-z0-9_-]/gi, '_').slice(0, 80)}-${hash}.json`)
}

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')) } catch { return null }
}

async function currentRevision(title) {
  const params = new URLSearchParams({ action: 'query', prop: 'revisions', rvprop: 'ids', titles: title, format: 'json', formatversion: '2', origin: '*' })
  const payload = await requestJson(`${apiHome}?${params}`)
  return payload.query?.pages?.[0]?.revisions?.[0]?.revid || null
}

async function fetchPage(title) {
  await mkdir(cacheDirectory, { recursive: true })
  const cachePath = cachePathFor(title)
  const cached = await readJson(cachePath)
  const revisionId = force ? null : await currentRevision(title)
  if (!force && cached?.revision_id && cached.revision_id === revisionId && cached.html) return cached

  const params = new URLSearchParams({ action: 'parse', page: title, prop: 'text|revid|displaytitle', format: 'json', formatversion: '2', origin: '*' })
  const payload = await requestJson(`${apiHome}?${params}`)
  if (payload.error || !payload.parse?.text) throw new Error(payload.error?.info || `Página sem HTML: ${title}`)
  const page = {
    page_title: payload.parse.title,
    source_url: sourceUrl(payload.parse.title),
    revision_id: payload.parse.revid,
    html: payload.parse.text,
  }
  await writeFile(cachePath, `${JSON.stringify(page)}\n`, 'utf8')
  await sleep(90)
  return page
}

async function mapLimit(values, limit, mapper) {
  const results = new Array(values.length)
  let cursor = 0
  async function worker() {
    while (cursor < values.length) {
      const index = cursor
      cursor += 1
      results[index] = await mapper(values[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker))
  return results
}

async function fetchPages(titles, errors) {
  return (await mapLimit([...new Set(titles)], 3, async (title) => {
    try { return await fetchPage(title) } catch (error) {
      errors.push({ page_title: title, message: error.message })
      return null
    }
  })).filter(Boolean)
}

function imageFromCell($, cell) {
  const src = $(cell).find('img').first().attr('src')
  return absoluteUrl(src)
}

function tableContext($, table) {
  const heading = $(table).prevAll('h2,h3,h4').first().find('.mw-headline').text() || $(table).prevAll('h2,h3,h4').first().text()
  return cleanText(heading)
}

export function tableRows(page) {
  const $ = load(page.html)
  const tables = []
  const headingByTable = new Map()
  let activeHeading = null
  $('.mw-parser-output').find('h2,h3,h4,table').each((_, element) => {
    if ($(element).is('h2,h3,h4')) activeHeading = cleanText($(element).find('.mw-headline').text() || $(element).text())
    else headingByTable.set(element, activeHeading)
  })
  $('table').each((tableIndex, table) => {
    const rows = []
    const headers = []
    $(table).find('tr').each((rowIndex, row) => {
      const cells = $(row).children('th,td').toArray()
      if (!cells.length) return
      const values = cells.map((cell) => cleanText($(cell).text()))
      if (rowIndex === 0 && $(row).children('th').length) headers.push(...values)
      else rows.push({
        values,
        links: cells.map((cell) => $(cell).find('a[title]').toArray().map((link) => ({ title: cleanText($(link).attr('title')), href: absoluteUrl($(link).attr('href')) })).filter((link) => link.title)),
        images: cells.map((cell) => imageFromCell($, cell)),
      })
    })
    if (rows.length) tables.push({ table_index: tableIndex, heading: headingByTable.get(table) || tableContext($, table), headers, rows })
  })
  return tables
}

export function extractBalanced(text, marker, opening = '{', closing = '}') {
  const markerIndex = text.indexOf(marker)
  if (markerIndex < 0) return null
  const start = text.indexOf(opening, markerIndex + marker.length)
  if (start < 0) return null
  let depth = 0
  let quote = null
  let escaped = false
  for (let index = start; index < text.length; index += 1) {
    const character = text[index]
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = null
      continue
    }
    if (character === '"' || character === "'") { quote = character; continue }
    if (character === opening) depth += 1
    if (character === closing) depth -= 1
    if (depth === 0) return text.slice(start, index + 1)
  }
  return null
}

export function parseDurationSeconds(value) {
  const text = normalizedName(value)
  const number = Number(text.match(/[\d.,]+/)?.[0]?.replace(',', '.'))
  if (!Number.isFinite(number)) return null
  if (/hora/.test(text)) return Math.round(number * 3600)
  if (/minuto/.test(text)) return Math.round(number * 60)
  return Math.round(number)
}

function metadataFor(domain, pages, errors, counts = {}) {
  return {
    source_type: 'official_pokexgames_wiki',
    source_home: wikiHome,
    domain,
    generated_at: nowIso(),
    complete: errors.length === 0,
    pages: pages.map(({ page_title, source_url, revision_id }) => ({ page_title, source_url, revision_id })),
    errors,
    ...counts,
  }
}

export function buildCrafting(page, items = new Map()) {
  const raw = extractBalanced(page.html, 'window.CRAFTS_WIDGET_DATA =', '{', '}')
  if (!raw) throw new Error('CRAFTS_WIDGET_DATA não encontrado.')
  const payload = JSON.parse(raw)
  const recipes = payload.crafts.map((craft, index) => {
    const outputId = canonicalId(craft.item)
    const outputImage = fileUrl(craft.imagem_nome)
    ensureItem(items, craft.item, { image_url: outputImage, categories: ['Crafting'], sources: [{ type: 'crafting', label: craft.profissao }] })
    const ingredients = craft.materiais.map((material) => {
      const itemId = canonicalId(material.nome)
      ensureItem(items, material.nome, { image_url: fileUrl(material.imagem_nome), categories: ['Material'], sources: [{ type: 'crafting_material', label: craft.profissao }] })
      return { item_id: itemId, name: material.nome, quantity: Number(material.quantidade) || 0, image_url: fileUrl(material.imagem_nome) }
    })
    return {
      id: `recipe:${outputId}:${normalizedName(craft.profissao)}:${craft.rank || 'none'}:${index}`,
      output: { item_id: outputId, name: craft.item, quantity: Number(craft.quantidade) || 1, image_url: outputImage },
      profession: craft.profissao || null,
      rank: craft.rank || null,
      skill: Number(craft.habilidade) || 0,
      time_raw: craft.tempo || null,
      time_seconds: parseDurationSeconds(craft.tempo),
      ingredients,
      source_url: page.source_url,
      revision_id: page.revision_id,
    }
  })
  return { recipes, source_summary: { total: payload.total, by_profession: payload.por_profissao, by_profession_rank: payload.por_profissao_e_rank } }
}

function ensureItem(items, name, patch = {}) {
  const cleanedName = cleanText(name)
  if (!cleanedName) return null
  const id = canonicalId(patch.page_title || cleanedName)
  const current = items.get(id) || {
    id,
    page_title: patch.page_title || cleanedName,
    name: cleanedName,
    image_url: null,
    description: null,
    categories: [],
    sources: [],
    origins: [],
    vendors: [],
    npc_buy: null,
    npc_sell: null,
    dropped_by: [],
    produced_by_recipe_ids: [],
    used_in_recipe_ids: [],
    source_url: sourceUrl(patch.page_title || cleanedName),
  }
  const merged = {
    ...current,
    ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== null && value !== undefined && !Array.isArray(value))),
    image_url: current.image_url || patch.image_url || null,
    description: current.description || patch.description || null,
    categories: [...new Set([...(current.categories || []), ...(patch.categories || [])].filter(Boolean))],
    sources: [...new Map([...(current.sources || []), ...(patch.sources || [])].map((source) => [`${source.type}:${source.label}`, source])).values()],
    origins: [...new Set([...(current.origins || []), ...(patch.origins || [])].filter(Boolean))],
    vendors: [...new Set([...(current.vendors || []), ...(patch.vendors || [])].filter(Boolean))],
    dropped_by: [...new Set([...(current.dropped_by || []), ...(patch.dropped_by || [])].filter(Boolean))],
  }
  items.set(id, merged)
  return merged
}

export function addCatalogTables(page, items, category) {
  for (const table of tableRows(page)) {
    const headers = table.headers.map(normalizedName)
    for (const row of table.rows) {
      if (headers.includes('mega stone')) {
        const name = row.values[headers.indexOf('mega stone')]
        const pokemonName = row.values[headers.indexOf('mega evolucao')] || row.values[headers.indexOf('pokemon')]
        const origin = row.values[headers.findIndex((header) => /onde obter|obtencao|origem/.test(header))]
        if (!name) continue
        ensureItem(items, name, {
          image_url: row.images.find(Boolean) || null,
          description: origin || null,
          categories: ['Mega Stones'],
          origins: [origin],
          sources: [{ type: 'mega_evolution', label: page.page_title }],
          dropped_by: /drop do pokemon/i.test(normalizedName(origin)) ? [pokemonName] : [],
        })
        continue
      }

      const allItemColumns = headers.length > 0 && headers.every((header) => /^(item|mochila|nome)$/.test(header))
      let itemCells = []
      if (headers.length === 1 && /^(item|mochila|nome)$/.test(headers[0])) {
        itemCells = row.values.map((value, index) => value ? index : -1).filter((index) => index >= 0)
      } else if (allItemColumns && row.values.length >= headers.length * 2) {
        itemCells = headers.map((_, index) => index * 2 + 1).filter((index) => row.values[index])
      } else {
        const itemColumn = headers.findIndex((header) => /^(item|mochila|nome)$/.test(header))
        if (itemColumn < 0) continue
        const offset = row.values.length > headers.length ? row.values.length - headers.length : 0
        itemCells = [Math.min(row.values.length - 1, itemColumn + offset)]
      }

      for (const itemCell of itemCells) {
        const semanticLink = (row.links[itemCell] || []).find((link) => !normalizedName(link.title).startsWith('arquivo '))
        const name = semanticLink?.title || row.values[itemCell]
        if (!name || name.length > 100 || /^(item|nome|pokemon|pokémon)$/i.test(name)) continue
        const offset = row.values.length > headers.length ? row.values.length - headers.length : 0
        const relation = (pattern) => {
          const column = headers.findIndex((header) => pattern.test(header))
          return column < 0 ? { value: null, links: [] } : { value: row.values[Math.min(row.values.length - 1, column + offset)] || null, links: row.links[Math.min(row.links.length - 1, column + offset)] || [] }
        }
        const pokemon = relation(/^pokemon$/)
        const npc = relation(/npc/)
        const drop = relation(/^drop$/)
        const origin = relation(/dimensional zone|quest|onde obter|obtencao|origem/)
        const vendors = npc.links.map((link) => link.title).filter(Boolean)
        if (!vendors.length && npc.value) vendors.push(npc.value)
        const droppedBy = pokemon.links.map((link) => link.title).filter(Boolean)
        if (!droppedBy.length && pokemon.value) droppedBy.push(pokemon.value)
        ensureItem(items, name, {
          page_title: semanticLink?.title || name,
          image_url: row.images[itemCell] || row.images.find(Boolean) || null,
          description: origin.value || drop.value || null,
          categories: [table.heading || category],
          origins: [origin.value, drop.value],
          vendors,
          sources: [{ type: 'wiki_table', label: page.page_title }],
          dropped_by: droppedBy,
        })
      }
    }
  }
}

export function parseBerries(page, items = new Map()) {
  const berries = []
  for (const table of tableRows(page)) {
    if (!table.headers.some((header) => normalizedName(header) === 'berry')) continue
    for (const row of table.rows) {
      const nameCell = row.links.findIndex((links) => links.some((link) => /berry$/i.test(link.title) && normalizedName(link.title) !== 'berries'))
      const name = row.links[nameCell]?.find((link) => /berry$/i.test(link.title) && normalizedName(link.title) !== 'berries')?.title || row.values[nameCell]
      if (!/berry/i.test(name || '')) continue
      const entry = {
        id: canonicalId(name), name, category: table.heading || 'Berry', image_url: row.images.find(Boolean) || null,
        effect: row.values[nameCell + 1] || null, duration: row.values[nameCell + 2] || null,
        ripening: row.values[nameCell + 3] || row.values.at(-2) || null, rotting: row.values[nameCell + 4] || row.values.at(-1) || null,
        source_url: page.source_url, revision_id: page.revision_id,
      }
      berries.push(entry)
      ensureItem(items, name, { image_url: entry.image_url, description: entry.effect, categories: ['Berries', entry.category], sources: [{ type: 'berry', label: entry.category }] })
    }
  }
  return berries
}

export function parseBalls(page, items = new Map()) {
  const balls = []
  for (const table of tableRows(page)) {
    if (!table.headers.some((header) => /rate/i.test(header))) continue
    for (const row of table.rows) {
      const nameCell = row.links.findIndex((links) => links.some((link) => /ball|bola/i.test(link.title) && normalizedName(link.title) !== 'pokebolas'))
      const name = row.links[nameCell]?.find((link) => /ball|bola/i.test(link.title) && normalizedName(link.title) !== 'pokebolas')?.title || row.values[nameCell]
      if (!name || !/ball|bola/i.test(name)) continue
      const entry = {
        id: canonicalId(name), name, image_url: row.images.find(Boolean) || null, rate: row.values[nameCell + 1] || null,
        acquisition: row.values[nameCell + 2] || null, description: row.values[nameCell + 3] || null,
        category: table.heading || 'Pokébolas', source_url: page.source_url, revision_id: page.revision_id,
      }
      balls.push(entry)
      const vendors = [...String(entry.acquisition || '').matchAll(/NPC\s+([\p{L}' -]+)/giu)].map((match) => `NPC ${cleanText(match[1]).split(/[;,]/)[0]}`)
      ensureItem(items, name, { image_url: entry.image_url, description: entry.description, categories: ['Pokébolas', entry.category], origins: [entry.acquisition], vendors, sources: [{ type: 'capture_ball', label: entry.category }] })
    }
  }
  return [...new Map(balls.map((entry) => [entry.id, entry])).values()]
}

export function parseHeldTables(page, items = new Map()) {
  const helds = []
  for (const table of tableRows(page)) {
    for (const row of table.rows) {
      const nameCell = row.links.findIndex((links) => links.some((link) => /^[XY]-/i.test(link.title)))
      const name = row.links[nameCell]?.find((link) => /^[XY]-/i.test(link.title))?.title || row.values.find((value) => /^[XY]-/i.test(value))
      if (!name || !/^[XY]-/i.test(name)) continue
      const entry = {
        id: canonicalId(name), name, slot: name[0].toLowerCase(), category: table.heading || 'Held Item',
        image_url: row.images[0], values: row.values.slice(1), source_url: page.source_url, revision_id: page.revision_id,
      }
      helds.push(entry)
      ensureItem(items, name, { image_url: entry.image_url, categories: ['Held Items', entry.category], sources: [{ type: 'held_item', label: entry.category }] })
    }
  }
  const parsed = [...new Map(helds.map((entry) => [entry.id, entry])).values()]
  const result = parsed.length ? parsed : atlasHeldItems.map((item) => ({
    id: canonicalId(item.name), name: item.name, slot: item.slot, category: item.category,
    image_url: item.iconUrl, tiers: item.tiers, unit: item.unit, description: item.description,
    source_url: page.source_url, revision_id: page.revision_id,
  }))
  for (const entry of result) ensureItem(items, entry.name, { image_url: entry.image_url, description: entry.description, categories: ['Held Items', entry.category], sources: [{ type: 'held_item', label: entry.category }] })
  return result
}

function linkRecipeRelations(items, recipes) {
  for (const recipe of recipes) {
    const output = items.get(recipe.output.item_id)
    if (output) output.produced_by_recipe_ids = [...new Set([...(output.produced_by_recipe_ids || []), recipe.id])]
    for (const ingredient of recipe.ingredients) {
      const item = items.get(ingredient.item_id)
      if (item) item.used_in_recipe_ids = [...new Set([...(item.used_in_recipe_ids || []), recipe.id])]
    }
  }
}

export function parseQuests(page) {
  const raw = extractBalanced(page.html, 'window.quests = /* CMS_DATA_START */', '[', ']') || extractBalanced(page.html, 'window.quests =', '[', ']')
  if (!raw) throw new Error('Lista window.quests não encontrada.')
  const normalizedJson = raw.replace(/,\s*([}\]])/g, '$1')
  return JSON.parse(normalizedJson).map((quest) => ({
    id: `quest:${quest.id ?? canonicalId(quest.name)}`,
    name: cleanText(quest.name), image_url: absoluteUrl(quest.image), level: Number(quest.level) || 0,
    vip: Boolean(quest.isVip), regions: Array.isArray(quest.region) ? quest.region : [quest.region].filter(Boolean),
    category: cleanText(quest.category) || null, rewards_raw: cleanText(quest.rewards),
    guide_url: absoluteUrl(quest.link) || sourceUrl(quest.name),
    spoiler: { available: true, label: quest.btnText || 'Ver spoiler' },
    source_url: page.source_url, revision_id: page.revision_id,
  }))
}

export function parseLinkedDirectory(page, type, linkFilter = () => true) {
  const $ = load(page.html)
  const entries = []
  let section = null
  $('.mw-parser-output').find('h2,h3,h4,a[title]').each((_, element) => {
    if (/^h[234]$/i.test(element.tagName)) {
      section = cleanText($(element).find('.mw-headline').text() || $(element).text())
      return
    }
    const title = cleanText($(element).attr('title'))
    const href = absoluteUrl($(element).attr('href'))
    if (!title || !href || !linkFilter(title, href, section)) return
    entries.push({ id: `${type}:${canonicalId(title)}`, name: title, category: section, source_url: href, index_source_url: page.source_url, revision_id: page.revision_id })
  })
  return [...new Map(entries.map((entry) => [entry.id, entry])).values()]
}

export function parseNpcDirectory(page) {
  const entries = []
  let category = null
  const categoryNames = new Set(['alimentos', 'outfits', 'profissoes', 'itens', 'sistemas do jogo', 'dimensional zone'])
  const headings = [...page.html.matchAll(/<h([234])[^>]*>([\s\S]*?)<\/h\1>/gi)]
  headings.forEach((match, index) => {
    const headingDocument = load(match[2])
    const name = cleanText(headingDocument('.mw-headline').text() || headingDocument.root().text()).replace(/\[\s*editar\s*\]$/i, '').trim()
    if (!name || /^(índice|indice)$/i.test(name)) return
    if (categoryNames.has(normalizedName(name))) { category = name; return }
    const contentStart = match.index + match[0].length
    const contentEnd = headings[index + 1]?.index ?? page.html.length
    const contentDocument = load(page.html.slice(contentStart, contentEnd))
    const description = cleanText(contentDocument.root().text()).slice(0, 900) || null
    const imageUrl = absoluteUrl(contentDocument('img').first().attr('src'))
    const source = absoluteUrl(contentDocument('a[href*="/index.php/"]').first().attr('href'))
    entries.push({
      id: `npc:${canonicalId(name)}`,
      name,
      category: category || 'NPC',
      description,
      image_url: imageUrl,
      source_url: source || page.source_url,
      index_source_url: page.source_url,
      revision_id: page.revision_id,
    })
  })
  return [...new Map(entries.map((entry) => [entry.id, entry])).values()]
}

function wikiTitleFromUrl(value) {
  try {
    const url = new URL(value)
    const marker = '/index.php/'
    const index = url.pathname.indexOf(marker)
    return index >= 0 ? decodeURIComponent(url.pathname.slice(index + marker.length)).replace(/_/g, ' ') : null
  } catch { return null }
}

export function parseGuideSections(page) {
  const $ = load(page.html)
  const sections = []
  $('.mw-parser-output').find('h2,h3').each((_, heading) => {
    const title = cleanText($(heading).find('.mw-headline').text() || $(heading).text()).replace(/\[\s*editar\s*\]$/i, '').trim()
    if (!title || /^(indice|índice|referencias|referências)$/i.test(title)) return
    const content = cleanText($(heading).nextUntil('h2,h3').clone().find('.mw-editsection,.navbox,.toc').remove().end().text()).slice(0, 5000)
    if (content) sections.push({ title, content })
  })
  const lead = cleanText($('.mw-parser-output').clone().find('table,.toc,h2,h3,.mw-editsection').remove().end().text()).slice(0, 1800)
  return { lead: lead || null, sections }
}

function sectionContents(sections, pattern) {
  return sections.filter((section) => pattern.test(normalizedName(section.title))).map((section) => section.content).filter(Boolean)
}

function enrichQuest(quest, detailPage) {
  if (!detailPage) return quest
  const detail = parseGuideSections(detailPage)
  return {
    ...quest,
    requirements: sectionContents(detail.sections, /requisito|requirement|nivel|level/),
    dependencies: sectionContents(detail.sections, /depend|pre requisito|quest anterior|acesso/),
    steps: detail.sections.filter((section) => /passo|parte|objetivo|procedimento|como fazer|walkthrough/.test(normalizedName(section.title))).slice(0, 30),
    detail_revision_id: detailPage.revision_id,
  }
}

function enrichNpc(npc, detailPage) {
  if (!detailPage) return npc
  const detail = parseGuideSections(detailPage)
  return {
    ...npc,
    description: npc.description || detail.lead,
    functions: sectionContents(detail.sections, /funcao|servico|sistema|sobre/),
    shop: sectionContents(detail.sections, /loja|item|vende|compra|produto/),
    regions: sectionContents(detail.sections, /local|regiao|onde encontrar/),
    detail_revision_id: detailPage.revision_id,
  }
}

function enrichBoss(boss, detailPage) {
  if (!detailPage) return boss
  const detail = parseGuideSections(detailPage)
  return {
    ...boss,
    requirements: sectionContents(detail.sections, /requisito|requirement|level|nivel|acesso/),
    official_recommendations: sectionContents(detail.sections, /recomend|time|funcao|role|pokemon indicado/),
    rotation: sectionContents(detail.sections, /rotacao|rotation|calendario|agenda|horario/),
    mechanics: detail.sections.filter((section) => !/recompensa|reward|referencia|reference/.test(normalizedName(section.title))).slice(0, 30),
    detail_revision_id: detailPage.revision_id,
  }
}

export function parseExperience(page) {
  const levels = { normal: {}, nightmare: {} }
  const reductions = []
  for (const table of tableRows(page)) {
    const heading = normalizedName(table.heading)
    const normalizedHeaders = table.headers.map(normalizedName)
    const isLevelTable = normalizedHeaders.includes('level') && normalizedHeaders.some((header) => /experien/.test(header))
    const pairs = []
    if (isLevelTable) for (const row of table.rows) {
      for (let index = 0; index + 1 < row.values.length; index += 2) {
        const level = Number(row.values[index].replace(/\D/g, ''))
        const experience = Number(row.values[index + 1].replace(/[^\d]/g, ''))
        if (level >= 1 && level <= 600 && Number.isFinite(experience)) pairs.push([level, experience])
      }
    }
    if (pairs.length) {
      const mode = /nightmare/.test(heading) || pairs.some(([level]) => levels.normal[level] !== undefined) ? 'nightmare' : 'normal'
      for (const [level, experience] of pairs) levels[mode][level] = experience
    } else if (table.rows.some((row) => row.values.some((value) => /%/.test(value)))) {
      reductions.push({ heading: table.heading, rows: table.rows.map((row) => row.values) })
    }
  }
  return { levels, reductions }
}

export function parseCatchRules(page) {
  const $ = load(page.html)
  return $('.mw-parser-output li').toArray().map((item) => cleanText($(item).text())).filter(Boolean).slice(0, 30)
}

export function parseRespawn(page) {
  const result = { pokemon: [], npcs: [], resources: [] }
  for (const table of tableRows(page)) {
    const heading = normalizedName(table.heading)
    const target = /npc/.test(heading) ? result.npcs : /recurso/.test(heading) ? result.resources : result.pokemon
    for (const row of table.rows) {
      const values = row.values.filter(Boolean)
      if (!values[0] || !values[1]) continue
      target.push({ name: values[0], time_raw: values[1], source_url: page.source_url, revision_id: page.revision_id })
    }
  }
  return result
}

async function writeSnapshot(filename, payload) {
  await mkdir(dataDirectory, { recursive: true })
  await writeFile(resolve(dataDirectory, filename), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

async function main() {
  const globalErrors = []
  const wantedPageTitles = Object.entries(SOURCE_PAGES).flatMap(([domain, pages]) => includesDomain(domain) ? pages : [])
  const pages = await fetchPages(wantedPageTitles, globalErrors)
  const byTitle = new Map(pages.map((page) => [normalizedName(page.page_title), page]))
  const page = (title) => byTitle.get(normalizedName(title))

  if (process.argv.includes('--debug-tables')) {
    for (const currentPage of pages) {
      console.log(currentPage.page_title, JSON.stringify(tableRows(currentPage).map((table) => ({ heading: table.heading, headers: table.headers, rows: table.rows.length, sample: table.rows.slice(0, 2).map((row) => row.values) })).filter((table) => table.rows > 5), null, 2))
    }
  }

  let craftingPayload = await readJson(resolve(dataDirectory, 'pxg_crafting.json'))
  let catalogPayload = await readJson(resolve(dataDirectory, 'pxg_catalog.json'))
  let guidesPayload = await readJson(resolve(dataDirectory, 'pxg_guides.json'))
  let progressionPayload = await readJson(resolve(dataDirectory, 'pxg_progression.json'))
  let worldPayload = await readJson(resolve(dataDirectory, 'pxg_world_content.json'))

  if (includesDomain('crafting') || includesDomain('catalog')) {
    const items = new Map()
    const craftingPage = page('Sistema de Crafting') || await fetchPage('Sistema_de_Crafting')
    const crafting = buildCrafting(craftingPage, items)
    const catalogPages = SOURCE_PAGES.catalog.map(page).filter(Boolean)
    for (const catalogPage of catalogPages) addCatalogTables(catalogPage, items, catalogPage.page_title)
    const heldPage = page('Held Itens')
    const berryPage = page('Berries')
    const ballsPage = page('Pokébolas')
    const heldItems = heldPage ? parseHeldTables(heldPage, items) : []
    const berries = berryPage ? parseBerries(berryPage, items) : []
    const balls = ballsPage ? parseBalls(ballsPage, items) : []
    linkRecipeRelations(items, crafting.recipes)
    const sortedItems = [...items.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    const domainErrors = globalErrors.filter((error) => [...SOURCE_PAGES.catalog, ...SOURCE_PAGES.crafting].some((title) => normalizedName(title) === normalizedName(error.page_title)))
    catalogPayload = {
      metadata: metadataFor('catalog', [...catalogPages, craftingPage], domainErrors, { total_items: sortedItems.length, total_held_items: heldItems.length, total_berries: berries.length, total_balls: balls.length }),
      items: sortedItems, held_items: heldItems, berries, balls,
    }
    craftingPayload = {
      metadata: metadataFor('crafting', [craftingPage], domainErrors, { total_recipes: crafting.recipes.length, ...crafting.source_summary }),
      recipes: crafting.recipes,
    }
    await writeSnapshot('pxg_catalog.json', catalogPayload)
    await writeSnapshot('pxg_crafting.json', craftingPayload)
  }

  if (includesDomain('guides')) {
    const questPage = page('Quests')
    const npcPage = page("NPC's")
    const bossPage = page('Boss Fight')
    const questIndex = questPage ? parseQuests(questPage) : []
    const npcIndex = npcPage ? parseNpcDirectory(npcPage) : []
    const bossIndex = bossPage ? parseLinkedDirectory(bossPage, 'boss', (title) => /^Boss Fight\s*-/i.test(title)) : []
    const detailTitles = [...new Set([...questIndex.map((entry) => wikiTitleFromUrl(entry.guide_url)), ...npcIndex.map((entry) => wikiTitleFromUrl(entry.source_url)), ...bossIndex.map((entry) => wikiTitleFromUrl(entry.source_url))].filter(Boolean))]
    const detailPages = await fetchPages(detailTitles, globalErrors)
    const detailByTitle = new Map(detailPages.map((detailPage) => [normalizedName(detailPage.page_title), detailPage]))
    const detailFor = (url) => detailByTitle.get(normalizedName(wikiTitleFromUrl(url)))
    const quests = questIndex.map((entry) => enrichQuest(entry, detailFor(entry.guide_url)))
    const npcs = npcIndex.map((entry) => enrichNpc(entry, detailFor(entry.source_url)))
    const bosses = bossIndex.map((entry) => enrichBoss(entry, detailFor(entry.source_url)))
    const guideTitles = new Set([...SOURCE_PAGES.guides, ...detailTitles].map(normalizedName))
    const domainErrors = globalErrors.filter((error) => guideTitles.has(normalizedName(error.page_title)))
    guidesPayload = {
      metadata: metadataFor('guides', [questPage, npcPage, bossPage, ...detailPages].filter(Boolean), domainErrors, { total_quests: quests.length, total_npcs: npcs.length, total_bosses: bosses.length, total_detail_pages: detailPages.length }),
      quests, npcs, bosses,
    }
    await writeSnapshot('pxg_guides.json', guidesPayload)
  }

  if (includesDomain('progression')) {
    const experiencePage = page('Experience')
    const catchPage = page('Sistema de Catch')
    const ballsPage = page('Pokébolas')
    const experience = experiencePage ? parseExperience(experiencePage) : { levels: { normal: {}, nightmare: {} }, reductions: [] }
    const balls = ballsPage ? parseBalls(ballsPage, new Map()) : (catalogPayload?.balls || [])
    const domainErrors = globalErrors.filter((error) => SOURCE_PAGES.progression.some((title) => normalizedName(title) === normalizedName(error.page_title)))
    progressionPayload = {
      metadata: metadataFor('progression', [experiencePage, catchPage, ballsPage].filter(Boolean), domainErrors, { normal_levels: Object.keys(experience.levels.normal).length, nightmare_levels: Object.keys(experience.levels.nightmare).length }),
      experience, catch_system: { rules: catchPage ? parseCatchRules(catchPage) : [], source_url: catchPage?.source_url || null }, balls,
    }
    await writeSnapshot('pxg_progression.json', progressionPayload)
  }

  if (includesDomain('world')) {
    const respawnPage = page('Tempo de Respawn')
    const respawn = respawnPage ? parseRespawn(respawnPage) : { pokemon: [], npcs: [], resources: [] }
    const domainErrors = globalErrors.filter((error) => SOURCE_PAGES.world.some((title) => normalizedName(title) === normalizedName(error.page_title)))
    worldPayload = {
      metadata: metadataFor('world', [respawnPage].filter(Boolean), domainErrors, { total_respawn_entries: respawn.pokemon.length + respawn.npcs.length + respawn.resources.length }),
      respawn, points: [],
    }
    await writeSnapshot('pxg_world_content.json', worldPayload)
  }

  if (globalErrors.length && !allowPartial) {
    console.error(JSON.stringify({ complete: false, errors: globalErrors }, null, 2))
    process.exitCode = 1
    return
  }

  console.log(JSON.stringify({
    complete: globalErrors.length === 0,
    domain: domainArg,
    catalog_items: catalogPayload?.items?.length || 0,
    crafting_recipes: craftingPayload?.recipes?.length || 0,
    quests: guidesPayload?.quests?.length || 0,
    npcs: guidesPayload?.npcs?.length || 0,
    bosses: guidesPayload?.bosses?.length || 0,
    errors: globalErrors,
  }, null, 2))
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
