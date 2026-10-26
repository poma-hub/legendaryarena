<script setup lang="ts">
import ArenaCard from '../components/ArenaCard.vue'
import DifficultyLegend from '../components/DifficultyLegend.vue'
import { arenas } from '../data/arenas'
</script>

<template>
  <div class="page-wrap">
    <section id="arenas" class="arena-section">
      <div class="section-heading">
        <div>
          <h2>Legendary Arenas</h2>
        </div>
        <span class="section-count">14 <span>ARENAS</span></span>
      </div>
      <p class="section-intro"></p>
      <div class="arena-grid">
        <ArenaCard v-for="(arena, index) in arenas" :key="arena.slug" :arena="arena" :index="index" />
      </div>
    </section>

    <DifficultyLegend />

    <section class="credits">
      <span class="eyebrow">MADE POSSIBLE BY THE COMMUNITY</span>
      <p>
        Document originally made by
        <a href="https://www.youtube.com/@MaelmcPoMa" target="_blank" rel="noreferrer">Maelmc</a>
        and currently maintained by
        <a href="https://www.youtube.com/@naovalentine" target="_blank" rel="noreferrer">Naomi</a>.
        Credits to
        <a href="https://www.reddit.com/user/Sages/" target="_blank" rel="noreferrer">u/Sages</a>
        and
        <a href="https://pomasters.github.io/SyncPairsTracker/icons/" target="_blank" rel="noreferrer">Sync Pair Icons</a>
        for the sync pair assets. Special thanks to
        <a href="https://www.youtube.com/@pomatools" target="_blank" rel="noreferrer">StDk</a>
        for
        <a href="https://pomatools.github.io/" target="_blank" rel="noreferrer">PoMaTools</a>
        and miscellaneous fixes to the sheet.
      </p>
      <a href="https://docs.google.com/spreadsheets/d/1iDfxrZ9AMQCrSaZDuT0yripAln8QH1QQP9r0g56ANhI" target="_blank" rel="noreferrer">View the original document ↗</a>
    </section>
  </div>
</template>
