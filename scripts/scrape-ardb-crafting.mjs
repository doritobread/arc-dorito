/**
 * Scrape crafting recipes from ardb.tools/crafting
 * Extracts: recipe output item, required materials + quantities, workbench + level
 * Resolves RSC deduplication references within the recipes array.
 */
import { extractRSCData, extractNamedArray } from './utils.mjs'

const CRAFTING_URL = 'https://ardb.tools/crafting'

export async function scrapeCrafting() {
  console.log('[crafting] Fetching crafting data...')
  const data = await extractRSCData(CRAFTING_URL)

  const recipes = extractNamedArray(data, 'recipes')
  if (!recipes || recipes.length === 0) {
    throw new Error('[crafting] Failed to extract recipes from RSC payload')
  }

  console.log(`[crafting] Extracted ${recipes.length} recipes`)

  // First pass: build a lookup of all inline item objects so we can resolve refs
  resolveAllRefs(recipes)

  // Normalize into our format
  const result = recipes.map(recipe => {
    const outputItem = typeof recipe.item === 'object' ? recipe.item : null
    if (!outputItem || !outputItem.id) return null

    const requirements = (recipe.requirements || []).map(req => {
      const item = typeof req.item === 'object' ? req.item : null
      return {
        itemId: item?.id || null,
        itemName: item?.name || null,
        quantity: req.quantity || 1,
      }
    }).filter(r => r.itemId)

    const workbench = recipe.workbench || {}

    return {
      outputId: outputItem.id,
      outputName: outputItem.name,
      requirements,
      station: formatStationName(workbench.id || 'workbench'),
      stationLevel: workbench.level || 1,
      blueprint: recipe.recipe && typeof recipe.recipe === 'object' ? {
        id: recipe.recipe.id,
        name: recipe.recipe.name,
      } : null,
    }
  }).filter(Boolean)

  console.log(`[crafting] Normalized ${result.length} recipes`)
  return result
}

/**
 * Resolve RSC deduplication references in-place.
 * RSC refs like "$0:...:recipes:25:requirements:0:item" point to
 * items that were already serialized inline in the same array.
 */
function resolveAllRefs(recipes) {
  let resolved = 0
  let unresolved = 0

  for (const recipe of recipes) {
    // Resolve the main item
    if (typeof recipe.item === 'string') {
      const found = resolveRef(recipe.item, recipes)
      if (found) { recipe.item = found; resolved++ }
      else unresolved++
    }

    // Resolve requirement items
    for (const req of recipe.requirements || []) {
      if (typeof req.item === 'string') {
        const found = resolveRef(req.item, recipes)
        if (found) { req.item = found; resolved++ }
        else unresolved++
      }
    }

    // Resolve blueprint
    if (typeof recipe.recipe === 'string') {
      const found = resolveRef(recipe.recipe, recipes)
      if (found) { recipe.recipe = found; resolved++ }
      else unresolved++
    }
  }

  console.log(`[crafting] Resolved ${resolved} refs, ${unresolved} unresolved`)
}

function resolveRef(ref, recipes) {
  if (typeof ref !== 'string' || !ref.startsWith('$')) return null

  // Pattern: $0:...:recipes:N:requirements:M:item
  const recipeReqMatch = ref.match(/recipes:(\d+):requirements:(\d+):item$/)
  if (recipeReqMatch) {
    const recipeIdx = parseInt(recipeReqMatch[1])
    const reqIdx = parseInt(recipeReqMatch[2])
    const target = recipes[recipeIdx]?.requirements?.[reqIdx]?.item
    if (target && typeof target === 'object') return target
  }

  // Pattern: $0:...:recipes:N:item
  const recipeItemMatch = ref.match(/recipes:(\d+):item$/)
  if (recipeItemMatch) {
    const recipeIdx = parseInt(recipeItemMatch[1])
    const target = recipes[recipeIdx]?.item
    if (target && typeof target === 'object') return target
  }

  // Pattern: $0:...:recipes:N:recipe
  const recipeBlueprintMatch = ref.match(/recipes:(\d+):recipe$/)
  if (recipeBlueprintMatch) {
    const recipeIdx = parseInt(recipeBlueprintMatch[1])
    const target = recipes[recipeIdx]?.recipe
    if (target && typeof target === 'object') return target
  }

  return null
}

function formatStationName(id) {
  const names = {
    'workbench': 'Workbench',
    'medical-bench': 'Medical Lab',
    'medical-lab': 'Medical Lab',
    'gunsmith': 'Gunsmith',
    'gear-bench': 'Gear Bench',
    'explosive-bench': 'Explosives Station',
    'explosives-station': 'Explosives Station',
    'utility-station': 'Utility Station',
    'refiner': 'Refiner',
  }
  return names[id] || id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const recipes = await scrapeCrafting()
  console.log(`Total: ${recipes.length}`)
  console.log(JSON.stringify(recipes.slice(0, 3), null, 2))

  const withRefs = recipes.filter(r => r.requirements.some(req => !req.itemId))
  console.log(`\nRecipes with unresolved refs: ${withRefs.length}`)
}
