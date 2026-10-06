<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useTutor } from './composables/useTutor';
import { desktop } from './services/desktop';
import AppDrawer from './shell/AppDrawer.vue';
import PracticeView from './features/practice/PracticeView.vue';
import CustomPractice from './features/custom/CustomPractice.vue';
import ProgressHistory from './features/history/ProgressHistory.vue';
import UpdatesView from './features/updates/UpdatesView.vue';
import ResultDialog from './features/practice/ResultDialog.vue';

const tutor = useTutor(desktop);
const { lessons, currentLesson, view, drawerOpen, loading, error, history,
  historyLoading, historyError, hasMore, result, saving, saveMessage,
  installedVersion, versionError, exerciseKey } = tutor;
const practiceEnabled = computed(() => view.value === 'lesson' && !drawerOpen.value && !result.value && !loading.value);
onMounted(tutor.load);
</script>

<template>
  <div class="app-container">
    <AppDrawer :open="drawerOpen" :view="view" :lessons="lessons" :selected-id="currentLesson?.id"
      :busy="saving" @close="drawerOpen = false" @navigate="tutor.navigate"
      @select="tutor.selectLesson" @control="tutor.control" />

    <header class="app-header">
      <div class="header-left">
        <button class="hamburger-btn" aria-label="Open menu" :aria-expanded="drawerOpen" @click="drawerOpen = !drawerOpen">☰</button>
        <div class="logo"><h1>TypeDH</h1></div>
      </div>
      <div class="current-lesson-name">{{ currentLesson?.title || 'No Lesson Selected' }}</div>
    </header>

    <p v-if="loading" role="status">Loading your lessons…</p>
    <div v-if="error" class="error-banner" role="alert">
      <p>{{ error }}</p>
      <button :disabled="loading || saving" @click="tutor.load">Retry loading</button>
    </div>
    <main v-if="!loading" class="main-view" :inert="drawerOpen || !!result">
      <PracticeView v-if="view === 'lesson' && currentLesson" :key="exerciseKey"
        :lesson="currentLesson" :enabled="practiceEnabled" @complete="tutor.complete" />
      <CustomPractice v-else-if="view === 'custom'" @start="tutor.customPractice" />
      <ProgressHistory v-else-if="view === 'history'" :entries="history" :loading="historyLoading"
        :error="historyError" :has-more="hasMore" @retry="tutor.loadHistory()" @more="tutor.loadHistory(true)" />
      <UpdatesView v-else-if="view === 'updates'" :version="installedVersion" :error="versionError" />
    </main>
    <ResultDialog v-if="result" :score="result" :saving="saving" :message="saveMessage"
      @next="tutor.nextLesson" @again="tutor.practiceAgain" />
  </div>
</template>

<style scoped>
.error-banner { padding: 12px 20px; border: 1px solid var(--error-color); border-radius: 8px; }
.header-left { display: flex; align-items: center; gap: 15px; }
.app-header h1 { font-size: 1.2rem; margin: 0; }
.current-lesson-name { font-weight: 600; color: var(--text-muted); font-size: 0.9rem; }
</style>
