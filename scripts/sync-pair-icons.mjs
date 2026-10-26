import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const spreadsheetId = '1iDfxrZ9AMQCrSaZDuT0yripAln8QH1QQP9r0g56ANhI'
const sheetGid = '2047631707'
const pairsUrl = 'https://raw.githubusercontent.com/pomasters/SyncPairsTracker/main/js/syncpairs.json'
const mappingPath = resolve(projectRoot, 'src/data/sync-pair-icons.json')
const iconsBaseUrl = 'https://raw.githubusercontent.com/pomasters/SyncPairsTracker/main/icons/'

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’‘ʼ]/g, "'")
    .toLocaleLowerCase('en')
    .replace(/\s+/g, ' ')
    .trim()
}

function compact(value) {
  return normalize(value).replace(/[^a-z0-9]/g, '')
}

function splitSheetName(name) {
  const match = /^(.+?)\s*\((.+)\)$/.exec(name)
  return match ? [match[1].trim(), match[2].trim()] : [name, '']
}

function iconUrls(pair) {
  const number = pair.pokemonNumber ?? ''
  const stems = number.includes('|')
    ? (() => {
        const [dex, occurrence] = number.split('|')
        return [`${dex}_${occurrence}`, `${dex}-${occurrence}`]
      })()
    : [number]
  const icons = {}

  for (const path of pair.images ?? []) {
    const filename = path.split('/').at(-1) ?? ''
    const tierMatch = /_(1|2|3|4|5|EX)\.png$/i.exec(filename)
    if (!tierMatch || !stems.some((stem) => new RegExp(`_${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_(?:1|2|3|4|5|EX)\\.png$`, 'i').test(filename))) {
      continue
    }

    const tier = tierMatch[1].toUpperCase()
    const url = iconsBaseUrl + encodeURIComponent(filename)
    ;(icons[tier] ??= []).push(url)
  }

  return icons
}

function makeCandidate(pair) {
  const icons = iconUrls(pair)
  if (Object.keys(icons).length === 0) {
    throw new Error(`No icon found for ${pair.trainerName} / ${pair.pokemonNumber}.`)
  }

  const candidate = {
    pokemonName: String(pair.pokemonName ?? '').trim(),
    pokemonNumber: pair.pokemonNumber,
    trainerAlt: pair.trainerAlt ?? '',
    acquisition: pair.syncPairAcquisition ?? '',
    icons,
  }

  if (pair.trainerName === 'Player') candidate.randomizePlayerIcon = true
  if (pair.syncPairIcon && pair.syncPairIcon !== 'none') candidate.syncPairIcon = pair.syncPairIcon
  return candidate
}

function uniquePairs(pairs) {
  const seen = new Set()
  return pairs.filter((pair) => {
    const key = `${pair.trainerName}|${pair.pokemonNumber}|${pair.syncPairAcquisition}|${pair.trainerAlt ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function selectPairs(name, pairs) {
  const [trainerName, alt] = splitSheetName(name)
  const normalizedAlt = normalize(alt)

  if (trainerName.startsWith('Player & ')) {
    const pokemonName = normalize(trainerName.slice('Player & '.length))
    return {
      matchedBy: 'player-pokemon-name',
      candidates: pairs.filter((pair) =>
        pair.trainerName === 'Player' && normalize(pair.pokemonName) === pokemonName,
      ),
    }
  }

  const trainerPairs = pairs.filter((pair) => normalize(pair.trainerName) === normalize(trainerName))
  if (!alt) {
    const noAlt = trainerPairs.filter((pair) => !pair.trainerAlt)
    const standardPairs = noAlt.filter((pair) =>
      !['trainer lodge', 'variety scout', 'battle points', 'training ticket', 'mix scout', 'event reward', 'gym scout']
        .some((marker) => normalize(pair.syncPairAcquisition).includes(marker)),
    )
    return { matchedBy: 'base-name', candidates: standardPairs.length ? standardPairs : noAlt }
  }

  if (normalizedAlt === 'academy') {
    return {
      matchedBy: 'syncPairIcon-Academy',
      candidates: trainerPairs.filter((pair) => pair.syncPairIcon === 'Academy'),
    }
  }

  const altToMatch = trainerName === 'Iris' && compact(alt) === 'alt' ? 'Champion' : alt
  const exactMatches = trainerPairs.filter((pair) => compact(pair.trainerAlt) === compact(altToMatch))
  let candidates = exactMatches
  let matchedBy = exactMatches.length ? 'exact-trainer-alt' : ''

  if (!candidates.length) {
    const acquisitionMatches = (acquisition) =>
      trainerPairs.filter((pair) => pair.syncPairAcquisition === acquisition)
    const hasAltMarker = (marker) =>
      trainerPairs.filter((pair) => normalize(pair.trainerAlt).includes(normalize(marker)))

    if (normalizedAlt === 'bp') {
      matchedBy = 'battle-points-exchange'
      candidates = acquisitionMatches('Battle Points Exchange')
    } else if (normalizedAlt === 'lodge') {
      matchedBy = 'trainer-lodge-exchange'
      candidates = acquisitionMatches('Trainer Lodge Exchange')
    } else if (normalizedAlt === 'dc') {
      matchedBy = 'training-ticket-exchange'
      candidates = acquisitionMatches('Training Ticket Exchange')
    } else if (/^ss(?:\s*[a-z])?$/.test(normalizedAlt)) {
      const letter = normalizedAlt.replace(/\s/g, '').slice(2)
      matchedBy = letter ? `sygna-suit-${letter}` : 'sygna-suit'
      candidates = trainerPairs.filter((pair) => {
        const pairAlt = normalize(pair.trainerAlt)
        if (!letter) return pairAlt === 'sygna suit'
        const prefix = 'sygna suit ('
        return pairAlt.startsWith(prefix) && pairAlt.slice(prefix.length).startsWith(letter)
      })
    } else if (/^anni(?:\s+\d+)?$/.test(normalizedAlt)) {
      matchedBy = 'anniversary'
      candidates = trainerPairs.filter((pair) => /anni|anniversary/i.test(pair.trainerAlt ?? ''))
      const anniversaryYear = /\b(20\d{2})\b/.exec(alt)?.[1]
      if (anniversaryYear) {
        const yearMatches = candidates.filter((pair) => String(pair.trainerAlt).includes(anniversaryYear))
        if (yearMatches.length) {
          matchedBy = `anniversary-year-${anniversaryYear}`
          candidates = yearMatches
        }
      }
    } else if (/^(?:palentine'?s|spring|summer|fall|holiday|ny)(?:\s+\d+)?$/.test(normalizedAlt)) {
      const season = normalizedAlt.split(' ')[0]
      const seasonMarker = season === 'ny' ? "new year's" : season
      matchedBy = `seasonal-${season}`
      candidates = hasAltMarker(seasonMarker)
    } else if (/^sc(?:\s+\d+)?$/.test(normalizedAlt)) {
      matchedBy = 'special-costume'
      candidates = trainerPairs.filter((pair) =>
        normalize(pair.trainerAlt) === 'special costume' &&
        pair.syncPairAcquisition === 'Special Costume Scout',
      )
    } else if (normalizedAlt === 'champion') {
      matchedBy = 'champion-alt'
      candidates = trainerPairs.filter((pair) =>
        ['champion', 'neo champion'].includes(normalize(pair.trainerAlt)),
      )
    } else if (/^variety(?:\s+\d+)?$/.test(normalizedAlt)) {
      matchedBy = 'variety-scout'
      candidates = acquisitionMatches('Variety Scout')
    } else if (normalizedAlt === 'mix') {
      matchedBy = 'mix-scout'
      candidates = acquisitionMatches('Mix Scout')
    } else if (normalizedAlt === 'arc') {
      matchedBy = 'arc-suit'
      candidates = trainerPairs.filter((pair) =>
        pair.syncPairAcquisition === 'Arc Suit Fair Scout' || normalize(pair.trainerAlt) === 'arc suit',
      )
    } else if (normalizedAlt === 'gym') {
      matchedBy = 'gym-scout'
      candidates = acquisitionMatches('Gym Scout')
    } else if (normalizedAlt === 'event') {
      matchedBy = 'event-reward'
      candidates = acquisitionMatches('Event Reward')
    } else {
      matchedBy = 'trainer-alt'
      candidates = trainerPairs.filter((pair) => compact(altToMatch) && compact(altToMatch) === compact(pair.trainerAlt))
      if (!candidates.length) {
        candidates = trainerPairs.filter((pair) => compact(pair.trainerAlt).includes(compact(altToMatch)))
      }
      if (!candidates.length && ['pokekid', 'furisodegirl', 'hexmaniac'].includes(compact(alt))) {
        matchedBy = 'npc-class-event-reward'
        candidates = acquisitionMatches('Event Reward')
      }
    }
  }

  candidates = uniquePairs(candidates)
  const ordinalMatch = /\s+(\d+)$/.exec(normalizedAlt)
  const ordinal = ordinalMatch && !normalizedAlt.startsWith('anni')
    ? Number(ordinalMatch[1])
    : normalizedAlt.startsWith('anni') ? Number(ordinalMatch?.[1]) : undefined
  if (ordinal && candidates.length >= ordinal) {
    candidates = [candidates[ordinal - 1]]
    matchedBy += `-occurrence-${ordinal}`
  }

  return { matchedBy, candidates }
}

export function createMappingEntry(name, pairs) {
  const { matchedBy, candidates } = selectPairs(name, pairs)
  const mappedCandidates = uniquePairs(candidates).map(makeCandidate)
  const entry = {
    status: mappedCandidates.length === 0 ? 'unmatched' : mappedCandidates.length === 1 ? 'matched' : 'ambiguous',
    matchedBy,
    candidates: mappedCandidates,
  }

  if (mappedCandidates.length > 1) entry.defaultCandidateIndex = 0
  if (mappedCandidates.length > 1 && mappedCandidates.some((candidate) => candidate.acquisition === 'Event Reward')) {
    const nonAcademyIndex = mappedCandidates.findIndex((candidate) => candidate.syncPairIcon !== 'Academy')
    if (nonAcademyIndex >= 0) entry.defaultCandidateIndex = nonAcademyIndex
  }

  return entry
}

function parseGoogleVisualizationResponse(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('Google Sheets returned an unreadable response.')
  return JSON.parse(text.slice(start, end + 1))
}

async function fetchJson(url, label) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`${label} could not be loaded (HTTP ${response.status}).`)
  return response.json()
}

async function fetchSheetNames() {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq`)
  url.searchParams.set('tqx', 'out:json')
  url.searchParams.set('gid', sheetGid)
  url.searchParams.set('range', 'B4:B')
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`Google Sheets could not be loaded (HTTP ${response.status}).`)

  const payload = parseGoogleVisualizationResponse(await response.text())
  if (payload.status !== 'ok' || !Array.isArray(payload.table?.rows)) {
    throw new Error(payload.errors?.[0]?.message ?? 'The Google Sheets response has an unexpected format.')
  }

  const names = [...new Set(payload.table.rows.map((row) => String(row.c?.[0]?.v ?? '').trim()).filter(Boolean))]
  if (!names.length) throw new Error('Google Sheets returned no names in B4:B.')
  return names
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const [names, pairData, existing] = await Promise.all([
    fetchSheetNames(),
    fetchJson(pairsUrl, 'The SyncPairsTracker JSON'),
    readFile(mappingPath, 'utf8').then(JSON.parse),
  ])

  if (!Array.isArray(pairData.SYNCPAIRS)) throw new Error('The SyncPairsTracker JSON has no SYNCPAIRS array.')

  let added = 0
  let refreshed = 0
  let unmatched = 0

  for (const name of names) {
    if (existing.entries[name] && existing.entries[name].status !== 'unmatched') continue
    if (existing.entries[name]) refreshed++
    else added++

    const entry = createMappingEntry(name, pairData.SYNCPAIRS)
    if (entry.status === 'unmatched') unmatched++
    existing.entries[name] = entry
    console.log(`${entry.status.padEnd(9)} ${name}${entry.candidates[0] ? ` → ${entry.candidates[0].pokemonName}` : ''}`)
  }

  console.log(`Names: ${names.length}; added: ${added}; retried: ${refreshed}; still unmatched: ${unmatched}.`)
  if (!dryRun && (added || refreshed)) {
    await writeFile(mappingPath, `${JSON.stringify(existing, null, 2)}\n`, 'utf8')
    console.log(`Updated ${mappingPath}.`)
  } else if (dryRun) {
    console.log('Dry run; no files were changed.')
  } else {
    console.log('No new names to add.')
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
