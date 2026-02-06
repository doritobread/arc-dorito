/**
 * Workshop progression state management
 */
import { getProfile, saveProfile, getSettings } from './data.js'

export const STATIONS = [
  { id: 'workbench', name: 'Workbench', maxLevel: 3 },
  { id: 'gunsmith', name: 'Gunsmith', maxLevel: 3 },
  { id: 'gear-bench', name: 'Gear Bench', maxLevel: 3 },
  { id: 'medical-lab', name: 'Medical Lab', maxLevel: 3 },
  { id: 'explosives-station', name: 'Explosives Station', maxLevel: 3 },
  { id: 'utility-station', name: 'Utility Station', maxLevel: 3 },
  { id: 'refiner', name: 'Refiner', maxLevel: 3 },
]

const DEFAULT_PROGRESS = Object.fromEntries(
  STATIONS.map(s => [s.id, 0])
)

export function getWorkshopProgress() {
  const profile = getProfile()
  return profile?.workshopProgress || { ...DEFAULT_PROGRESS }
}

export function setWorkshopProgress(progress) {
  saveProfile({ workshopProgress: progress })
}

export function getStationLevel(stationId) {
  const progress = getWorkshopProgress()
  return progress[stationId] || 0
}

/**
 * Check if a workshop upgrade is completed based on user's progression.
 * Returns true if the user has already reached or exceeded this level.
 */
export function isUpgradeCompleted(stationId, level) {
  return getStationLevel(stationId) >= level
}

/**
 * Filter workshop requirements for an item based on user's progression.
 * Returns only upgrades the user hasn't completed yet.
 */
export function filterWorkshopForUser(workshopEntries) {
  const settings = getSettings()
  if (settings.showCompletedUpgrades) return workshopEntries

  return workshopEntries.filter(entry => {
    return !isUpgradeCompleted(entry.stationId, entry.level)
  })
}

/**
 * Determine if an item is needed for any remaining workshop upgrade.
 */
export function isNeededForWorkshop(workshopEntries) {
  const remaining = filterWorkshopForUser(workshopEntries)
  return remaining.length > 0
}

/**
 * Get the most important remaining workshop need for verdict.
 */
export function getTopWorkshopNeed(workshopEntries) {
  const remaining = filterWorkshopForUser(workshopEntries)
  if (remaining.length === 0) return null
  // Return the lowest level need first
  remaining.sort((a, b) => a.level - b.level)
  return remaining[0]
}
