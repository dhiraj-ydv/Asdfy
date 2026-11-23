<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useTutor } from './composables/useTutor';
import { desktop } from './services/desktop';
import { MODE_VIEWS } from './domain/models';
import { streak } from './domain/stats';
import AppSidebar from './shell/AppSidebar.vue';
import PracticeView from './features/practice/PracticeView.vue';
import LearnView from './features/learn/LearnView.vue';
import AdaptiveView from './features/adaptive/AdaptiveView.vue';
import TestView from './features/test/TestView.vue';
import CustomView from './features/custom/CustomView.vue';
import StatsView from './features/stats/StatsView.vue';
import SettingsView from './features/settings/SettingsView.vue';

const tutor = useTutor(desktop);
const {
  lessons, summary, view, session, sessionKey, loading, error, history, historyLoading, historyError, hasMore,
  result, previousBest, saving, saveMessage, customText, adaptiveOptions, testOptions, installedVersion,
  versionError, passed, upNext, learned, hasNextLesson,
} = tutor;
const inSession = computed(() => !!session.value && MODE_VIEWS[session.value.mode] === view.value);
const practiceEnabled = computed(() => inSession.value && !result.value && !loading.value);
const testBest = computed(() => summary.value.modes.find(entry => entry.mode === 'test') ?? null);
const streakDays = computed(() => streak(summary.value.days));
onMounted(tutor.load);
</script>

<template>
  <div class="app">
    <AppSidebar :view="view" :busy="saving" :streak="streakDays" @navigate="tutor.navigate" />
    <main class="content">
      <div v-if="error" class="banner" role="alert">
        <p>{{ error }}</p>
        <button class="btn btn-secondary" :disabled="loading || saving" @click="tutor.load">Retry</button>
      </div>
      <p v-if="loading" class="page muted" role="status">Loading your lessons…</p>
      <template v-else>
        <PracticeView v-if="inSession && session" :key="sessionKey" :session="session" :enabled="practiceEnabled"
          :result="result" :saving="saving" :message="saveMessage" :previous-best="previousBest" :has-next="hasNextLesson"
          @complete="tutor.complete" @next="tutor.next" @retry="tutor.retry" @leave="tutor.leave" />
        <LearnView v-else-if="view === 'learn'" :lessons="lessons" :bests="summary.lessons" :passed="passed"
          :up-next="upNext" :first-run="summary.sessions === 0" @start="tutor.startLesson" @practice="tutor.navigate('adaptive')" />
        <AdaptiveView v-else-if="view === 'adaptive'" :learned="learned" :keys="summary.keys" :options="adaptiveOptions"
          @start="tutor.startAdaptive" />
        <TestView v-else-if="view === 'test'" :options="testOptions" :best="testBest?.best_wpm ?? null"
          :sessions="testBest?.sessions ?? 0" @start="tutor.startTest" />
        <CustomView v-else-if="view === 'custom'" v-model="customText" @start="tutor.startCustom" />
        <StatsView v-else-if="view === 'stats'" :summary="summary" :history="history" :loading="historyLoading"
          :error="historyError" :has-more="hasMore" @retry="tutor.loadHistory()" @more="tutor.loadHistory(true)" />
        <SettingsView v-else-if="view === 'settings'" :version="installedVersion" :error="versionError"
          @control="tutor.control" />
      </template>
    </main>
  </div>
</template>
