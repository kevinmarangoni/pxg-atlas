import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { load } from 'cheerio'

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cacheDirectory = resolve(projectDirectory, '.cache/pxg-wiki-dungeons')
const dataDirectory = resolve(projectDirectory, 'public/data')
const wikiHome = 'https://wiki.pokexgames.com'
const apiHome = `${wikiHome}/api.php`
const indexTitle = 'Spoiler das Masmorras'
const userAgent = 'PXG-Atlas-Dungeon-Sync/1.0 (static community reference; respectful cached requests)'
const force = process.argv.includes('--force')

const cleanText = (value) => String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
const normalizedName = (value) => cleanText(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim()
const slugify = (value) => normalizedName(value).replace(/ /g, '-')
const sourceUrl = (title) => `${wikiHome}/index.php/${encodeURIComponent(String(title || '').replace(/\s+/g, '_')).replace(/%2F/gi, '/')}`
const absoluteUrl = (value) => value ? new URL(value, wikiHome).href : null
const nowIso = () => new Date().toISOString()
const sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds))

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')) } catch { return null }
}

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
  return resolve(cacheDirectory, `${slugify(title).slice(0, 80)}-${hash}.json`)
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
  const page = { page_title: payload.parse.title, source_url: sourceUrl(payload.parse.title), revision_id: payload.parse.revid, html: payload.parse.text }
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

function categoryFromHeading(value) {
  const heading = normalizedName(value)
  if (heading === 'bronze dungeons') return 'Bronze'
  if (heading === 'silver dungeons') return 'Silver'
  if (heading === 'golden dungeons') return 'Golden'
  if (heading === 'crystal dungeons') return 'Crystal'
  if (heading === 'crystal dungeons legado') return 'Crystal Legacy'
  if (heading === 'master dungeons') return 'Master'
  return null
}

export function parseDungeonIndex(page) {
  const $ = load(page.html)
  const entries = new Map()
  let category = null
  $('.mw-parser-output').find('h1,h2,h3,a').each((_, element) => {
    if ($(element).is('h1,h2,h3')) {
      category = categoryFromHeading($(element).find('.mw-headline').text() || $(element).text()) || category
      return
    }
    if (!category) return
    const href = $(element).attr('href') || ''
    const title = cleanText($(element).attr('title') || $(element).text())
    if (!href.includes('/index.php/') || !title || /^imagem?:/i.test(title) || /^(especial:|categoria:|p[aá]gina principal$)/i.test(title)) return
    const url = absoluteUrl(href)
    if (!url || url.includes('Spoiler_das_Masmorras')) return
    const key = normalizedName(title)
    if (!entries.has(key)) entries.set(key, { id: `dungeon:${slugify(title)}`, title, category, source_url: url })
  })
  return [...entries.values()]
}

function sectionBlock($, heading) {
  const content = $(heading).nextUntil('h1,h2,h3,h4').toArray()
  return $(content)
}

function headingText($, heading) {
  return cleanText($(heading).find('.mw-headline').text() || $(heading).text())
}

function findSection($, patterns) {
  let found = null
  $('.mw-parser-output').find('h1,h2,h3,h4').each((_, heading) => {
    if (found) return
    const title = normalizedName(headingText($, heading))
    if (patterns.some((pattern) => pattern.test(title))) found = sectionBlock($, heading)
  })
  return found
}

function pokemonCandidates($, block, pokemonByName) {
  const names = new Map()
  const add = (value) => {
    const key = normalizedName(value).replace(/\s+boss$/, '')
    if (pokemonByName.has(key)) names.set(key, pokemonByName.get(key))
  }
  block.find('a[title]').each((_, link) => add($(link).attr('title')))
  block.find('img[alt]').each((_, image) => add($(image).attr('alt')))
  const text = normalizedName(block.text())
  for (const [key, name] of pokemonByName) if (` ${text} `.includes(` ${key} `)) names.set(key, name)
  return [...names.values()]
}

function rewardName(value) {
  return cleanText(value)
    .replace(/^[-–—•]+\s*/, '')
    .replace(/\s*\[editar\]\s*$/i, '')
}

function rewardCandidates($, block) {
  const values = []
  const add = (value) => {
    const name = rewardName(value)
    if (name && !/^(item|nome e quantidade|quantidade|recompensa|recompensas|pr[eê]mio|pr[eê]mios)$/i.test(name)) values.push(name)
  }
  block.find('table tr').each((_, row) => {
    const cells = $(row).children('th,td').map((__, cell) => cleanText($(cell).text())).get().filter(Boolean)
    if (cells.length && !cells.every((cell) => /^(item|nome e quantidade|quantidade)$/i.test(cell))) cells.forEach(add)
  })
  block.find('li').each((_, item) => add($(item).text()))
  if (!values.length) {
    block.children('p,div,center').each((_, element) => add($(element).text()))
  }
  return [...new Set(values)].filter((value) => value.length <= 180)
}

function parseDungeonPage(page, indexEntry, pokemonByName) {
  const $ = load(page.html)
  const captureBlock = findSection($, [/possiveis captur/, /possiveis catch/, /capturaveis/])
  const rewardBlock = findSection($, [/premios? dos bau/, /premios?/, /recompens/, /rewards?/])
  const intro = cleanText($('.mw-parser-output').clone().find('table,.toc,h2,h3,h4,.mw-editsection,.tabber').remove().end().text()).slice(0, 1000)
  return {
    ...indexEntry,
    page_title: page.page_title,
    source_url: page.source_url,
    revision_id: page.revision_id,
    capturable_pokemon: captureBlock ? pokemonCandidates($, captureBlock, pokemonByName) : [],
    rewards: rewardBlock ? rewardCandidates($, rewardBlock).map((raw) => ({ name: raw, raw })) : [],
    summary: intro || null,
  }
}

async function main() {
  const indexPage = await fetchPage(indexTitle)
  const indexEntries = parseDungeonIndex(indexPage)
  const pokemonData = await readJson(resolve(dataDirectory, 'pxg_pokemon_capture.json'))
  const pokemonByName = new Map((pokemonData?.pokemon || []).map((entry) => {
    const name = entry.page_title || entry.name
    return [normalizedName(name), name]
  }))
  const errors = []
  const pages = await mapLimit(indexEntries, 3, async (entry) => {
    try { return parseDungeonPage(await fetchPage(entry.title), entry, pokemonByName) } catch (error) {
      errors.push({ page_title: entry.title, message: error.message })
      return null
    }
  })
  const dungeons = pages.filter(Boolean).map((entry) => ({
    ...entry,
    capturable_pokemon: [...new Set(entry.capturable_pokemon)],
    rewards: [...new Map(entry.rewards.map((reward) => [normalizedName(reward.raw), reward])).values()],
  }))
  const payload = {
    metadata: {
      source_type: 'official_pokexgames_wiki',
      source_home: wikiHome,
      source_url: indexPage.source_url,
      domain: 'dungeons',
      generated_at: nowIso(),
      complete: errors.length === 0,
      pages: [indexPage, ...pages.filter(Boolean)].map((page) => ({ page_title: page.page_title, source_url: page.source_url, revision_id: page.revision_id })),
      errors,
      dungeon_count: dungeons.length,
      capture_relations: dungeons.reduce((total, dungeon) => total + dungeon.capturable_pokemon.length, 0),
      reward_relations: dungeons.reduce((total, dungeon) => total + dungeon.rewards.length, 0),
    },
    dungeons,
  }
  await mkdir(dataDirectory, { recursive: true })
  await writeFile(resolve(dataDirectory, 'pxg_dungeons.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ complete: payload.metadata.complete, dungeons: dungeons.length, captures: payload.metadata.capture_relations, rewards: payload.metadata.reward_relations, errors }, null, 2))
  if (errors.length) process.exitCode = 1
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error); process.exitCode = 1 })
