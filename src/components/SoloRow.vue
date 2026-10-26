<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { difficultyOptions, flagOptions } from '../data/markers'
import syncPairIcons from '../data/sync-pair-icons.json'
import type { Solo } from '../services/sheet'

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

const props = defineProps<{
  solo: Solo
  color: string
  gid: string
  shareUrl?: string
  expandable?: boolean
  expanded?: boolean
  previewExpanded?: boolean
}>()
const emit = defineEmits<{
  toggleExpanded: []
  togglePreview: []
}>()
const iconMappings = syncPairIcons.entries as Record<string, SyncPairIconMapping>
const iconLoadFailed = ref(false)
const shareStatus = ref<'idle' | 'copied' | 'error'>('idle')

async function copyShareLink() {
  if (!props.shareUrl) return

  shareStatus.value = 'idle'
  try {
    await navigator.clipboard.writeText(props.shareUrl)
    shareStatus.value = 'copied'
  } catch {
    shareStatus.value = 'error'
  }
}

function embedUrl(value: string): string {
  if (!value) return ''

  try {
    const url = new URL(value)
    if (url.hostname === 'youtu.be') {
      const videoId = url.pathname.slice(1)
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : value
    }

    if (url.hostname.endsWith('youtube.com')) {
      const videoId = url.searchParams.get('v') ??
        /^\/(?:embed|shorts)\/([^/?]+)/.exec(url.pathname)?.[1]
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : value
    }

    if (url.hostname === 'docs.google.com' && url.pathname.includes('/spreadsheets/')) {
      url.pathname = url.pathname.replace(/\/edit\/?$/, '/preview')
      return url.href
    }

    return value
  } catch {
    return ''
  }
}

const gridEmbedUrl = computed(() => embedUrl(props.solo.gridUrl))
const sourceUrl = computed(() => props.solo.sourceUrl || (
  `https://docs.google.com/spreadsheets/d/1iDfxrZ9AMQCrSaZDuT0yripAln8QH1QQP9r0g56ANhI/preview?gid=${props.gid}&range=A${props.solo.sheetRow}`
))
const sourceEmbedUrl = computed(() => embedUrl(sourceUrl.value))

function handleRowClick(event: MouseEvent) {
  const target = event.target
  if (target instanceof Element && target.closest('a, button')) return
  emit('togglePreview')
}

function handleRowKeydown(event: KeyboardEvent) {
  if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
  event.preventDefault()
  emit('togglePreview')
}

function iconTierFor(solo: Solo, candidate: SyncPairIconCandidate): IconTier | undefined {
  const tiers = candidate.icons
  const available = (Object.keys(tiers) as IconTier[]).filter((tier) => tiers[tier]?.length)
  if (!available.length) return undefined

  const requestedTier: IconTier = /\bEX\b/i.test(solo.upgrades)
    ? 'EX'
    : /(?:^|\D)([1-5])(?:\D|$)/.exec(solo.upgrades)?.[1] as IconTier | undefined ?? '5'

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

function iconFor(solo: Solo): string {
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

  const tier = iconTierFor(solo, candidate)
  const urls = tier ? candidate.icons[tier] : undefined
  if (!urls?.length) return ''

  return candidate.randomizePlayerIcon
    ? urls[Math.floor(Math.random() * urls.length)] ?? ''
    : urls[0] ?? ''
}

const iconUrl = computed(() => iconFor(props.solo))
watch(iconUrl, () => {
  iconLoadFailed.value = false
})

function initials(name: string): string {
  return name
    .replace(/\s*\(.*?\)/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function difficultyFor(solo: Solo) {
  return difficultyOptions.find((item) => solo.difficulties.includes(item.icon))
}

function flagsFor(solo: Solo) {
  return flagOptions.filter((item) => solo.difficulties.includes(item.icon))
}
</script>

<template>
  <article
    :id="`solo-row-${solo.id}`"
    class="solo-row"
    :class="{ 'solo-row-expandable': expandable, 'solo-row-preview-open': previewExpanded }"
    :style="{ '--arena-color': color }"
    tabindex="0"
    :aria-label="`Show grid and source for ${solo.name}`"
    :aria-expanded="Boolean(previewExpanded)"
    @click="handleRowClick"
    @keydown="handleRowKeydown"
  >
    <div class="sync-avatar" aria-hidden="true">
      <img
        v-if="iconUrl && !iconLoadFailed"
        :src="iconUrl"
        alt=""
        @error="iconLoadFailed = true"
      >
      <span v-else>{{ initials(solo.name) }}</span>
    </div>
    <div class="solo-main">
      <div class="solo-name-line">
        <h3>{{ solo.name }}</h3>
        <span v-if="solo.japaneseName" class="japanese-name">{{ solo.japaneseName }}</span>
      </div>
      <div class="solo-meta">
        <span class="build-chip">{{ solo.upgrades || 'Build not specified' }}</span>
        <span v-if="solo.level" class="meta-item">Lv. {{ solo.level }}</span>
        <span v-if="solo.luckySkill" class="meta-item"><span class="meta-icon">✦</span>{{ solo.luckySkill }}</span>
        <a
          v-if="solo.gridUrl"
          class="grid-link"
          :href="solo.gridUrl"
          target="_blank"
          rel="noreferrer"
        >Grid ↗</a>
        <button
          v-if="expandable"
          class="solo-more-button"
          type="button"
          :aria-expanded="Boolean(expanded)"
          :aria-controls="`solo-group-${solo.id}-more`"
          @click.stop="emit('toggleExpanded')"
        >{{ expanded ? 'Show fewer investments' : 'Show more investments' }}</button>
      </div>
      <p v-if="solo.advice" class="solo-advice">{{ solo.advice }}</p>
    </div>
    <div class="solo-markers">
      <span
        v-if="difficultyFor(solo)"
        class="difficulty-pill"
        :class="`tone-${difficultyFor(solo)?.tone}`"
        :title="difficultyFor(solo)?.detail"
      >{{ difficultyFor(solo)?.icon }} {{ difficultyFor(solo)?.label }}</span>
      <span v-else class="difficulty-unrated">Not rated</span>
      <div v-if="flagsFor(solo).length" class="run-flags" :aria-label="flagsFor(solo).map((flag) => flag.label).join(', ')">
        <span v-for="flag in flagsFor(solo)" :key="flag.label" :title="flag.label">{{ flag.icon }}</span>
      </div>
    </div>
    <div class="solo-source">
      <span>RECORDED BY</span>
      <strong>{{ solo.source || 'Community' }}</strong>
      <button
        v-if="shareUrl"
        class="solo-share-button"
        type="button"
        :aria-label="`Share ${solo.name} run`"
        @click.stop="copyShareLink"
      >{{ shareStatus === 'copied' ? 'Link copied' : 'Share run' }}</button>
      <span v-if="shareStatus === 'error'" class="solo-share-status" role="status">
        Could not copy link
      </span>
      <a
        v-if="solo.sourceUrl"
        class="grid-link"
        :href="solo.sourceUrl"
        target="_blank"
        rel="noreferrer"
      >Open source ↗</a>
      <a
        v-else-if="solo.grid"
        class="grid-link"
        :href="`https://docs.google.com/spreadsheets/d/1iDfxrZ9AMQCrSaZDuT0yripAln8QH1QQP9r0g56ANhI/edit?gid=${gid}#gid=${gid}&range=A${solo.sheetRow}`"
        target="_blank"
        rel="noreferrer"
      >Open source row ↗</a>
    </div>
    <button
      class="solo-row-toggle"
      type="button"
      :aria-expanded="Boolean(previewExpanded)"
      :aria-controls="`solo-preview-${solo.id}`"
      :aria-label="previewExpanded ? `Hide grid and source for ${solo.name}` : `Show grid and source for ${solo.name}`"
      :title="previewExpanded ? 'Hide grid and source' : 'Show grid and source'"
      @click.stop="emit('togglePreview')"
    >
      <span class="solo-preview-chevron" aria-hidden="true"></span>
    </button>
  </article>
  <section
    v-if="previewExpanded"
    :id="`solo-preview-${solo.id}`"
    class="solo-preview"
    :style="{ '--arena-color': color }"
    :aria-label="`${solo.name} grid and source`"
  >
    <div class="solo-preview-panel">
      <div class="solo-preview-heading">
        <h4>Grid</h4>
        <a v-if="solo.gridUrl" :href="solo.gridUrl" target="_blank" rel="noreferrer">Open in new tab ↗</a>
      </div>
      <iframe
        v-if="gridEmbedUrl"
        :src="gridEmbedUrl"
        :title="`${solo.name} grid`"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen
      ></iframe>
      <p v-else class="solo-preview-empty">No grid link is available for this solo.</p>
    </div>
    <div class="solo-preview-panel">
      <div class="solo-preview-heading">
        <h4>Source</h4>
        <a :href="sourceUrl" target="_blank" rel="noreferrer">Open in new tab ↗</a>
      </div>
      <iframe
        :src="sourceEmbedUrl"
        :title="`${solo.name} source`"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen
      ></iframe>
    </div>
  </section>
</template>
