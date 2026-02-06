/**
 * Entry point: init data, wire search, orchestrate rendering
 */
import { loadData, getItemsArray, hasProfile } from './data.js'
import { initSearch, search, getAllItems } from './search.js'
import { renderResults } from './render.js'
import { initFilters, filterItems, getActiveFilter } from './filters.js'
import { initSettings, showSettings, showSetup } from './settings.js'
import './style.css'

let allItems = []
let currentQuery = ''

async function init() {
  // Load data
  try {
    await loadData()
  } catch (e) {
    document.getElementById('results').innerHTML =
      `<div class="error">Failed to load data: ${e.message}</div>`
    return
  }

  allItems = getItemsArray()
  initSearch(allItems)

  // First-time setup
  if (!hasProfile()) {
    await showSetup()
  }

  // Wire up UI
  const searchInput = document.getElementById('search-input')
  const clearBtn = document.getElementById('search-clear')
  const resultsContainer = document.getElementById('results')
  const filtersContainer = document.getElementById('filters')
  const settingsBtn = document.getElementById('settings-btn')

  // Filters
  initFilters(filtersContainer, () => {
    updateResults()
  })

  // Settings
  initSettings(() => {
    // Reload data and re-render on settings change
    loadData().then(() => {
      allItems = getItemsArray()
      initSearch(allItems)
      updateResults()
    })
  })

  settingsBtn.addEventListener('click', showSettings)

  // Search input
  let debounceTimer = null
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      currentQuery = searchInput.value.trim()
      clearBtn.classList.toggle('visible', currentQuery.length > 0)
      updateResults()
    }, 150)
  })

  // Clear button
  clearBtn.addEventListener('click', () => {
    searchInput.value = ''
    currentQuery = ''
    clearBtn.classList.remove('visible')
    updateResults()
    searchInput.focus()
  })

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // / to focus search
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault()
      searchInput.focus()
      searchInput.select()
    }

    // Esc to clear search
    if (e.key === 'Escape') {
      if (document.activeElement === searchInput && currentQuery) {
        searchInput.value = ''
        currentQuery = ''
        clearBtn.classList.remove('visible')
        updateResults()
      } else {
        searchInput.blur()
      }
    }
  })

  // Auto-focus search
  searchInput.focus()

  // Show initial state
  updateResults()
}

function updateResults() {
  const resultsContainer = document.getElementById('results')
  const filter = getActiveFilter()

  let results
  if (currentQuery) {
    results = search(currentQuery)
    // Apply category filter to search results
    if (filter !== 'all') {
      results = results.filter(r => {
        const items = filterItems([r.item], filter)
        return items.length > 0
      })
    }
  } else {
    // No search query — show all items (filtered)
    let items = getAllItems(allItems)
    items = filterItems(items, filter)
    results = items.slice(0, 50).map(item => ({ item }))
  }

  renderResults(results, resultsContainer)

  // Update result count
  const countEl = document.getElementById('result-count')
  if (countEl) {
    if (currentQuery) {
      countEl.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`
    } else {
      countEl.textContent = `${allItems.length} items`
    }
  }
}

init()
