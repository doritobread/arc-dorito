/**
 * Restore data from a backup.
 * Lists available backups and restores the most recent (or specified) one.
 */
import { readdirSync, copyFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, '..', 'data', 'items.json')
const BACKUP_DIR = join(__dirname, 'backups')

function listBackups() {
  if (!existsSync(BACKUP_DIR)) return []
  return readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('items-') && f.endsWith('.json'))
    .sort()
    .reverse()
}

function rollback(target) {
  const backups = listBackups()

  if (backups.length === 0) {
    console.log('[rollback] No backups available')
    process.exit(1)
  }

  console.log('[rollback] Available backups:')
  backups.forEach((b, i) => console.log(`  ${i + 1}. ${b}`))

  const file = target ? backups.find(b => b.includes(target)) : backups[0]
  if (!file) {
    console.log(`[rollback] No backup matching "${target}"`)
    process.exit(1)
  }

  const backupPath = join(BACKUP_DIR, file)
  copyFileSync(backupPath, DATA_PATH)
  console.log(`[rollback] Restored from ${file}`)
}

const target = process.argv[2]
rollback(target)
