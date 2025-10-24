import { createRouter, createWebHistory } from 'vue-router'
import MyTasks from './src/views/MyTasks.vue'
import Calendar from './src/views/Calendar.vue'
import Reports from './src/views/Reports.vue'
import Settings from './src/views/Settings.vue'
import login from './src/views/LoginPage.vue'
import Project from './src/views/Project.vue'
import AllTasks from './src/views/AllTasks.vue'
import TaskDetail from './src/views/TaskDetail.vue';
import ProjectDetail from './src/views/ProjectDetail.vue'
import Timeline from './src/views/Timeline.vue';
import generateReport from './src/views/GenerateReport.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/all-tasks', name: 'AllTasks', component: AllTasks }, 
  { path: '/my-tasks', name: 'MyTasks', component: MyTasks }, 
  { path: '/all-tasks/:id', name: 'TaskDetail', component: TaskDetail, props: true },
  { path: '/all-tasks/:id/:subtaskId', name: 'SubtaskDetail', component: TaskDetail },
  { path: '/calendar', name: 'Calendar', component: Calendar }, 
  { path: '/reports', name: 'Reports', component: Reports }, 
  { path: '/settings', name: 'Settings', component: Settings }, 
  { path: '/login', name: 'Login', component: login }, 
  { path: '/projects', name: 'Projects', component: Project }, 
  { path: '/projects/:id', name: 'ProjectDetail', component: ProjectDetail, props: true },
  { path: '/timeline/', name: 'Timeline', component: Timeline, props: true },
  { path: '/generateReport', component: generateReport },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router