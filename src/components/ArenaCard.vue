<script setup lang="ts">
import { getArenaIcon, type Arena } from '../data/arenas'
import { appPath } from '../routes'

const props = defineProps<{ arena: Arena; index: number }>()
</script>

<template>
  <a class="arena-card" :href="appPath(props.arena.slug)" :style="{ '--arena-color': arena.color }">
    <div class="arena-card-top">
      <span class="arena-number">{{ String(index + 1).padStart(2, '0') }}</span>
    </div>
    <div class="arena-art">
      <div class="art-halo"></div>
      <img
        :src="getArenaIcon(arena)"
        :alt="`${arena.name} icon`"
        loading="lazy"
      />
    </div>
    <div class="arena-card-bottom">
      <div>
        <h3>{{ arena.name }}</h3>
      </div>
      <span class="card-arrow" aria-hidden="true">↗</span>
    </div>
  </a>
</template>
