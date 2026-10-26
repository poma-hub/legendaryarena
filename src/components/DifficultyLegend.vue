<script setup lang="ts">
import { difficultyOptions, flagOptions } from '../data/markers'
</script>

<template>
  <section class="legend-panel" aria-labelledby="legend-title">
    <div class="legend-heading">
      <span class="eyebrow">QUICK REFERENCE</span>
    </div>
    <div class="legend-content">
      <div class="legend-group">
        <h3>Difficulty</h3>
        <div class="legend-items">
          <div v-for="item in difficultyOptions" :key="item.label" class="legend-item">
            <span class="legend-icon">{{ item.icon }}</span>
            <span><strong>{{ item.label }}</strong><small>{{ item.detail }}</small></span>
          </div>
        </div>
      </div>
      <div class="legend-group flags-group">
        <h3>Run flags</h3>
        <div class="flag-grid">
          <span v-for="item in flagOptions" :key="item.label" class="flag-item">
            <span>{{ item.icon }}</span>{{ item.label }}
          </span>
        </div>
        <p class="flag-note">Multiple status markers may appear on a single run.</p>
      </div>
    </div>
  </section>
</template>
