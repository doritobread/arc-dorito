/**
 * Full data update pipeline:
 * 1. Backup current data
 * 2. Run all scrapers in parallel
 * 3. Merge data
 * 4. Validate
 * 5. Save if valid, abort if not
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { scrapeItems } from './scrape-ardb-items.mjs'
import { scrapeCrafting } from './scrape-ardb-crafting.mjs'
import { scrapeRecycling } from './scrape-ardb-recycling.mjs'
import { scrapeWorkshop } from './scrape-workshop.mjs'
import { mergeData, saveMergedData } from './merge-data.mjs'
import { validate } from './validate.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, '..', 'data', 'items.json')
const BACKUP_DIR = join(__dirname, 'backups')

function backup() {
  if (!existsSync(DATA_PATH)) {
    console.log('[update] No existing data to backup')
    return
  }

  mkdirSync(BACKUP_DIR, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = join(BACKUP_DIR, `items-${timestamp}.json`)
  copyFileSync(DATA_PATH, backupPath)
  console.log(`[update] Backed up to ${backupPath}`)
}

async function run() {
  const scrapeOnly = process.argv.includes('--scrape-only')

  console.log('[update] Starting data update pipeline...\n')

  // 1. Backup
  backup()

  // 2. Scrape all sources in parallel
  console.log('\n[update] Scraping data sources...\n')
  const [items, crafting, recycling, workshop] = await Promise.all([
    scrapeItems(),
    scrapeCrafting(),
    scrapeRecycling(),
    scrapeWorkshop(),
  ])

  if (scrapeOnly) {
    console.log('\n[update] Scrape-only mode, skipping merge')
    return
  }

  // 3. Merge
  console.log('\n[update] Merging data...\n')
  const merged = mergeData(items, crafting, recycling, workshop)

  // 4. Validate
  console.log('\n[update] Validating...\n')
  const result = validate(merged)

  if (!result.valid) {
    console.error('\n[update] VALIDATION FAILED — aborting, keeping existing data')
    process.exit(1)
  }

  // 5. Save
  console.log('\n[update] Validation passed, saving data...')
  saveMergedData(merged)
  console.log('[update] Done!')
}

run().catch(e => {
  console.error('[update] Fatal error:', e)
  process.exit(1)
})
