<template>
  <div class="p-6">
    <!-- === Statistics Overview === -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="p-4 border rounded-lg shadow-sm">
        <div class="text-sm text-gray-500">{{ indvTask ? 'Total Subtasks' : 'Total Tasks' }}</div>
        <div class="text-2xl font-semibold">{{ totalTasks }}</div>
      </div>
      <div class="p-4 border rounded-lg shadow-sm">
        <div class="text-sm text-gray-500">In Progress</div>
        <div class="text-2xl font-semibold">{{ inProgressTasks }}</div>
      </div>
      <div class="p-4 border rounded-lg shadow-sm">
        <div class="text-sm text-gray-500">Overdue</div>
        <div class="text-2xl font-semibold text-red-600">{{ overdueTasks }}</div>
      </div>
      <div class="p-4 border rounded-lg shadow-sm">
        <div class="text-sm text-gray-500">Completion Rate</div>
        <div class="text-2xl font-semibold">{{ completionRate.toFixed(0) }}%</div>
      </div>
    </div>

    <!-- === Task Table === -->
    <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div class="flex flex-col space-y-1.5 p-6">
        <div class="flex items-center justify-between">
          <h3 class="text-2xl font-semibold leading-none tracking-tight">{{ indvTask ? 'Subtasks' : 'Tasks' }}</h3>
          <button 
            class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
            @click="$emit('createTask')"
          >
            <Plus class="w-4 h-4 mr-2" />
            {{ indvTask ? 'New Subtask' : 'New Task' }}
          </button>
        </div>
      </div>
  
      <table class="w-full border-collapse border text-sm" :class="indvTask ? 'bg-gray-50' : 'bg-white'">
  <thead>
    <tr class="bg-gray-100 text-left">
      <th class="p-2 border">{{ indvTask ? 'Subtask' : 'Task' }}</th>
      <!-- <th class="p-2 border">Task</th> -->
      <th class="p-2 border">Project</th>
      <th class="p-2 border">Creator</th>
      <th class="p-2 border">Assignees</th>
      <th class="p-2 border">Due Date</th>
      <th class="p-2 border">Status</th>
      <th class="p-2 border">Priority</th>
      <th class="p-2 border">Tags</th>
    </tr>
  </thead>

  <tbody>
  <tr
    v-for="task in tasks"
    :key="task.id"
    class="hover:bg-gray-50 cursor-pointer transition"
    :class="{ 'bg-red-50': task.isOverdue }"
    @click="goToTaskDetail(task.id)"
  >
    <!-- Task / Subtask Title -->
    <td class="p-2 border font-medium">{{ task.title || 'Untitled' }}</td>

    <!-- ✅ Project -->
    <td class="p-2 border text-gray-800">
      {{ task.projectTitle || 'No project' }}
    </td>

    <!-- ✅ Creator -->
    <td class="p-2 border text-gray-800">
      {{ task.creatorName || 'No creator' }}
    </td>

    <!-- ✅ Assignees -->
    <td class="p-2 border text-gray-800">
      <template v-if="Array.isArray(task.assigneeNames) && task.assigneeNames.length">
        <span v-for="(name, index) in task.assigneeNames.slice(0, 3)" :key="index">
          {{ name }}
          <span v-if="index < Math.min(task.assigneeNames.length, 3) - 1">, </span>
        </span>
        <span v-if="task.assigneeNames.length > 3">...</span>
      </template>
      <template v-else>
        <span class="text-gray-400 text-xs italic">No assignees</span>
      </template>
    </td>

    <!-- ✅ Due Date -->
    <td class="p-2 border" :class="getDateClasses(task)">
      {{ formatDate(task.deadline) }}
    </td>

    <!-- ✅ Status -->
    <td class="p-2 border">
      <span
        class="px-2 py-1 rounded text-white text-xs"
        :class="getStatusConfig(task.status).color"
      >
        {{ getStatusConfig(task.status).label }}
      </span>
    </td>

    <!-- ✅ Priority -->
    <td class="p-2 border">{{ task.priority || '—' }}</td>

    <!-- ✅ Tags -->
    <td class="p-2 border">
      <div class="flex flex-wrap gap-1">
        <template v-if="task.tags && task.tags.length">
          <span
            v-for="(tag, i) in task.tags"
            :key="i"
            class="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-700"
          >
            {{ tag }}
          </span>
        </template>
        <template v-else>
          <span class="text-gray-400 text-xs italic">No tags</span>
        </template>
      </div>
    </td>
  </tr>
  </tbody>

</table>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from 'lucide-vue-next'

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  indvTask: { type: Boolean, default: false }
})
defineEmits(['createTask'])

const router = useRouter()
const goToTaskDetail = (taskId) => {
  router.push('/all-tasks/'+taskId)
}

// === Stats ===
const totalTasks = computed(() => props.tasks.length)
const completedTasks = computed(() => props.tasks.filter(t => t.status === 'done').length)
const inProgressTasks = computed(() => props.tasks.filter(t => t.status === 'in-progress').length)
const overdueTasks = computed(() =>
  props.tasks.filter(t => t.isOverdue).length
)
const completionRate = computed(() =>
  totalTasks.value ? (completedTasks.value / totalTasks.value) * 100 : 0
)

// === Date helpers ===
// === Date conversion helper ===
const toJsDate = (value) => {
  if (!value) return null
  // Firestore Timestamp object
  if (typeof value?.toDate === 'function') return value.toDate()
  // Admin SDK timestamp
  if (typeof value === 'object') {
    const s = value.seconds ?? value._seconds
    const ns = value.nanoseconds ?? value._nanoseconds
    if (typeof s === 'number') {
      return new Date(s * 1000 + Math.floor((ns ?? 0) / 1e6))
    }
  }
  // ISO string or numeric timestamp
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return isNaN(d) ? null : d
  }
  if (value instanceof Date) return value
  return null
}

const formatDate = (date) => {
  const d = toJsDate(date)
  return d ? d.toLocaleDateString() : 'No due date'
}

const isTaskOverdue = (task) => {
  const d = toJsDate(task.deadline)
  return d && d < new Date() && task.status !== 'done'
}

const isTaskDueSoon = (task) => {
  const d = toJsDate(task.deadline)
  if (!d) return false
  const now = new Date()
  const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
  return d > now && d <= soon && task.status !== 'done'
}

const getDateClasses = (task) => {
  if (isTaskOverdue(task)) return 'text-red-600 font-semibold'
  if (isTaskDueSoon(task)) return 'text-yellow-600 font-semibold'
  return ''
}

const statusConfig = {
  todo: { label: 'To Do', color: 'bg-gray-500' },
  'in-progress': { label: 'In Progress', color: 'bg-blue-500' },
  review: { label: 'In Review', color: 'bg-yellow-500' },
  done: { label: 'Done', color: 'bg-green-500' },
}

const getStatusConfig = (status) => statusConfig[status] || { label: 'To Do', color: 'bg-gray-500' }
</script>
