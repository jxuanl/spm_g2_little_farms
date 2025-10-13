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
import { collection, getDocs, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'

const tasks = ref([])
const loading = ref(true)
const ganttContainer = ref(null)

let gantt = null

// === Fetch data safely ===
const fetchData = async () => {
  try {
    const projectSnap = await getDocs(collection(db, 'Projects'))
    const projectColors = {}
    const colorPalette = [
      '#3b82f6', '#10b981', '#f59e0b', '#29E6BD',
      '#8b5cf6', '#14b8a6', '#ec4899', '#84cc16'
    ]
    projectSnap.docs.forEach((doc, i) => {
      projectColors[doc.id] = colorPalette[i % colorPalette.length]
    })

    const taskSnap = await getDocs(collection(db, 'Tasks'))
    const allTasks = await Promise.all(
      taskSnap.docs.map(async (docSnap) => {
        const data = docSnap.data()

        // Convert Firestore dates safely
        const getSafeDate = (value, fallback) => {
          if (value?.toDate) return value.toDate()
          if (typeof value === 'string' && !isNaN(Date.parse(value))) return new Date(value)
          return fallback
        }

        const startDate = getSafeDate(data.createdDate, new Date())
        const endDate = getSafeDate(data.deadline, new Date(startDate.getTime() + 3 * 86400000))

        // Fix reversed dates
        const validEnd = endDate < startDate ? new Date(startDate.getTime() + 86400000) : endDate

        const start = startDate.toISOString().split('T')[0]
        const end = validEnd.toISOString().split('T')[0]

        // Project color
        let color = '#9ca3af'
        if (data.projectId) {
          const projectDoc = await getDoc(data.projectId)
          if (projectDoc.exists()) color = projectColors[projectDoc.id] || color
        }

        return {
          id: docSnap.id,
          name: data.title || 'Untitled Task',
          start,
          end,
          status: data.status || 'Not started',   // 👈 added
          color,
        }

      })
    )

    // Filter invalid tasks
    tasks.value = allTasks.filter(t => !isNaN(Date.parse(t.start)) && !isNaN(Date.parse(t.end)))
  } catch (err) {
    console.error('Error fetching Firestore data:', err)
  } finally {
    loading.value = false
  }
}

// === Render Gantt chart ===
const renderGantt = () => {
  // ✅ Use Vue ref safely
  if (!ganttContainer.value || !tasks.value.length) return

  // Clear previous chart
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
    readonly_progress: true, // 👈 disables built-in progress display
popup: (task) => {
  const t = task.task // get actual task data

  // --- Parse and format dates ---
  const startDate = new Date(t.start)
  const endDate = new Date(t.end)
  const options = { month: 'short', day: 'numeric' }
  const startFormatted = startDate.toLocaleDateString('en-US', options)
  const endFormatted = endDate.toLocaleDateString('en-US', options)

  const durationDays = Math.max(
    1,
    Math.round((endDate - startDate) / (1000 * 60 * 60 * 24))
  )

  // --- Format status color ---
  let statusColor = '#9ca3af' // default gray
  if (t.status?.toLowerCase() === 'done') statusColor = '#16a34a' // green
  else if (t.status?.toLowerCase() === 'in-progress') statusColor = '#f59e0b' // amber
  else if (t.status?.toLowerCase() === 'not started') statusColor = '#ef4444' // red

  // --- Return popup HTML ---
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
}

  })

  // Apply bar colors
  // === Apply colors and draw delayed overlays proportionally ===
setTimeout(() => {
  const today = new Date()

  // how many pixels each day takes in current view
  const pxPerDay = gantt.options.column_width / (gantt.options.view_mode === 'Day' ? 1
                    : gantt.options.view_mode === 'Week' ? 7
                    : gantt.options.view_mode === 'Month' ? 30
                    : 1)

  tasks.value.forEach((t) => {
    const barWrapper = ganttContainer.value.querySelector(`.bar-wrapper[data-id="${t.id}"]`)
    if (!barWrapper) return

    const barRect = barWrapper.querySelector('rect.bar')
    if (!barRect) return

    // Base bar color
    barRect.setAttribute('fill', t.color)

    // Remove previous overlays
    const oldOverlay = barWrapper.querySelector('.overdue-overlay')
    if (oldOverlay) oldOverlay.remove()

    const endDate = new Date(t.end)
    const startDate = new Date(t.start)
    const isOverdue = today > endDate && t.status?.toLowerCase() !== 'done'

    if (isOverdue) {
      // Calculate overdue days precisely
      const overdueDays = Math.floor((today - endDate) / (1000 * 60 * 60 * 24))
      const overdueWidth = overdueDays * pxPerDay

      // Draw red overlay starting right after bar end
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
      updateOverdueFlag(t.id, true)
    } else {
      updateOverdueFlag(t.id, false)
    }
  })
}, 400)

}

// === Change View ===
const changeView = (mode) => {
  if (gantt) gantt.change_view_mode(mode)
}

import { doc, updateDoc } from 'firebase/firestore'

const updateOverdueFlag = async (taskId, isOverdue) => {
  try {
    const taskRef = doc(db, 'Tasks', taskId)
    await updateDoc(taskRef, { isOverdue })
  } catch (err) {
    console.error(`Error updating isOverdue for task ${taskId}:`, err)
  }
}


onMounted(async () => {
  await fetchData()
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
