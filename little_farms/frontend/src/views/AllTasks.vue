<template>
  <div class="h-screen bg-background flex">
    <TaskSidebar
      :activeProject="activeProject"
      :projects="projects"
      @projectChange="setActiveProject"
      @createTask="() => setIsCreateModalOpen(true)"
    />

    <div class="flex-1 flex flex-col">
      <TaskHeader />

      <TaskList
        :tasks="filteredTasks"
        @taskClick="id => router.push({ name: 'TaskDetail', params: { id } })"
        @createTask="() => setIsCreateModalOpen(true)"
        :searchQuery="searchQuery"
        @searchChange="setSearchQuery"
        :statusFilter="statusFilter"
        @statusFilterChange="setStatusFilter"
        :priorityFilter="priorityFilter"
        @priorityFilterChange="setPriorityFilter"
      />
    </div>

    <CreateTaskModal
      :isOpen="isCreateModalOpen"
      @close="() => setIsCreateModalOpen(false)"
      @taskCreated="handleTaskCreated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import TaskSidebar from '../components/TaskSidebar.vue'
import TaskHeader from '../components/TaskHeader.vue'
import TaskList from '../components/TaskList.vue'
import CreateTaskModal from '../components/CreateTaskModal.vue'

const router = useRouter()

// --- State ---
const tasks = ref([])
const projects = ref([])
const activeProject = ref('all')
const searchQuery = ref('')
const statusFilter = ref('all')
const priorityFilter = ref('all')
const isCreateModalOpen = ref(false)
const currentUserId = ref(null)

// --- Fetch tasks from backend ---
const fetchTasks = async (userId) => {
  try {
    console.log('📡 Fetching tasks for user:', userId)
    const res = await fetch(`/api/tasks?userId=${userId}`)
    const data = await res.json()
    console.log('📦 Raw response:', data) // 👈 add this

    if (!data.success) throw new Error(data.message || 'Failed to fetch tasks')

    tasks.value = data.tasks || []
    console.log('✅ Loaded tasks:', tasks.value)
  } catch (err) {
    console.error('❌ Failed to load tasks:', err)
  }
}


// --- Filters ---
const filteredTasks = computed(() => {
  return tasks.value.filter(task => {
    const matchesProject =
      activeProject.value === 'all' ||
      task.projectId?.id?.toLowerCase?.().includes(activeProject.value)

    const matchesSearch =
      task.title?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesStatus =
      statusFilter.value === 'all' || task.status === statusFilter.value

    const matchesPriority =
      priorityFilter.value === 'all' || task.priority === priorityFilter.value

    return matchesProject && matchesSearch && matchesStatus && matchesPriority
  })
})

// --- Setters ---
const setActiveProject = (project) => activeProject.value = project
const setSearchQuery = (query) => searchQuery.value = query
const setStatusFilter = (status) => statusFilter.value = status
const setPriorityFilter = (priority) => priorityFilter.value = priority
const setIsCreateModalOpen = (open) => isCreateModalOpen.value = open

const handleTaskCreated = () => {
  console.log('🔄 Task created — reloading list')
  if (currentUserId.value) fetchTasks(currentUserId.value)
}

// --- On mount: wait for Firebase Auth and load tasks ---
onMounted(() => {
  const auth = getAuth()
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUserId.value = user.uid
      await fetchTasks(user.uid)
    } else {
      console.warn('⚠️ No user logged in, redirecting to login...')
      window.location.href = '/login'
    }
  })
})
</script>
