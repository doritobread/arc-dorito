/**
 * Scrape recycling data from ardb.tools/recycling
 * Extracts: input item, output materials + quantities
 * Resolves RSC deduplication references within the recycling array.
 */
import { extractRSCData, extractNamedArray } from './utils.mjs'

const RECYCLING_URL = 'https://ardb.tools/recycling'

export async function scrapeRecycling() {
  console.log('[recycling] Fetching recycling data...')
  const data = await extractRSCData(RECYCLING_URL)

  const recycling = extractNamedArray(data, 'recycling')
  if (!recycling || recycling.length === 0) {
    throw new Error('[recycling] Failed to extract recycling data from RSC payload')
  }

  console.log(`[recycling] Extracted ${recycling.length} recycling entries`)

  // Resolve RSC refs
  resolveAllRefs(recycling)

  // Normalize
  const result = recycling.map(entry => {
    const inputItem = typeof entry.item === 'object' ? entry.item : null
    if (!inputItem || !inputItem.id) return null

    const outputs = (entry.outputs || []).map(out => {
      const item = typeof out.item === 'object' ? out.item : null
      return {
        itemId: item?.id || null,
        itemName: item?.name || null,
        quantity: out.quantity || 1,
      }
    }).filter(o => o.itemId)

    return {
      inputId: inputItem.id,
      inputName: inputItem.name,
      outputs,
    }
  }).filter(Boolean)

  console.log(`[recycling] Normalized ${result.length} entries`)
  return result
}

function resolveAllRefs(entries) {
  let resolved = 0
  let unresolved = 0

  for (const entry of entries) {
    // Resolve the main item
    if (typeof entry.item === 'string') {
      const found = resolveRef(entry.item, entries)
      if (found) { entry.item = found; resolved++ }
      else unresolved++
    }

    // Resolve output items
    for (const out of entry.outputs || []) {
      if (typeof out.item === 'string') {
        const found = resolveRef(out.item, entries)
        if (found) { out.item = found; resolved++ }
        else unresolved++
      }
    }
  }

  console.log(`[recycling] Resolved ${resolved} refs, ${unresolved} unresolved`)
}

function resolveRef(ref, entries) {
  if (typeof ref !== 'string' || !ref.startsWith('$')) return null

  // Pattern: ...:recycling:N:outputs:M:item
  const outputMatch = ref.match(/recycling:(\d+):outputs:(\d+):item$/)
  if (outputMatch) {
    const entryIdx = parseInt(outputMatch[1])
    const outIdx = parseInt(outputMatch[2])
    const target = entries[entryIdx]?.outputs?.[outIdx]?.item
    if (target && typeof target === 'object') return target
  }

  // Pattern: ...:recycling:N:item
  const itemMatch = ref.match(/recycling:(\d+):item$/)
  if (itemMatch) {
    const entryIdx = parseInt(itemMatch[1])
    const target = entries[entryIdx]?.item
    if (target && typeof target === 'object') return target
  }

  return null
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const recycling = await scrapeRecycling()
  console.log(`Total: ${recycling.length}`)
  console.log(JSON.stringify(recycling.slice(0, 3), null, 2))
}
