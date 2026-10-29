<script setup lang="ts">
import { difficultyOptions, flagOptions } from '../data/markers'
import { markerText, t } from '../i18n'
</script>

<template>
  <section class="legend-panel" aria-labelledby="legend-title">
    <div class="legend-heading">
      <span class="eyebrow">{{ t('quickReference') }}</span>
    </div>
    <div class="legend-content">
      <div class="legend-group">
        <h3>{{ t('difficulty') }}</h3>
        <div class="legend-items">
          <div v-for="item in difficultyOptions" :key="item.label" class="legend-item">
            <span class="legend-icon">{{ item.icon }}</span>
            <span><strong>{{ markerText(item.label) }}</strong><small>{{ markerText(item.detail) }}</small></span>
          </div>
        </div>
      </div>
      <div class="legend-group flags-group">
        <h3>{{ t('runFlags') }}</h3>
        <div class="flag-grid">
          <span v-for="item in flagOptions" :key="item.label" class="flag-item">
            <span>{{ item.icon }}</span>{{ markerText(item.label) }}
          </span>
        </div>
        <p class="flag-note">{{ t('multipleStatusMarkers') }}</p>
      </div>
    </div>
  </section>
</template>
