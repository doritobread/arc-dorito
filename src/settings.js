/**
 * Settings panel, workshop level selectors, import/export/reset
 */
import { STATIONS, getWorkshopProgress, setWorkshopProgress } from './profile.js'
import { getSettings, saveSettings, importData, exportData, resetToBuiltin, hasProfile, saveProfile } from './data.js'

let onSettingsChange = null

export function initSettings(onChange) {
  onSettingsChange = onChange
}

export function showSettings() {
  // Remove existing overlay if any
  const existing = document.getElementById('settings-overlay')
  if (existing) existing.remove()

  const overlay = document.createElement('div')
  overlay.id = 'settings-overlay'
  overlay.className = 'settings-overlay'
  overlay.innerHTML = `
    <div class="settings-panel">
      <div class="settings-header">
        <h2>Settings</h2>
        <button class="settings-close" aria-label="Close">&times;</button>
      </div>

      <div class="settings-section">
        <h3>Workshop Levels</h3>
        <p class="settings-hint">Set your workshop levels to get personalized item recommendations.</p>
        <div id="workshop-grid" class="workshop-grid"></div>
      </div>

      <div class="settings-section">
        <h3>Display</h3>
        <label class="settings-toggle">
          <input type="checkbox" id="show-completed-toggle">
          <span>Show completed workshop upgrades</span>
        </label>
      </div>

      <div class="settings-section">
        <h3>Data</h3>
        <div class="settings-actions">
          <button id="btn-import" class="settings-btn">Import JSON</button>
          <button id="btn-export" class="settings-btn">Export JSON</button>
          <button id="btn-reset" class="settings-btn settings-btn-danger">Reset to built-in</button>
        </div>
        <input type="file" id="import-file" accept=".json" style="display:none">
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  // Workshop grid
  const grid = overlay.querySelector('#workshop-grid')
  const progress = getWorkshopProgress()

  for (const station of STATIONS) {
    const row = document.createElement('div')
    row.className = 'workshop-row'

    const label = document.createElement('span')
    label.className = 'workshop-label'
    label.textContent = station.name

    const selector = document.createElement('div')
    selector.className = 'workshop-selector'

    for (let level = 0; level <= station.maxLevel; level++) {
      const btn = document.createElement('button')
      btn.className = `workshop-level-btn${progress[station.id] === level ? ' active' : ''}`
      btn.textContent = level === 0 ? '0' : `L${level}`
      btn.addEventListener('click', () => {
        progress[station.id] = level
        setWorkshopProgress(progress)
        // Update active states
        selector.querySelectorAll('.workshop-level-btn').forEach((b, i) => {
          b.classList.toggle('active', i === level)
        })
        if (onSettingsChange) onSettingsChange()
      })
      selector.appendChild(btn)
    }

    row.appendChild(label)
    row.appendChild(selector)
    grid.appendChild(row)
  }

  // Show completed toggle
  const settings = getSettings()
  const toggle = overlay.querySelector('#show-completed-toggle')
  toggle.checked = settings.showCompletedUpgrades
  toggle.addEventListener('change', () => {
    settings.showCompletedUpgrades = toggle.checked
    saveSettings(settings)
    if (onSettingsChange) onSettingsChange()
  })

  // Import
  const importBtn = overlay.querySelector('#btn-import')
  const importFile = overlay.querySelector('#import-file')
  importBtn.addEventListener('click', () => importFile.click())
  importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const text = await file.text()
      importData(text)
      overlay.remove()
      if (onSettingsChange) onSettingsChange()
    } catch (err) {
      alert(`Import failed: ${err.message}`)
    }
  })

  // Export
  overlay.querySelector('#btn-export').addEventListener('click', () => {
    const data = exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'arc-dorito-items.json'
    a.click()
    URL.revokeObjectURL(url)
  })

  // Reset
  overlay.querySelector('#btn-reset').addEventListener('click', () => {
    if (confirm('Reset to built-in data? This will clear any imported data.')) {
      resetToBuiltin()
      overlay.remove()
      if (onSettingsChange) onSettingsChange()
    }
  })

  // Close
  overlay.querySelector('.settings-close').addEventListener('click', () => overlay.remove())
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove()
  })
}

/**
 * Show first-time setup screen for workshop levels.
 * Returns a promise that resolves when the user clicks "Done".
 */
export function showSetup() {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.className = 'setup-overlay'
    overlay.innerHTML = `
      <div class="setup-panel">
        <h1>Welcome to ARC Dorito</h1>
        <p>Set your workshop levels so we can tell you what's worth keeping.</p>
        <div id="setup-grid" class="workshop-grid"></div>
        <button id="setup-done" class="setup-done-btn">Done</button>
      </div>
    `

    document.body.appendChild(overlay)

    const grid = overlay.querySelector('#setup-grid')
    const progress = {}

    for (const station of STATIONS) {
      progress[station.id] = 0
      const row = document.createElement('div')
      row.className = 'workshop-row'

      const label = document.createElement('span')
      label.className = 'workshop-label'
      label.textContent = station.name

      const selector = document.createElement('div')
      selector.className = 'workshop-selector'

      for (let level = 0; level <= station.maxLevel; level++) {
        const btn = document.createElement('button')
        btn.className = `workshop-level-btn${level === 0 ? ' active' : ''}`
        btn.textContent = level === 0 ? '0' : `L${level}`
        btn.addEventListener('click', () => {
          progress[station.id] = level
          selector.querySelectorAll('.workshop-level-btn').forEach((b, i) => {
            b.classList.toggle('active', i === level)
          })
        })
        selector.appendChild(btn)
      }

      row.appendChild(label)
      row.appendChild(selector)
      grid.appendChild(row)
    }

    overlay.querySelector('#setup-done').addEventListener('click', () => {
      setWorkshopProgress(progress)
      overlay.remove()
      resolve()
    })
  })
}
