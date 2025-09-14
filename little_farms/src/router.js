import { createRouter, createWebHistory } from 'vue-router'
//This is all fake and just a template for reference:)
import Home from '../src/views/Home.vue'
import About from '../src/views/About.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
