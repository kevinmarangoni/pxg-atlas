import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SOURCE_HOME = 'https://www.pxgmap.com'
const CDN_HOME = 'https://cdn.pxgmap.com'
const SOURCE_FILES = {
  generation1: `${SOURCE_HOME}/assets/gen1.csv`,
  generation2: `${SOURCE_HOME}/assets/gen2.csv`,
  orbs: `${SOURCE_HOME}/assets/orbs.csv`,
  tilePositions: `${SOURCE_HOME}/minimap_positions.txt`,
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const outputPath = resolve(scriptDirectory, '../public/data/pxg_map.json')

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'PXG-Atlas map data sync' } })
  if (!response.ok) throw new Error(`Falha ao carregar ${url}: HTTP ${response.status}`)
  return { text: await response.text(), etag: response.headers.get('etag') }
}

function parseCsvLine(line) {
  const values = []
  let value = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"' && quoted && line[index + 1] === '"') {
      value += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === ',' && !quoted) {
      values.push(value.trim())
      value = ''
    } else {
      value += character
    }
  }

  values.push(value.trim())
  return values
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim())
  const headers = parseCsvLine(lines.shift())
  return lines.map((line) => Object.fromEntries(parseCsvLine(line).map((value, index) => [headers[index], value])))
}

function parseCoordinates(value) {
  const [x, y, z] = String(value || '').split(',').map((part) => Number.parseInt(part.trim(), 10))
  return [x, y, z]
}

function spriteUrl(id, name) {
  const paddedId = String(id || '').padStart(4, '0')
  const slug = String(name || '').toLowerCase().replaceAll(' ', '_')
  return `${CDN_HOME}/sprite_${paddedId}_${slug}.png`
}

function mapMonster(row, source) {
  const [x, y, z] = parseCoordinates(row.coords)
  const id = String(row.id || '').padStart(4, '0')
  return {
    id,
    name: row.name,
    x,
    y,
    z,
    region: row.region,
    comment: row.comment || null,
    sprite_url: spriteUrl(row.id, row.name),
    source,
  }
}

function mapOrb(row) {
  const [x, y, z] = parseCoordinates(row.coords)
  return {
    id: String(row.id),
    name: `Orb #${row.id}`,
    x,
    y,
    z,
    region: row.region,
    comment: row.comment || null,
  }
}

function assertCoordinates(items, label) {
  const invalid = items.filter((item) => ![item.x, item.y, item.z].every(Number.isFinite))
  if (invalid.length) throw new Error(`${label}: ${invalid.length} registros com coordenadas inválidas`)
}

const [generation1, generation2, orbsSource, positionsSource] = await Promise.all([
  fetchText(SOURCE_FILES.generation1),
  fetchText(SOURCE_FILES.generation2),
  fetchText(SOURCE_FILES.orbs),
  fetchText(SOURCE_FILES.tilePositions),
])

const monsters = [
  ...parseCsv(generation1.text).map((row) => mapMonster(row, 'generation1')),
  ...parseCsv(generation2.text).map((row) => mapMonster(row, 'generation2')),
]
const orbs = parseCsv(orbsSource.text).map(mapOrb)
const tilePositions = positionsSource.text
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => line.split(',').map((part) => Number.parseInt(part, 10)))

assertCoordinates(monsters, 'Pokémon')
assertCoordinates(orbs, 'Orbs')
if (tilePositions.some((position) => position.length !== 3 || position.some((value) => !Number.isFinite(value)))) {
  throw new Error('A lista de tiles contém posições inválidas')
}

const payload = {
  metadata: {
    source_home: SOURCE_HOME,
    source_files: SOURCE_FILES,
    cdn_home: CDN_HOME,
    synced_at: new Date().toISOString(),
    etags: {
      generation1: generation1.etag,
      generation2: generation2.etag,
      orbs: orbsSource.etag,
      tilePositions: positionsSource.etag,
    },
    counts: {
      monster_locations: monsters.length,
      unique_monsters: new Set(monsters.map((entry) => entry.name.toLocaleLowerCase('pt-BR'))).size,
      orbs: orbs.length,
      tiles: tilePositions.length,
    },
  },
  destinations: [
    { name: 'Kanto', x: 4063, y: 3484, z: 7 },
    { name: 'Outland', x: 2750, y: 3101, z: 7 },
    { name: 'Orre', x: 5586, y: 5814, z: 7 },
    { name: 'Johto', x: 3350, y: 30473, z: 6 },
    { name: 'Mt Silver', x: 948, y: 36353, z: 6 },
    { name: 'Nightmare', x: 30633, y: 20302, z: 5 },
  ],
  monsters,
  orbs,
  tile_positions: tilePositions,
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(payload)}\n`, 'utf8')

console.log(`Mapa sincronizado: ${monsters.length} posições de Pokémon, ${orbs.length} orbs e ${tilePositions.length} tiles.`)
