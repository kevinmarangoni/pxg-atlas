import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SOURCE_HOME = 'https://www.pxgmap.com'
const CDN_HOME = 'https://cdn.pxgmap.com'
const PXGMAP_BR_HOME = 'https://pxgmap.com.br'
const SOURCE_FILES = {
  generation1: `${SOURCE_HOME}/assets/gen1.csv`,
  generation2: `${SOURCE_HOME}/assets/gen2.csv`,
  orbs: `${SOURCE_HOME}/assets/orbs.csv`,
  tilePositions: `${SOURCE_HOME}/minimap_positions.txt`,
}
const PXGMAP_BR_FILES = {
  kanto: `${PXGMAP_BR_HOME}/data/kanto.yml?v=12`,
  johto: `${PXGMAP_BR_HOME}/data/johto.yml?v=12`,
  transforms: `${PXGMAP_BR_HOME}/data/transforms.json`,
  floors: `${PXGMAP_BR_HOME}/assets/maps/floors/manifest.json`,
}

// A Wiki oficial lista Ursaring como Pokémon de caça em Dark Cave, mas o
// YAML público do PXGMap ainda não contém esse respawn. Mantemos o ponto de
// referência publicado pela task de Ursaring para que ele não desapareça na
// sincronização até a fonte de mapa incluir o registro exato.
const MANUAL_RESPAWNS = [
  {
    id: 'official-wiki:johto:ursaring:dark-cave',
    name: 'Ursaring',
    x: 3455,
    y: 30319,
    z: 0,
    floor: 0,
    region: 'Johto',
    comment: 'Dark Cave — ponto de referência do local de caça de Ursaring',
    sprite_url: `${PXGMAP_BR_HOME}/assets/icons/ursaring.png`,
    source: 'wiki.pokexgames.com',
    source_url: 'https://wiki.pokexgames.com/index.php/Tasks',
    source_type: 'official-wiki-reference',
  },
]

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const outputPath = resolve(scriptDirectory, '../public/data/pxg_map.json')
const localTileManifestPath = resolve(scriptDirectory, '../public/data/otmm_tiles/manifest.json')

async function readLocalTileManifest() {
  try { return JSON.parse(await readFile(localTileManifestPath, 'utf8')) } catch { return null }
}

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

function parseYamlScalar(value) {
  const raw = String(value || '').trim()
  if (!raw || raw === 'null' || raw === '~') return null
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) return Number(raw)
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try { return JSON.parse(raw) } catch { return raw.slice(1, -1) }
  }
  if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1).replaceAll("''", "'")
  return raw
}

// Os arquivos de respawn são uma lista YAML plana (pokemon, x, y e campos
// opcionais). Mantemos o parser pequeno para que o sincronizador continue
// sem dependências de runtime além do Node usado no deploy.
function parseRespawnYaml(text) {
  const records = []
  let current = null
  for (const line of String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const item = line.match(/^\s*-\s+pokemon:\s*(.*)$/)
    if (item) {
      if (current) records.push(current)
      current = { pokemon: parseYamlScalar(item[1]) }
      continue
    }
    const field = line.match(/^\s{2,}([a-zA-Z_][\w-]*):\s*(.*)$/)
    if (field && current) current[field[1]] = parseYamlScalar(field[2])
  }
  if (current) records.push(current)
  return records
}

function pokemonLabel(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function slugify(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const FLOOR_INFERENCE_MAX_DISTANCE = 60

function buildLegacyFloorIndex(monsters) {
  const index = new Map()
  for (const monster of monsters) {
    if (!['Kanto', 'Johto'].includes(monster.region)) continue
    const key = `${monster.region.toLowerCase()}|${slugify(monster.name)}`
    const candidates = index.get(key) || []
    candidates.push({ x: monster.x, y: monster.y, floor: monster.z })
    index.set(key, candidates)
  }
  return index
}

function inferLegacyFloors(index, region, name, x, y) {
  const candidates = index.get(`${region.toLowerCase()}|${slugify(name)}`) || []
  if (!candidates.length) return []

  const ranked = candidates
    .map((candidate) => ({
      ...candidate,
      distance: Math.abs(candidate.x - x) + Math.abs(candidate.y - y),
    }))
    .sort((left, right) => left.distance - right.distance)
  const nearest = ranked[0]
  if (nearest.distance > FLOOR_INFERENCE_MAX_DISTANCE) return []
  // The same XY can legitimately exist on multiple floors. Preserve every
  // nearby floor instead of silently choosing one of them.
  const nearby = ranked.filter((candidate) => candidate.distance <= nearest.distance + 2)
  const floors = new Map()
  for (const candidate of nearby) if (!floors.has(candidate.floor)) floors.set(candidate.floor, candidate)
  return [...floors.values()]
}

function mapPxgMapBrRecords(text, region, legacyFloorIndex) {
  return parseRespawnYaml(text).flatMap((row, index) => {
    const floor = Number.isFinite(row.andar) ? row.andar : 0
    const name = pokemonLabel(row.pokemon)
    const hasExplicitFloor = Object.prototype.hasOwnProperty.call(row, 'andar')
    const x = Number(row.x)
    const y = Number(row.y)
    const inferredFloors = !hasExplicitFloor
      ? inferLegacyFloors(legacyFloorIndex, region, name, x, y)
      : []
    const floorMatches = inferredFloors.length ? inferredFloors : [null]
    return floorMatches.map((inferredFloor, floorIndex) => ({
      id: `pxgmap-br:${region}:${index}${floorIndex ? `:${floorIndex}` : ''}`,
      name,
      x,
      y,
      z: floor,
      floor,
      region,
      comment: row.obs || null,
      sprite_url: `${PXGMAP_BR_HOME}/assets/icons/${slugify(row.pokemon)}.png`,
      source: 'pxgmap.com.br',
      source_url: `${PXGMAP_BR_HOME}/${region.toLowerCase()}`,
      floor_source: hasExplicitFloor ? 'pxgmap' : inferredFloor ? 'legacy-coordinate-match' : 'surface-default',
      ...(inferredFloor ? { world_floor: inferredFloor.floor, floor_match_distance: inferredFloor.distance } : {}),
    }))
  })
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

const [generation1, generation2, orbsSource, positionsSource, kantoSource, johtoSource, transformsSource, floorsSource] = await Promise.all([
  fetchText(SOURCE_FILES.generation1),
  fetchText(SOURCE_FILES.generation2),
  fetchText(SOURCE_FILES.orbs),
  fetchText(SOURCE_FILES.tilePositions),
  fetchText(PXGMAP_BR_FILES.kanto),
  fetchText(PXGMAP_BR_FILES.johto),
  fetchText(PXGMAP_BR_FILES.transforms),
  fetchText(PXGMAP_BR_FILES.floors),
])

const legacyMonsters = [
  ...parseCsv(generation1.text).map((row) => mapMonster(row, 'generation1')),
  ...parseCsv(generation2.text).map((row) => mapMonster(row, 'generation2')),
]
const legacyFloorIndex = buildLegacyFloorIndex(legacyMonsters)
const pxgMapBrMonsters = [
  ...mapPxgMapBrRecords(kantoSource.text, 'Kanto', legacyFloorIndex),
  ...mapPxgMapBrRecords(johtoSource.text, 'Johto', legacyFloorIndex),
]
const sourceMonsterKeys = new Set(pxgMapBrMonsters.map((entry) => `${entry.region}|${entry.name}|${entry.x}|${entry.y}|${entry.floor}`))
const manualRespawns = MANUAL_RESPAWNS.filter((entry) => !sourceMonsterKeys.has(`${entry.region}|${entry.name}|${entry.x}|${entry.y}|${entry.floor}`))
// A fonte pxgmap.com.br é a fonte mais completa para posições de Kanto e Johto.
// Os CSVs legados entram apenas como referência de andar quando o YAML não
// informa `andar`; os registros legados não são concatenados para evitar duplicatas.
const monsters = [
  ...legacyMonsters.filter((entry) => !['Kanto', 'Johto'].includes(entry.region)),
  ...pxgMapBrMonsters,
  ...manualRespawns,
]
const orbs = parseCsv(orbsSource.text).map(mapOrb)
const tilePositions = positionsSource.text
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => line.split(',').map((part) => Number.parseInt(part, 10)))
const localTileManifest = await readLocalTileManifest()

assertCoordinates(monsters, 'Pokémon')
assertCoordinates(orbs, 'Orbs')
if (tilePositions.some((position) => position.length !== 3 || position.some((value) => !Number.isFinite(value)))) {
  throw new Error('A lista de tiles contém posições inválidas')
}

const transforms = JSON.parse(transformsSource.text)
const floors = JSON.parse(floorsSource.text)
const pxgMapBrRegions = {
  kanto: {
    region: 'Kanto',
    image_url: `${PXGMAP_BR_HOME}/assets/maps/kanto-map.png`,
    floor_image_template: `${PXGMAP_BR_HOME}/assets/maps/floors/kanto/{floor}.png`,
    image_width: 2043,
    image_height: 3390,
    world_origin: transforms.kanto?.islands?.[0]?.world || [2767, 3070],
    available_floors: floors.kanto || [],
    source_home: PXGMAP_BR_HOME,
  },
  johto: {
    region: 'Johto',
    image_url: `${PXGMAP_BR_HOME}/assets/maps/johto-map.png`,
    floor_image_template: `${PXGMAP_BR_HOME}/assets/maps/floors/johto/{floor}.png`,
    image_width: 2461,
    image_height: 1610,
    world_origin: transforms.johto?.islands?.[0]?.world || [1610, 29872],
    available_floors: floors.johto || [],
    source_home: PXGMAP_BR_HOME,
  },
}

const payload = {
  metadata: {
    source_home: SOURCE_HOME,
    source_files: SOURCE_FILES,
    cdn_home: CDN_HOME,
    local_tile_home: localTileManifest?.tile_home || null,
    local_tile_positions: localTileManifest?.positions || [],
    synced_at: new Date().toISOString(),
    additional_sources: {
      pxgmap_br_home: PXGMAP_BR_HOME,
      pxgmap_br_files: PXGMAP_BR_FILES,
      manual_respawns: manualRespawns.map((entry) => ({ id: entry.id, name: entry.name, region: entry.region, source_url: entry.source_url, source_type: entry.source_type })),
    },
    etags: {
      generation1: generation1.etag,
      generation2: generation2.etag,
      orbs: orbsSource.etag,
      tilePositions: positionsSource.etag,
      pxgmapBrKanto: kantoSource.etag,
      pxgmapBrJohto: johtoSource.etag,
      pxgmapBrTransforms: transformsSource.etag,
      pxgmapBrFloors: floorsSource.etag,
    },
    counts: {
      monster_locations: monsters.length,
      unique_monsters: new Set(monsters.map((entry) => entry.name.toLocaleLowerCase('pt-BR'))).size,
      pxgmap_br_monster_locations: pxgMapBrMonsters.length,
      pxgmap_br_unique_monsters: new Set(pxgMapBrMonsters.map((entry) => entry.name.toLocaleLowerCase('pt-BR'))).size,
      orbs: orbs.length,
      tiles: tilePositions.length,
    },
  },
  map_sources: pxgMapBrRegions,
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
