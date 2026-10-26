<script setup lang="ts">
import { difficultyOptions, flagOptions } from '../data/markers'
import type { Solo } from '../services/sheet'

defineProps<{ solo: Solo; color: string; gid: string }>()

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
  <article class="solo-row" :style="{ '--arena-color': color }">
    <div class="sync-avatar" aria-hidden="true">{{ initials(solo.name) }}</div>
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
  </article>
</template>
