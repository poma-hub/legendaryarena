<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { arenas, getArenaIcon, type Arena } from '../data/arenas'
import { getSyncPairIconUrl } from '../data/sync-pair-icons'
import { locale, t } from '../i18n'
import { appPath } from '../routes'
import {
  isInCurrentLegendaryGauntlet,
  loadArenaNavigation,
  type ArenaNavigationRow,
} from '../services/sheet'

type SortMode = 'count' | 'name' | 'japanese' | 'investment'

interface IndexedNavigationRow extends ArenaNavigationRow {
  iconUrl: string
  gauntletSoloCount: number
  normalizedName: string
  normalizedJapaneseName: string
}

const gauntletOnly = ref(window.localStorage.getItem('legendary-arena-current-gauntlet-only') !== 'false')
const gauntletAvailable = ref(true)
const rows = ref<ArenaNavigationRow[]>([])
const currentGauntletArenas = ref<Arena[]>([])
const displayedArenas = computed(() =>
  gauntletOnly.value ? currentGauntletArenas.value : arenas,
)
const failedIcons = ref(new Set<string>())
const loading = ref(true)
const error = ref('')
const search = ref('')
const sortMode = ref<SortMode>('count')
const investmentArena = ref(arenas[0]?.slug ?? '')
const investmentDirection = ref<'least' | 'most'>('least')

function soloCountFor(row: IndexedNavigationRow): number {
  return gauntletOnly.value ? row.gauntletSoloCount : row.soloCount
}

const indexedRows = computed<IndexedNavigationRow[]>(() =>
  rows.value.map((row) => ({
    ...row,
    iconUrl: getSyncPairIconUrl({ name: row.name, upgrades: '1' }),
    gauntletSoloCount: currentGauntletArenas.value
      .filter((arena) => row.upgrades[arena.slug]).length,
    normalizedName: row.name.normalize('NFKC').toLocaleLowerCase(),
    normalizedJapaneseName: row.japaneseName.normalize('NFKC').toLocaleLowerCase(),
  })),
)

const sortedRows = computed(() => {
  const sorted = [...indexedRows.value]

  sorted.sort((left, right) => {
    if (sortMode.value === 'name') {
      return left.name.localeCompare(right.name, 'en', { sensitivity: 'base' })
    }
    if (sortMode.value === 'japanese') {
      return left.japaneseName.localeCompare(right.japaneseName, 'ja')
    }
    if (sortMode.value === 'investment') {
      const leftValue = investmentScore(left.upgrades[investmentArena.value] ?? '')
      const rightValue = investmentScore(right.upgrades[investmentArena.value] ?? '')
      if (leftValue === null && rightValue !== null) return 1
      if (leftValue !== null && rightValue === null) return -1
      if (leftValue !== rightValue) {
        const difference = (leftValue ?? 0) - (rightValue ?? 0)
        return investmentDirection.value === 'least' ? difference : -difference
      }
      return left.name.localeCompare(right.name, 'en', { sensitivity: 'base' })
    }

    return soloCountFor(right) - soloCountFor(left) ||
      left.name.localeCompare(right.name, 'en', { sensitivity: 'base' })
  })

  return sorted
})

const displayRows = computed(() => {
  const query = search.value.trim().normalize('NFKC').toLocaleLowerCase()
  return sortedRows.value.filter((row) =>
    (soloCountFor(row) > 0 || !gauntletOnly.value) &&
    (
      !query ||
      row.normalizedName.includes(query) ||
      row.normalizedJapaneseName.includes(query)
    ),
  )
})

function investmentScore(value: string): number | null {
  const level = /^\s*(10|[1-5])\b/.exec(value)?.[1]
  if (!level) return null

  const ex = /\bEX\b/i.test(value) ? 1 : 0
  const role = /\bR\b/i.test(value) ? 1 : 0
  const potential = /(\d+)\/20/.exec(value)?.[1]
  const moveLevels = /\+(\d+)E\b/i.exec(value)?.[1]

  return Number(level) * 1_000_000 +
    ex * 100_000 +
    role * 10_000 +
    Number(potential ?? 0) * 100 +
    Number(moveLevels ?? 0)
}

function arenaHref(slug: string, character?: string): string {
  const path = appPath(slug)
  return character ? `${path}?character=${encodeURIComponent(character)}` : path
}

function upgradeClass(value: string): string {
  const tier = /^\s*(10|[1-9])\b/.exec(value)?.[1]
  if (!tier) return 'navigation-investment-empty'
  return `navigation-investment-${tier}${/\bEX\b/i.test(value) ? '-ex' : ''}`
}

function initials(name: string): string {
  return name
    .replace(/\s*\(.*?\)/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? '')
    .join('')
}

function markIconFailed(name: string) {
  failedIcons.value = new Set(failedIcons.value).add(name)
}

watch(gauntletOnly, (showGauntlet) => {
  window.localStorage.setItem('legendary-arena-current-gauntlet-only', String(showGauntlet))
  investmentArena.value = showGauntlet
    ? currentGauntletArenas.value[0]?.slug ?? ''
    : arenas[0]?.slug ?? ''
})

async function fetchNavigation() {
  loading.value = true
  error.value = ''
  try {
    const [navigationRows, currentArenas] = await Promise.all([
      loadArenaNavigation(),
      Promise.all(arenas.map(async (arena) => ({
        arena,
        isCurrent: await isInCurrentLegendaryGauntlet(arena),
      }))),
    ])
    currentGauntletArenas.value = currentArenas
      .filter(({ isCurrent }) => isCurrent)
      .map(({ arena }) => arena)
    gauntletAvailable.value = currentGauntletArenas.value.length > 0
    if (!gauntletAvailable.value) gauntletOnly.value = false
    investmentArena.value = gauntletOnly.value
      ? currentGauntletArenas.value[0]?.slug ?? ''
      : arenas[0]?.slug ?? ''
    rows.value = navigationRows
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('navigationLoadError')
  } finally {
    loading.value = false
  }
}

onMounted(fetchNavigation)
</script>

<template>
  <section
    id="arenas"
    class="arena-section navigation-section"
    :class="{ 'navigation-section-gauntlet': gauntletOnly }"
  >
    <div class="section-heading">
      <h2>{{ gauntletOnly ? t('currentGauntlet') : t('navigation') }}</h2>
    </div>

    <div class="arena-mode-switch" role="group" :aria-label="t('arenaNavigationMode')">
      <span :class="{ 'arena-mode-label-active': !gauntletOnly }">{{ t('allArenas') }}</span>
      <label class="mode-switch">
        <input
          v-model="gauntletOnly"
          type="checkbox"
          role="switch"
          :aria-label="t('showCurrentGauntlet')"
          :disabled="!gauntletAvailable"
        />
        <span class="mode-switch-track" aria-hidden="true"></span>
      </label>
      <span :class="{ 'arena-mode-label-active': gauntletOnly }">{{ t('currentGauntlet') }}</span>
    </div>

    <p v-if="loading" class="section-intro" role="status">
      {{ gauntletOnly ? t('loadingCurrentGauntlet') : t('loadingNavigation') }}
    </p>
    <div v-else-if="error" class="navigation-error" role="alert">
      <p>{{ error }}</p>
      <button class="button-outline" type="button" @click="fetchNavigation">{{ t('tryAgain') }} <span aria-hidden="true">↻</span></button>
    </div>
    <p v-else-if="gauntletOnly && displayedArenas.length === 0" class="section-intro" role="status">
      {{ t('noCurrentArenas') }}
    </p>
    <p v-else-if="rows.length === 0" class="section-intro" role="status">
      {{ gauntletOnly ? t('noCurrentSolos') : t('noSyncPairs') }}
    </p>

    <template v-else-if="!gauntletOnly || displayedArenas.length > 0">
      <div       class="navigation-content"
      :style="{ '--navigation-arena-width': `${displayedArenas.length * 84}px` }">
      <div class="navigation-controls">
        <label class="navigation-search">
          <span aria-hidden="true">⌕</span>
          <input v-model="search" type="search" :placeholder="t('searchSyncPairs')" />
        </label>
        <label class="navigation-select">
          <span>{{ t('sortBy') }}</span>
          <select v-model="sortMode">
            <option value="count">{{ t('numberOfSolos') }}</option>
            <option value="name">{{ t('englishNameSort') }}</option>
            <option value="japanese">{{ t('japaneseNameSort') }}</option>
            <option value="investment">{{ t('investmentByArena') }}</option>
          </select>
        </label>
        <label v-if="sortMode === 'investment'" class="navigation-select">
          <span>{{ t('legendary') }}</span>
          <select v-model="investmentArena">
            <option v-for="arena in displayedArenas" :key="arena.slug" :value="arena.slug">
              {{ locale === 'ja' ? `${arena.japaneseName} · ${arena.name}` : `${arena.name} · ${arena.japaneseName}` }}
            </option>
          </select>
        </label>
        <label v-if="sortMode === 'investment'" class="navigation-select">
          <span>{{ t('order') }}</span>
          <select v-model="investmentDirection">
            <option value="least">{{ t('leastInvested') }}</option>
            <option value="most">{{ t('mostInvested') }}</option>
          </select>
        </label>
      </div>

      <p class="navigation-intro">
        {{ t('selectInvestmentHint') }}
      </p>

      <div v-if="displayRows.length" class="navigation-grid-wrap" :aria-label="t('selectInvestmentHint')">
        <div class="navigation-grid navigation-grid-header" role="row">
          <div class="navigation-pair-heading" role="columnheader">{{ t('syncPair') }}</div>
          <a
            v-for="arena in displayedArenas"
            :key="arena.slug"
            class="navigation-arena-heading"
            :style="{ '--arena-color': arena.color }"
            :href="arenaHref(arena.slug)"
            :aria-label="t('browseArenaSolos', { arena: locale === 'ja' ? arena.japaneseName : arena.name })"
          >
            <img :src="getArenaIcon(arena)" alt="" />
            <span class="navigation-arena-names">
              <span :class="locale === 'en' ? 'name-primary' : 'name-secondary'">{{ arena.name }}</span>
              <span :class="['navigation-arena-japanese', locale === 'ja' ? 'name-primary' : 'name-secondary']">{{ arena.japaneseName }}</span>
            </span>
          </a>
        </div>

        <div class="navigation-rows" tabindex="0" :aria-label="t('syncPair')">
          <div
            v-for="row in displayRows"
            :key="row.name"
            class="navigation-grid navigation-grid-row"
            role="row"
          >
            <div class="navigation-pair-card" role="rowheader">
              <img
                v-if="row.iconUrl && !failedIcons.has(row.name)"
                :src="row.iconUrl"
                alt=""
                loading="lazy"
                @error="markIconFailed(row.name)"
              />
              <span v-else class="navigation-pair-fallback">{{ initials(row.name) }}</span>
              <span class="navigation-pair-copy">
                <span :class="['navigation-pair-name', locale === 'en' ? 'name-primary' : 'name-secondary']">{{ row.name }}</span>
                <span :class="['navigation-japanese', locale === 'ja' ? 'name-primary' : 'name-secondary']">{{ row.japaneseName }}</span>
              </span>
              <span class="navigation-solo-count" :aria-label="t('soloCount', { count: soloCountFor(row) })">{{ soloCountFor(row) }}</span>
            </div>
            <div
              v-for="arena in displayedArenas"
              :key="arena.slug"
              class="navigation-investment-cell"
              role="cell"
            >
              <a
                v-if="row.upgrades[arena.slug]"
                :class="upgradeClass(row.upgrades[arena.slug] ?? '')"
                :href="arenaHref(arena.slug, row.name)"
                :aria-label="t('soloInvestment', { character: locale === 'ja' ? row.japaneseName : row.name, arena: locale === 'ja' ? arena.japaneseName : arena.name, investment: row.upgrades[arena.slug] ?? '' })"
                :title="`${locale === 'ja' ? row.japaneseName : row.name} · ${locale === 'ja' ? arena.japaneseName : arena.name} · ${row.upgrades[arena.slug]}`"
              >{{ row.upgrades[arena.slug] }}</a>
              <span v-else class="navigation-no-run" aria-hidden="true">—</span>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="navigation-no-results" role="status">{{ t('noSyncPairsMatch', { query: search }) }}</p>
      </div>
    </template>
  </section>
</template>
