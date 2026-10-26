<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import DifficultyLegend from '../components/DifficultyLegend.vue'
import SoloRow from '../components/SoloRow.vue'
import type { Arena } from '../data/arenas'
import { difficultyOptions } from '../data/markers'
import { loadArenaSheet, type ArenaSheet } from '../services/sheet'

const props = defineProps<{ arena: Arena }>()
const sheet = ref<ArenaSheet | null>(null)
const loading = ref(true)
const error = ref('')
const search = ref('')
const selectedDifficulties = ref<string[]>([])
const showLegend = ref(false)
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

async function fetchSheet() {
  loading.value = true
  error.value = ''
  try {
    sheet.value = await loadArenaSheet(props.arena)
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

onMounted(fetchSheet)
watch(() => props.arena.gid, fetchSheet)
</script>

<template>
  <div class="page-wrap detail-wrap">
    <a class="back-link" href="/legendaryarena"><span aria-hidden="true">←</span> All arenas</a>

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
          :src="`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${arena.pokemonId}.png`"
          :alt="`${arena.name} official artwork`"
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
        <span v-if="sheet && !loading" class="submission-count">{{ sheet.solos.length.toLocaleString('en-US') }} SUBMISSIONS IN ARCHIVE</span>
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
        <SoloRow v-for="solo in filteredSolos" :key="solo.id" :solo="solo" :color="arena.color" :gid="arena.gid" />
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
