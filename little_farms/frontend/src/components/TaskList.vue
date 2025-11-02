<template>
  <div class="p-6">
    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center h-96">
      <div class="text-muted-foreground">Loading Tasks...</div>
    </div>

    <!-- Main content -->
    <template v-else>
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

      <!-- === Filters === -->
      <div class="flex flex-wrap items-center gap-4 mb-6" @click="closeAllDropdowns">
        <!-- Project Filter -->
        <div class="relative inline-block text-left" @click.stop>
          <button
            @click="toggleDropdown('project')"
            class="flex h-9 w-56 items-center justify-between whitespace-nowrap rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50 transition-colors"
          >
            <span class="truncate">
              {{ selectedProjects.length === 0 ? 'All Projects' : selectedProjects.length === 1 ? selectedProjects[0] : `${selectedProjects.length} Projects` }}
            </span>
            <ChevronDown class="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
          </button>
          <div
            v-if="dropdownStates.project"
            class="relative top-full left-0 mt-1 z-50 w-56 rounded-md border border-gray-300 shadow-lg max-h-64 overflow-y-auto bg-white"
          >
            <div class="p-2">
              <button
                v-for="project in projectOptions"
                :key="project"
                type="button"
                @click="toggleSelection('project', project)"
                :class="[
                  'w-full text-left px-2 py-1.5 text-sm rounded-sm flex items-center justify-between',
                  selectedProjects.includes(project)
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                ]"
              >
                <span>{{ project }}</span>
                <Check v-if="selectedProjects.includes(project)" class="h-4 w-4" />
              </button>
            </div>
            <div class="border-t border-gray-200 p-2">
              <button
                @click="clearFilter('project')"
                class="w-full text-sm text-blue-600 hover:underline text-center py-1"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <!-- Creator Filter -->
        <div class="relative inline-block text-left" @click.stop>
          <button
            @click="toggleDropdown('creator')"
            class="flex h-9 w-56 items-center justify-between whitespace-nowrap rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50 transition-colors"
          >
            <span class="truncate">
              {{ selectedCreators.length === 0 ? 'All Creators' : selectedCreators.length === 1 ? selectedCreators[0] : `${selectedCreators.length} Creators` }}
            </span>
            <ChevronDown class="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
          </button>
          <div
            v-if="dropdownStates.creator"
            class="relative top-full left-0 mt-1 z-50 w-56 rounded-md border border-gray-300 bg-white shadow-lg max-h-64 overflow-y-auto"
          >
            <div class="p-2">
              <button
                v-for="creator in creatorOptions"
                :key="creator"
                type="button"
                @click="toggleSelection('creator', creator)"
                :class="[
                  'w-full text-left px-2 py-1.5 text-sm rounded-sm flex items-center justify-between',
                  selectedCreators.includes(creator)
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                ]"
              >
                <span>{{ creator }}</span>
                <Check v-if="selectedCreators.includes(creator)" class="h-4 w-4" />
              </button>
            </div>
            <div class="border-t border-gray-200 p-2">
              <button
                @click="clearFilter('creator')"
                class="w-full text-sm text-blue-600 hover:underline text-center py-1"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <!-- Assignee Filter -->
        <div class="relative inline-block text-left" @click.stop>
          <button
            @click="toggleDropdown('assignee')"
            class="flex h-9 w-56 items-center justify-between whitespace-nowrap rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50 transition-colors"
          >
            <span class="truncate">
              {{ selectedAssignees.length === 0 ? 'All Assignees' : selectedAssignees.length === 1 ? selectedAssignees[0] : `${selectedAssignees.length} Assignees` }}
            </span>
            <ChevronDown class="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
          </button>
          <div
            v-if="dropdownStates.assignee"
            class="relative top-full left-0 mt-1 z-50 w-56 rounded-md border border-gray-300 bg-white shadow-lg max-h-64 overflow-y-auto"
          >
            <div class="p-2">
              <button
                v-for="assignee in assigneeOptions"
                :key="assignee"
                type="button"
                @click="toggleSelection('assignee', assignee)"
                :class="[
                  'w-full text-left px-2 py-1.5 text-sm rounded-sm flex items-center justify-between',
                  selectedAssignees.includes(assignee)
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                ]"
              >
                <span>{{ assignee }}</span>
                <Check v-if="selectedAssignees.includes(assignee)" class="h-4 w-4" />
              </button>
            </div>
            <div class="border-t border-gray-200 p-2">
              <button
                @click="clearFilter('assignee')"
                class="w-full text-sm text-blue-600 hover:underline text-center py-1"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <!-- Due Date Filter -->
        <div class="relative inline-block text-left" @click.stop>
          <button
            @click="toggleDropdown('dueDate')"
            class="flex h-9 w-56 items-center justify-between whitespace-nowrap rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50 transition-colors"
          >
            <span class="truncate">{{ selectedDueDate }}</span>
            <ChevronDown class="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
          </button>
          <div
            v-if="dropdownStates.dueDate"
            class="relative top-full left-0 mt-1 z-50 w-56 rounded-md border border-gray-300 bg-white shadow-lg"
          >
            <div class="p-2">
              <button
                v-for="option in dueDateOptions"
                :key="option"
                type="button"
                @click="selectDueDate(option)"
                :class="[
                  'w-full text-left px-2 py-1.5 text-sm rounded-sm',
                  selectedDueDate === option
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                ]"
              >
                {{ option }}
              </button>
            </div>
          </div>
        </div>

        <!-- Status Filter -->
        <div class="relative inline-block text-left" @click.stop>
          <button
            @click="toggleDropdown('status')"
            class="flex h-9 w-56 items-center justify-between whitespace-nowrap rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50 transition-colors"
          >
            <span class="truncate">
              {{ selectedStatuses.length === 0 ? 'All Statuses' : selectedStatuses.length === 1 ? statusConfig[selectedStatuses[0]].label : `${selectedStatuses.length} Statuses` }}
            </span>
            <ChevronDown class="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
          </button>
          <div
            v-if="dropdownStates.status"
            class="relative top-full left-0 mt-1 z-50 w-56 rounded-md border border-gray-300 bg-white shadow-lg"
          >
            <div class="p-2">
              <button
                v-for="status in statusOptions"
                :key="status"
                type="button"
                @click="toggleSelection('status', status)"
                :class="[
                  'w-full text-left px-2 py-1.5 text-sm rounded-sm flex items-center justify-between',
                  selectedStatuses.includes(status)
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                ]"
              >
                <span>{{ statusConfig[status].label }}</span>
                <Check v-if="selectedStatuses.includes(status)" class="h-4 w-4" />
              </button>
            </div>
            <div class="border-t border-gray-200 p-2">
              <button
                @click="clearFilter('status')"
                class="w-full text-sm text-blue-600 hover:underline text-center py-1"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <!-- Priority Filter -->
        <div class="p-3 w-64 border rounded-md bg-white shadow-sm" @click.stop>
          <Slider
            v-model="selectedPriority"
            :min="1"
            :max="10"
            :step="1"
            :dot-size="16"
            :height="6"
            :tooltips="false"
            style="width: 100%;"
          />
          <span class="block mt-2 text-sm text-gray-700 text-center">
            Priority: {{ selectedPriority[0] }} - {{ selectedPriority[1] }}
          </span>
        </div>
      </div>

      <!-- === Task Table === -->
      <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div class="flex flex-col space-y-1.5 p-6">
          <div class="flex items-center justify-between">
            <h3 class="text-2xl font-semibold leading-none tracking-tight">
              {{ indvTask ? 'Subtasks' : 'Tasks' }}
            </h3>
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
              v-for="task in visibleTasks"
              :key="task.id"
              class="hover:bg-gray-50 cursor-pointer transition"
              :class="{ 'bg-red-50': isTaskOverdue(task) }"
              v-memo="[task.id, task.status, task.deadlineMs, task.priorityNum]"
              @click="goToTaskDetail(task.id)"
            >
              <td class="p-2 border font-medium">{{ task.title || 'Untitled' }}</td>
              <td class="p-2 border text-gray-800">{{ task.projectTitle || 'No project' }}</td>
              <td class="p-2 border text-gray-800">{{ task.creatorName || 'No creator' }}</td>
              <td class="p-2 border text-gray-800">
                <template v-if="Array.isArray(task.assigneeNames) && task.assigneeNames.length">
                  <span v-for="(name, index) in task.assigneeNames.slice(0, 3)" :key="index">
                    {{ name }}<span v-if="index < Math.min(task.assigneeNames.length, 3) - 1">, </span>
                  </span>
                  <span v-if="task.assigneeNames.length > 3">...</span>
                </template>
                <template v-else>
                  <span class="text-gray-400 text-xs italic">No assignees</span>
                </template>
              </td>
              <td class="p-2 border" :class="getDateClasses(task)">{{ formatDate(task.deadline) }}</td>
              <td class="p-2 border">
                <span class="px-2 py-1 rounded text-white text-xs" :class="task.statusColor">
                  {{ task.statusLabel }}
                </span>
              </td>
              <td class="p-2 border">{{ task.priorityNum ?? task.priority ?? '—' }}</td>
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
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, ChevronDown, Check } from 'lucide-vue-next'
import Slider from '@vueform/slider'
import '@vueform/slider/themes/default.css'

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  indvTask: { type: Boolean, default: false },
  parentTaskId: { type: String, default: null },
})

defineEmits(['createTask'])

const router = useRouter()

/* ---------- Loading state ---------- */
const isLoading = ref(true)

/* ---------- UI state ---------- */
const dropdownStates = ref({
  project: false,
  creator: false,
  assignee: false,
  dueDate: false,
  status: false,
})

const toggleDropdown = (dropdown) => {
  Object.keys(dropdownStates.value).forEach(key => {
    if (key !== dropdown) dropdownStates.value[key] = false
  })
  dropdownStates.value[dropdown] = !dropdownStates.value[dropdown]
}

const closeAllDropdowns = () => {
  Object.keys(dropdownStates.value).forEach(key => (dropdownStates.value[key] = false))
}

const goToTaskDetail = (taskId) => {
  if (props.indvTask && props.parentTaskId) {
    router.push({ name: 'SubtaskDetail', params: { id: props.parentTaskId, subtaskId: taskId } })
  } else {
    router.push({ name: 'TaskDetail', params: { id: taskId } })
  }
}

/* ---------- Status config ---------- */
const statusConfig = {
  todo: { label: 'To Do', color: 'bg-gray-500' },
  'in-progress': { label: 'In Progress', color: 'bg-blue-500' },
  done: { label: 'Done', color: 'bg-green-500' },
}
const getStatusConfig = (status) => statusConfig[status] || { label: 'To Do', color: 'bg-gray-500' }

/* ---------- Date helpers ---------- */
const toJsDate = (value) => {
  if (!value) return null
  if (typeof value?.toDate === 'function') return value.toDate()
  if (typeof value === 'object') {
    const s = value.seconds ?? value._seconds
    const ns = value.nanoseconds ?? value._nanoseconds
    if (typeof s === 'number') return new Date(s * 1000 + Math.floor((ns ?? 0) / 1e6))
  }
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

const getDateClasses = (task) => {
  if (task.isOverdue) return 'text-red-600 font-semibold'
  if (task.isDueSoon) return 'text-yellow-600 font-semibold'
  return ''
}

const isTaskOverdue = (task) => !!task.isOverdue

/* ---------- Preprocessed working list ---------- */
const processedTasks = ref([])

const preprocessTask = (t) => {
  const deadlineDate = toJsDate(t.deadline)
  const deadlineMs = deadlineDate ? deadlineDate.getTime() : null
  const now = Date.now()
  const twoDays = 2 * 24 * 60 * 60 * 1000
  const status = t.status || 'todo'
  const sc = getStatusConfig(status)
  const priorityNum = typeof t.priority === 'number' ? t.priority : Number(t.priority)
  const isDone = status === 'done'

  return {
    ...t,
    projectTitle: t.projectTitle || 'No project',
    creatorName: t.creatorName || 'No creator',
    assigneeNames: Array.isArray(t.assigneeNames) ? t.assigneeNames : [],
    priorityNum: Number.isNaN(priorityNum) ? undefined : priorityNum,
    statusLabel: sc.label,
    statusColor: sc.color,
    deadlineMs,
    isOverdue: !!deadlineMs && deadlineMs < now && !isDone,
    isDueSoon: !!deadlineMs && deadlineMs > now && deadlineMs <= now + twoDays && !isDone,
  }
}

watch(
  () => props.tasks,
  (arr) => {
    const src = Array.isArray(arr) ? arr : []
    processedTasks.value = src.map(preprocessTask)
    // once first props.tasks arrives (even empty), stop showing "Loading"
    isLoading.value = false
  },
  { immediate: true }
)

/* ---------- Filters ---------- */
const selectedProjects = ref([])
const selectedCreators = ref([])
const selectedAssignees = ref([])
const selectedDueDate = ref('All Tasks')
const selectedStatuses = ref([])
const selectedPriority = ref([1, 10])

const toggleSelection = (filterType, value) => {
  const map = {
    project: selectedProjects,
    creator: selectedCreators,
    assignee: selectedAssignees,
    status: selectedStatuses,
  }
  const filter = map[filterType]
  const i = filter.value.indexOf(value)
  if (i > -1) filter.value.splice(i, 1)
  else filter.value.push(value)
}

const clearFilter = (filterType) => {
  const map = {
    project: selectedProjects,
    creator: selectedCreators,
    assignee: selectedAssignees,
    status: selectedStatuses,
  }
  map[filterType].value = []
  dropdownStates.value[filterType] = false
}

const selectDueDate = (option) => {
  selectedDueDate.value = option
  dropdownStates.value.dueDate = false
}

/* ---------- Filter options ---------- */
const projectOptions = computed(() => {
  const set = new Set()
  for (const t of processedTasks.value) if (t.projectTitle) set.add(t.projectTitle)
  return Array.from(set)
})
const creatorOptions = computed(() => {
  const set = new Set()
  for (const t of processedTasks.value) if (t.creatorName) set.add(t.creatorName)
  return Array.from(set)
})
const assigneeOptions = computed(() => {
  const set = new Set()
  for (const t of processedTasks.value) {
    if (Array.isArray(t.assigneeNames)) for (const n of t.assigneeNames) if (n) set.add(n)
  }
  return Array.from(set)
})

const dueDateOptions = ['All Tasks', 'Overdue', 'Due Today', 'Due This Week', 'No Due Date']
const statusOptions = ['todo', 'in-progress', 'done']

/* ---------- Filtering logic ---------- */
const filteredTasks = computed(() => {
  const noProject = selectedProjects.value.length === 0
  const noCreator = selectedCreators.value.length === 0
  const noAssignee = selectedAssignees.value.length === 0
  const noStatus = selectedStatuses.value.length === 0
  const priorityMin = selectedPriority.value[0]
  const priorityMax = selectedPriority.value[1]
  const dueFilter = selectedDueDate.value
  const nowMs = Date.now()
  const weekFromNowMs = nowMs + 7 * 24 * 60 * 60 * 1000

  if (
    noProject && noCreator && noAssignee && noStatus &&
    dueFilter === 'All Tasks' &&
    priorityMin === 1 && priorityMax === 10
  ) {
    return processedTasks.value
  }

  return processedTasks.value.filter((task) => {
    const matchesProject = noProject || selectedProjects.value.includes(task.projectTitle)
    const matchesCreator = noCreator || selectedCreators.value.includes(task.creatorName)
    const matchesAssignee =
      noAssignee ||
      (task.assigneeNames.length &&
        task.assigneeNames.some((name) => selectedAssignees.value.includes(name)))

    let matchesDueDate = true
    const tms = task.deadlineMs
    if (dueFilter === 'Overdue') {
      matchesDueDate = !!tms && tms < nowMs && task.status !== 'done'
    } else if (dueFilter === 'Due Today') {
      if (!tms) matchesDueDate = false
      else {
        const d = new Date(tms)
        const now = new Date()
        matchesDueDate = d.toDateString() === now.toDateString()
      }
    } else if (dueFilter === 'Due This Week') {
      matchesDueDate = !!tms && tms >= nowMs && tms <= weekFromNowMs
    } else if (dueFilter === 'No Due Date') {
      matchesDueDate = !tms
    }

    const matchesStatus = noStatus || selectedStatuses.value.includes(task.status)
    const matchesPriority =
      task.priorityNum === undefined ||
      (task.priorityNum >= priorityMin && task.priorityNum <= priorityMax)

    return (
      matchesProject &&
      matchesCreator &&
      matchesAssignee &&
      matchesDueDate &&
      matchesStatus &&
      matchesPriority
    )
  })
})

/* ---------- Progressive render ---------- */
const initialRenderCap = 200
const renderCap = ref(initialRenderCap)
const visibleTasks = computed(() => filteredTasks.value.slice(0, renderCap.value))

/* ---------- Stats ---------- */
const totalTasks = computed(() => processedTasks.value.length)
const completedTasks = computed(() => processedTasks.value.filter((t) => t.status === 'done').length)
const inProgressTasks = computed(() => processedTasks.value.filter((t) => t.status === 'in-progress').length)
const overdueTasks = computed(() => processedTasks.value.filter((t) => t.isOverdue).length)
const completionRate = computed(() => (totalTasks.value ? (completedTasks.value / totalTasks.value) * 100 : 0))
</script>

<style scoped>
.border-gray-300 {
  border-color: #d1d5db !important;
  border-width: 1px !important;
}
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.z-50 { z-index: 2000; }
</style>
