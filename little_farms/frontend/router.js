import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from './src/views/Dashboard.vue'
import MyTasks from './src/views/MyTasks.vue'
import Calendar from './src/views/Calendar.vue'
import Reports from './src/views/Reports.vue'
import Settings from './src/views/Settings.vue'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: Dashboard },
  { path: '/my-tasks', component: MyTasks },
  { path: '/calendar', component: Calendar },
  { path: '/reports', component: Reports },
  { path: '/settings', component: Settings },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
