import { deflateSync, inflateSync } from 'node:zlib'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectDirectory = resolve(scriptDirectory, '..')
const inputPath = resolve(process.argv[2] || 'minimap.otmm')
const outputDirectory = resolve(process.argv[3] || 'public/data/otmm_tiles')
const mapDataPath = resolve(projectDirectory, 'public/data/pxg_map.json')

function pngChunk(type, payload) {
  const name = Buffer.from(type)
  const size = Buffer.alloc(4)
  size.writeUInt32BE(payload.length, 0)
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(Buffer.concat([name, payload])), 0)
  return Buffer.concat([size, name, payload, checksum])
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})

function crc32(buffer) {
  let value = 0xffffffff
  for (const byte of buffer) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8)
  return (value ^ 0xffffffff) >>> 0
}

function tileKey(z, x, y) {
  return `${z},${x},${y}`
}

function readBlocks(data) {
  const blocks = new Map()
  let offset = data.readUInt16LE(4)
  while (offset + 7 <= data.length) {
    const x = data.readUInt16LE(offset)
    const y = data.readUInt16LE(offset + 2)
    const z = data.readUInt8(offset + 4)
    offset += 5
    if (x === 0 && y === 0 && z === 0) break
    const compressedLength = data.readUInt16LE(offset)
    offset += 2
    if (offset + compressedLength > data.length) break
    blocks.set(`${z}:${x}:${y}`, data.subarray(offset, offset + compressedLength))
    offset += compressedLength
  }
  return blocks
}

function buildPalette() {
  const palette = Buffer.alloc(256 * 3)
  for (let color = 0; color < 216; color += 1) {
    const offset = color * 3
    palette[offset] = Math.floor(color / 36) % 6 * 51
    palette[offset + 1] = Math.floor(color / 6) % 6 * 51
    palette[offset + 2] = color % 6 * 51
  }
  return palette
}

function encodeIndexedPng(rows, palette) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(256, 0)
  header.writeUInt32BE(256, 4)
  header.writeUInt8(8, 8)
  header.writeUInt8(3, 9)
  const scanlines = Buffer.concat(rows.map((row) => Buffer.concat([Buffer.from([0]), row])))
  return Buffer.concat([
    Buffer.from('\x89PNG\r\n\x1a\n', 'binary'),
    pngChunk('IHDR', header),
    pngChunk('PLTE', palette),
    pngChunk('IDAT', deflateSync(scanlines, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

async function main() {
  const mapData = JSON.parse(await readFile(mapDataPath, 'utf8'))
  const positions = [...new Map((mapData.tile_positions || []).map((position) => [tileKey(...position), position])).values()]
  const source = await readFile(inputPath)
  const compressedBlocks = readBlocks(source)
  const decompressedBlocks = new Map()
  const palette = buildPalette()

  await rm(outputDirectory, { recursive: true, force: true })
  await mkdir(outputDirectory, { recursive: true })

  const manifest = []
  const getBlock = (z, x, y) => {
    const key = `${z}:${x}:${y}`
    if (decompressedBlocks.has(key)) return decompressedBlocks.get(key)
    const compressed = compressedBlocks.get(key)
    const block = compressed ? inflateSync(compressed) : null
    decompressedBlocks.set(key, block)
    return block
  }

  for (const [index, [z, tileX, tileY]] of positions.entries()) {
    const rows = []
    let hasVisiblePixel = false
    for (let pixelY = 0; pixelY < 256; pixelY += 1) {
      const worldY = tileY * 256 + pixelY
      const blockY = Math.floor(worldY / 64) * 64
      const rowOffset = (worldY % 64) * 64
      const row = Buffer.alloc(256, 255)
      for (let blockColumn = 0; blockColumn < 4; blockColumn += 1) {
        const worldX = tileX * 256 + blockColumn * 64
        const block = getBlock(z, Math.floor(worldX / 64) * 64, blockY)
        if (!block) continue
        for (let pixelX = 0; pixelX < 64; pixelX += 1) {
          const color = block[(rowOffset + pixelX) * 3 + 1]
          row[blockColumn * 64 + pixelX] = color
          if (color !== 255) hasVisiblePixel = true
        }
      }
      rows.push(row)
    }

    if (hasVisiblePixel) {
      const fileName = `tile_${z}_${tileX}_${tileY}.png`
      await writeFile(resolve(outputDirectory, fileName), encodeIndexedPng(rows, palette))
      manifest.push([z, tileX, tileY])
    }
    if ((index + 1) % 1000 === 0) console.log(`OTMM: ${index + 1}/${positions.length} tiles`)
  }

  await writeFile(resolve(outputDirectory, 'manifest.json'), `${JSON.stringify({ source: 'minimap.otmm', tile_home: '/data/otmm_tiles', positions: manifest })}\n`, 'utf8')
  console.log(`OTMM convertido: ${manifest.length} tiles em ${outputDirectory}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
