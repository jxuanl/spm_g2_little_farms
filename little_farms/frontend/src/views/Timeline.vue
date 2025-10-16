<template>
  <div class="p-6 space-y-4">
    <h2 class="text-2xl font-semibold text-gray-800">Project Timeline</h2>

    <div v-if="loading" class="text-gray-500 text-sm">Loading timeline...</div>

    <!-- ✅ Attach ref instead of id -->
    <div v-else ref="ganttContainer" class="border rounded-lg bg-white shadow-sm"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Gantt from 'frappe-gantt'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

const tasks = ref([])
const loading = ref(true)
const ganttContainer = ref(null)
let gantt = null

// === Fetch data from backend ===
// === Fetch data from backend (respect role-based access) ===
const fetchData = async (userId) => {
  try {
    console.log('📡 Fetching tasks (role-based) for user:', userId)
    const res = await fetch(`/api/tasks?userId=${encodeURIComponent(userId)}`)
    const data = await res.json()

    if (!data.success || !Array.isArray(data.tasks)) {
      throw new Error(data.message || 'Failed to fetch tasks')
    }

    // Map backend enriched tasks to Frappe Gantt format
    const palette = ['#3b82f6', '#10b981', '#f59e0b', '#29E6BD', '#8b5cf6', '#14b8a6', '#ec4899', '#84cc16']
    const projectColorCache = new Map()

    tasks.value = data.tasks.map((t, i) => {
      // Normalize dates to YYYY-MM-DD
      const toYmd = (v) => {
        if (!v) return null
        const d = typeof v === 'string' ? new Date(v) : v instanceof Date ? v : null
        if (!d || Number.isNaN(d.getTime())) return null
        return d.toISOString().split('T')[0]
      }

      const start = toYmd(t.createdDate) || toYmd(t.modifiedDate) || toYmd(new Date())
      // default end: +3 days if missing or invalid
      const end = toYmd(t.deadline) || toYmd(new Date(new Date(start).getTime() + 3 * 86400000))

      // Derive stable color per project reference/path
      const projectKey = typeof t.projectId === 'string'
        ? t.projectId
        : t.projectId?.path || t.projectId?._path?.segments?.join('/') || 'no-project'
      if (!projectColorCache.has(projectKey)) {
        projectColorCache.set(projectKey, palette[projectColorCache.size % palette.length])
      }
      const color = projectColorCache.get(projectKey)

      // Normalize status to match your popup logic
      const status = (t.status || 'Not started')

      return {
        id: t.id,
        name: t.title || 'Untitled Task',
        start,
        end,
        status,
        color,
        projectId: projectKey
      }
    })

    console.log('✅ Timeline tasks loaded (role-filtered):', tasks.value.length)
  } catch (err) {
    console.error('❌ Error fetching tasks:', err)
  } finally {
    loading.value = false
  }
}

// === Render Gantt chart ===
const renderGantt = () => {
  if (!ganttContainer.value || !tasks.value.length) return

  ganttContainer.value.innerHTML = ''

  gantt = new Gantt(ganttContainer.value, tasks.value, {
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

      // --- Format popup dates ---
      const startDate = new Date(t.start)
      const endDate = new Date(t.end)
      const options = { month: 'short', day: 'numeric' }
      const startFormatted = startDate.toLocaleDateString('en-US', options)
      const endFormatted = endDate.toLocaleDateString('en-US', options)

      const durationDays = Math.max(
        1,
        Math.round((endDate - startDate) / (1000 * 60 * 60 * 24))
      )

      // --- Status color ---
      let statusColor = '#9ca3af'
      if (t.status?.toLowerCase() === 'done') statusColor = '#16a34a'
      else if (t.status?.toLowerCase() === 'in-progress') statusColor = '#f59e0b'
      else if (t.status?.toLowerCase() === 'not started') statusColor = '#ef4444'

      // --- Popup content ---
      return `
        <div class="p-2 text-sm">
          <div class="font-medium text-gray-900">${t.name}</div>
          <div class="text-xs text-gray-500 mt-1">
            ${startFormatted} – ${endFormatted} (${durationDays} day${durationDays > 1 ? 's' : ''})
          </div>
          <div class="text-xs mt-1" style="color:${statusColor}">
            ${t.status || 'No status'}
          </div>
        </div>
      `
    },
  })

  // === Apply bar colors and overdue overlays ===
  setTimeout(() => {
    const today = new Date()
    const pxPerDay = gantt.options.column_width /
      (gantt.options.view_mode === 'Day' ? 1
        : gantt.options.view_mode === 'Week' ? 7
        : gantt.options.view_mode === 'Month' ? 30
        : 1)

    tasks.value.forEach((t) => {
      const barWrapper = ganttContainer.value.querySelector(`.bar-wrapper[data-id="${t.id}"]`)
      if (!barWrapper) return

      const barRect = barWrapper.querySelector('rect.bar')
      if (!barRect) return

      // Base color
      barRect.setAttribute('fill', t.color)

      // Remove old overlays
      const oldOverlay = barWrapper.querySelector('.overdue-overlay')
      if (oldOverlay) oldOverlay.remove()

      const endDate = new Date(t.end)
      const startDate = new Date(t.start)
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

// === Firebase Auth listener ===
onMounted(() => {
  const auth = getAuth()
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('✅ Authenticated user:', user.uid)
      await fetchData(user.uid)
      renderGantt()
    } else {
      console.warn('⚠️ No user logged in, redirecting...')
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
