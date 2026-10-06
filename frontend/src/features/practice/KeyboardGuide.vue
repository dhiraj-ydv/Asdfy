<script setup lang="ts">
import { computed } from 'vue';
import Hands from './Hands.vue';
import { layout, fingerColors, getFinger, physicalKey } from '../../domain/keyboard';

const props = defineProps<{
  activeKey?: string;
  targetKey?: string;
}>();

const targetFinger = computed(() => {
  if (!props.targetKey) return -1;
  return getFinger(props.targetKey);
});

const isKeyActive = (key: string) => {
  return physicalKey(props.activeKey ?? '') === key;
};

const isKeyTarget = (key: string) => {
  return physicalKey(props.targetKey ?? '') === key;
};
</script>

<template>
  <div class="keyboard-visualizer">
    <div class="keyboard-frame">
      <div class="keyboard-inner">
        <div v-for="(row, rowIndex) in layout" :key="rowIndex" class="keyboard-row">
          <div 
            v-for="key in row" 
            :key="key" 
            class="key-cap"
            :class="{ 
              active: isKeyActive(key), 
              target: isKeyTarget(key)
            }"
            :style="isKeyTarget(key) ? { '--finger-color': fingerColors[getFinger(key)] } : {}"
          >
            <span class="label">{{ key.toUpperCase() }}</span>
            <div class="finger-indicator" :style="{ background: fingerColors[getFinger(key)] }"></div>
          </div>
        </div>
        <div class="keyboard-row">
          <div 
            class="key-cap space-bar" 
            :class="{ active: isKeyActive(' '), target: isKeyTarget(' ') }"
            :style="isKeyTarget(' ') ? { '--finger-color': fingerColors[0] } : {}"
          >
            <span class="label">SPACE</span>
          </div>
        </div>
      </div>
    </div>

    <div class="hands-view">
      <Hands :targetFinger="targetFinger" />
    </div>
  </div>
</template>

<style scoped>
.keyboard-visualizer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px; /* Reduced gap */
}

.keyboard-frame {
  background: #1e293b;
  padding: 16px; /* Reduced padding */
  border-radius: 16px;
  box-shadow: 
    0 10px 25px -5px rgba(0,0,0,0.3),
    inset 0 2px 4px rgba(255,255,255,0.1);
}

.keyboard-inner {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.keyboard-row {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.key-cap {
  width: 42px; /* Slightly smaller keys */
  height: 42px;
  background: #334155;
  border-radius: 6px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 3px 0 #0f172a,
    0 4px 8px rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.05);
}

.key-cap .label {
  color: #94a3b8;
  font-weight: 700;
  font-size: 0.9rem;
}

.key-cap.active {
  transform: translateY(3px);
  box-shadow: 0 0 0 #0f172a;
  background: var(--primary-color);
}

.key-cap.active .label {
  color: white;
}

.key-cap.target {
  background: #475569;
  border: 2px solid var(--finger-color);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 3px 0 #0f172a, 0 0 0 0px var(--finger-color); }
  50% { box-shadow: 0 3px 0 #0f172a, 0 0 12px 1px var(--finger-color); }
  100% { box-shadow: 0 3px 0 #0f172a, 0 0 0 0px var(--finger-color); }
}

.space-bar {
  width: 280px; /* Smaller spacebar */
  margin-top: 3px;
}

.hands-view {
  opacity: 0.8;
  transform: scale(0.85); /* Scale down hands to fit */
  margin-top: -30px;
}

@media (max-height: 760px) {
  .keyboard-visualizer {
    gap: 6px;
  }

  .keyboard-frame {
    padding: 10px;
  }

  .key-cap {
    width: 38px;
    height: 38px;
  }

  .space-bar {
    width: 250px;
  }

  .hands-view {
    height: 125px;
    transform: scale(0.7);
    transform-origin: top center;
    margin-top: -20px;
  }
}
</style>
