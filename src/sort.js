/**
 * Sort controls and sorting logic
 */

const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 }

const SORT_OPTIONS = [
  { id: 'alphabetical', label: 'Name' },
  { id: 'rarity', label: 'Rarity' },
  { id: 'value', label: 'Value' },
]

const SORT_OPTIONS_SEARCH = [
  { id: 'relevance', label: 'Relevance' },
  ...SORT_OPTIONS,
]

let currentSort = 'alphabetical'
let currentDir = 'asc'
let isSearchMode = false
let onChange = null

export function initSort(container, callback) {
  onChange = callback
  renderControls(container)
}

export function setSearchMode(searching) {
  if (isSearchMode === searching) return
  isSearchMode = searching
  if (searching && currentSort !== 'relevance') {
    currentSort = 'relevance'
    currentDir = 'asc'
  } else if (!searching && currentSort === 'relevance') {
    currentSort = 'alphabetical'
    currentDir = 'asc'
  }
  const container = document.getElementById('sort-controls')
  if (container) renderControls(container)
}

export function getSort() {
  return { sort: currentSort, dir: currentDir }
}

export function applySorting(results, { sort, dir }) {
  if (sort === 'relevance') return results

  const sorted = [...results]
  sorted.sort((a, b) => {
    const itemA = a.item || a
    const itemB = b.item || b
    let cmp = 0

    switch (sort) {
      case 'rarity':
        cmp = (RARITY_ORDER[itemA.rarity] || 0) - (RARITY_ORDER[itemB.rarity] || 0)
        if (cmp === 0) cmp = itemA.name.localeCompare(itemB.name)
        break
      case 'value':
        cmp = (itemA.sellValue || 0) - (itemB.sellValue || 0)
        if (cmp === 0) cmp = itemA.name.localeCompare(itemB.name)
        break
      case 'alphabetical':
      default:
        cmp = itemA.name.localeCompare(itemB.name)
        break
    }

    return dir === 'desc' ? -cmp : cmp
  })

  return sorted
}

function renderControls(container) {
  container.innerHTML = ''
  const options = isSearchMode ? SORT_OPTIONS_SEARCH : SORT_OPTIONS

  for (const opt of options) {
    const btn = document.createElement('button')
    btn.className = `sort-btn${opt.id === currentSort ? ' active' : ''}`
    btn.textContent = opt.label
    btn.addEventListener('click', () => {
      if (currentSort === opt.id) return
      currentSort = opt.id
      renderControls(container)
      if (onChange) onChange()
    })
    container.appendChild(btn)
  }

  // Direction toggle
  const dirBtn = document.createElement('button')
  dirBtn.className = 'sort-dir-btn'
  dirBtn.textContent = currentDir === 'asc' ? '\u2191' : '\u2193'
  dirBtn.title = currentDir === 'asc' ? 'Ascending' : 'Descending'
  dirBtn.addEventListener('click', () => {
    currentDir = currentDir === 'asc' ? 'desc' : 'asc'
    dirBtn.textContent = currentDir === 'asc' ? '\u2191' : '\u2193'
    dirBtn.title = currentDir === 'asc' ? 'Ascending' : 'Descending'
    if (onChange) onChange()
  })
  container.appendChild(dirBtn)
}
