<script setup lang="ts">
import { ref } from 'vue';
import { MAX_CUSTOM_LENGTH } from '../../domain/models';

const emit = defineEmits<{ start: [text: string] }>();
const text = ref('');
const error = ref('');
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
    if (contents.length > MAX_CUSTOM_LENGTH) throw new Error('Use a text file with at most 10,000 characters.');
    text.value = contents;
  } catch (cause) {
    if (request === fileRequest) error.value = cause instanceof Error ? cause.message : 'The file could not be loaded.';
  }
}
</script>

<template>
  <div class="custom-view-content">
    <div class="card full-height-card">
      <h2>Custom Practice</h2><p>Paste text or upload a file to begin.</p>
      <p v-if="error" role="alert" class="error-message">{{ error }}</p>
      <textarea v-model="text" :maxlength="MAX_CUSTOM_LENGTH" aria-label="Custom practice text" placeholder="Paste your text here..." class="custom-textarea flex-grow"></textarea>
      <div class="upload-actions">
        <label class="file-label">📁 Upload .txt <input type="file" accept=".txt" @change="upload" /></label>
        <button :disabled="!text.trim()" @click="emit('start', text)">Start Practice</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-view-content { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 20px; }
.full-height-card { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 10px; }
.flex-grow { flex: 1; }
.custom-textarea { width: 100%; background: var(--bg-color); color: white; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; margin-bottom: 15px; min-height: 200px; }
.upload-actions { display: flex; justify-content: space-between; align-items: center; }
.file-label { cursor: pointer; color: var(--primary-color); font-weight: 600; }
.file-label input { width: 1px; height: 1px; opacity: 0; position: absolute; }
.error-message { color: var(--error-color); }
</style>
