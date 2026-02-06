/**
 * Category filter toggles
 */

let activeFilter = 'all'
let onFilterChange = null

const FILTER_GROUPS = [
  { id: 'all', label: 'All' },
  { id: 'materials', label: 'Materials', categories: ['Basic Material', 'Refined Material', 'Topside Material', 'Advanced Material'] },
  { id: 'weapons', label: 'Weapons', categories: ['Hand Cannon', 'Battle Rifle', 'Submachine Gun', 'Assault Rifle', 'Shotgun', 'Sniper Rifle', 'Pistol', 'Light Machinegun'] },
  { id: 'mods', label: 'Mods', categories: ['Modification'] },
  { id: 'consumables', label: 'Consumables', categories: ['Quickuse'] },
  { id: 'equipment', label: 'Equipment', categories: ['Backpack', 'Shield', 'Outfit', 'Augment'] },
  { id: 'misc', label: 'Misc', categories: ['Misc', 'Recyclable', 'Nature', 'Key', 'Trinket', 'Tricket', 'Currency', 'Blueprint', 'Charm', 'Special', 'Ammo'] },
]

export function initFilters(container, onChange) {
  onFilterChange = onChange
  container.innerHTML = ''

  for (const group of FILTER_GROUPS) {
    const btn = document.createElement('button')
    btn.className = `filter-btn${group.id === activeFilter ? ' active' : ''}`
    btn.textContent = group.label
    btn.dataset.filterId = group.id
    btn.addEventListener('click', () => {
      setFilter(group.id, container)
    })
    container.appendChild(btn)
  }
}

function setFilter(filterId, container) {
  activeFilter = filterId

  // Update button states
  const buttons = container.querySelectorAll('.filter-btn')
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filterId === filterId)
  })

  if (onFilterChange) onFilterChange(filterId)
}

export function getActiveFilter() {
  return activeFilter
}

export function filterItems(items, filterId) {
  if (filterId === 'all') return items

  const group = FILTER_GROUPS.find(g => g.id === filterId)
  if (!group || !group.categories) return items

  return items.filter(item => {
    const cat = item.category || ''
    return group.categories.some(c => c.toLowerCase() === cat.toLowerCase())
  })
}
