<script setup lang="ts">
import { computed } from 'vue';
import { settings } from '../../services/settings';
import { connectLighting, lighting } from '../../services/lighting';
import type { Updates } from '../../composables/useUpdates';
import Icon from '../../shell/Icon.vue';
import LicenseNotices from './LicenseNotices.vue';

const props = defineProps<{ version: string; error: string; dataLocation: string; update: Updates['update'] }>();
const emit = defineEmits<{ control: [action: 'restart' | 'close']; check: []; install: []; restart: [] }>();
const lightingText = computed(() => ({
  off: '',
  connecting: 'Connecting to OpenRGB…',
  on: `Connected to ${lighting.device} (${lighting.keys} keys).`,
  error: lighting.message,
})[lighting.state]);
const updateText = computed(() => {
  const { state, version, progress } = props.update;
  if (state === 'checking') return 'Checking for updates…';
  if (state === 'current') return 'You have the latest version.';
  if (state === 'downloading') return `Downloading Asdfy ${version}…${progress === null ? '' : ` ${Math.round(progress * 100)}%`}`;
  if (state === 'installed') return `Asdfy ${version} is installed. Restart to start using it.`;
  return '';
});
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>Settings</h1>
      <p>Preferences apply immediately and are remembered on this computer.</p>
    </header>

    <div class="card section">
      <h2>Appearance</h2>
      <fieldset class="field">
        <legend>Theme</legend>
        <div class="segmented">
          <label v-for="theme in (['system', 'light', 'dark'] as const)" :key="theme">
            <input v-model="settings.theme" type="radio" name="theme" :value="theme" /><span>{{ theme[0]!.toUpperCase() + theme.slice(1) }}</span>
          </label>
        </div>
      </fieldset>
      <fieldset class="field">
        <legend>Typing text size</legend>
        <div class="segmented">
          <label v-for="size in (['small', 'medium', 'large'] as const)" :key="size">
            <input v-model="settings.textSize" type="radio" name="size" :value="size" /><span>{{ size[0]!.toUpperCase() + size.slice(1) }}</span>
          </label>
        </div>
      </fieldset>
    </div>

    <div class="card section">
      <h2>Practice</h2>
      <label class="switch">
        <input v-model="settings.stopOnError" type="checkbox" role="switch" />
        <span class="switch-track"></span>
        <span class="switch-text">Stop on errors<small>The cursor waits until you type the correct key. Mistakes still count.</small></span>
      </label>
      <label class="switch">
        <input v-model="settings.showKeyboard" type="checkbox" role="switch" />
        <span class="switch-track"></span>
        <span class="switch-text">Show keyboard<small>Highlights the next key, coloured by the finger that types it.</small></span>
      </label>
      <label class="switch">
        <input v-model="settings.showHands" type="checkbox" role="switch" />
        <span class="switch-track"></span>
        <span class="switch-text">Show finger guide<small>Shows which finger to use, including the Shift pinky.</small></span>
      </label>
    </div>

    <div class="card section">
      <h2>Keyboard backlight</h2>
      <label class="switch">
        <input v-model="settings.keyboardLighting" type="checkbox" role="switch" />
        <span class="switch-track"></span>
        <span class="switch-text">Light the next key on my keyboard<small>Needs a per-key RGB keyboard that OpenRGB
          supports, with OpenRGB running and its SDK server on (port 6742). Only this computer is contacted.</small></span>
      </label>
      <p v-if="lightingText" class="lighting-status" :class="lighting.state" role="status">{{ lightingText }}</p>
      <button v-if="settings.keyboardLighting && lighting.state === 'error'" class="btn btn-secondary retry"
        @click="connectLighting">Try again</button>
    </div>

    <div class="card section">
      <h2>Keyboard layout</h2>
      <p class="muted">Lessons and the on-screen keyboard use the US QWERTY layout. Asdfy checks the characters
        your keyboard produces and does not change your system layout, so set it to English (US) for the guides to match.</p>
    </div>

    <div class="card section">
      <h2>About and updates</h2>
      <p v-if="version">Asdfy version {{ version }}</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div v-if="update.state === 'available'" class="callout update">
        <Icon name="download" />
        <div>
          <strong>Asdfy {{ update.version }} is available.</strong>
          <p v-if="update.notes" class="notes">{{ update.notes }}</p>
          <p v-if="!update.installable" class="muted">This copy of Asdfy cannot update itself. Download the new
            version from GitHub Releases and install it over this one.</p>
        </div>
      </div>
      <p v-if="updateText" role="status">{{ updateText }}</p>
      <progress v-if="update.state === 'downloading'" :value="update.progress ?? undefined" max="1"
        aria-label="Update download"></progress>
      <p v-if="update.message" class="error" role="alert">{{ update.message }}</p>
      <div class="controls">
        <button v-if="update.state === 'available' && update.installable" class="btn btn-primary" @click="emit('install')">
          <Icon name="download" />Update now</button>
        <button v-else-if="update.state === 'installed'" class="btn btn-primary" @click="emit('restart')">
          <Icon name="restart" />Restart now</button>
        <button v-else class="btn btn-secondary" :disabled="update.state === 'checking' || update.state === 'downloading'"
          @click="emit('check')">Check for updates</button>
      </div>
      <label class="switch">
        <input v-model="settings.checkForUpdates" type="checkbox" role="switch" />
        <span class="switch-track"></span>
        <span class="switch-text">Check for updates at startup<small>Asks GitHub whether a newer release exists. Updates
          are verified against Asdfy's signing key before they are installed, and lessons and progress are kept.</small></span>
      </label>
      <p v-if="dataLocation" class="muted">Progress is stored in <code>{{ dataLocation }}</code>. Quit the app before
        copying that folder as a backup.</p>
      <p class="muted">Asdfy is free software under the Apache License 2.0 and includes open-source components
        under their own licenses.</p>
      <div class="controls"><LicenseNotices /></div>
      <div class="controls">
        <button class="btn btn-secondary" @click="emit('control', 'restart')"><Icon name="restart" />Restart app</button>
        <button class="btn btn-ghost btn-danger" @click="emit('control', 'close')"><Icon name="power" />Quit app</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section { display: flex; flex-direction: column; gap: 18px; }
.section > p { max-width: 70ch; }
code { font-size: 0.85em; padding: 1px 5px; border-radius: 4px; background: var(--surface-2); word-break: break-all; }
.controls { display: flex; gap: 10px; flex-wrap: wrap; }
.error { color: var(--danger); font-weight: 600; }
.lighting-status { font-size: 0.9rem; color: var(--muted); }
.lighting-status.on { color: var(--accent-strong); font-weight: 600; }
.lighting-status.error { color: var(--danger); }
.retry { width: fit-content; }
.notes { margin-top: 6px; white-space: pre-line; }
progress { width: 100%; max-width: 420px; accent-color: var(--accent); }
</style>
