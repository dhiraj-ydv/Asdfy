<script setup lang="ts">
import { computed, reactive, ref, useTemplateRef } from 'vue';
import { loadNotices, type NoticePackage, type Notices } from '../../services/notices';
import Icon from '../../shell/Icon.vue';

const dialogEl = useTemplateRef<HTMLDialogElement>('dialog');
const state = ref<'idle' | 'loading' | 'ready' | 'missing' | 'error'>('idle');
const notices = ref<Notices | null>(null);
const query = ref('');
// License texts are only rendered for expanded entries; all of them together are several megabytes of DOM.
// The set also drives each entry's open state, so an entry filtered out and back in keeps it.
const expanded = reactive(new Set<string>());
const sources: Record<NoticePackage['source'], string> = {
  app: 'This app', crate: 'Rust crate', npm: 'npm package', bundled: 'C library compiled into Asdfy',
};
const keyOf = (pkg: NoticePackage) => `${pkg.source}:${pkg.name}@${pkg.version}`;

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

function toggle(pkg: NoticePackage, event: Event) {
  const key = keyOf(pkg);
  if ((event.target as HTMLDetailsElement).open) expanded.add(key);
  else expanded.delete(key);
}
</script>

<template>
  <button class="btn btn-secondary" @click="open">Licenses and notices</button>
  <dialog ref="dialog" class="notices" aria-labelledby="notices-title" @click.self="dialogEl?.close()">
    <div class="notices-body">
      <header>
        <h2 id="notices-title">Licenses and notices</h2>
        <button class="icon-btn" aria-label="Close" @click="dialogEl?.close()"><Icon name="close" /></button>
      </header>
      <p class="muted">Asdfy's own license and notice come first, followed by the open-source software it is built
        with. Each entry shows the license it is used under and the license and notice files it is distributed with.</p>
      <p v-if="state === 'loading'" role="status">Loading…</p>
      <p v-else-if="state === 'missing'" class="muted">License notices are added when Asdfy is packaged. This
        development build does not include them.</p>
      <p v-else-if="state === 'error'" class="error" role="alert">The license notices could not be loaded.</p>
      <template v-else-if="notices">
        <input v-model="query" type="search" class="filter" placeholder="Filter by name or license"
          aria-label="Filter packages" />
        <p class="muted count">{{ shown.length }} of {{ notices.packages.length }} packages</p>
        <ul>
          <li v-for="pkg in shown" :key="keyOf(pkg)">
            <details :open="expanded.has(keyOf(pkg))" @toggle="toggle(pkg, $event)">
              <summary>
                <span class="name"><strong>{{ pkg.name }}</strong> <span class="muted">{{ pkg.version }}</span></span>
                <span class="license">{{ pkg.license }}</span>
              </summary>
              <template v-if="expanded.has(keyOf(pkg))">
                <p class="muted source">{{ sources[pkg.source] }} · <span class="url">{{ pkg.repository }}</span></p>
                <p v-if="pkg.standardText" class="muted source">This package is published without a license file, so
                  the standard text of each license it names is shown, with its authors as the copyright holders.</p>
                <pre v-for="id in pkg.texts" :key="id">{{ notices.texts[id] }}</pre>
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
summary {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 12px;
  padding: 8px 0 8px 20px;
  list-style: none;
  cursor: pointer;
}
summary::-webkit-details-marker { display: none; }
summary::before {
  content: '';
  position: absolute;
  left: 3px;
  top: 15px;
  width: 6px;
  height: 6px;
  border-right: 2px solid var(--muted);
  border-bottom: 2px solid var(--muted);
  transform: rotate(-45deg);
}
details[open] > summary::before { transform: rotate(45deg); }
.name { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
/* Long expressions such as "Apache-2.0 WITH LLVM-exception OR …" wrap onto their own right-aligned line. */
.license { margin-left: auto; max-width: 100%; text-align: right; overflow-wrap: anywhere; color: var(--muted);
  font-size: 0.85rem; }
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
