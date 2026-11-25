import { createApp } from 'vue'
import './styles/base.css'
import App from './App.vue'
import { applySettings } from './services/settings'
import { initLighting } from './services/lighting'
import { lockWebview } from './services/webview'

lockWebview()
applySettings()
initLighting()
createApp(App).mount('#app')
