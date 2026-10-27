<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { arenas, getArenaIcon, type Arena } from '../data/arenas'
import { getSyncPairIconUrl } from '../data/sync-pair-icons'
import { appPath } from '../routes'
import {
  isInCurrentLegendaryGauntlet,
  loadArenaNavigation,
  type ArenaNavigationRow,
} from '../services/sheet'

type SortMode = 'count' | 'name' | 'japanese' | 'investment'

const props = withDefaults(defineProps<{ gauntletOnly?: boolean }>(), {
  gauntletOnly: false,
})

interface DisplayNavigationRow extends ArenaNavigationRow {
  iconUrl: string
  displayedSoloCount: number
}

const rows = ref<ArenaNavigationRow[]>([])
const displayedArenas = ref<Arena[]>(props.gauntletOnly ? [] : arenas)
const failedIcons = ref(new Set<string>())
const loading = ref(true)
const error = ref('')
const search = ref('')
const sortMode = ref<SortMode>('count')
const investmentArena = ref(arenas[0]?.slug ?? '')
const investmentDirection = ref<'least' | 'most'>('least')

function soloCountFor(row: ArenaNavigationRow): number {
  if (!props.gauntletOnly) return row.soloCount
  return displayedArenas.value.filter((arena) => row.upgrades[arena.slug]).length
}

const displayRows = computed<DisplayNavigationRow[]>(() => {
  const query = search.value.trim().normalize('NFKC').toLocaleLowerCase()
  const filtered = rows.value.filter((row) =>
    (soloCountFor(row) > 0 || !props.gauntletOnly) &&
    (
      !query ||
      row.name.normalize('NFKC').toLocaleLowerCase().includes(query) ||
      row.japaneseName.normalize('NFKC').toLocaleLowerCase().includes(query)
    ),
  )

  filtered.sort((left, right) => {
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

  return filtered.map((row) => ({
    ...row,
    iconUrl: getSyncPairIconUrl({ name: row.name, upgrades: '5 EX' }),
    displayedSoloCount: soloCountFor(row),
  }))
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

async function fetchNavigation() {
  loading.value = true
  error.value = ''
  try {
    const [navigationRows, currentArenas] = await Promise.all([
      loadArenaNavigation(),
      props.gauntletOnly
        ? Promise.all(arenas.map(async (arena) => ({
          arena,
          isCurrent: await isInCurrentLegendaryGauntlet(arena),
        })))
        : Promise.resolve([]),
    ])
    if (props.gauntletOnly) {
      displayedArenas.value = currentArenas
        .filter(({ isCurrent }) => isCurrent)
        .map(({ arena }) => arena)
      investmentArena.value = displayedArenas.value[0]?.slug ?? ''
    }
    rows.value = navigationRows
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'The sync pair navigation could not be loaded.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchNavigation)
</script>

<template>
  <section
    :id="gauntletOnly ? 'current-lg' : 'arenas'"
    class="arena-section navigation-section"
    :class="{ 'navigation-section-gauntlet': gauntletOnly }"
  >
    <div class="section-heading">
      <div>
        <h2>{{ gauntletOnly ? 'Current Legendary Gauntlet' : 'Navigation' }}</h2>
      </div>
      <span v-if="!loading && !error" class="section-count">
        <template v-if="gauntletOnly">
          {{ displayedArenas.length }} <span>ARENAS</span>
        </template>
        <template v-else>
          {{ displayRows.length }} <span>OF {{ rows.length }} PAIRS</span>
        </template>
      </span>
    </div>

    <p v-if="loading" class="section-intro" role="status">
      {{ gauntletOnly ? 'Loading the current Legendary Gauntlet...' : 'Loading sync pair navigation...' }}
    </p>
    <div v-else-if="error" class="navigation-error" role="alert">
      <p>{{ error }}</p>
      <button class="button-outline" type="button" @click="fetchNavigation">Try again <span aria-hidden="true">↻</span></button>
    </div>
    <p v-else-if="gauntletOnly && displayedArenas.length === 0" class="section-intro" role="status">
      No arenas are currently in the Legendary Gauntlet.
    </p>
    <p v-else-if="rows.length === 0" class="section-intro" role="status">
      {{ gauntletOnly ? 'No sync pairs have solos in the current Gauntlet.' : 'No sync pairs are available.' }}
    </p>

    <template v-else-if="!gauntletOnly || displayedArenas.length > 0">
      <div class="navigation-controls">
        <label class="navigation-search">
          <span aria-hidden="true">⌕</span>
          <input v-model="search" type="search" placeholder="Search sync pairs..." />
        </label>
        <label class="navigation-select">
          <span>Sort by</span>
          <select v-model="sortMode">
            <option value="count">Number of solos</option>
            <option value="name">Name (A–Z)</option>
            <option value="japanese">Japanese name (A–Z)</option>
            <option value="investment">Investment by arena</option>
          </select>
        </label>
        <label v-if="sortMode === 'investment'" class="navigation-select">
          <span>Legendary</span>
          <select v-model="investmentArena">
            <option v-for="arena in displayedArenas" :key="arena.slug" :value="arena.slug">{{ arena.name }}</option>
          </select>
        </label>
        <label v-if="sortMode === 'investment'" class="navigation-select">
          <span>Order</span>
          <select v-model="investmentDirection">
            <option value="least">Least invested first</option>
            <option value="most">Most invested first</option>
          </select>
        </label>
      </div>

      <p class="navigation-intro">
        Select an investment to find that sync pair's solo, or choose a legendary to browse all its runs.
      </p>

      <div v-if="displayRows.length" class="navigation-grid-wrap" aria-label="Sync pair solos by legendary arena">
        <div class="navigation-grid navigation-grid-header" role="row">
          <div class="navigation-pair-heading" role="columnheader">Sync pair</div>
          <a
            v-for="arena in displayedArenas"
            :key="arena.slug"
            class="navigation-arena-heading"
            :style="{ '--arena-color': arena.color }"
            :href="arenaHref(arena.slug)"
            :aria-label="`Browse ${arena.name} solos`"
          >
            <img :src="getArenaIcon(arena)" alt="" />
            <span>{{ arena.name }}</span>
          </a>
        </div>

        <div class="navigation-rows" tabindex="0" aria-label="Sync pair investments">
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
                <span class="navigation-pair-name">{{ row.name }}</span>
                <span class="navigation-japanese">{{ row.japaneseName }}</span>
              </span>
              <span class="navigation-solo-count" :aria-label="`${row.displayedSoloCount} solos`">{{ row.displayedSoloCount }}</span>
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
                :aria-label="`${row.name} on ${arena.name}: ${row.upgrades[arena.slug]}`"
                :title="`${row.name} · ${arena.name} · ${row.upgrades[arena.slug]}`"
              >{{ row.upgrades[arena.slug] }}</a>
              <span v-else class="navigation-no-run" aria-hidden="true">—</span>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="navigation-no-results" role="status">No sync pairs match “{{ search }}”.</p>
    </template>
  </section>
</template>
