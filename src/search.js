/**
 * Fuse.js search configuration and query interface
 */
import Fuse from 'fuse.js'

let fuse = null

const FUSE_OPTIONS = {
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'category', weight: 0.15 },
    { name: 'aliases', weight: 0.15 },
  ],
  threshold: 0.4,
  minMatchCharLength: 2,
  includeMatches: true,
  ignoreLocation: true,
}

export function initSearch(items) {
  fuse = new Fuse(items, FUSE_OPTIONS)
}

export function search(query) {
  if (!fuse) return []
  if (!query || query.length < 1) return []
  return fuse.search(query, { limit: 50 })
}

export function getAllItems(items) {
  // Return all items sorted by name when no search query
  return [...items].sort((a, b) => a.name.localeCompare(b.name))
}
