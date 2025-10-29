<template>
  <div class="h-screen bg-background flex">
    <!-- Left: Sidebar (exactly like Project.vue) -->
    <TaskSidebar
      :activeProject="activeProject"
      :projects="projects"
      @projectChange="setActiveProject"
      @createTask="() => setIsCreateModalOpen(true)"
    />

    <!-- Right: Page content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header (same shell as Project.vue) -->
      <div class="bg-card border-b border-border p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-semibold">Timeline</h2>
            <p class="text-sm text-muted-foreground mt-1">
              View project timelines and filter by project and assignees
            </p>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div class="flex-1 p-6 overflow-auto">
        <!-- Authentication Error (same pattern) -->
        <div
          v-if="authError && !isLoggedIn"
          class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6"
        >
          <div class="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none"
              stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="lucide lucide-triangle-alert-icon lucide-triangle-alert">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a 2 2 0 0 0 1.73-3"></path>
              <path d="M12 9v4"></path>
              <path d="M12 17h.01"></path>
            </svg>
            <div>
              <h4 class="font-semibold text-red-800 dark:text-red-200" style="color: red;">Authentication Required</h4>
              <p class="text-sm text-red-700 dark:text-red-300 mt-1">{{ authError }}</p>
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <label class="text-sm text-gray-600">Filter by project</label>
          <select v-model="selectedProjectId" class="border rounded px-2 py-1 text-sm">
            <option value="">All projects</option>
            <option
              v-for="p in projectOptions"
              :key="p.value"
              :value="p.value"
            >
              {{ p.label }}
            </option>
          </select>

          <label class="text-sm text-gray-600 ml-4">Assigned</label>
          <select v-model="selectedAssigneeName" class="border rounded px-2 py-1 text-sm">
            <option
              v-for="a in assigneeOptions"
              :key="a.value || 'all'"
              :value="a.value"
            >
              {{ a.label }}
            </option>
          </select>
        </div>

        <div v-if="loadingTimeline" class="text-gray-500 text-sm">Loading timeline...</div>
        <div v-else ref="ganttContainer" class="border rounded-lg bg-white shadow-sm"></div>
      </div>
    </div>

    <!-- Create Task Modal (hooked from sidebar action to keep UX parity) -->
    <CreateTaskModal
      :isOpen="isCreateModalOpen"
      @close="() => setIsCreateModalOpen(false)"
      @createTask="handleCreateTask"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import Gantt from 'frappe-gantt'
import TaskSidebar from '../components/TaskSidebar.vue'
import CreateTaskModal from '../components/CreateTaskModal.vue'

// ----------------------------
// Sidebar & page scaffolding
// ----------------------------
const activeProject = ref('all')
const isCreateModalOpen = ref(false)

const projects = ref([])
const loadingProjects = ref(false) // reserved (matches Project.vue), not shown here but kept for parity
const isLoggedIn = ref(false)
const authError = ref('')
const userRole = ref('')

// timeline state
const tasks = ref([]) // server returns tasks with projectId, projectTitle, assigneeNames[]
const loadingTimeline = ref(true)
const ganttContainer = ref(null)
const selectedProjectId = ref('')     // empty = all
const selectedAssigneeName = ref('')  // empty = all
let gantt = null

// auth/session (copied pattern from Project.vue)
const checkAuth = () => {
  try {
    const userSessionStr = sessionStorage.getItem('userSession')
    if (!userSessionStr) {
      isLoggedIn.value = false
      authError.value = 'You must be logged in to view timelines'
      userRole.value = ''
      return null
    }
    const userSession = JSON.parse(userSessionStr)
    if (!userSession.uid) {
      isLoggedIn.value = false
      authError.value = 'Invalid user session. Please log in again.'
      userRole.value = ''
      return null
    }
    isLoggedIn.value = true
    authError.value = ''
    userRole.value = userSession.role || ''
    return userSession
  } catch (err) {
    isLoggedIn.value = false
    authError.value = 'Authentication error. Please log in again.'
    userRole.value = ''
    return null
  }
}

const setActiveProject = (projectId) => {
  activeProject.value = projectId || 'all'
  // Keep dropdown in sync with sidebar selection
  selectedProjectId.value = activeProject.value === 'all' ? '' : activeProject.value
}

const setIsCreateModalOpen = (open) => {
  isCreateModalOpen.value = open
}

const handleCreateTask = (newTask) => {
  // You can refresh timeline or show toast; keeping it simple.
  isCreateModalOpen.value = false
}

// ----------------------------
// Projects (for sidebar)
// ----------------------------
const loadProjects = async (uid, role) => {
  loadingProjects.value = true
  try {
    const res = await fetch(`http://localhost:3001/api/projects?userId=${uid}&userRole=${role}`)
    if (!res.ok) throw new Error(`Failed to fetch projects: ${res.statusText}`)
    const userProjects = await res.json()
    projects.value = userProjects
  } catch (err) {
    console.error('Error loading projects:', err)
  } finally {
    loadingProjects.value = false
  }
}

// ----------------------------
// Timeline filters & options
// ----------------------------
const palette = ['#3b82f6', '#10b981', '#f59e0b', '#29E6BD', '#8b5cf6', '#14b8a6', '#ec4899', '#84cc16']
const projectColorCache = new Map()
function getProjectColor(pid) {
  const key = pid || 'no-project'
  if (!projectColorCache.has(key)) {
    projectColorCache.set(key, palette[projectColorCache.size % palette.length])
  }
  return projectColorCache.get(key)
}

const projectOptions = computed(() => {
  const seen = new Set()
  const opts = []
  for (const t of tasks.value) {
    const pid = t.projectId || 'no-project'
    if (seen.has(pid)) continue
    seen.add(pid)
    const label = t.projectTitle || pid
    opts.push({ value: pid, label })
  }
  opts.sort((a, b) => a.label.localeCompare(b.label))
  return opts
})

const assigneeOptions = computed(() => {
  const base = selectedProjectId.value
    ? tasks.value.filter(x => x.projectId === selectedProjectId.value)
    : tasks.value

  const nameSet = new Set()
  for (const t of base) {
    (t.assigneeNames || []).forEach(n => n && nameSet.add(n))
  }

  const opts = [{ value: '', label: 'All assignees' }]
  Array.from(nameSet).sort((a, b) => a.localeCompare(b)).forEach(n => {
    opts.push({ value: n, label: n })
  })
  return opts
})

const filteredTasks = computed(() => {
  let list = selectedProjectId.value
    ? tasks.value.filter(t => t.projectId === selectedProjectId.value)
    : tasks.value

  if (selectedAssigneeName.value) {
    list = list.filter(
      t => Array.isArray(t.assigneeNames) && t.assigneeNames.includes(selectedAssigneeName.value)
    )
  }
  return list
})

// ----------------------------
// Data fetch & rendering
// ----------------------------
const fetchTimeline = async (uid) => {
  try {
    loadingTimeline.value = true
    const params = new URLSearchParams({ userId: uid })
    // if you later add server-side assignee filtering by ID:
    // if (selectedAssigneeId.value) params.set('assigned', selectedAssigneeId.value)

    const res = await fetch(`/api/timeline?${params.toString()}`)
    const data = await res.json()
    if (!data.success || !Array.isArray(data.tasks)) {
      throw new Error(data.message || 'Failed to fetch tasks')
    }

    // Normalize server payload
    tasks.value = data.tasks.map((t) => {
      const toYmd = (v) => {
        if (!v) return null
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v
        const d = typeof v === 'string' ? new Date(v) : v instanceof Date ? v : null
        if (!d || Number.isNaN(d.getTime())) return null
        return d.toISOString().split('T')[0]
      }

      const start = toYmd(t.start) || toYmd(t.createdDate) || toYmd(new Date())
      const end =
        toYmd(t.end) ||
        toYmd(t.deadline) ||
        toYmd(new Date(new Date(start).getTime() + 3 * 86400000))

      const projectKey = typeof t.projectId === 'string'
        ? t.projectId
        : t.projectId?.path || t.projectId?._path?.segments?.join('/') || 'no-project'
      const color = t.color || getProjectColor(projectKey)

      return {
        id: t.id,
        name: t.name || t.title || 'Untitled Task',
        start,
        end,
        status: t.status || 'Not started',
        color,
        projectId: projectKey,
        projectTitle: t.projectTitle || 'No Project',
        assigneeNames: Array.isArray(t.assigneeNames) ? t.assigneeNames : []
      }
    })
  } catch (err) {
    console.error('❌ Error fetching timeline:', err)
  } finally {
    loadingTimeline.value = false
  }
}

const renderGantt = () => {
  if (!ganttContainer.value || !filteredTasks.value.length) {
    if (ganttContainer.value) ganttContainer.value.innerHTML = ''
    return
  }

  ganttContainer.value.innerHTML = ''

  gantt = new Gantt(ganttContainer.value, filteredTasks.value, {
    view_mode: 'Day',
    view_mode_select: true,
    date_format: 'YYYY-MM-DD',
    bar_height: 28,
    bar_corner_radius: 3,
    padding: 20,
    column_width: 45,
    lines: 'both',
    infinite_padding: false,
    scroll_to: 'today',
    today_button: true,
    popup_on: 'click',
    readonly_progress: true,
    popup(task) {
      const t = task.task

      const startDate = new Date(t.start)
      const endDate = new Date(t.end)
      const options = { month: 'short', day: 'numeric' }
      const startFormatted = startDate.toLocaleDateString('en-US', options)
      const endFormatted = endDate.toLocaleDateString('en-US', options)
      const durationDays = Math.max(
        1,
        Math.round((endDate - startDate) / (1000 * 60 * 60 * 24))
      )

      let statusColor = '#9ca3af'
      if (t.status?.toLowerCase() === 'done') statusColor = '#16a34a'
      else if (t.status?.toLowerCase() === 'in-progress') statusColor = '#f59e0b'
      else if (t.status?.toLowerCase() === 'not started') statusColor = '#ef4444'

      const names = Array.isArray(t.assigneeNames) ? t.assigneeNames.filter(Boolean) : []
      const assignedText = names.length ? names.join(', ') : 'Unassigned'

      return `
        <div class="p-2 text-sm">
          <div class="font-medium text-gray-900">${t.name}</div>
          <div class="text-xs text-gray-500 mt-1">
            ${startFormatted} – ${endFormatted} (${durationDays} day${durationDays > 1 ? 's' : ''})
          </div>
          <div class="text-xs mt-1" style="color:${statusColor}">
            ${t.status || 'No status'}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            Assigned: ${assignedText}
          </div>
        </div>
      `
    },
  })

  // Overdue overlays
  setTimeout(() => {
    const today = new Date()
    const pxPerDay =
      gantt.options.column_width /
      (gantt.options.view_mode === 'Day'
        ? 1
        : gantt.options.view_mode === 'Week'
        ? 7
        : gantt.options.view_mode === 'Month'
        ? 30
        : 1)

    filteredTasks.value.forEach((t) => {
      const barWrapper = ganttContainer.value.querySelector(`.bar-wrapper[data-id="${t.id}"]`)
      if (!barWrapper) return

      const barRect = barWrapper.querySelector('rect.bar')
      if (!barRect) return

      barRect.setAttribute('fill', t.color || getProjectColor(t.projectId))

      const oldOverlay = barWrapper.querySelector('.overdue-overlay')
      if (oldOverlay) oldOverlay.remove()

      const endDate = new Date(t.end)
      const isOverdue = today > endDate && t.status?.toLowerCase() !== 'done'
      if (isOverdue) {
        const overdueDays = Math.floor((today - endDate) / (1000 * 60 * 60 * 24))
        const overdueWidth = overdueDays * pxPerDay

        const redOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        redOverlay.classList.add('overdue-overlay')
        redOverlay.setAttribute('x', parseFloat(barRect.getAttribute('x')) + parseFloat(barRect.getAttribute('width')))
        redOverlay.setAttribute('y', barRect.getAttribute('y'))
        redOverlay.setAttribute('width', overdueWidth)
        redOverlay.setAttribute('height', barRect.getAttribute('height'))
        redOverlay.setAttribute('fill', '#ef4444')
        redOverlay.setAttribute('opacity', '0.85')
        redOverlay.setAttribute('rx', '4')
        redOverlay.setAttribute('ry', '4')
        barWrapper.appendChild(redOverlay)
      }
    })
  }, 400)
}

watch(filteredTasks, () => {
  renderGantt()
})

// ----------------------------
// Mount
// ----------------------------
onMounted(async () => {
  const session = checkAuth()
  if (!session) return
  await Promise.all([
    loadProjects(session.uid, session.role),
    fetchTimeline(session.uid),
  ])
  renderGantt()
})
</script>

<style scoped>
#gantt {
  height: 600px;
}
.gantt-container {
  width: 100%;
  height: 600px;
  background: #fff;
  border-radius: 8px;
  overflow: auto;
}
.gantt .grid-row,
.gantt .grid-header {
  stroke: #e5e7eb !important;
}
.gantt .grid-row rect {
  fill: #ffffff !important;
}
.gantt .grid-row:not(:last-child) rect {
  stroke: #f1f5f9 !important;
}
.gantt .grid-header text {
  fill: #374151 !important;
  font-weight: 500;
}
.gantt .bar {
  rx: 4;
  ry: 4;
  opacity: 0.9;
}
.gantt .today-highlight {
  fill: rgba(59, 130, 246, 0.1);
}
</style>
