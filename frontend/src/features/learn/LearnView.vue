<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue';
import type { Lesson, LessonBest, LessonKind } from '../../domain/models';
import { PASS_ACCURACY } from '../../domain/models';
import Icon from '../../shell/Icon.vue';

const props = defineProps<{ lessons: Lesson[]; bests: LessonBest[]; passed: Set<number>; upNext: Lesson | null; firstRun: boolean }>();
const emit = defineEmits<{ start: [lesson: Lesson]; practice: [] }>();
const startButton = useTemplateRef<HTMLButtonElement>('start-button');

const KIND_LABELS: Record<LessonKind, string> = {
  keys: 'New keys', words: 'Review', caps: 'Capitals', punctuation: 'Punctuation', numbers: 'Numbers', text: 'Passage',
};

const bestById = computed(() => new Map(props.bests.map(best => [best.lesson_id, best])));
const stages = computed(() => {
  const groups: { name: string; lessons: Lesson[] }[] = [];
  for (const lesson of props.lessons) {
    const last = groups.at(-1);
    if (last?.name === lesson.stage) last.lessons.push(lesson);
    else groups.push({ name: lesson.stage, lessons: [lesson] });
  }
  return groups;
});
const passedCount = computed(() => props.lessons.filter(lesson => props.passed.has(lesson.id)).length);
const percent = computed(() => props.lessons.length ? Math.round(passedCount.value / props.lessons.length * 100) : 0);

function status(lesson: Lesson): string {
  if (props.passed.has(lesson.id)) return 'passed';
  if (lesson.id === props.upNext?.id) return 'current';
  return bestById.value.has(lesson.id) ? 'tried' : 'new';
}

function bestLabel(lesson: Lesson): string {
  const best = bestById.value.get(lesson.id);
  return best ? `${Math.round(best.best_wpm)} wpm · ${Math.round(best.best_accuracy)}%` : 'Not started';
}

function begin() {
  if (props.upNext) emit('start', props.upNext);
  else emit('practice');
}

onMounted(() => startButton.value?.focus());
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>Learn to touch type</h1>
      <p>Each lesson adds a few keys and drills real words made only from letters you already know.
        Finish with {{ PASS_ACCURACY }}% accuracy to pass.</p>
    </header>

    <div v-if="firstRun" class="callout">
      <Icon name="keyboard" />
      <p><strong>Rest your fingers on the home row.</strong> Left fingers on A S D F, right fingers on J K L ;,
        thumbs on Space. The F and J keys have small bumps so you can find them without looking.</p>
    </div>

    <div class="hero card">
      <div class="hero-text">
        <p class="eyebrow">{{ upNext ? 'Up next' : 'Course complete' }}</p>
        <h2>{{ upNext?.title ?? 'Every lesson passed' }}</h2>
        <p class="muted">{{ upNext ? `${upNext.stage} · ${KIND_LABELS[upNext.kind]}` : 'Keep building speed with smart practice.' }}</p>
        <div v-if="upNext?.keys" class="key-row">
          <span v-for="key in upNext.keys" :key="key" class="keycap large">{{ key }}</span>
        </div>
      </div>
      <div class="hero-side">
        <div class="meter" role="progressbar" aria-label="Course progress" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="percent">
          <span :style="{ width: `${percent}%` }"></span>
        </div>
        <p class="muted">{{ passedCount }} of {{ lessons.length }} lessons passed</p>
        <button ref="start-button" class="btn btn-primary btn-lg" @click="begin">
          {{ upNext ? (bestById.has(upNext.id) ? 'Continue lesson' : 'Start lesson') : 'Smart practice' }}
        </button>
      </div>
    </div>

    <section v-for="(stage, index) in stages" :key="stage.name" class="stage" :aria-labelledby="`stage-${index}`">
      <h2 :id="`stage-${index}`" class="stage-title">
        <span class="stage-number">{{ index + 1 }}</span>{{ stage.name }}
        <span class="stage-count">{{ stage.lessons.filter(lesson => passed.has(lesson.id)).length }}/{{ stage.lessons.length }}</span>
      </h2>
      <ol class="lessons">
        <li v-for="lesson in stage.lessons" :key="lesson.id">
          <button class="lesson" :class="status(lesson)" @click="emit('start', lesson)">
            <span class="lesson-status" aria-hidden="true"><Icon v-if="passed.has(lesson.id)" name="check" /></span>
            <span class="lesson-body">
              <span class="lesson-kind">{{ KIND_LABELS[lesson.kind] }}</span>
              <span class="lesson-title">{{ lesson.title }}</span>
            </span>
            <span class="lesson-best">{{ bestLabel(lesson) }}</span>
          </button>
        </li>
      </ol>
    </section>
  </section>
</template>

<style scoped>
.callout p { color: var(--text); }

.hero {
  display: flex;
  justify-content: space-between;
  gap: 32px;
  padding: 28px;
  background:
    radial-gradient(circle at 100% 0%, var(--accent-soft), transparent 55%),
    var(--surface);
}

.hero-text { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.hero-text h2 { font-size: 1.6rem; letter-spacing: -0.02em; }
.hero-text .key-row { margin-top: 8px; }
.hero-side { display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-end; gap: 10px; min-width: 220px; }
.hero-side p { font-size: 0.85rem; }

.meter { width: 100%; height: 8px; border-radius: 4px; background: var(--surface-3); overflow: hidden; }
.meter span { display: block; height: 100%; border-radius: 4px; background: var(--accent); }

.stage { display: flex; flex-direction: column; gap: 12px; }
.stage-title { display: flex; align-items: center; gap: 10px; }

.stage-number {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: var(--surface-3);
  font-size: 0.78rem;
  font-weight: 700;
}

.stage-count { margin-left: auto; color: var(--faint); font-size: 0.85rem; font-weight: 600; }

.lessons {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}

.lesson {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--border);
  text-align: left;
  transition: border-color 0.15s;
}

.lesson:hover { border-color: var(--border-strong); }
.lesson.current { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }

.lesson-status {
  display: grid;
  place-items: center;
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid var(--border-strong);
}

.lesson.tried .lesson-status { border-color: var(--warning); }
.lesson.current .lesson-status { border-color: var(--accent); }
.lesson.passed .lesson-status { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
.lesson-status .icon { width: 14px; height: 14px; stroke-width: 3; }

.lesson-body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.lesson-kind { font-size: 0.72rem; font-weight: 650; text-transform: uppercase; letter-spacing: 0.06em; color: var(--faint); }
.lesson-title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lesson-best { flex: none; font-size: 0.8rem; color: var(--muted); font-variant-numeric: tabular-nums; }

@media (max-width: 760px) {
  .hero { flex-direction: column; }
  .hero-side { align-items: stretch; }
}
</style>
