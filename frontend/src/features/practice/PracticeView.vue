<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import type { Lesson, Score } from '../../domain/models';
import TypingExercise from './TypingExercise.vue';
import KeyboardGuide from './KeyboardGuide.vue';

const props = defineProps<{ lesson: Lesson; enabled: boolean }>();
const emit = defineEmits<{ complete: [score: Score] }>();
const targetKey = ref(Array.from(props.lesson.content)[0] ?? '');
const activeKey = ref('');
function keydown(event: KeyboardEvent) {
  if (props.enabled && !event.ctrlKey && !event.metaKey && !event.altKey) activeKey.value = event.key;
}
function clearKey() { activeKey.value = ''; }
watch(() => props.enabled, clearKey);
onMounted(() => {
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', clearKey);
  window.addEventListener('blur', clearKey);
});
onUnmounted(() => {
  window.removeEventListener('keydown', keydown);
  window.removeEventListener('keyup', clearKey);
  window.removeEventListener('blur', clearKey);
});
</script>

<template>
  <div class="typing-section">
    <TypingExercise :target-text="lesson.content" :enabled="enabled" @complete="emit('complete', $event)" @target-change="targetKey = $event" />
  </div>
  <div class="visualizer-section"><KeyboardGuide :active-key="activeKey" :target-key="targetKey" /></div>
</template>
