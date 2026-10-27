<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { difficultyOptions, flagOptions } from '../data/markers'
import { getSyncPairIconUrl } from '../data/sync-pair-icons'
import type { Solo } from '../services/sheet'

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
const iconLoadFailed = ref(false)
const shareStatus = ref<'idle' | 'copied' | 'error'>('idle')
const activeSourceIndex = ref(0)

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
    const hostname = url.hostname.toLowerCase()

    if (hostname === 'youtu.be') {
      const videoId = url.pathname.slice(1)
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : value
    }

    if (hostname.endsWith('youtube.com')) {
      const videoId = url.searchParams.get('v') ??
        /^\/(?:embed|shorts)\/([^/?]+)/.exec(url.pathname)?.[1]
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : value
    }

    if (hostname === 'docs.google.com' && url.pathname.includes('/spreadsheets/')) {
      url.pathname = url.pathname.replace(/\/edit\/?$/, '/preview')
      return url.href
    }

    if (['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com'].includes(hostname)) {
      const tweetId = /(?:^|\/)(?:i\/web\/)?status(?:es)?\/(\d+)/.exec(url.pathname)?.[1]
      if (tweetId) {
        const twitterEmbed = new URL('https://platform.twitter.com/embed/Tweet.html')
        twitterEmbed.searchParams.set('dnt', 'true')
        twitterEmbed.searchParams.set('id', tweetId)
        return twitterEmbed.href
      }

      const handleSegments = url.pathname.split('/').filter(Boolean)
      const handle = handleSegments[0]
      if (handle && !['i', 'search', 'hashtag', 'intent', 'tweets', 'settings'].includes(handle)) {
        const followButton = new URL('https://platform.twitter.com/widgets/followButton.html')
        followButton.searchParams.set('screen_name', handle)
        followButton.searchParams.set('show_screen_name', 'true')
        followButton.searchParams.set('size', 'l')
        return followButton.href
      }
    }

    return value
  } catch {
    return ''
  }
}

const gridEmbedUrl = computed(() => embedUrl(props.solo.gridUrl))
const fallbackSourceUrl = computed(() => (
  `https://docs.google.com/spreadsheets/d/1iDfxrZ9AMQCrSaZDuT0yripAln8QH1QQP9r0g56ANhI/preview?gid=${props.gid}&range=A${props.solo.sheetRow}`
))
const sourceUrls = computed(() => props.solo.sourceUrls.length
  ? props.solo.sourceUrls
  : [fallbackSourceUrl.value])
const selectedSourceUrl = computed(() => sourceUrls.value[activeSourceIndex.value] ?? sourceUrls.value[0] ?? '')
const sourceEmbedUrl = computed(() => embedUrl(selectedSourceUrl.value))

watch(() => props.solo.runId, () => {
  activeSourceIndex.value = 0
})

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

const iconUrl = computed(() => getSyncPairIconUrl(props.solo))
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
      <div class="solo-source-actions">
        <a
          v-if="solo.sourceUrls.length === 1"
          class="grid-link"
          :href="solo.sourceUrls[0]"
          target="_blank"
          rel="noreferrer"
        >Open source ↗</a>
        <div v-else-if="solo.sourceUrls.length > 1" class="solo-source-actions">
          <a
            v-for="(url, index) in solo.sourceUrls"
            :key="index"
            class="grid-link"
            :href="url"
            target="_blank"
            rel="noreferrer"
          >Part {{ index + 1 }} ↗</a>
        </div>
        <a
          v-else-if="solo.grid"
          class="grid-link"
          :href="`https://docs.google.com/spreadsheets/d/1iDfxrZ9AMQCrSaZDuT0yripAln8QH1QQP9r0g56ANhI/edit?gid=${gid}#gid=${gid}&range=A${solo.sheetRow}`"
          target="_blank"
          rel="noreferrer"
        >Open source row ↗</a>
        <span
          v-if="shareUrl && (solo.sourceUrls.length || solo.grid)"
          class="solo-source-separator"
          aria-hidden="true"
        ></span>
        <button
          v-if="shareUrl"
          class="solo-share-button"
          type="button"
          :aria-label="`Share ${solo.name} run`"
          @click.stop="copyShareLink"
        >{{ shareStatus === 'copied' ? 'Link copied' : 'Share run' }}</button>
      </div>
      <span v-if="shareStatus === 'error'" class="solo-share-status" role="status">
        Could not copy link
      </span>
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
        <div class="source-heading-label">
          <h4>Source</h4>
          <div v-if="sourceUrls.length > 1" class="source-part-tabs" role="tablist" aria-label="Source parts">
            <button
              v-for="(url, index) in sourceUrls"
              :key="url"
              class="source-part-tab"
              :class="{ 'source-part-tab-active': activeSourceIndex === index }"
              type="button"
              role="tab"
              :aria-selected="activeSourceIndex === index"
              :aria-controls="`source-panel-${solo.id}`"
              @click="activeSourceIndex = index"
            >Part {{ index + 1 }}</button>
          </div>
        </div>
        <a :href="selectedSourceUrl" target="_blank" rel="noreferrer">Open in new tab ↗</a>
      </div>
      <iframe
        :id="`source-panel-${solo.id}`"
        :src="sourceEmbedUrl"
        :title="`${solo.name} source part ${activeSourceIndex + 1}`"
        role="tabpanel"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen
      ></iframe>
    </div>
  </section>
</template>
