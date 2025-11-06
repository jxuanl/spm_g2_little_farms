<template>
  <div class="p-6">
    <!-- Loading state -->
    <div v-if="showLoading" class="flex items-center justify-center h-96">
      <div class="text-muted-foreground">Loading tasks...</div>
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
          <div class="text-2xl font-semibold text-destructive">{{ overdueTasks }}</div>
        </div>
        <div class="p-4 border rounded-lg shadow-sm">
          <div class="text-sm text-gray-500">Completion Rate</div>
          <div class="text-2xl font-semibold">{{ completionRate.toFixed(0) }}%</div>
        </div>
      </div>

      <!-- === Task Table / Empty === -->
      <div class="rounded-lg bg-card text-card-foreground shadow-sm">
        <div class="flex flex-col space-y-1.5 p-6">
          <div class="flex items-center justify-between">
            <h3 class="text-2xl font-semibold leading-none tracking-tight">
              {{ indvTask ? 'Subtasks' : 'Tasks' }}
            </h3>
            <button
              class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
              @click="$emit('createTask')">
              <Plus class="w-4 h-4 mr-2" />
              {{ indvTask ? 'New Subtask' : 'New Task' }}
            </button>
          </div>
        </div>

        <!-- === Filters === -->
        <div ref="filtersContainer" class="w-full mb-6">
          <!-- Filter chips row -->
          <div class="flex flex-wrap gap-3 bg-[#f8f9fa] p-4 rounded-lg items-center w-full">
            
            <!-- Project Filter -->
            <div v-if="!hideProjectFilter" class="relative flex-shrink-0" @click.stop>
              <button @click="toggleDropdown('project')"
                class="flex h-9 w-full min-w-[160px] max-w-[240px] items-center justify-between whitespace-nowrap rounded-md border border-[#dee2e6] bg-white px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
                <span class="truncate">
                  {{ selectedProjects.length === 0 ? 'All Projects' : selectedProjects.length === 1 ? selectedProjects[0]
                    : `${selectedProjects.length} Projects` }}
                </span>
                <ChevronDown class="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
              </button>
              <div v-if="dropdownStates.project"
                class="absolute top-full left-0 mt-1 w-64 rounded-md border border-gray-300 shadow-lg bg-white z-50">
                <div class="p-2 border-b border-gray-200">
                  <input v-model="searchQueries.project" type="text" placeholder="Search projects..."
                    class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white" @click.stop />
                </div>
                <div class="p-2 max-h-48 overflow-y-auto">
                  <button v-for="project in projectOptions" :key="project" type="button"
                    @click="toggleSelection('project', project)" :class="[
                      'w-full text-left px-2 py-1.5 text-sm rounded-sm flex items-center justify-between',
                      selectedProjects.includes(project)
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    ]">
                    <span>{{ project }}</span>
                    <Check v-if="selectedProjects.includes(project)" class="h-4 w-4" />
                  </button>
                  <div v-if="projectOptions.length === 0" class="text-sm text-gray-500 text-center py-2">
                    No results found
                  </div>
                </div>
                <div class="border-t border-gray-200 p-2">
                  <button @click="clearFilter('project')"
                    class="w-full text-sm text-blue-600 hover:underline text-center py-1">
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <!-- Creator Filter -->
            <div class="relative flex-shrink-0" @click.stop>
              <button @click="toggleDropdown('creator')"
                class="flex h-9 w-full min-w-[160px] max-w-[240px] items-center justify-between whitespace-nowrap rounded-md border border-[#dee2e6] bg-white px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
                <span class="truncate">
                  {{ selectedCreators.length === 0 ? 'All Creators' : selectedCreators.length === 1 ? selectedCreators[0]
                    : `${selectedCreators.length} Creators` }}
                </span>
                <ChevronDown class="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
              </button>
              <div v-if="dropdownStates.creator"
                class="absolute top-full left-0 mt-1 z-50 w-64 rounded-md border border-gray-300 bg-white shadow-lg">
                <div class="p-2 border-b border-gray-200">
                  <input v-model="searchQueries.creator" type="text" placeholder="Search creators..."
                    class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white" @click.stop />
                </div>
                <div class="p-2 max-h-48 overflow-y-auto">
                  <button v-for="creator in creatorOptions" :key="creator" type="button"
                    @click="toggleSelection('creator', creator)" :class="[
                      'w-full text-left px-2 py-1.5 text-sm rounded-sm flex items-center justify-between',
                      selectedCreators.includes(creator)
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    ]">
                    <span>{{ creator }}</span>
                    <Check v-if="selectedCreators.includes(creator)" class="h-4 w-4" />
                  </button>
                  <div v-if="creatorOptions.length === 0" class="text-sm text-gray-500 text-center py-2">
                    No results found
                  </div>
                </div>
                <div class="border-t border-gray-200 p-2">
                  <button @click="clearFilter('creator')"
                    class="w-full text-sm text-blue-600 hover:underline text-center py-1">
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <!-- Assignee Filter -->
            <div class="relative flex-shrink-0" @click.stop>
              <button @click="toggleDropdown('assignee')"
                class="flex h-9 w-full min-w-[160px] max-w-[240px] items-center justify-between whitespace-nowrap rounded-md border border-[#dee2e6] bg-white px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
                <span class="truncate">
                  {{ selectedAssignees.length === 0 ? 'All Assignees' : selectedAssignees.length === 1 ?
                    selectedAssignees[0] : `${selectedAssignees.length} Assignees` }}
                </span>
                <ChevronDown class="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
              </button>
              <div v-if="dropdownStates.assignee"
                class="absolute top-full left-0 mt-1 z-50 w-64 rounded-md border border-gray-300 bg-white shadow-lg">
                <div class="p-2 border-b border-gray-200">
                  <input v-model="searchQueries.assignee" type="text" placeholder="Search assignees..."
                    class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white" @click.stop />
                </div>
                <div class="p-2 max-h-48 overflow-y-auto">
                  <button v-for="assignee in assigneeOptions" :key="assignee" type="button"
                    @click="toggleSelection('assignee', assignee)" :class="[
                      'w-full text-left px-2 py-1.5 text-sm rounded-sm flex items-center justify-between',
                      selectedAssignees.includes(assignee)
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    ]">
                    <span>{{ assignee }}</span>
                    <Check v-if="selectedAssignees.includes(assignee)" class="h-4 w-4" />
                  </button>
                  <div v-if="assigneeOptions.length === 0" class="text-sm text-gray-500 text-center py-2">
                    No results found
                  </div>
                </div>
                <div class="border-t border-gray-200 p-2">
                  <button @click="clearFilter('assignee')"
                    class="w-full text-sm text-blue-600 hover:underline text-center py-1">
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <!-- Due Date Filter -->
            <div class="relative flex-shrink-0" @click.stop>
              <button @click="toggleDropdown('dueDate')"
                class="flex h-9 w-full min-w-[160px] max-w-[240px] items-center justify-between whitespace-nowrap rounded-md border border-[dee2e6] bg-white px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
                <span class="truncate">{{ selectedDueDate }}</span>
                <ChevronDown class="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
              </button>
              <div v-if="dropdownStates.dueDate"
                class="absolute top-full left-0 mt-1 z-50 w-64 rounded-md border border-gray-300 bg-white shadow-lg">
                <div class="p-2">
                  <button v-for="option in dueDateOptions" :key="option" type="button" @click="selectDueDate(option)"
                    :class="[
                      'w-full text-left px-2 py-1.5 text-sm rounded-sm',
                      selectedDueDate === option
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    ]">
                    {{ option }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Status Filter -->
            <div class="relative flex-shrink-0" @click.stop>
              <button @click="toggleDropdown('status')"
                class="flex h-9 w-full min-w-[160px] max-w-[240px] items-center justify-between whitespace-nowrap rounded-md border border-[#dee2e6] bg-white px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
                <span class="truncate">
                  {{ selectedStatuses.length === 0 ? 'All Statuses' : selectedStatuses.length === 1 ?
                    statusConfig[selectedStatuses[0]].label : `${selectedStatuses.length} Statuses` }}
                </span>
                <ChevronDown class="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
              </button>
              <div v-if="dropdownStates.status"
                class="absolute top-full left-0 mt-1 z-50 w-64 rounded-md border border-gray-300 bg-white shadow-lg">
                <div class="p-2">
                  <button v-for="status in statusOptions" :key="status" type="button"
                    @click="toggleSelection('status', status)" :class="[
                      'w-full text-left px-2 py-1.5 text-sm rounded-sm flex items-center justify-between',
                      selectedStatuses.includes(status)
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    ]">
                    <span>{{ statusConfig[status].label }}</span>
                    <Check v-if="selectedStatuses.includes(status)" class="h-4 w-4" />
                  </button>
                </div>
                <div class="border-t border-gray-200 p-2">
                  <button @click="clearFilter('status')"
                    class="w-full text-sm text-blue-600 hover:underline text-center py-1">
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <!-- Tags Filter -->
            <div class="relative flex-shrink-0" @click.stop>
              <button @click="toggleDropdown('tags')"
                class="flex h-9 w-full min-w-[160px] max-w-[240px] items-center justify-between whitespace-nowrap rounded-md border border-[#dee2e6] bg-white px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
                <span class="truncate">
                  {{ selectedTags.length === 0
                    ? 'All Tags'
                    : selectedTags.length === 1
                      ? selectedTags[0]
                      : `${selectedTags.length} Tags` }}
                </span>
                <ChevronDown class="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
              </button>
              <div v-if="dropdownStates.tags"
                class="absolute top-full left-0 mt-1 z-50 w-64 rounded-md border border-gray-300 bg-white shadow-lg">
                <div class="p-2 border-b border-gray-200">
                  <input v-model="searchQueries.tags" type="text" placeholder="Search tags..."
                    class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white" @click.stop />
                </div>
                <div class="p-2 max-h-48 overflow-y-auto">
                  <button v-for="tag in tagOptions" :key="tag" type="button" @click="toggleSelection('tags', tag)" :class="[
                    'w-full text-left px-2 py-1.5 text-sm rounded-sm flex items-center justify-between',
                    selectedTags.includes(tag)
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  ]">
                    <span>{{ tag }}</span>
                    <Check v-if="selectedTags.includes(tag)" class="h-4 w-4" />
                  </button>
                  <div v-if="tagOptions.length === 0" class="text-sm text-gray-500 text-center py-2">
                    No results found
                  </div>
                </div>
                <div class="border-t border-gray-200 p-2">
                  <button @click="clearFilter('tags')"
                    class="w-full text-sm text-blue-600 hover:underline text-center py-1">
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <!-- Priority Filter -->
            <div class="flex items-center min-w-[200px] flex-1 max-w-[320px] flex-shrink-0" @click.stop>
              <div class="flex items-center gap-3 w-full bg-white border border-[#dee2e6] rounded-md px-3 py-2 h-9">
                <span class="text-sm text-gray-600 whitespace-nowrap flex-shrink-0">Priority:</span>
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <span class="text-sm font-medium text-gray-700 whitespace-nowrap flex-shrink-0">
                    {{ selectedPriority[0] }} - {{ selectedPriority[1] }}
                  </span>
                  <Slider v-model="selectedPriority" :min="1" :max="10" :step="1" :dot-size="14" :height="4"
                    :tooltips="false" :process-style="{ backgroundColor: '#0d6efd' }"
                    :tooltip-style="{ backgroundColor: '#0d6efd', borderColor: '#0d6efd' }" 
                    class="flex-1 min-w-[100px]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Show table when there are results -->
        <template v-if="visibleTasks.length > 0">
          <!-- Table container with fixed height and scroll -->
          <div class="overflow-hidden rounded-b-xl">
            <div class="table-container max-h-[500px]! overflow-y-auto">
              <table class="w-full border-collapse">
                <thead class="sticky top-0 bg-muted/50 z-10">
                  <tr class="border-y border-border">
                    <th class="p-4 text-left text-sm font-semibold text-foreground">Task</th>
                    <th class="p-4 text-left text-sm font-semibold text-foreground">Project</th>
                    <th class="p-4 text-left text-sm font-semibold text-foreground">Creator</th>
                    <th class="p-4 text-left text-sm font-semibold text-foreground">Assignees</th>
                    <th class="p-4 text-left text-sm font-semibold text-foreground">Due Date</th>
                    <th class="p-4 text-left text-sm font-semibold text-foreground">Status</th>
                    <th class="p-4 text-left text-sm font-semibold text-foreground">Priority</th>
                    <th class="p-4 text-left text-sm font-semibold text-foreground">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="task in visibleTasks" :key="task.id" 
                      :class="['border-b border-border transition-colors hover:bg-muted/30', 
                              { 'bg-destructive/5': isTaskOverdue(task) }]"
                      @click="goToTaskDetail(task.id)"
                      class="cursor-pointer">
                    
                    <!-- Task Name -->
                    <td class="p-4">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-foreground">{{ task.title || 'Untitled' }}</span>
                        <span v-if="task.showId" class="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          #{{ task.id.slice(-4) }}
                        </span>
                        <span v-if="task.recurring" class="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          <RotateCcw class="w-3 h-3" />
                          Recurring
                        </span>
                      </div>
                      <p v-if="task.description" class="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {{ task.description }}
                      </p>
                    </td>
                    
                    <!-- Project -->
                    <td class="p-4">
                      <span class="text-sm text-foreground">{{ task.projectTitle || 'No project' }}</span>
                    </td>
                    
                    <!-- Creator -->
                    <td class="p-4">
                      <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <span class="text-xs font-medium text-primary">
                            {{ getInitials(task.creatorName) }}
                          </span>
                        </div>
                        <span class="text-sm">{{ task.creatorName || 'No creator' }}</span>
                      </div>
                    </td>
                    
                    <!-- Assignees -->
                    <td class="p-4">
                      <div class="flex flex-wrap gap-1">
                        <span v-for="assignee in task.assigneeNames.slice(0, 2)" :key="assignee" 
                              class="inline-flex items-center gap-1 text-xs bg-muted text-foreground px-2 py-1 rounded-full">
                          <div class="w-2 h-2 rounded-full bg-primary"></div>
                          {{ assignee }}
                        </span>
                        <span v-if="task.assigneeNames.length > 2" 
                              class="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                          +{{ task.assigneeNames.length - 2 }}
                        </span>
                        <span v-if="!task.assigneeNames.length" class="text-xs text-muted-foreground">
                          Unassigned
                        </span>
                      </div>
                    </td>
                    
                    <!-- Due Date -->
                    <td class="p-4">
                      <div :class="['text-sm font-medium', getDateClasses(task)]">
                        {{ formatDate(task.deadline) }}
                        <div v-if="task.isDueSoon && !task.isOverdue" class="text-xs text-yellow-600 font-normal">
                          Due soon
                        </div>
                        <div v-if="task.isOverdue" class="text-xs text-destructive font-normal">
                          Overdue
                        </div>
                      </div>
                    </td>
                    
                    <!-- Status -->
                    <td class="p-6">
                      <span :class="['inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium', 
                                  statusConfig[task.status]?.color || 'bg-gray-100 text-gray-700']">
                        <div class="w-1.5 h-1.5 rounded-full bg-current opacity-70"></div>
                        {{ task.statusLabel }}
                      </span>
                    </td>
                    
                    <!-- Priority -->
                    <td class="p-5">
                      <div class="flex items-center gap-2">
                        <div class="w-full max-w-[80px] bg-muted rounded-full h-2">
                          <div :class="['h-2 rounded-full', getPriorityColor(task.priorityNum)]" 
                              :style="{ width: `${(task.priorityNum / 10) * 100}%` }"></div>
                        </div>
                        <span class="text-sm font-medium text-muted-foreground min-w-[20px]">
                          {{ task.priorityNum }}
                        </span>
                      </div>
                    </td>
                    
                    <!-- Tags -->
                    <td class="p-4">
                      <div class="flex flex-wrap gap-1">
                        <span v-for="tag in task.tags?.slice(0, 2)" :key="tag" 
                              class="inline-flex items-center text-xs bg-muted text-foreground px-2 py-1 rounded-md">
                          {{ tag }}
                        </span>
                        <span v-if="task.tags?.length > 2" 
                              class="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                          +{{ task.tags.length - 2 }}
                        </span>
                        <span v-if="!task.tags?.length" class="text-xs text-muted-foreground">
                          No tags
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Load more button for large datasets -->
          <div v-if="filteredTasks.length > renderCap" class="p-4 border-t border-border bg-muted/20">
            <button @click="renderCap += 50"
                    class="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
              Load more tasks ({{ filteredTasks.length - renderCap }} remaining)
            </button>
          </div>
        </template>

        <!-- Show empty-state when no results -->
        <template v-else>
          <div v-if="visibleTasks.length === 0" class="flex flex-col items-center justify-center py-16 px-6 text-center">
            <Inbox class="w-16 h-16 text-gray-300 mb-4" />
            <h3 class="text-lg font-semibold text-gray-700 mb-2">
              {{ indvTask ? 'No Subtasks' : 'No Tasks' }}
            </h3>
            <p class="text-sm text-gray-500 mb-6 max-w-md">
              {{ indvTask 
                ? 'There are no subtasks yet. Click the "New Subtask" button to create one.' 
                : 'There are no tasks to display. Click the "New Task" button to get started.' 
              }}
            </p>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, ChevronDown, Check, Inbox, RotateCcw  } from 'lucide-vue-next'
import Slider from '@vueform/slider'
import '@vueform/slider/themes/default.css'

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  indvTask: { type: Boolean, default: false },
  parentTaskId: { type: String, default: null },
  loading: { type: Boolean, default: false },
  hideProjectFilter: { type: Boolean, default: false },
})

defineEmits(['createTask'])

const router = useRouter()

/* ---------- Loading state ---------- */
// keep a local boot flag so first paint shows "Loading tasks..." until initial props processed
const localBootLoading = ref(true)
const showLoading = computed(() => props.loading || localBootLoading.value)

/* ---------- UI state ---------- */
const dropdownStates = ref({
  project: false,
  creator: false,
  assignee: false,
  dueDate: false,
  status: false,
  tags: false
})

const searchQueries = ref({
  project: '',
  creator: '',
  assignee: '',
  tags: ''
})

const toggleDropdown = (dropdown) => {
  Object.keys(dropdownStates.value).forEach(key => {
    if (key !== dropdown) dropdownStates.value[key] = false
  })
  dropdownStates.value[dropdown] = !dropdownStates.value[dropdown]
  // Clear search when closing dropdown
  if (!dropdownStates.value[dropdown] && searchQueries.value[dropdown] !== undefined) {
    searchQueries.value[dropdown] = ''
  }
}

const closeAllDropdowns = () => {
  Object.keys(dropdownStates.value).forEach(key => (dropdownStates.value[key] = false))
}

// Template ref for filters container
const filtersContainer = ref(null)

// Handle click outside to close dropdowns
const handleClickOutside = (event) => {
  if (filtersContainer.value && !filtersContainer.value.contains(event.target)) {
    closeAllDropdowns()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const goToTaskDetail = (taskId) => {
  if (props.indvTask && props.parentTaskId) {
    router.push({ name: 'SubtaskDetail', params: { id: props.parentTaskId, subtaskId: taskId } })
  } else {
    router.push({ name: 'TaskDetail', params: { id: taskId } })
  }
}

/* ---------- Status config ---------- */
const statusConfig = {
  todo: { label: 'To Do', color: 'bg-gray-100 text-gray-700' },
  'in-progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  review: { label: 'In Review', color: 'bg-yellow-100 text-yellow-700' },
  done: { label: 'Done', color: 'bg-green-100 text-green-700' },
}
const getStatusConfig = (status) => statusConfig[status] || { label: 'To Do', color: 'bg-gray-500' }

/* ---------- Date helpers ---------- */
const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const getPriorityColor = (priority) => {
  if (priority <= 3) return 'bg-green-500'
  if (priority <= 6) return 'bg-yellow-500'
  return 'bg-red-500'
}

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
  if (task.isOverdue) return 'text-destructive font-semibold'
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
    // Preprocess tasks and mark tasks that share a duplicate title so we can
    // optionally show the task id when multiple tasks have the same title.
    const pre = src.map(preprocessTask)
    const titleCounts = {}
    for (const t of pre) {
      const key = (t.title || 'Untitled').trim()
      titleCounts[key] = (titleCounts[key] || 0) + 1
    }
    processedTasks.value = pre.map(t => {
      const key = (t.title || 'Untitled').trim()
      return { ...t, showId: titleCounts[key] > 1 }
    })
    // once first props.tasks arrives (even empty), stop showing "Loading"
    localBootLoading.value = false
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
const selectedTags = ref([])

const toggleSelection = (filterType, value) => {
  const map = {
    project: selectedProjects,
    creator: selectedCreators,
    assignee: selectedAssignees,
    status: selectedStatuses,
    tags: selectedTags
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
    tags: selectedTags,
  }
  map[filterType].value = []
  dropdownStates.value[filterType] = false
}

const selectDueDate = (option) => {
  selectedDueDate.value = option
  dropdownStates.value.dueDate = false
}

/* ---------- Filter options with search ---------- */
const projectOptions = computed(() => {
  const set = new Set()
  for (const t of processedTasks.value) if (t.projectTitle) set.add(t.projectTitle)
  const all = Array.from(set)
  const query = searchQueries.value.project.toLowerCase()
  return query ? all.filter(p => p.toLowerCase().includes(query)) : all
})

const creatorOptions = computed(() => {
  const set = new Set()
  for (const t of processedTasks.value) if (t.creatorName) set.add(t.creatorName)
  const all = Array.from(set)
  const query = searchQueries.value.creator.toLowerCase()
  return query ? all.filter(c => c.toLowerCase().includes(query)) : all
})

const assigneeOptions = computed(() => {
  const set = new Set()
  for (const t of processedTasks.value) {
    if (Array.isArray(t.assigneeNames)) for (const n of t.assigneeNames) if (n) set.add(n)
  }
  const all = Array.from(set)
  const query = searchQueries.value.assignee.toLowerCase()
  return query ? all.filter(a => a.toLowerCase().includes(query)) : all
})

const dueDateOptions = ['All Tasks', 'Overdue', 'Due Today', 'Due This Week', 'No Due Date']
const statusOptions = ['todo', 'in-progress', 'review', 'done']

const tagOptions = computed(() => {
  const set = new Set()
  for (const t of processedTasks.value) {
    if (Array.isArray(t.tags)) {
      for (const tag of t.tags) if (tag) set.add(tag)
    }
  }
  const all = Array.from(set)
  const query = searchQueries.value.tags.toLowerCase()
  return query ? all.filter(tag => tag.toLowerCase().includes(query)) : all
})

/* ---------- Filtering logic ---------- */
const filteredTasks = computed(() => {
  const noProject = selectedProjects.value.length === 0
  const noCreator = selectedCreators.value.length === 0
  const noAssignee = selectedAssignees.value.length === 0
  const noStatus = selectedStatuses.value.length === 0
  const noTags = selectedTags.value.length === 0
  const priorityMin = selectedPriority.value[0]
  const priorityMax = selectedPriority.value[1]
  const dueFilter = selectedDueDate.value
  const nowMs = Date.now()
  const weekFromNowMs = nowMs + 7 * 24 * 60 * 60 * 1000

  if (
    noProject && noCreator && noAssignee && noStatus && noTags &&
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
    const matchesTags =
      noTags ||
      (Array.isArray(task.tags) && task.tags.length > 0 && task.tags.some((tag) => selectedTags.value.includes(tag)))
    return (
      matchesProject &&
      matchesCreator &&
      matchesAssignee &&
      matchesDueDate &&
      matchesStatus &&
      matchesPriority &&
      matchesTags
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

.z-50 {
  z-index: 9999 !important;
}

/* soft red tint for overdue rows using theme destructive color */
.overdue-row {
  background-color: color-mix(in oklab, var(--destructive) 10%, transparent);
}

/* soft green tint for new instance rows */
.new-instance-row {
  background-color: color-mix(in oklab, #10b981 8%, transparent);
  border-left: 3px solid #10b981;
}

/* Override global button/input background-color: transparent for all filters */
.bg-white {
  background-color: #ffffff !important;
}

/* Ensure all dropdown menus have white background */
.relative.top-full.bg-white {
  background-color: #ffffff !important;
}

/* Ensure search inputs inside filter dropdowns have white background */
.relative input[type="text"] {
  background-color: #ffffff !important;
}

/* Filter improvements */
.filter-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.filter-chip {
  flex: 0 1 auto;
  min-width: 140px;
}

/* Priority slider improvements */
.priority-slider-container {
  flex: 1 1 100%;
  margin-bottom: 0.5rem;
}

@media (min-width: 640px) {
  .priority-slider-container {
    flex: 0 1 auto;
    min-width: 200px;
    margin-bottom: 0;
  }

  .filter-chip {
    min-width: 160px;
  }
}

/* Ensure proper z-index for dropdowns */
.relative .absolute {
  z-index: 9999 !important;
}

/* White backgrounds for all filter elements */
.bg-white {
  background-color: #ffffff !important;
}

.relative input[type="text"] {
  background-color: #ffffff !important;
}

/* Better spacing for filter header */
.filter-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

/* Responsive filter grid */
.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.5rem;
}

@media (min-width: 640px) {
  .filter-grid {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.75rem;
  }
}

/* Truncation for long text */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100px;
}

@media (min-width: 640px) {
  .truncate {
    max-width: 120px;
  }
}

/* Overdue and new instance row styles */
.overdue-row {
  background-color: color-mix(in oklab, var(--destructive) 10%, transparent);
}

.new-instance-row {
  background-color: color-mix(in oklab, #10b981 8%, transparent);
  border-left: 3px solid #10b981;
}
/* Enhanced styles for the sleek design */
:deep(.slider) {
  --slider-connect-bg: var(--primary);
  --slider-tooltip-bg: var(--primary);
  --slider-handle-bg: white;
  --slider-handle-border: 2px solid var(--primary);
  --slider-height: 6px;
}

:deep(.slider-handle) {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

:deep(.slider-handle:hover) {
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* Smooth transitions for interactive elements */
tr {
  transition: all 0.2s ease-in-out;
}

/* Better focus states */
button:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Improved empty state */
.empty-state {
  background: linear-gradient(135deg, var(--muted) 0%, transparent 100%);
}

/* Custom scrollbar for table */
.table-container {
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.table-container::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.table-container::-webkit-scrollbar-track {
  background: transparent;
}

.table-container::-webkit-scrollbar-thumb {
  background-color: var(--border);
  border-radius: 3px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background-color: var(--muted-foreground);
}

.table-container {
  max-height: 600px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.table-container::-webkit-scrollbar {
  width: 8px;
}

.table-container::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb {
  background-color: var(--border);
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background-color: var(--muted-foreground);
}

/* Sticky header */
.sticky {
  position: sticky;
  top: 0;
  z-index: 10;
}

/* Ensure the header has a background so content scrolls underneath properly */
.sticky th {
  background-color: var(--muted);
  backdrop-filter: blur(8px);
}

/* Rest of your existing styles... */
.border-gray-300 {
  border-color: #d1d5db !important;
  border-width: 1px !important;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.z-50 {
  z-index: 9999 !important;
}
</style>