import type { Arena } from '../data/arenas'

const spreadsheetId = '1iDfxrZ9AMQCrSaZDuT0yripAln8QH1QQP9r0g56ANhI'

interface SheetCell {
  v?: unknown
  f?: string
  p?: Record<string, unknown>
}

interface SheetRow {
  c: (SheetCell | null)[]
}

interface SheetResponse {
  status: string
  errors?: { reason?: string; message?: string }[]
  table?: { rows: SheetRow[] }
}

export interface Solo {
  id: number
  sheetRow: number
  name: string
  japaneseName: string
  upgrades: string
  level: string
  grid: string
  luckySkill: string
  source: string
  gridUrl: string
  sourceUrl: string
  difficulties: string[]
  advice: string
}

export interface ArenaSheet {
  uniqueCount: number
  solos: Solo[]
}

function cellValue(row: SheetRow, index: number): string {
  const value = row.c[index]?.v
  return value === null || value === undefined ? '' : String(value).trim()
}

function cellUrl(row: SheetRow, index: number): string {
  const value = cellValue(row, index)
  if (!value) return ''

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}

function parseResponse(text: string): SheetResponse {
  const jsonStart = text.indexOf('{')
  const jsonEnd = text.lastIndexOf('}')
  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    throw new Error('The spreadsheet returned an unreadable response.')
  }

  return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as SheetResponse
}

export async function loadArenaSheet(arena: Arena): Promise<ArenaSheet> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&gid=${arena.gid}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`The ${arena.name} sheet could not be loaded (HTTP ${response.status}).`)
  }

  const payload = parseResponse(await response.text())
  if (payload.status !== 'ok' || !payload.table) {
    const reason = payload.errors?.[0]?.message
    throw new Error(reason || `The ${arena.name} sheet is unavailable.`)
  }

  const rows = payload.table.rows
  const countRow = rows.find((row) => cellValue(row, 1).includes('Unique Solo Count'))
  const uniqueCount = Number.parseInt(cellValue(countRow ?? { c: [] }, 2), 10)
  const headerIndex = rows.findIndex((row) => cellValue(row, 1) === 'Sync Pair')
  if (headerIndex < 0) {
    throw new Error(`The ${arena.name} sheet has an unexpected format.`)
  }

  const solos = rows.slice(headerIndex + 1).flatMap((row, index) => {
    const name = cellValue(row, 1)
    if (!name || name === 'Sync Pair') return []

    return [{
      id: index,
      sheetRow: headerIndex + 3 + index,
      name,
      japaneseName: cellValue(row, 2).replace(/\s+/g, ' ').trim(),
      upgrades: cellValue(row, 3),
      level: cellValue(row, 4),
      grid: cellValue(row, 5),
      luckySkill: cellValue(row, 6),
      source: cellValue(row, 7),
      gridUrl: cellUrl(row, 10),
      sourceUrl: cellUrl(row, 11),
      difficulties: ['🔰', '✔️', '⚠️', '⛔', '🚫', '🕗', '🔁', '⚙️', '🪽', '💦', '💤', '🧊', '❓', '⚡', '🥠']
        .filter((marker) => cellValue(row, 8).includes(marker)),
      advice: cellValue(row, 9),
    }]
  })

  return {
    uniqueCount: Number.isNaN(uniqueCount) ? new Set(solos.map((solo) => solo.name)).size : uniqueCount,
    solos,
  }
}
