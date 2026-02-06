/**
 * Shared utilities for scraper scripts
 */

/**
 * Extract RSC (React Server Components) flight data from a Next.js page.
 * Returns the full concatenated and unescaped RSC payload string.
 */
export async function extractRSCData(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const html = await res.text()

  const matches = html.match(/self\.__next_f\.push\(\[[\d],"(.*?)"\]\)/gs)
  if (!matches) throw new Error(`No RSC data found at ${url}`)

  let fullData = ''
  for (const m of matches) {
    const inner = m.match(/self\.__next_f\.push\(\[[\d],"(.*?)"\]\)/s)
    if (inner) fullData += inner[1]
  }

  // Unescape RSC string encoding: \" -> "
  return fullData.replace(/\\"/g, '"')
}

/**
 * Extract the first JSON array from RSC data that contains objects with the given keys.
 * Handles the bracket-matching needed to find complete arrays in the stream.
 */
export function extractFirstArray(data, requiredKeys) {
  // Find start of array containing objects with the required keys
  const keyCheck = requiredKeys.map(k => `"${k}"`).join('.*?')
  const pattern = new RegExp(`\\[\\{${keyCheck}`)
  const startMatch = data.match(pattern)
  if (!startMatch) return null

  const startIdx = data.indexOf(startMatch[0])
  return extractArrayAt(data, startIdx)
}

/**
 * Extract a JSON array from RSC data starting at a given property name.
 * Looks for "propName":[ and extracts the complete array.
 */
export function extractNamedArray(data, propName) {
  const marker = `"${propName}":[`
  const idx = data.indexOf(marker)
  if (idx === -1) return null
  const arrayStart = idx + marker.length - 1 // include the [
  return extractArrayAt(data, arrayStart)
}

/**
 * Extract a JSON array from RSC data starting at a given index.
 * Uses bracket matching to find the complete array.
 */
export function extractArrayAt(data, startIdx) {
  let depth = 0
  let endIdx = startIdx
  for (let i = startIdx; i < data.length; i++) {
    if (data[i] === '[') depth++
    if (data[i] === ']') {
      depth--
      if (depth === 0) {
        endIdx = i + 1
        break
      }
    }
  }

  try {
    return JSON.parse(data.substring(startIdx, endIdx))
  } catch (e) {
    console.warn(`Failed to parse array at index ${startIdx}: ${e.message}`)
    return null
  }
}

/**
 * Find all occurrences of a named array in RSC data.
 * Returns array of { context, data } where context is the text before the array.
 */
export function extractAllNamedArrays(data, propName) {
  const marker = `"${propName}":[`
  const results = []
  let searchFrom = 0

  while (true) {
    const idx = data.indexOf(marker, searchFrom)
    if (idx === -1) break

    const context = data.substring(Math.max(0, idx - 500), idx)
    const arrayStart = idx + marker.length - 1
    const arr = extractArrayAt(data, arrayStart)

    if (arr) {
      results.push({ context, data: arr })
    }

    searchFrom = idx + 1
  }

  return results
}

/**
 * Resolve RSC deduplication references in item data.
 * RSC uses strings like "$22:props:children:..." to reference previously-seen objects.
 * We resolve these by looking up the referenced item from a known items map.
 */
export function resolveRSCRef(ref, knownItems) {
  if (typeof ref !== 'string' || !ref.startsWith('$')) return ref
  // These are RSC internal refs we can't resolve directly.
  // Return null to signal the caller needs to fill this in manually.
  return null
}
