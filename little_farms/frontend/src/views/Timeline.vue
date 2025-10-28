<template>
  <div class="p-6 space-y-4">
    <h2 class="text-2xl font-semibold text-gray-800">Project Timeline</h2>

    <!-- Filter by project (labels provided by backend via task.projectTitle) -->
    <div class="flex items-center gap-3">
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
    </div>

    <div v-if="loading" class="text-gray-500 text-sm">Loading timeline...</div>

    <div v-else ref="ganttContainer" class="border rounded-lg bg-white shadow-sm"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import Gantt from 'frappe-gantt'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

const tasks = ref([])                 // server returns tasks with projectId, projectTitle, assignedUsers[]
const loading = ref(true)
const ganttContainer = ref(null)
const selectedProjectId = ref('')     // empty = all
let gantt = null

// One color per project
const palette = ['#3b82f6', '#10b981', '#f59e0b', '#29E6BD', '#8b5cf6', '#14b8a6', '#ec4899', '#84cc16']
const projectColorCache = new Map()
function getProjectColor(pid) {
  const key = pid || 'no-project'
  if (!projectColorCache.has(key)) {
    projectColorCache.set(key, palette[projectColorCache.size % palette.length])
  }
  return projectColorCache.get(key)
}

// Unique dropdown options
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

// Filtered list for the chart
const filteredTasks = computed(() =>
  selectedProjectId.value
    ? tasks.value.filter(t => t.projectId === selectedProjectId.value)
    : tasks.value
)

// Fetch tasks; expect the backend to enrich:
// - projectTitle (string)
// - assignedUsers: [{ id, name?, displayName?, email?, photoURL? }, ...]
const fetchData = async (userId) => {
  try {
    loading.value = true
    const params = new URLSearchParams({ userId })
    // if (selectedProjectId.value) params.set('projectId', selectedProjectId.value) // optional server-side filter

    const res = await fetch(`/api/tasks?${params.toString()}`)
    const data = await res.json()
    if (!data.success || !Array.isArray(data.tasks)) {
      throw new Error(data.message || 'Failed to fetch tasks')
    }

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
        assigneeNames: Array.isArray(t.assigneeNames) ? t.assigneeNames : [] // <- from server
      }
    })
  } catch (err) {
    console.error('❌ Error fetching tasks:', err)
  } finally {
    loading.value = false
  }
}

// Render Gantt
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

      // Build assigned users text
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

  // Apply colors and overdue overlays
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

      // Ensure stable project color
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

// Re-render on source change
watch(filteredTasks, () => {
  renderGantt()
})

onMounted(() => {
  const auth = getAuth()
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await fetchData(user.uid)
      renderGantt()
    } else {
      window.location.href = '/login'
    }
  })
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
