<script setup lang="ts">
import { computed, reactive, ref, useTemplateRef } from 'vue';
import { loadNotices, type Notices } from '../../services/notices';
import Icon from '../../shell/Icon.vue';

const dialogEl = useTemplateRef<HTMLDialogElement>('dialog');
const state = ref<'idle' | 'loading' | 'ready' | 'missing' | 'error'>('idle');
const notices = ref<Notices | null>(null);
const query = ref('');
// License texts are only rendered for expanded entries; all of them together are several megabytes of DOM.
const expanded = reactive(new Set<string>());

const shown = computed(() => {
  const needle = query.value.trim().toLowerCase();
  const packages = notices.value?.packages ?? [];
  return needle ? packages.filter(pkg => `${pkg.name} ${pkg.license}`.toLowerCase().includes(needle)) : packages;
});

async function open() {
  dialogEl.value?.showModal();
  if (state.value !== 'idle' && state.value !== 'error') return;
  state.value = 'loading';
  try {
    notices.value = await loadNotices();
    state.value = notices.value ? 'ready' : 'missing';
  } catch {
    state.value = 'error';
  }
}

function toggle(key: string, event: Event) {
  if ((event.target as HTMLDetailsElement).open) expanded.add(key);
  else expanded.delete(key);
}
</script>

<template>
  <button class="btn btn-secondary" @click="open">Third-party licenses</button>
  <dialog ref="dialog" class="notices" aria-labelledby="notices-title" @click.self="dialogEl?.close()">
    <div class="notices-body">
      <header>
        <h2 id="notices-title">Third-party licenses</h2>
        <button class="icon-btn" aria-label="Close" @click="dialogEl?.close()"><Icon name="close" /></button>
      </header>
      <p class="muted">Asdfy is built with the open-source software listed here. Each entry shows the license it is
        used under and the license and notice files it is distributed with.</p>
      <p v-if="state === 'loading'" role="status">Loading…</p>
      <p v-else-if="state === 'missing'" class="muted">License notices are added when Asdfy is packaged. This
        development build does not include them.</p>
      <p v-else-if="state === 'error'" class="error" role="alert">The license notices could not be loaded.</p>
      <template v-else-if="notices">
        <input v-model="query" type="search" class="filter" placeholder="Filter by name or license"
          aria-label="Filter packages" />
        <p class="muted count">{{ shown.length }} of {{ notices.packages.length }} packages</p>
        <ul>
          <li v-for="pkg in shown" :key="`${pkg.source}:${pkg.name}@${pkg.version}`">
            <details @toggle="toggle(`${pkg.source}:${pkg.name}@${pkg.version}`, $event)">
              <summary><strong>{{ pkg.name }}</strong> <span class="muted">{{ pkg.version }}</span>
                <span class="license">{{ pkg.license }}</span></summary>
              <template v-if="expanded.has(`${pkg.source}:${pkg.name}@${pkg.version}`)">
                <p class="muted source">{{ pkg.source === 'crate' ? 'Rust crate' : 'npm package' }} ·
                  <span class="url">{{ pkg.repository }}</span></p>
                <pre v-for="id in pkg.texts" :key="id">{{ notices.texts[id] }}</pre>
                <p v-if="!pkg.texts.length" class="muted">This package is published without a license file. Its
                  license, {{ pkg.license }}, is stated in its package metadata.</p>
              </template>
            </details>
          </li>
        </ul>
      </template>
    </div>
  </dialog>
</template>

<style scoped>
.notices {
  width: min(760px, calc(100vw - 32px));
  max-height: calc(100vh - 64px);
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow);
}
.notices::backdrop { background: rgba(0, 0, 0, 0.45); }
.notices-body { display: flex; flex-direction: column; gap: 12px; padding: 20px 24px 24px; }
header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.filter {
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
}
.count { font-size: 0.85rem; }
ul { list-style: none; margin: 0; padding: 0; }
li { border-top: 1px solid var(--border); }
summary { padding: 8px 0; cursor: pointer; }
.license { float: right; margin-left: 12px; color: var(--muted); font-size: 0.85rem; }
.source { font-size: 0.85rem; margin-bottom: 8px; }
.url { word-break: break-all; }
pre {
  margin: 0 0 10px;
  padding: 12px;
  max-height: 320px;
  overflow: auto;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  white-space: pre-wrap;
  word-break: break-word;
}
.error { color: var(--danger); font-weight: 600; }
</style>
