/**
 * Result card DOM rendering, rarity colors, match highlighting, smart verdict
 */
import { filterWorkshopForUser, getTopWorkshopNeed, isNeededForWorkshop } from './profile.js'
import { getItems } from './data.js'

const RARITY_COLORS = {
  common: { bg: '#3a3a3a', text: '#a0a0a0', label: 'COMMON' },
  uncommon: { bg: '#1a3a1a', text: '#4ade80', label: 'UNCOMMON' },
  rare: { bg: '#1a2a4a', text: '#60a5fa', label: 'RARE' },
  epic: { bg: '#2a1a4a', text: '#c084fc', label: 'EPIC' },
  legendary: { bg: '#3a2a0a', text: '#fbbf24', label: 'LEGENDARY' },
}

const MAX_CRAFTING_SHOWN = 4

export function renderResults(results, container) {
  container.innerHTML = ''
  if (results.length === 0) return

  const fragment = document.createDocumentFragment()
  for (const result of results) {
    const item = result.item || result
    fragment.appendChild(createCard(item, result.matches))
  }
  container.appendChild(fragment)
}

export function createCard(item, matches) {
  const card = document.createElement('div')
  card.className = 'item-card'
  card.dataset.itemId = item.id

  const rarity = RARITY_COLORS[item.rarity] || RARITY_COLORS.common
  const neededForUpgrade = isNeededForWorkshop(item.workshop || [])

  if (neededForUpgrade) {
    card.classList.add('needed-for-upgrade')
  }

  card.style.setProperty('--rarity-bg', rarity.bg)
  card.style.setProperty('--rarity-text', rarity.text)

  // Header
  const header = document.createElement('div')
  header.className = 'card-header'

  const nameEl = document.createElement('span')
  nameEl.className = 'card-name'
  nameEl.textContent = item.name

  const metaEl = document.createElement('span')
  metaEl.className = 'card-meta'

  const rarityBadge = document.createElement('span')
  rarityBadge.className = 'rarity-badge'
  rarityBadge.textContent = rarity.label
  rarityBadge.style.color = rarity.text

  metaEl.appendChild(rarityBadge)

  if (item.sellValue > 0) {
    const price = document.createElement('span')
    price.className = 'card-price'
    price.textContent = `${item.sellValue} CR`
    metaEl.appendChild(price)
  }

  header.appendChild(nameEl)
  header.appendChild(metaEl)
  card.appendChild(header)

  if (item.category) {
    const catEl = document.createElement('div')
    catEl.className = 'card-category'
    catEl.textContent = item.category
    card.appendChild(catEl)
  }

  // Crafting section — recipe (what this item is crafted from)
  if (item.crafting?.recipe) {
    const section = createSection('RECIPE')
    const recipe = item.crafting.recipe
    const reqList = recipe.requirements.map(r =>
      `${r.itemName} (x${r.quantity})`
    ).join(' + ')
    const stationInfo = recipe.stationLevel > 1
      ? `${recipe.station} ${toRoman(recipe.stationLevel)}`
      : recipe.station
    addSectionLine(section, `${reqList} @ ${stationInfo}`)
    card.appendChild(section)
  }

  // Crafting section — usedIn (what this item crafts into)
  if (item.crafting?.usedIn?.length > 0) {
    const section = createSection('CRAFTS INTO')
    const uses = item.crafting.usedIn
    const shown = uses.slice(0, MAX_CRAFTING_SHOWN)

    for (const use of shown) {
      const stationInfo = use.station
      addSectionLine(section, `${use.output} (x${use.quantity}) @ ${stationInfo}`)
    }

    if (uses.length > MAX_CRAFTING_SHOWN) {
      const more = document.createElement('div')
      more.className = 'section-more'
      more.textContent = `+${uses.length - MAX_CRAFTING_SHOWN} more`
      more.addEventListener('click', () => {
        // Expand to show all
        section.innerHTML = ''
        section.appendChild(createSectionHeader('CRAFTS INTO'))
        for (const use of uses) {
          addSectionLine(section, `${use.output} (x${use.quantity}) @ ${use.station}`)
        }
      })
      section.appendChild(more)
    }

    card.appendChild(section)
  }

  // Recycling section
  if (item.recycling?.recyclesInto) {
    const section = createSection('RECYCLES INTO')
    const outputs = item.recycling.recyclesInto
    const line = outputs.map(o => `${o.itemName} (x${o.quantity})`).join(' + ')
    addSectionLine(section, line)

    // Show recycle value
    const items = getItems()
    const recycleValue = outputs.reduce((sum, o) => {
      const outputItem = items[o.itemId]
      return sum + (outputItem?.sellValue || 0) * o.quantity
    }, 0)
    if (recycleValue > 0) {
      const valueEl = document.createElement('span')
      valueEl.className = 'recycle-value'
      valueEl.textContent = ` (${recycleValue} CR value)`
      section.lastElementChild.appendChild(valueEl)
    }

    card.appendChild(section)
  } else if (item.category && ['Basic Material', 'Refined Material', 'Topside Material'].includes(item.category)) {
    // Note that base materials can't be recycled
    const note = document.createElement('div')
    note.className = 'section-note'
    note.textContent = 'Not recyclable (base material)'
    card.appendChild(note)
  }

  // Workshop section
  const workshopNeeds = filterWorkshopForUser(item.workshop || [])
  if (workshopNeeds.length > 0) {
    const section = createSection('WORKSHOP')
    for (const need of workshopNeeds) {
      const levelInfo = need.level > 1
        ? `${need.station} L${need.level}`
        : need.station
      addSectionLine(section, `${levelInfo} (x${need.quantity})`)
    }
    card.appendChild(section)
  }

  // Smart verdict
  const verdict = computeVerdict(item)
  if (verdict) {
    const verdictEl = document.createElement('div')
    verdictEl.className = `card-verdict verdict-${verdict.type}`
    verdictEl.textContent = verdict.text
    card.appendChild(verdictEl)
  }

  return card
}

function computeVerdict(item) {
  // 1. Workshop need
  const topNeed = getTopWorkshopNeed(item.workshop || [])
  if (topNeed) {
    return {
      type: 'keep',
      text: `KEEP \u2014 needed for ${topNeed.station} L${topNeed.level} (x${topNeed.quantity})`,
    }
  }

  // 2. Crafting utility
  if (item.crafting?.usedIn?.length > 0) {
    const topUse = item.crafting.usedIn[0]
    const suffix = item.crafting.usedIn.length > 1
      ? ` (+${item.crafting.usedIn.length - 1} more)`
      : ''
    return {
      type: 'keep',
      text: `KEEP \u2014 crafts into ${topUse.output}${suffix}`,
    }
  }

  // 3. Sell vs recycle comparison
  const sellValue = item.sellValue || 0
  if (item.recycling?.recyclesInto) {
    const items = getItems()
    const recycleValue = item.recycling.recyclesInto.reduce((sum, o) => {
      const outputItem = items[o.itemId]
      return sum + (outputItem?.sellValue || 0) * o.quantity
    }, 0)

    if (recycleValue > sellValue && recycleValue > 0) {
      const materials = item.recycling.recyclesInto
        .map(o => o.itemName)
        .join(', ')
      return {
        type: 'recycle',
        text: `RECYCLE for ${materials} (+${recycleValue} CR value)`,
      }
    }
  }

  if (sellValue > 0) {
    return {
      type: 'sell',
      text: `SELL for ${sellValue} CR`,
    }
  }

  return {
    type: 'neutral',
    text: 'SAFE TO SELL/RECYCLE',
  }
}

function createSection(title) {
  const section = document.createElement('div')
  section.className = 'card-section'
  section.appendChild(createSectionHeader(title))
  return section
}

function createSectionHeader(title) {
  const header = document.createElement('div')
  header.className = 'section-header'
  header.textContent = title
  return header
}

function addSectionLine(section, text) {
  const line = document.createElement('div')
  line.className = 'section-line'
  line.textContent = text
  section.appendChild(line)
}

function toRoman(n) {
  const numerals = ['', 'I', 'II', 'III', 'IV', 'V']
  return numerals[n] || n.toString()
}
