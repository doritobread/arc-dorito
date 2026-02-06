/**
 * Data loading, localStorage management, import/export
 */

const STORAGE_KEY = 'arc-reference-data'
const PROFILE_KEY = 'arc-reference-profile'
const SETTINGS_KEY = 'arc-reference-settings'

let itemsData = null

export async function loadData() {
  // Check for localStorage override first
  const override = localStorage.getItem(STORAGE_KEY)
  if (override) {
    try {
      itemsData = JSON.parse(override)
      console.log(`Loaded ${Object.keys(itemsData.items).length} items from localStorage`)
      return itemsData
    } catch (e) {
      console.warn('Failed to parse localStorage data, falling back to bundled')
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // Load bundled data
  const res = await fetch(import.meta.env.BASE_URL + 'items.json')
  if (!res.ok) throw new Error(`Failed to load items.json: ${res.status}`)
  itemsData = await res.json()
  console.log(`Loaded ${Object.keys(itemsData.items).length} items from bundled data`)
  return itemsData
}

export function getData() {
  return itemsData
}

export function getItems() {
  if (!itemsData) return {}
  return itemsData.items
}

export function getItemsArray() {
  return Object.values(getItems())
}

export function getItem(id) {
  return getItems()[id] || null
}

export function importData(jsonString) {
  const data = JSON.parse(jsonString)
  if (!data.items || !data.version) {
    throw new Error('Invalid data format: missing items or version')
  }
  localStorage.setItem(STORAGE_KEY, jsonString)
  itemsData = data
  return data
}

export function exportData() {
  return JSON.stringify(itemsData, null, 2)
}

export function resetToBuiltin() {
  localStorage.removeItem(STORAGE_KEY)
}

// Profile (workshop progression)
export function getProfile() {
  const stored = localStorage.getItem(PROFILE_KEY)
  if (stored) {
    try { return JSON.parse(stored) } catch (e) { /* fall through */ }
  }
  return null
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function hasProfile() {
  return localStorage.getItem(PROFILE_KEY) !== null
}

// Settings
export function getSettings() {
  const stored = localStorage.getItem(SETTINGS_KEY)
  if (stored) {
    try { return JSON.parse(stored) } catch (e) { /* fall through */ }
  }
  return {
    showCompletedUpgrades: false,
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
