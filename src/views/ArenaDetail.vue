<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import DifficultyLegend from '../components/DifficultyLegend.vue'
import SoloRow from '../components/SoloRow.vue'
import { getArenaIcon, type Arena } from '../data/arenas'
import { difficultyOptions } from '../data/markers'
import { appPath } from '../routes'
import { loadArenaSheet, type ArenaSheet, type Solo } from '../services/sheet'

const props = defineProps<{ arena: Arena }>()
const indexPath = appPath()
const sheet = ref<ArenaSheet | null>(null)
const loading = ref(true)
const error = ref('')
const search = ref('')
const selectedDifficulties = ref<string[]>([])
const showLegend = ref(false)
const expandedSoloGroups = ref<Set<string>>(new Set())
const expandedSoloPreview = ref<number | null>(null)
const notRatedFilter = 'not-rated'

const filteredSolos = computed(() => {
  if (!sheet.value) return []
  const query = search.value.trim().toLocaleLowerCase()

  return sheet.value.solos.filter((solo) => {
    const matchesSearch = !query ||
      solo.name.toLocaleLowerCase().includes(query) ||
      solo.japaneseName.toLocaleLowerCase().includes(query)
    const hasDifficulty = difficultyOptions.some((item) => solo.difficulties.includes(item.icon))
    const matchesDifficulty = selectedDifficulties.value.length === 0 ||
      difficultyOptions.some((item) =>
        solo.difficulties.includes(item.icon) && selectedDifficulties.value.includes(item.icon),
      ) ||
      (!hasDifficulty && selectedDifficulties.value.includes(notRatedFilter))
    return matchesSearch && matchesDifficulty
  })
})

const groupedSolos = computed(() => {
  const groups = new Map<string, Solo[]>()

  for (const solo of filteredSolos.value) {
    const group = groups.get(solo.name)
    if (group) group.push(solo)
    else groups.set(solo.name, [solo])
  }

  return Array.from(groups, ([name, solos]) => ({ name, solos }))
})

function shareUrlFor(solo: Solo): string {
  const url = new URL(appPath(props.arena.slug), window.location.origin)
  url.searchParams.set('runId', solo.runId)
  return url.href
}

async function openSharedRun() {
  if (!sheet.value) return

  const params = new URLSearchParams(window.location.search)
  const runId = params.get('runId')
  if (!runId) return
  const target = sheet.value.solos.find((solo) => solo.runId === runId)
  if (!target) return

  search.value = target.name
  selectedDifficulties.value = []
  const firstRunId = sheet.value.solos.find((solo) => solo.name === target.name)?.runId
  expandedSoloGroups.value = firstRunId !== target.runId ? new Set([target.name]) : new Set()
  expandedSoloPreview.value = target.id

  await nextTick()
  document.getElementById(`solo-row-${target.id}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}

async function fetchSheet() {
  loading.value = true
  error.value = ''
  search.value = new URLSearchParams(window.location.search).get('character')?.trim() ?? ''
  try {
    sheet.value = await loadArenaSheet(props.arena)
    await openSharedRun()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'The arena data could not be loaded.'
  } finally {
    loading.value = false
  }
}

function toggleDifficulty(icon: string) {
  selectedDifficulties.value = selectedDifficulties.value.includes(icon)
    ? selectedDifficulties.value.filter((item) => item !== icon)
    : [...selectedDifficulties.value, icon]
}

function toggleSoloGroup(name: string) {
  const expanded = new Set(expandedSoloGroups.value)
  if (expanded.has(name)) expanded.delete(name)
  else expanded.add(name)
  expandedSoloGroups.value = expanded
}

function toggleSoloPreview(id: number) {
  expandedSoloPreview.value = expandedSoloPreview.value === id ? null : id
}

onMounted(fetchSheet)
watch(() => props.arena.gid, () => {
  expandedSoloGroups.value = new Set()
  expandedSoloPreview.value = null
  fetchSheet()
})
</script>

<template>
  <div class="page-wrap detail-wrap">
    <a class="back-link" :href="indexPath"><span aria-hidden="true">←</span> All arenas</a>

    <section class="detail-hero" :style="{ '--arena-color': arena.color }">
      <div class="detail-copy">
        <span class="eyebrow"><span class="eyebrow-dot"></span> LEGENDARY ARENA</span>
        <h1>{{ arena.name }}</h1>
        <div class="detail-count">
          <strong v-if="sheet">{{ sheet.uniqueCount.toLocaleString('en-US') }}</strong>
          <span v-else-if="loading" class="count-loading">···</span>
          <strong v-else>—</strong>
          <span>UNIQUE SYNC PAIRS<br />WITH A SOLO</span>
        </div>
      </div>
      <div class="detail-art">
        <div class="detail-art-halo"></div>
        <img
          :src="getArenaIcon(arena)"
          :alt="`${arena.name} icon`"
        />
      </div>
      <span class="detail-number">LA / {{ String(arena.pokemonId).padStart(3, '0') }}</span>
    </section>

    <section class="solos-section" aria-labelledby="solos-heading">
      <div class="solos-heading-row">
        <div>
          <h2 id="solos-heading">Solos</h2>
        </div>
        <a
          class="sheet-link"
          :href="`https://docs.google.com/spreadsheets/d/1iDfxrZ9AMQCrSaZDuT0yripAln8QH1QQP9r0g56ANhI/edit?gid=${arena.gid}`"
          target="_blank"
          rel="noreferrer"
        >Open source sheet <span aria-hidden="true">↗</span></a>
      </div>

      <div class="filter-bar">
        <label class="search-box">
          <span class="search-icon" aria-hidden="true">⌕</span>
          <input v-model="search" type="search" placeholder="Search a trainer in English or Japanese..." />
        </label>
        <button class="legend-toggle" type="button" @click="showLegend = !showLegend">
          <span>◎</span> Difficulty guide <span class="toggle-chevron">{{ showLegend ? '−' : '+' }}</span>
        </button>
      </div>

      <div class="difficulty-filters" aria-label="Filter by difficulty">
        <label
          v-for="item in difficultyOptions"
          :key="item.icon"
          class="filter-chip"
          :class="{ selected: selectedDifficulties.includes(item.icon) }"
          :title="item.detail"
        >
          <input
            type="checkbox"
            :checked="selectedDifficulties.includes(item.icon)"
            @change="toggleDifficulty(item.icon)"
          />
          <span>{{ item.icon }}</span>{{ item.label }}
        </label>
        <label
          class="filter-chip"
          :class="{ selected: selectedDifficulties.includes(notRatedFilter) }"
        >
          <input
            type="checkbox"
            :checked="selectedDifficulties.includes(notRatedFilter)"
            @change="toggleDifficulty(notRatedFilter)"
          />
          Not rated
        </label>
      </div>

      <div v-if="showLegend" class="detail-legend">
        <DifficultyLegend />
      </div>

      <div class="results-line">
        <span v-if="loading">LOADING RUNS…</span>
        <span v-else-if="error">COULD NOT LOAD RUNS</span>
        <span v-else>{{ filteredSolos.length.toLocaleString('en-US') }} RUN{{ filteredSolos.length === 1 ? '' : 'S' }} FOUND</span>
        <span v-if="sheet && !loading" class="submission-count">{{ sheet.solos.length.toLocaleString('en-US') }} RUNS IN ARCHIVE</span>
      </div>

      <div v-if="loading" class="state-panel">
        <div class="loader-orbit"></div>
        <h3>Looking through the archive</h3>
        <p>Fetching the latest {{ arena.name }} solo strategies.</p>
      </div>
      <div v-else-if="error" class="state-panel error-panel" role="alert">
        <span class="state-icon">!</span>
        <h3>The archive is temporarily out of reach.</h3>
        <p>{{ error }}</p>
        <button class="button-outline" type="button" @click="fetchSheet">Try again <span aria-hidden="true">↻</span></button>
      </div>
      <div v-else-if="filteredSolos.length" class="solo-list">
        <section v-for="group in groupedSolos" :key="group.name" class="solo-group">
          <SoloRow
            :solo="group.solos[0]!"
            :color="arena.color"
            :gid="arena.gid"
            :share-url="shareUrlFor(group.solos[0]!)"
            :expandable="group.solos.length > 1"
            :expanded="expandedSoloGroups.has(group.name)"
            :preview-expanded="expandedSoloPreview === group.solos[0]!.id"
            @toggle-expanded="toggleSoloGroup(group.name)"
            @toggle-preview="toggleSoloPreview(group.solos[0]!.id)"
          />
          <div
            v-if="expandedSoloGroups.has(group.name)"
            :id="`solo-group-${group.solos[0]?.id}-more`"
            class="solo-group-rows"
          >
            <SoloRow
              v-for="solo in group.solos.slice(1)"
              :key="solo.id"
              :solo="solo"
              :color="arena.color"
              :gid="arena.gid"
              :share-url="shareUrlFor(solo)"
              :preview-expanded="expandedSoloPreview === solo.id"
              @toggle-preview="toggleSoloPreview(solo.id)"
            />
          </div>
        </section>
      </div>
      <div v-else class="state-panel empty-panel">
        <span class="state-icon">⌕</span>
        <h3>No runs match those filters.</h3>
        <p>Try another trainer name or select more difficulty levels.</p>
        <button class="text-button" type="button" @click="search = ''; selectedDifficulties = []">
          Clear all filters <span aria-hidden="true">↗</span>
        </button>
      </div>

      <div class="detail-contribute">
        <p>Have a run that's not listed yet?</p>
        <a href="https://docs.google.com/forms/d/e/1FAIpQLSdJUCivOpeM_OgclKL047Qe8v1APWKbMq0_099lbensOtvwnw/viewform" target="_blank" rel="noreferrer">
          Submit it <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  </div>
</template>
