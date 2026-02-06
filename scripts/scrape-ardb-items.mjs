/**
 * Scrape base item list from ardb.tools/items
 * Extracts RSC flight data containing all 498+ items with:
 * id, name, description, rarity, price, stack, weight, category
 */
import { extractRSCData, extractFirstArray } from './utils.mjs'

const ITEMS_URL = 'https://ardb.tools/items'

export async function scrapeItems() {
  console.log('[items] Fetching item data...')
  const data = await extractRSCData(ITEMS_URL)

  // The items page has a rich array of all items in the RSC payload
  // Pattern: [{"id":"...","name":"...","description":"...","rarity":"...","icon":"...","price":N,...}]
  const items = extractFirstArray(data, ['id', 'name', 'description', 'rarity', 'price'])
  if (!items || items.length === 0) {
    throw new Error('[items] Failed to extract item data from RSC payload')
  }

  console.log(`[items] Extracted ${items.length} items`)

  // Normalize into our schema
  const result = {}
  for (const item of items) {
    if (typeof item !== 'object' || !item.id || !item.name) continue
    result[item.id] = {
      id: item.id,
      name: item.name,
      description: item.description || '',
      category: formatCategory(item.category || ''),
      rarity: (item.rarity || 'common').toLowerCase(),
      sellValue: item.price || 0,
      stack: item.stack || 1,
      weight: item.weight || 0,
      modifiers: Array.isArray(item.modifiers) && item.modifiers.length > 0
        ? item.modifiers.map(m => m.description || m)
        : [],
    }
  }

  console.log(`[items] Normalized ${Object.keys(result).length} items`)
  return result
}

function formatCategory(cat) {
  return cat
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const items = await scrapeItems()
  console.log(`Total: ${Object.keys(items).length}`)
  const sample = Object.values(items).slice(0, 3)
  console.log(JSON.stringify(sample, null, 2))
}
