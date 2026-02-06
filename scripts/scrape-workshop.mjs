/**
 * Scrape workshop upgrade requirements from ardb.tools/workshop
 * Extracts: station name, level, required materials + quantities
 * Resolves RSC deduplication references across station data.
 */
import { extractRSCData, extractAllNamedArrays } from './utils.mjs'

const WORKSHOP_URL = 'https://ardb.tools/workshop'

export async function scrapeWorkshop() {
  console.log('[workshop] Fetching workshop data...')
  const data = await extractRSCData(WORKSHOP_URL)

  const allLevels = extractAllNamedArrays(data, 'levels')
  if (!allLevels || allLevels.length === 0) {
    throw new Error('[workshop] Failed to extract workshop data from RSC payload')
  }

  console.log(`[workshop] Found ${allLevels.length} station level arrays`)

  // Build item lookup from all resolved items across all stations
  const itemLookup = buildItemLookup(allLevels)

  const stations = []
  for (const { context, data: levels } of allLevels) {
    const idMatch = context.match(/"id":"([^"]+)"/)
    const nameMatch = context.match(/"name":"([^"]+)"/)
    const stationId = idMatch ? idMatch[1] : `unknown-${stations.length}`
    const stationName = nameMatch ? nameMatch[1] : 'Unknown'

    const normalizedLevels = levels.map(level => {
      const requirements = (level.requirements || []).map(req => {
        let item = req.item
        // Resolve RSC refs
        if (typeof item === 'string' && item.startsWith('$')) {
          item = resolveWorkshopRef(item, allLevels, itemLookup)
        }

        return {
          itemId: item?.id || null,
          itemName: item?.name || null,
          quantity: req.quantity || 1,
        }
      })

      return {
        level: level.level,
        requirements,
      }
    })

    stations.push({ id: stationId, name: stationName, levels: normalizedLevels })
    console.log(`[workshop]   ${stationName}: ${normalizedLevels.length} levels`)
  }

  return stations
}

function buildItemLookup(allLevels) {
  const lookup = {}
  for (const { data: levels } of allLevels) {
    for (const level of levels) {
      for (const req of level.requirements || []) {
        if (typeof req.item === 'object' && req.item?.id) {
          lookup[req.item.id] = req.item
        }
      }
    }
  }
  return lookup
}

function resolveWorkshopRef(ref, allLevels, itemLookup) {
  if (typeof ref !== 'string') return ref

  // Workshop refs point to other stations' level requirements
  // Pattern: $NN:props:children:1:props:children:props:bench:levels:L:requirements:R:item
  const match = ref.match(/levels:(\d+):requirements:(\d+):item$/)
  if (match) {
    const levelIdx = parseInt(match[1])
    const reqIdx = parseInt(match[2])

    // Try to find which station this refers to by checking all stations
    for (const { data: levels } of allLevels) {
      if (levels[levelIdx]?.requirements?.[reqIdx]?.item) {
        const target = levels[levelIdx].requirements[reqIdx].item
        if (typeof target === 'object') return target
      }
    }
  }

  return null
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const stations = await scrapeWorkshop()
  console.log(`\nTotal stations: ${stations.length}`)
  for (const station of stations) {
    console.log(`\n${station.name} (${station.id}):`)
    for (const level of station.levels) {
      const reqs = level.requirements.map(r =>
        r.itemName ? `${r.itemName} x${r.quantity}` : `[unresolved] x${r.quantity}`
      )
      console.log(`  Level ${level.level}: ${reqs.join(', ')}`)
    }
  }
}
