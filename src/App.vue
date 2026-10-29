<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import ArenaDetail from './views/ArenaDetail.vue'
import ArenaNavigation from './views/ArenaNavigation.vue'
import { arenas } from './data/arenas'
import { locale, setLocale, t, type Locale } from './i18n'
import { appPath, getRoutePath, isAppPath } from './routes'

const currentPath = ref(getRoutePath(window.location.pathname))
const selectedLocale = computed({
  get: () => locale.value,
  set: (value: Locale) => setLocale(value),
})
const activeArena = computed(() => {
  const slug = currentPath.value.split('/').filter(Boolean).at(-1)
  return arenas.find((arena) => arena.slug === slug)
})
const isIndex = computed(() => currentPath.value === '/')

function syncPath() {
  currentPath.value = getRoutePath(window.location.pathname)
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
    !isAppPath(destination.pathname)
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
  if (window.location.pathname === '/' && import.meta.env.BASE_URL !== '/') {
    window.history.replaceState(null, '', appPath())
    syncPath()
  }
  window.addEventListener('popstate', syncPath)
})

onUnmounted(() => window.removeEventListener('popstate', syncPath))
</script>

<template>
  <div class="site-shell" :lang="locale" @click="handleNavigation">
    <header class="topbar">
      <nav class="topnav" :aria-label="t('mainNavigation')">
        <a class="topnav-link active" :href="appPath()">{{ t('arenaIndex') }}</a>
        <a class="topnav-link" href="https://docs.google.com/spreadsheets/d/1iDfxrZ9AMQCrSaZDuT0yripAln8QH1QQP9r0g56ANhI" target="_blank" rel="noreferrer">
          {{ t('sourceSheet') }} <span aria-hidden="true">↗</span>
        </a>
        <a class="topnav-link" href="https://docs.google.com/forms/d/e/1FAIpQLSdJUCivOpeM_OgclKL047Qe8v1APWKbMq0_099lbensOtvwnw/viewform" target="_blank" rel="noreferrer">
          {{ t('submitSolo') }} <span aria-hidden="true">↗</span>
        </a>
      </nav>
      <label class="language-select">
        <span class="sr-only">{{ t('language') }}</span>
        <select v-model="selectedLocale" :aria-label="t('language')">
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </label>
    </header>

    <main>
      <ArenaNavigation v-if="isIndex" />
      <ArenaDetail v-else-if="activeArena" :arena="activeArena" />
      <section v-else class="not-found">
        <span class="eyebrow">{{ t('arenaNotFound') }}</span>
        <h1>{{ t('missingArena') }}</h1>
        <a class="button-primary" :href="appPath()">{{ t('backToArenaIndex') }} <span aria-hidden="true">→</span></a>
      </section>
      <section class="credits">
        <span class="eyebrow">{{ t('communityMade') }}</span>
        <p>
          {{ t('originalDocument') }}
          <a href="https://www.youtube.com/@MaelmcPoMa" target="_blank" rel="noreferrer">Maelmc</a>
          {{ t('maintainedBy') }}
          <a href="https://www.youtube.com/@naovalentine" target="_blank" rel="noreferrer">Naomi</a>{{ t('creditsSentenceEnd') }}
          {{ t('creditsTo') }}
          <a href="https://www.reddit.com/user/Sages/" target="_blank" rel="noreferrer">u/Sages</a>
          {{ t('and') }}
          <a href="https://pomasters.github.io/SyncPairsTracker/icons/" target="_blank" rel="noreferrer">Sync Pair Icons</a>
          {{ t('syncPairAssets') }}
          <a href="https://www.youtube.com/@pomatools" target="_blank" rel="noreferrer">StDk</a>
          {{ t('for') }}
          <a href="https://pomatools.github.io/" target="_blank" rel="noreferrer">PoMaTools</a>
          {{ t('miscellaneousFixes') }}
        </p>
        <a href="https://docs.google.com/spreadsheets/d/1iDfxrZ9AMQCrSaZDuT0yripAln8QH1QQP9r0g56ANhI" target="_blank" rel="noreferrer">{{ t('viewOriginalDocument') }} ↗</a>
      </section>
    </main>
  </div>
</template>
