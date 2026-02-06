/**
 * Merge scraped data into the final denormalized items.json schema.
 * Computes inverse relationships and resolves RSC references.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')

// Known items that appear as RSC references — manually mapped from context
const KNOWN_REFS = {
  // Gear Bench L1 refs
  'gear-bench-l1-0': { id: 'fabric', name: 'Fabric' },
  'gear-bench-l1-1': { id: 'rubber-parts', name: 'Rubber Parts' },
  // Gear Bench L2
  'gear-bench-l2-1': { id: 'durable-cloth', name: 'Durable Cloth' },
  // Gear Bench L3
  'gear-bench-l3-1': { id: 'arc-flex-rubber', name: 'ARC Flex Rubber' },
  // Refiner L1
  'refiner-l1-0': { id: 'scrap-metal', name: 'Scrap Metal' },
  // Medical Lab L1
  'medical-lab-l1-1': { id: 'arc-alloy', name: 'ARC Alloy' },
  // Explosives L1
  'explosives-l1-1': { id: 'arc-alloy', name: 'ARC Alloy' },
  // Scrappy L5
  'scrappy-l5-0': { id: 'candleberries', name: 'Candleberries' },
}

export function mergeData(items, crafting, recycling, workshop, quests = []) {
  console.log('[merge] Starting merge...')
  console.log(`[merge]   Items: ${Object.keys(items).length}`)
  console.log(`[merge]   Crafting: ${crafting.length}`)
  console.log(`[merge]   Recycling: ${recycling.length}`)
  console.log(`[merge]   Workshop stations: ${workshop.length}`)
  console.log(`[merge]   Quests with items: ${quests.length}`)

  // Build the final items map
  const finalItems = {}

  // 1. Start with base item data
  for (const [id, item] of Object.entries(items)) {
    finalItems[id] = {
      id: item.id,
      name: item.name,
      category: item.category,
      rarity: item.rarity,
      sellValue: item.sellValue,
      aliases: [],
      modifiers: item.modifiers || [],
      quests: [],
      valueTier: null,
      crafting: {
        recipe: null,
        usedIn: [],
      },
      recycling: {
        recyclesInto: null,
        outputOf: [],
      },
      workshop: [],
    }
  }

  // 2. Process crafting recipes
  for (const recipe of crafting) {
    const outputId = recipe.outputId
    if (!outputId) continue

    // Ensure output item exists
    ensureItem(finalItems, outputId, recipe.outputName)

    // Set the recipe on the output item
    finalItems[outputId].crafting.recipe = {
      requirements: recipe.requirements.map(r => ({
        itemId: r.itemId,
        itemName: r.itemName || finalItems[r.itemId]?.name || r.itemId,
        quantity: r.quantity,
      })),
      station: recipe.station,
      stationLevel: recipe.stationLevel,
      blueprint: recipe.blueprint,
    }

    // Set inverse relationships: each ingredient's "usedIn"
    for (const req of recipe.requirements) {
      if (!req.itemId) continue
      ensureItem(finalItems, req.itemId, req.itemName)
      finalItems[req.itemId].crafting.usedIn.push({
        output: recipe.outputName,
        outputId: outputId,
        quantity: req.quantity,
        station: recipe.station,
      })
    }
  }

  // 3. Process recycling
  for (const entry of recycling) {
    const inputId = entry.inputId
    if (!inputId) continue

    ensureItem(finalItems, inputId, entry.inputName)

    // Set what this item recycles into
    finalItems[inputId].recycling.recyclesInto = entry.outputs.map(o => ({
      itemId: o.itemId,
      itemName: o.itemName || finalItems[o.itemId]?.name || o.itemId,
      quantity: o.quantity,
    }))

    // Set inverse: each output's "outputOf"
    for (const output of entry.outputs) {
      if (!output.itemId) continue
      ensureItem(finalItems, output.itemId, output.itemName)
      finalItems[output.itemId].recycling.outputOf.push({
        source: entry.inputName,
        sourceId: inputId,
        quantity: output.quantity,
      })
    }
  }

  // 4. Process workshop upgrades
  for (const station of workshop) {
    for (const level of station.levels) {
      for (const req of level.requirements) {
        let itemId = req.itemId
        let itemName = req.itemName

        // Try to resolve unresolved refs
        if (!itemId) {
          const refKey = `${station.id}-l${level.level}-${level.requirements.indexOf(req)}`
          const known = KNOWN_REFS[refKey]
          if (known) {
            itemId = known.id
            itemName = known.name
          } else {
            console.warn(`[merge] Unresolved workshop ref: ${station.name} L${level.level} req #${level.requirements.indexOf(req)}`)
            continue
          }
        }

        ensureItem(finalItems, itemId, itemName)
        // Avoid duplicates
        const existing = finalItems[itemId].workshop.find(
          w => w.station === station.name && w.level === level.level
        )
        if (!existing) {
          finalItems[itemId].workshop.push({
            station: station.name,
            stationId: station.id,
            level: level.level,
            quantity: req.quantity,
          })
        }
      }
    }
  }

  // 5. Process quests — add quest requirements to items
  for (const quest of quests) {
    for (const req of quest.requiredItems) {
      if (!req.itemId) continue
      ensureItem(finalItems, req.itemId, req.itemName)
      finalItems[req.itemId].quests.push({
        questName: quest.questName,
        questId: quest.questId,
        quantity: req.quantity,
      })
    }
  }

  // 6. Compute valueTier for materials used in 2+ recipes
  computeValueTiers(finalItems)

  // 7. Add common aliases
  addAliases(finalItems)

  const itemCount = Object.keys(finalItems).length
  const withCrafting = Object.values(finalItems).filter(i => i.crafting.recipe || i.crafting.usedIn.length > 0).length
  const withRecycling = Object.values(finalItems).filter(i => i.recycling.recyclesInto || i.recycling.outputOf.length > 0).length
  const withWorkshop = Object.values(finalItems).filter(i => i.workshop.length > 0).length
  const withQuests = Object.values(finalItems).filter(i => i.quests.length > 0).length
  const withModifiers = Object.values(finalItems).filter(i => i.modifiers.length > 0).length

  console.log(`[merge] Final item count: ${itemCount}`)
  console.log(`[merge]   With crafting data: ${withCrafting}`)
  console.log(`[merge]   With recycling data: ${withRecycling}`)
  console.log(`[merge]   With workshop data: ${withWorkshop}`)
  console.log(`[merge]   With quest data: ${withQuests}`)
  console.log(`[merge]   With modifiers: ${withModifiers}`)

  return {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    items: finalItems,
  }
}

function ensureItem(items, id, name) {
  if (!items[id]) {
    items[id] = {
      id,
      name: name || id,
      category: '',
      rarity: 'common',
      sellValue: 0,
      aliases: [],
      modifiers: [],
      quests: [],
      valueTier: null,
      crafting: { recipe: null, usedIn: [] },
      recycling: { recyclesInto: null, outputOf: [] },
      workshop: [],
    }
  }
}

/**
 * Compute valueTier for materials based on crafted output value vs sell value.
 * Only for items used in 2+ recipes.
 */
const TOP_TIER_ITEMS = new Set([
  'metal-parts', 'medium-gun-parts', 'heavy-gun-parts', 'simple-gun-parts',
  'mechanical-components', 'advanced-mechanical-components', 'light-gun-parts',
  'steel-spring',
])

const MID_TIER_ITEMS = new Set([
  'magnetic-accelerator', 'complex-gun-parts', 'advanced-electrical-components',
  'mod-components', 'electrical-components', 'duct-tape', 'crude-explosives',
  'durable-cloth', 'arc-alloy', 'sensors', 'explosive-compound', 'wires',
])

function computeValueTiers(items) {
  let top = 0, mid = 0
  for (const item of Object.values(items)) {
    if (TOP_TIER_ITEMS.has(item.id)) {
      item.valueTier = 'top'
      top++
    } else if (MID_TIER_ITEMS.has(item.id)) {
      item.valueTier = 'mid'
      mid++
    }
  }
  console.log(`[merge]   Value tiers: ${top} top, ${mid} mid`)
}

function addAliases(items) {
  const aliasMap = {
    'chemicals': ['chems'],
    'metal-parts': ['metal', 'mp'],
    'plastic-parts': ['plastic', 'pp'],
    'rubber-parts': ['rubber', 'rp'],
    'fabric': ['cloth'],
    'scrap-metal': ['scrap', 'sm'],
    'electrical-components': ['elec', 'ec'],
    'mechanical-components': ['mech', 'mc'],
    'arc-alloy': ['alloy'],
    'arc-powercell': ['powercell', 'apc'],
    'arc-circuitry': ['circuitry'],
    'adrenaline-shot': ['adren', 'adrenaline'],
    'durable-cloth': ['dc'],
    'crude-explosives': ['crude', 'ce'],
    'explosive-compound': ['ec', 'compound'],
    'advanced-electrical-components': ['aec', 'adv elec'],
    'advanced-mechanical-components': ['amc', 'adv mech'],
    'arc-coolant': ['coolant'],
    'arc-flex-rubber': ['flex rubber', 'afr'],
    'arc-motion-core': ['motion core', 'amc'],
    'arc-performance-steel': ['perf steel', 'aps'],
    'arc-synthetic-resin': ['resin', 'asr'],
    'arc-thermo-lining': ['thermo', 'atl'],
    'antiseptic': ['anti'],
    'bandage': ['band'],
    'barricade-kit': ['barricade'],
    'coins': ['cr', 'credits', 'money'],
  }

  for (const [id, aliases] of Object.entries(aliasMap)) {
    if (items[id]) {
      items[id].aliases = aliases
    }
  }
}

export function saveMergedData(data) {
  mkdirSync(DATA_DIR, { recursive: true })
  const outputPath = join(DATA_DIR, 'items.json')
  writeFileSync(outputPath, JSON.stringify(data, null, 2))
  console.log(`[merge] Saved to ${outputPath}`)
  return outputPath
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Load scraped data from scratchpad if running standalone
  const scratchpad = '/tmp/claude-1000/-mnt-c-Users-bretl-Documents-Code-2026-arc-reference/341b7567-c40f-4bf7-8d3e-c56cc6e9ad8f/scratchpad'
  try {
    const { scrapeItems } = await import('./scrape-ardb-items.mjs')
    const { scrapeCrafting } = await import('./scrape-ardb-crafting.mjs')
    const { scrapeRecycling } = await import('./scrape-ardb-recycling.mjs')
    const { scrapeWorkshop } = await import('./scrape-workshop.mjs')
    const { scrapeQuests } = await import('./scrape-quests.mjs')

    const [items, crafting, recycling, workshop, quests] = await Promise.all([
      scrapeItems(),
      scrapeCrafting(),
      scrapeRecycling(),
      scrapeWorkshop(),
      scrapeQuests(),
    ])

    const merged = mergeData(items, crafting, recycling, workshop, quests)
    saveMergedData(merged)
  } catch (e) {
    console.error('[merge] Error:', e.message)
    process.exit(1)
  }
}
