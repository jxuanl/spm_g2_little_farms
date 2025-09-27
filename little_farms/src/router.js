import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../src/views/Dashboard.vue'
import Home from '../src/views/Home.vue'
import About from '../src/views/About.vue'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: Dashboard },
  { path: '/home', component: Home },
  { path: '/about', component: About }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
