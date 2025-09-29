import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from './views/Dashboard.vue'
import MyTasks from './views/MyTasks.vue'
import Calendar from './views/Calendar.vue'
import Reports from './views/Reports.vue'
import Settings from './views/Settings.vue'
import Home from './views/Home.vue'
import About from './views/About.vue'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: Dashboard },
  { path: '/my-tasks', component: MyTasks },
  { path: '/calendar', component: Calendar },
  { path: '/reports', component: Reports },
  { path: '/settings', component: Settings },
  { path: '/home', component: Home },
  { path: '/about', component: About }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
