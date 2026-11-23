import { createApp } from 'vue'
import './styles/base.css'
import App from './App.vue'
import { applySettings } from './services/settings'

applySettings()
createApp(App).mount('#app')
