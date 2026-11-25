<script setup lang="ts">
import type { View } from '../domain/models';
import type { IconName } from './icons';
import Icon from './Icon.vue';

/** `update` is the version of a newer release, or empty when there is none. */
defineProps<{ view: View; busy: boolean; streak: number; update: string }>();
const emit = defineEmits<{ navigate: [view: View] }>();
const sections: { view: View; label: string; icon: IconName }[] = [
  { view: 'learn', label: 'Learn', icon: 'learn' },
  { view: 'adaptive', label: 'Smart practice', icon: 'adaptive' },
  { view: 'test', label: 'Speed test', icon: 'test' },
  { view: 'custom', label: 'Custom text', icon: 'custom' },
  { view: 'stats', label: 'Statistics', icon: 'stats' },
  { view: 'settings', label: 'Settings', icon: 'settings' },
];
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <img class="brand-mark" src="/favicon.svg" alt="" />
      <span class="brand-name">Asdfy</span>
    </div>
    <nav class="nav" aria-label="Main">
      <button v-for="section in sections" :key="section.view" class="nav-item" :class="{ active: view === section.view }"
        :aria-current="view === section.view ? 'page' : undefined" :title="section.label" :disabled="busy"
        @click="emit('navigate', section.view)">
        <Icon :name="section.icon" /><span class="nav-label">{{ section.label }}</span>
      </button>
    </nav>
    <button v-if="update" class="nav-item update" :title="`Asdfy ${update} is available`" :disabled="busy"
      @click="emit('navigate', 'settings')">
      <Icon name="download" /><span class="nav-label">Update to {{ update }}</span>
    </button>
    <div class="streak" :class="{ lit: streak > 0 }" :title="`${streak}-day practice streak`">
      <Icon name="flame" /><span class="nav-label">{{ streak }} day streak</span>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px 14px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  min-height: 0;
}

.brand { display: flex; align-items: center; gap: 10px; padding: 4px 8px 18px; }

.brand-mark { width: 32px; height: 32px; flex: none; }

.brand-name { font-weight: 750; font-size: 1.1rem; letter-spacing: -0.02em; }

.nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 40px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  color: var(--muted);
  font-weight: 550;
  text-align: left;
  transition: background-color 0.15s, color 0.15s;
}

.nav-item:not(:disabled):hover { background: var(--surface-2); color: var(--text); }
.nav-item.active { background: var(--accent-soft); color: var(--accent-strong); }

.nav-item.update { color: var(--accent-strong); background: var(--accent-soft); }
.nav-item.update:not(:disabled):hover { color: var(--accent-strong); }

.streak {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: var(--faint);
  font-size: 0.85rem;
  font-weight: 600;
}

.streak.lit { color: var(--warning); }

@media (max-width: 960px) {
  .sidebar { padding-inline: 10px; align-items: center; }
  .brand { padding-inline: 0; }
  .brand-name, .nav-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  .nav-item, .streak { justify-content: center; padding: 0; width: 44px; height: 44px; }
}
</style>
