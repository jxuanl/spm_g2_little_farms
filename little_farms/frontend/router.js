import { createRouter, createWebHistory } from 'vue-router'
import AllTasks from './src/views/AllTasks.vue'
import TaskDetail from './src/views/TaskDetail.vue';
import MyTasks from './src/views/MyTasks.vue'
import Calendar from './src/views/Calendar.vue'
import Reports from './src/views/Reports.vue'
import Settings from './src/views/Settings.vue'
import login from './src/views/LoginPage.vue'
import Project from './src/views/Project.vue'


const routes = [
  { path: '/', redirect: '/all-tasks' },
  { path: '/all-tasks', component: AllTasks },
  { path: '/my-tasks', component: MyTasks },
  { path: '/all-tasks/:id', name: 'TaskDetail', component: TaskDetail },
  { path: '/calendar', component: Calendar },
  { path: '/reports', component: Reports },
  { path: '/settings', component: Settings },
  { path: '/login', component: login },
  { path: '/projects', component: Project },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
