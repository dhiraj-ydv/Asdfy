<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import type { AdaptiveOptions, KeyStat, LetterScope } from '../../domain/models';
import { LETTERS } from '../../domain/keyboard';
import { weakKeys } from '../../domain/generator';
import { keyAccuracy, keySpeed } from '../../domain/stats';

const props = defineProps<{ learned: string; keys: KeyStat[]; options: AdaptiveOptions }>();
const emit = defineEmits<{ start: [options: AdaptiveOptions] }>();
const startButton = useTemplateRef<HTMLButtonElement>('start-button');
const scope = ref<LetterScope>(props.options.scope);
const words = ref(props.options.words);

const letters = computed(() => scope.value === 'all' ? LETTERS : props.learned);
const focus = computed(() => weakKeys(props.keys, letters.value).map(key => {
  const stat = props.keys.find(entry => entry.key === key);
  const attempts = stat ? stat.hits + stat.misses : 0;
  return {
    key,
    detail: stat && attempts >= 15 ? `${keyAccuracy(stat)}% · ${keySpeed(stat) ?? '–'} ms` : 'Needs practice',
  };
}));

onMounted(() => startButton.value?.focus());
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>Smart practice</h1>
      <p>Drills built around your weakest keys. Every session re-ranks keys by how often you miss them and how
        long they take, so the focus moves as you improve.</p>
    </header>

    <div class="card focus-card">
      <p class="eyebrow">Next focus</p>
      <ul class="focus">
        <li v-for="entry in focus" :key="entry.key">
          <span class="keycap large">{{ entry.key }}</span>
          <span class="muted">{{ entry.detail }}</span>
        </li>
      </ul>
    </div>

    <div class="card options">
      <fieldset class="field">
        <legend>Letters</legend>
        <div class="segmented">
          <label><input v-model="scope" type="radio" name="scope" value="learned" /><span>Learned so far ({{ learned.length }})</span></label>
          <label><input v-model="scope" type="radio" name="scope" value="all" /><span>Full alphabet</span></label>
        </div>
      </fieldset>
      <fieldset class="field">
        <legend>Length</legend>
        <div class="segmented">
          <label v-for="count in [25, 50, 100]" :key="count">
            <input v-model="words" type="radio" name="length" :value="count" /><span>{{ count }} words</span>
          </label>
        </div>
      </fieldset>
      <button ref="start-button" class="btn btn-primary btn-lg" @click="emit('start', { scope, words })">Start drill</button>
    </div>
  </section>
</template>

<style scoped>
.focus-card { display: flex; flex-direction: column; gap: 14px; }
.focus { list-style: none; margin: 0; padding: 0; display: flex; gap: 28px; flex-wrap: wrap; }
.focus li { display: flex; align-items: center; gap: 12px; }
.focus .keycap { font-size: 1.4rem; }
.options { display: flex; flex-direction: column; gap: 22px; align-items: flex-start; }
</style>
