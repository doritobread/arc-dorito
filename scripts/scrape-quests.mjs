/**
 * Scrape quest data from ardb.tools/quests
 * Extracts item delivery/collection objectives from RSC payload.
 * Output: [{ questId, questName, requiredItems: [{ itemId, itemName, quantity }] }]
 */
import { extractRSCData } from './utils.mjs'

const QUESTS_URL = 'https://ardb.tools/quests'

export async function scrapeQuests() {
  console.log('[quests] Fetching quest data...')
  const data = await extractRSCData(QUESTS_URL)

  // Extract individual quest objects by matching the quest pattern
  // Each quest has: id, name, description, image, trader, objectives
  const questPattern = /\{"id":"([^"]+)","name":"([^"]+)","description":"[^"]*","image":"\/quests\//g
  const questPositions = []
  let m
  while ((m = questPattern.exec(data)) !== null) {
    questPositions.push({ id: m[1], name: m[2], pos: m.index })
  }

  if (questPositions.length === 0) {
    throw new Error('[quests] Failed to find quest data in RSC payload')
  }

  console.log(`[quests] Found ${questPositions.length} quests`)

  const results = []

  for (let qi = 0; qi < questPositions.length; qi++) {
    const quest = questPositions[qi]
    // Extract the chunk for this quest (up to next quest or end)
    const endPos = qi + 1 < questPositions.length
      ? questPositions[qi + 1].pos
      : data.length
    const chunk = data.substring(quest.pos, endPos)

    // Find item-type objectives in this quest's chunk
    const requiredItems = []
    const objPattern = /"type":"item","itemId":"([^"]+)","quantity":(\d+)/g
    let objMatch
    while ((objMatch = objPattern.exec(chunk)) !== null) {
      const itemId = objMatch[1]
      const quantity = parseInt(objMatch[2])

      // Try to get item name from nearby "name" field
      const afterMatch = chunk.substring(objMatch.index, objMatch.index + 500)
      const nameMatch = afterMatch.match(/"item":\{"id":"[^"]+","name":"([^"]+)"/)
      const itemName = nameMatch ? nameMatch[1] : itemId

      requiredItems.push({ itemId, itemName, quantity })
    }

    if (requiredItems.length > 0) {
      results.push({
        questId: quest.id,
        questName: quest.name,
        requiredItems,
      })
    }
  }

  const totalItems = results.reduce((sum, q) => sum + q.requiredItems.length, 0)
  console.log(`[quests] Extracted ${results.length} quests with ${totalItems} item requirements`)
  return results
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const quests = await scrapeQuests()
  console.log(`Total quests with items: ${quests.length}`)
  console.log(JSON.stringify(quests.slice(0, 3), null, 2))
}
