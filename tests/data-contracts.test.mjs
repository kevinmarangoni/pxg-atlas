import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const load = async (name) => JSON.parse(await readFile(new URL(`../public/data/${name}`, import.meta.url), 'utf8'))

test('snapshots modulares estao completos e versionados por revisao', async () => {
  const files = ['pxg_catalog.json', 'pxg_crafting.json', 'pxg_guides.json', 'pxg_progression.json', 'pxg_world_content.json']
  for (const file of files) {
    const snapshot = await load(file)
    assert.equal(snapshot.metadata.complete, true, file)
    assert.ok(snapshot.metadata.generated_at, file)
    assert.ok(snapshot.metadata.pages.every((page) => Number(page.revision_id) > 0 && page.source_url), file)
  }
})

test('catalogos essenciais nao podem regredir para vazios', async () => {
  const catalog = await load('pxg_catalog.json')
  const progression = await load('pxg_progression.json')
  assert.ok(catalog.items.length > 1800)
  assert.ok(catalog.held_items.length >= 30)
  assert.ok(catalog.berries.length >= 25)
  assert.ok(progression.balls.length >= 20)
})
