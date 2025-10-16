import { createApp } from 'vue'
import './index.css'
import App from './App.vue'
import router from './router'
import './firebase'
import './webSocket'

createApp(App).use(router).mount('#app')