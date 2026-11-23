<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue';
import type { TestOptions } from '../../domain/models';

const props = defineProps<{ options: TestOptions; best: number | null; sessions: number }>();
const emit = defineEmits<{ start: [options: TestOptions] }>();
const startButton = useTemplateRef<HTMLButtonElement>('start-button');
const seconds = ref(props.options.seconds);
const punctuation = ref(props.options.punctuation);
const numbers = ref(props.options.numbers);

onMounted(() => startButton.value?.focus());
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>Speed test</h1>
      <p>Type common words against the clock. The timer starts on your first keystroke.</p>
    </header>

    <div class="summary">
      <div class="card tile"><span class="eyebrow">Best</span><strong>{{ best === null ? '–' : `${Math.round(best)} wpm` }}</strong></div>
      <div class="card tile"><span class="eyebrow">Tests taken</span><strong>{{ sessions }}</strong></div>
    </div>

    <div class="card options">
      <fieldset class="field">
        <legend>Duration</legend>
        <div class="segmented">
          <label v-for="value in [15, 30, 60, 120]" :key="value">
            <input v-model="seconds" type="radio" name="duration" :value="value" /><span>{{ value }}s</span>
          </label>
        </div>
      </fieldset>
      <div class="toggles">
        <label class="switch">
          <input v-model="punctuation" type="checkbox" role="switch" />
          <span class="switch-track"></span>
          <span class="switch-text">Punctuation and capitals<small>Sentences with commas, quotes and contractions</small></span>
        </label>
        <label class="switch">
          <input v-model="numbers" type="checkbox" role="switch" />
          <span class="switch-track"></span>
          <span class="switch-text">Numbers<small>Mixes in digits from the number row</small></span>
        </label>
      </div>
      <button ref="start-button" class="btn btn-primary btn-lg" @click="emit('start', { seconds, punctuation, numbers })">
        Start {{ seconds }}-second test
      </button>
    </div>
  </section>
</template>

<style scoped>
.summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.tile { display: flex; flex-direction: column; gap: 4px; padding: 18px 20px; }
.tile strong { font-size: 1.6rem; letter-spacing: -0.02em; }
.options { display: flex; flex-direction: column; gap: 22px; align-items: flex-start; }
.toggles { display: flex; flex-direction: column; gap: 14px; }
</style>
