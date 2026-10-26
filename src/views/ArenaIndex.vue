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
          <h2>Legendary arenas</h2>
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
      <p>Document originally made by Maelmc and currently maintained by Naomi. Credits to u/Sages and Sync Pair Icons for the sync pair assets. Special thanks to StDk for PoMaTools and miscellaneous fixes to the sheet.</p>
      <a href="https://docs.google.com/spreadsheets/d/1iDfxrZ9AMQCrSaZDuT0yripAln8QH1QQP9r0g56ANhI" target="_blank" rel="noreferrer">View the original document ↗</a>
    </section>
  </div>
</template>
