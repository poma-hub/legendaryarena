<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import ArenaDetail from './views/ArenaDetail.vue'
import ArenaIndex from './views/ArenaIndex.vue'
import { arenas } from './data/arenas'

const currentPath = ref(window.location.pathname)
const activeArena = computed(() => {
  const slug = currentPath.value.split('/').filter(Boolean).at(-1)
  return arenas.find((arena) => arena.slug === slug)
})
const isIndex = computed(() => currentPath.value === '/legendaryarena' || currentPath.value === '/')

function syncPath() {
  currentPath.value = window.location.pathname
}

function handleNavigation(event: MouseEvent) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    !(event.target instanceof Element)
  ) {
    return
  }

  const link = event.target.closest('a')
  if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return

  const destination = new URL(link.href)
  if (
    destination.origin !== window.location.origin ||
    !(
      destination.pathname === '/' ||
      destination.pathname === '/legendaryarena' ||
      destination.pathname.startsWith('/legendaryarena/')
    )
  ) {
    return
  }

  event.preventDefault()
  if (destination.href === window.location.href) return

  window.history.pushState(null, '', destination.href)
  syncPath()
  window.scrollTo({ top: 0, behavior: 'instant' })
}

onMounted(() => {
  if (window.location.pathname === '/') {
    window.history.replaceState(null, '', '/legendaryarena')
    syncPath()
  }
  window.addEventListener('popstate', syncPath)
})

onUnmounted(() => window.removeEventListener('popstate', syncPath))
</script>

<template>
  <div class="site-shell" @click="handleNavigation">
    <header class="topbar">
      <nav class="topnav" aria-label="Main navigation">
        <a class="topnav-link active" href="/legendaryarena">Arena index</a>
        <a class="topnav-link" href="https://docs.google.com/spreadsheets/d/1iDfxrZ9AMQCrSaZDuT0yripAln8QH1QQP9r0g56ANhI" target="_blank" rel="noreferrer">
          Source sheet <span aria-hidden="true">↗</span>
        </a>
        <a class="topnav-link" href="https://docs.google.com/forms/d/e/1FAIpQLSdJUCivOpeM_OgclKL047Qe8v1APWKbMq0_099lbensOtvwnw/viewform" target="_blank" rel="noreferrer">
          Submit a solo <span aria-hidden="true">↗</span>
        </a>
      </nav>
    </header>

    <main>
      <ArenaIndex v-if="isIndex" />
      <ArenaDetail v-else-if="activeArena" :arena="activeArena" />
      <section v-else class="not-found">
        <span class="eyebrow">404 · ARENA NOT FOUND</span>
        <h1>That arena isn't in the archive.</h1>
        <a class="button-primary" href="/legendaryarena">Back to arena index <span aria-hidden="true">→</span></a>
      </section>
    </main>
  </div>
</template>
