<script setup lang="ts">
import { computed, ref } from 'vue';
import { MAX_CUSTOM_LENGTH } from '../../domain/models';
import { normalizePractice } from '../../domain/practice';
import Icon from '../../shell/Icon.vue';

const text = defineModel<string>({ required: true });
const emit = defineEmits<{ start: [text: string] }>();
const lowercase = ref(false);
const error = ref('');
const length = computed(() => Array.from(text.value).length);
let fileRequest = 0;

async function upload(event: Event) {
  const element = event.target as HTMLInputElement;
  const file = element.files?.[0];
  element.value = '';
  if (!file) return;
  const request = ++fileRequest;
  error.value = '';
  try {
    if (file.size > 100_000) throw new Error('Choose a text file smaller than 100 KB.');
    const contents = await file.text();
    if (request !== fileRequest) return;
    if (Array.from(contents).length > MAX_CUSTOM_LENGTH) throw new Error('Use a text file with at most 10,000 characters.');
    text.value = contents;
  } catch (cause) {
    if (request === fileRequest) error.value = cause instanceof Error ? cause.message : 'The file could not be loaded.';
  }
}

function start() {
  error.value = '';
  try { emit('start', normalizePractice(text.value, lowercase.value)); }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Invalid practice text.'; }
}
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>Custom text</h1>
      <p>Practise anything: notes, code, an article. Curly quotes and dashes are converted to keys you can type,
        and line breaks become spaces. Your text is kept only while the app is open.</p>
    </header>

    <div class="card editor">
      <textarea v-model="text" :maxlength="MAX_CUSTOM_LENGTH" aria-label="Custom practice text"
        placeholder="Paste or type the text you want to practise…" spellcheck="false"></textarea>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="toolbar">
        <label class="btn btn-secondary file">
          <Icon name="upload" />Open .txt file<input type="file" accept=".txt,text/plain" @change="upload" />
        </label>
        <label class="switch">
          <input v-model="lowercase" type="checkbox" role="switch" />
          <span class="switch-track"></span><span class="switch-text">Lowercase</span>
        </label>
        <span class="count" :class="{ over: length > MAX_CUSTOM_LENGTH }">{{ length.toLocaleString() }} / {{ MAX_CUSTOM_LENGTH.toLocaleString() }}</span>
        <button class="btn btn-primary" :disabled="!text.trim()" @click="start">Start practice</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.editor { display: flex; flex-direction: column; gap: 14px; }

textarea {
  width: 100%;
  min-height: 300px;
  resize: vertical;
  padding: 16px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg);
  font-family: var(--font-mono);
  font-size: 0.95rem;
  line-height: 1.6;
}

textarea:focus-visible { outline-offset: 0; }

.toolbar { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
.file { position: relative; cursor: pointer; }
.file input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.file:focus-within { outline: 2px solid var(--accent); outline-offset: 2px; }
.switch { align-items: center; }
.count { margin-left: auto; color: var(--faint); font-size: 0.85rem; font-variant-numeric: tabular-nums; }
.count.over { color: var(--danger); }
.error { color: var(--danger); font-weight: 600; }
</style>
