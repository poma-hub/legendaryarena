import syncPairIcons from './sync-pair-icons.json'

type IconTier = '1' | '2' | '3' | '4' | '5' | 'EX'

interface SyncPairIconCandidate {
  acquisition: string
  icons: Partial<Record<IconTier, string[]>>
  randomizePlayerIcon?: boolean
  syncPairIcon?: string
}

interface SyncPairIconMapping {
  status: string
  matchedBy: string
  defaultCandidateIndex?: number
  candidates: SyncPairIconCandidate[]
}

const iconMappings = syncPairIcons.entries as Record<string, SyncPairIconMapping>

function iconTierFor(upgrades: string, candidate: SyncPairIconCandidate): IconTier | undefined {
  const tiers = candidate.icons
  const available = (Object.keys(tiers) as IconTier[]).filter((tier) => tiers[tier]?.length)
  if (!available.length) return undefined

  const requestedTier: IconTier = /\bEX\b/i.test(upgrades)
    ? 'EX'
    : /(?:^|\D)([1-5])(?:\D|$)/.exec(upgrades)?.[1] as IconTier | undefined ?? '5'

  if (tiers[requestedTier]?.length) return requestedTier

  const numericTiers = available.filter((tier) => tier !== 'EX')
  if (requestedTier === 'EX') {
    if (numericTiers.includes('5')) return '5'
    return numericTiers.sort((left, right) => Number(right) - Number(left))[0] ?? 'EX'
  }

  const requestedNumber = Number(requestedTier)
  return numericTiers.sort((left, right) => {
    const difference = Math.abs(Number(left) - requestedNumber) - Math.abs(Number(right) - requestedNumber)
    return difference || Number(right) - Number(left)
  })[0] ?? 'EX'
}

export function getSyncPairIconUrl(solo: { name: string; upgrades: string }): string {
  const mapping = iconMappings[solo.name]
  if (mapping?.status === 'unmatched') return ''

  const hasEventCandidate = mapping?.candidates.some((candidate) => candidate.acquisition === 'Event Reward')
  const eventCandidateIndex = mapping?.candidates.findIndex(
    (candidate) => candidate.acquisition === 'Event Reward' && candidate.syncPairIcon !== 'Academy',
  )
  const candidateIndex = hasEventCandidate && eventCandidateIndex !== undefined && eventCandidateIndex >= 0
    ? eventCandidateIndex
    : mapping?.defaultCandidateIndex ?? 0
  const candidate = mapping?.candidates[candidateIndex]
  if (!candidate) return ''

  const tier = iconTierFor(solo.upgrades, candidate)
  const urls = tier ? candidate.icons[tier] : undefined
  if (!urls?.length) return ''

  return candidate.randomizePlayerIcon
    ? urls[Math.floor(Math.random() * urls.length)] ?? ''
    : urls[0] ?? ''
}
