import { arenas, type Arena } from '../data/arenas'

const spreadsheetId = '1iDfxrZ9AMQCrSaZDuT0yripAln8QH1QQP9r0g56ANhI'
const navigationSheetGid = '2047631707'

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
  runId: string
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
  sourceUrls: string[]
  difficulties: string[]
  advice: string
}

export interface ArenaSheet {
  uniqueCount: number
  solos: Solo[]
}

export interface ArenaNavigationRow {
  name: string
  japaneseName: string
  soloCount: number
  upgrades: Record<string, string>
}

function createRunId(solo: Omit<Solo, 'id' | 'runId' | 'sheetRow'>): string {
  const identity = JSON.stringify([
    solo.name.normalize('NFKC').trim().toLocaleLowerCase('en-US'),
    solo.japaneseName.normalize('NFKC').trim(),
    solo.upgrades.normalize('NFKC').trim(),
    solo.level.normalize('NFKC').trim(),
    solo.grid.normalize('NFKC').trim(),
    solo.luckySkill.normalize('NFKC').trim(),
    solo.source.normalize('NFKC').trim(),
    solo.gridUrl.trim(),
    solo.sourceUrl.trim(),
    ...(solo.sourceUrls.length > 1 ? [solo.sourceUrls.slice(1)] : []),
    solo.difficulties,
    solo.advice.normalize('NFKC').trim(),
  ])

  function hash(seed: number): string {
    let value = seed
    for (let index = 0; index < identity.length; index++) {
      value = Math.imul(value ^ identity.charCodeAt(index), 0x01000193)
    }
    return (value >>> 0).toString(16).padStart(8, '0')
  }

  return `run-${hash(0x811c9dc5)}${hash(0xdeadbeef)}`
}

function cellValue(row: SheetRow, index: number): string {
  const value = row.c[index]?.v
  return value === null || value === undefined ? '' : String(value).trim()
}

function cleanSourceName(value: string): string {
  return value.replace(/(?:\s*\(part\s*\d+\))+\s*$/i, '').trim()
}

function parseHttpUrl(value: string): string {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : ''
  } catch {
    return ''
  }
}

function cellUrls(row: SheetRow, index: number): string[] {
  return cellValue(row, index)
    .split(/\s+/)
    .map(parseHttpUrl)
    .filter(Boolean)
}

function cellUrl(row: SheetRow, index: number): string {
  return cellUrls(row, index)[0] ?? ''
}

function parseResponse(text: string): SheetResponse {
  const jsonStart = text.indexOf('{')
  const jsonEnd = text.lastIndexOf('}')
  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    throw new Error('The spreadsheet returned an unreadable response.')
  }

  return JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as SheetResponse
}

async function loadSheetRows(gid: string, sheetName: string, range?: string): Promise<SheetRow[]> {
  const params = new URLSearchParams({ tqx: 'out:json', gid })
  if (range) params.set('range', range)

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?${params}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`The ${sheetName} sheet could not be loaded (HTTP ${response.status}).`)
  }

  const payload = parseResponse(await response.text())
  if (payload.status !== 'ok' || !payload.table) {
    const reason = payload.errors?.[0]?.message
    throw new Error(reason || `The ${sheetName} sheet is unavailable.`)
  }

  return payload.table.rows
}

export async function isInCurrentLegendaryGauntlet(arena: Arena): Promise<boolean> {
  const rows = await loadSheetRows(arena.gid, arena.name, 'I2')
  const value = rows[0]
  return value ? cellValue(value, 0) === 'In Current LG' : false
}

export async function loadArenaSheet(arena: Arena): Promise<ArenaSheet> {
  const rows = await loadSheetRows(arena.gid, arena.name)
  const countRow = rows.find((row) => cellValue(row, 1).includes('Unique Solo Count'))
  const uniqueCount = Number.parseInt(cellValue(countRow ?? { c: [] }, 2), 10)
  const headerIndex = rows.findIndex((row) => cellValue(row, 1) === 'Sync Pair')
  if (headerIndex < 0) {
    throw new Error(`The ${arena.name} sheet has an unexpected format.`)
  }

  const solos = rows.slice(headerIndex + 1).flatMap((row, index) => {
    const name = cellValue(row, 1)
    if (!name || name === 'Sync Pair') return []

    const sourceUrls = cellUrls(row, 11)
    const solo = {
      id: index,
      sheetRow: headerIndex + 3 + index,
      name,
      japaneseName: cellValue(row, 2).replace(/\s+/g, ' ').trim(),
      upgrades: cellValue(row, 3),
      level: cellValue(row, 4),
      grid: cellValue(row, 5),
      luckySkill: cellValue(row, 6),
      source: cleanSourceName(cellValue(row, 7)),
      gridUrl: cellUrl(row, 10),
      sourceUrl: sourceUrls[0] ?? '',
      sourceUrls,
      difficulties: ['🔰', '✔️', '⚠️', '⛔', '🚫', '🕗', '🔁', '⚙️', '🪽', '💦', '💤', '🧊', '❓', '⚡', '🥠']
        .filter((marker) => cellValue(row, 8).includes(marker)),
      advice: cellValue(row, 9),
    }

    return [{ ...solo, runId: createRunId(solo) }]
  })

  return {
    uniqueCount: Number.isNaN(uniqueCount) ? new Set(solos.map((solo) => solo.name)).size : uniqueCount,
    solos,
  }
}

let arenaNavigationPromise: Promise<ArenaNavigationRow[]> | undefined

export function loadArenaNavigation(): Promise<ArenaNavigationRow[]> {
  if (!arenaNavigationPromise) {
    arenaNavigationPromise = fetchArenaNavigation().catch((error: unknown) => {
      arenaNavigationPromise = undefined
      throw error
    })
  }
  return arenaNavigationPromise
}

async function fetchArenaNavigation(): Promise<ArenaNavigationRow[]> {
  const rows = await loadSheetRows(navigationSheetGid, 'sync pair navigation')
  const headerRow = rows[0]
  if (!headerRow) throw new Error('The sync pair navigation sheet is empty.')

  const arenaColumnIndexes = arenas.map((arena) => {
    const columnIndex = headerRow.c.findIndex((cell) =>
      (cell?.f ?? cell?.v ?? '').toString().trim().split(/\r?\n/)[0] === arena.name,
    )
    if (columnIndex < 0) {
      throw new Error(`The sync pair navigation sheet is missing the ${arena.name} column.`)
    }
    return columnIndex
  })

  return rows.flatMap((row) => {
    const name = cellValue(row, 1)
    const japaneseName = cellValue(row, 2).replace(/\s+/g, ' ').trim()
    const soloCount = Number.parseInt(cellValue(row, 17), 10)
    if (!name || !japaneseName || !Number.isInteger(soloCount) || soloCount < 0 || soloCount > arenas.length) {
      return []
    }

    return [{
      name,
      japaneseName,
      soloCount,
      upgrades: Object.fromEntries(
        arenas.map((arena, index) => [arena.slug, cellValue(row, arenaColumnIndexes[index] ?? -1)]),
      ),
    }]
  })
}
