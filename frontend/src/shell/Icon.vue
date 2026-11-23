<script setup lang="ts">
import type { IconName } from './icons';
import { ICONS } from './icons';

defineProps<{ name: IconName }>();
</script>

<template>
  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path :d="ICONS[name]" />
  </svg>
</template>
