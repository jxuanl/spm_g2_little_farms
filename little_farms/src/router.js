import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../src/views/Dashboard.vue'
import MyTasks from '../src/views/MyTasks.vue'
import Calendar from '../src/views/Calendar.vue'
import Reports from '../src/views/Reports.vue'
import Settings from '../src/views/Settings.vue'
import Home from '../src/views/Home.vue'
import About from '../src/views/About.vue'
import login from '../src/views/LoginPage.vue'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: Dashboard },
  { path: '/my-tasks', component: MyTasks },
  { path: '/calendar', component: Calendar },
  { path: '/reports', component: Reports },
  { path: '/settings', component: Settings },
  { path: '/home', component: Home },
  { path: '/about', component: About },
  { path: '/login', component: login }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
