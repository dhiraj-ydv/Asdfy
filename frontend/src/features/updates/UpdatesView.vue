<script setup lang="ts">
defineProps<{ version: string; error: string }>();
</script>

<template>
  <div class="history-view-content"><div class="card">
    <h2>Updates</h2><p v-if="version">Installed version: {{ version }}</p>
    <p v-if="error" class="update-error" role="alert">{{ error }}</p>
    <p class="update-note">Update by installing the newer typedh .flatpak bundle file from GitHub Releases. Your lessons and progress are kept.</p>
  </div></div>
</template>

<style scoped>
.history-view-content { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 20px; }
.update-error { color: var(--error-color); font-weight: 600; }
.update-note { font-size: 0.8rem; color: var(--text-muted); margin-top: 15px; }
</style>
