/**
 * Validate merged items.json for sanity and referential integrity.
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function validate(data) {
  const errors = []
  const warnings = []
  const items = data.items || {}
  const itemCount = Object.keys(items).length

  console.log('[validate] Checking data integrity...')

  // Check basic structure
  if (!data.version) errors.push('Missing version')
  if (!data.timestamp) errors.push('Missing timestamp')

  // Check item count
  if (itemCount < 400) {
    errors.push(`Too few items: ${itemCount} (expected 400+)`)
  }
  if (itemCount < 490) {
    warnings.push(`Item count lower than expected: ${itemCount} (expected ~498)`)
  }

  // Check known items exist
  const knownItems = [
    'chemicals', 'metal-parts', 'plastic-parts', 'fabric', 'rubber-parts',
    'adrenaline-shot', 'bandage', 'arc-alloy',
  ]
  for (const id of knownItems) {
    if (!items[id]) {
      errors.push(`Missing known item: ${id}`)
    }
  }

  // Check referential integrity
  let craftingRefs = 0
  let brokenCraftRefs = 0
  let recyclingRefs = 0
  let brokenRecycleRefs = 0

  for (const item of Object.values(items)) {
    // Check crafting references
    if (item.crafting?.recipe) {
      for (const req of item.crafting.recipe.requirements || []) {
        craftingRefs++
        if (req.itemId && !items[req.itemId]) {
          brokenCraftRefs++
          warnings.push(`Broken craft ref: ${item.name} requires ${req.itemId}`)
        }
      }
    }

    for (const use of item.crafting?.usedIn || []) {
      craftingRefs++
      if (use.outputId && !items[use.outputId]) {
        brokenCraftRefs++
        warnings.push(`Broken usedIn ref: ${item.name} -> ${use.outputId}`)
      }
    }

    // Check recycling references
    if (item.recycling?.recyclesInto) {
      for (const out of item.recycling.recyclesInto) {
        recyclingRefs++
        if (out.itemId && !items[out.itemId]) {
          brokenRecycleRefs++
          warnings.push(`Broken recycle ref: ${item.name} -> ${out.itemId}`)
        }
      }
    }

    for (const src of item.recycling?.outputOf || []) {
      recyclingRefs++
      if (src.sourceId && !items[src.sourceId]) {
        brokenRecycleRefs++
        warnings.push(`Broken outputOf ref: ${item.name} <- ${src.sourceId}`)
      }
    }

    // Check for items with no useful data
    const hasData = item.sellValue > 0 ||
      item.crafting?.recipe ||
      item.crafting?.usedIn?.length > 0 ||
      item.recycling?.recyclesInto ||
      item.recycling?.outputOf?.length > 0 ||
      item.workshop?.length > 0

    if (!hasData && item.category) {
      // Items with a category but no data are ok, just worth noting
    }
  }

  // Check workshop data quality
  const VALID_STATION_IDS = new Set([
    'workbench', 'gunsmith', 'gear-bench', 'medical-lab',
    'explosives-station', 'utility-station', 'refiner', 'scrappy',
  ])
  const VALID_STATION_NAMES = new Set([
    'Workbench', 'Gunsmith', 'Gear Bench', 'Medical Lab',
    'Explosives Station', 'Utility Station', 'Refiner', 'Scrappy',
  ])

  let workshopRefs = 0
  let workshopNameIssues = 0
  const stationNameVariants = new Set()

  for (const item of Object.values(items)) {
    for (const w of item.workshop || []) {
      workshopRefs++
      stationNameVariants.add(w.station)
      if (!VALID_STATION_IDS.has(w.stationId)) {
        warnings.push(`Invalid workshop stationId: ${item.name} -> ${w.stationId}`)
      }
      if (!VALID_STATION_NAMES.has(w.station)) {
        workshopNameIssues++
        warnings.push(`Non-canonical workshop station name: "${w.station}" on ${item.name}`)
      }
    }

    // Check for duplicate quest entries
    if (item.quests?.length > 1) {
      const seen = new Set()
      for (const q of item.quests) {
        const key = `${q.questId}:${q.quantity}`
        if (seen.has(key)) {
          warnings.push(`Duplicate quest entry: ${item.name} -> ${q.questName} (x${q.quantity})`)
        }
        seen.add(key)
      }
    }
  }

  // Check known workshop items have data
  const workshopCheckItems = ['fabric', 'arc-alloy', 'plastic-parts', 'metal-parts']
  for (const id of workshopCheckItems) {
    if (items[id] && (!items[id].workshop || items[id].workshop.length === 0)) {
      warnings.push(`Expected workshop data on ${id} but found none`)
    }
  }

  console.log(`[validate] Workshop refs: ${workshopRefs} (${workshopNameIssues} name issues)`)
  console.log(`[validate] Station name variants: ${[...stationNameVariants].join(', ')}`)

  // Spot-check known values
  const chemicals = items['chemicals']
  if (chemicals) {
    if (chemicals.sellValue !== 50) {
      warnings.push(`Chemicals sell value: ${chemicals.sellValue} (expected 50)`)
    }
    if (chemicals.rarity !== 'common') {
      warnings.push(`Chemicals rarity: ${chemicals.rarity} (expected common)`)
    }
    if (!chemicals.crafting.usedIn.length) {
      warnings.push('Chemicals has no usedIn entries')
    }
  }

  const adrenaline = items['adrenaline-shot']
  if (adrenaline) {
    if (adrenaline.sellValue !== 300) {
      warnings.push(`Adrenaline Shot sell value: ${adrenaline.sellValue} (expected 300)`)
    }
    if (!adrenaline.crafting.recipe) {
      warnings.push('Adrenaline Shot has no recipe')
    }
  }

  // Summary
  console.log(`[validate] Items: ${itemCount}`)
  console.log(`[validate] Crafting refs: ${craftingRefs} (${brokenCraftRefs} broken)`)
  console.log(`[validate] Recycling refs: ${recyclingRefs} (${brokenRecycleRefs} broken)`)
  console.log(`[validate] Errors: ${errors.length}`)
  console.log(`[validate] Warnings: ${warnings.length}`)

  if (errors.length) {
    console.log('\nErrors:')
    errors.forEach(e => console.log(`  ERROR: ${e}`))
  }
  if (warnings.length) {
    console.log('\nWarnings:')
    warnings.forEach(w => console.log(`  WARN: ${w}`))
  }

  return { valid: errors.length === 0, errors, warnings }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dataPath = join(__dirname, '..', 'data', 'items.json')
  try {
    const data = JSON.parse(readFileSync(dataPath, 'utf-8'))
    const result = validate(data)
    process.exit(result.valid ? 0 : 1)
  } catch (e) {
    console.error(`[validate] Failed to read ${dataPath}: ${e.message}`)
    process.exit(1)
  }
}
