# ARC Dorito

An interactive item reference and optimization guide for ARC Raiders. Search, filter, and get smart recommendations on whether to keep, craft, recycle, or sell any item — personalized to your workshop progression.

**Live site:** [doritobread.github.io/arc-dorito](https://doritobread.github.io/arc-dorito/)

## Features

- **Fuzzy search** across 480+ items with real-time results (powered by Fuse.js)
- **Smart verdicts** — personalized KEEP / SELL / RECYCLE recommendations based on your workshop levels, crafting trees, and recycling values
- **Workshop tracking** — set your station levels and see which items you still need for upgrades
- **Category filters & sorting** — filter by Materials, Weapons, Mods, Consumables, Equipment, or Misc; sort by name, rarity, or value
- **Crafting & recycling trees** — see what each item crafts into, what's needed to craft it, and what it recycles into
- **Quest & modifier info** — expandable card sections show quest requirements and item modifiers
- **Rarity-colored UI** — items and outputs are color-coded by rarity (Common through Legendary)
- **Import/Export** — share or back up your workshop profile as JSON

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server with hot reload
npm run dev
```

The app opens at `http://localhost:5173/arc-dorito/`.

## Building for Production

```bash
npm run build
```

Output goes to `dist/`. Deployment to GitHub Pages happens automatically on push to `main` via GitHub Actions.

## Updating Item Data

Item data is scraped from [ardb.tools](https://ardb.tools) and stored in `data/items.json`. To refresh it:

```bash
# Full pipeline: scrape all sources, merge, validate, save
npm run update

# Or run individual steps
npm run scrape      # Scrape sources only
npm run merge       # Merge pre-scraped data
npm run validate    # Check data integrity
npm run rollback    # Revert to previous backup
```

Backups are saved automatically to `scripts/backups/` before each update.

## Project Structure

```
src/
  main.js       # App initialization & orchestration
  data.js       # Data loading, localStorage, import/export
  search.js     # Fuse.js search configuration
  render.js     # Card rendering, verdicts, styling
  filters.js    # Category filtering
  sort.js       # Sort controls
  settings.js   # Settings modal & workshop level UI
  profile.js    # Workshop progression state
  style.css     # Dark theme styles with rarity colors
data/
  items.json    # 480+ items with crafting, recycling, quest, and workshop data
scripts/
  scrape-*.mjs  # Web scrapers for each data source
  merge-data.mjs
  validate.mjs
  update.mjs    # Orchestrates the full update pipeline
  rollback.mjs
```

## Tech Stack

- **Vanilla JS** (ES modules) — no framework
- **Vite 6** — build tooling
- **Fuse.js** — fuzzy search
- **Playwright** + **Cheerio** — data scraping (dev only)
- **GitHub Actions** — CI/CD to GitHub Pages
