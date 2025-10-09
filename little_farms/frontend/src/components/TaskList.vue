<template>
  <div class="p-6">
    <!-- === Header Section === -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">Task List</h2>
      <button 
        class="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        @click="$emit('createTask')"
      >
        <Plus class="w-4 h-4" />
        New Task
      </button>
    </div>

    <!-- === Statistics Overview === -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="p-4 border rounded-lg shadow-sm">
        <div class="text-sm text-gray-500">Total Tasks</div>
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
    <table class="w-full border-collapse border text-sm">
      <thead>
        <tr class="bg-gray-100 text-left">
          <th class="p-2 border">Task</th>
          <th class="p-2 border">Project</th>
          <th class="p-2 border">Creator</th>
          <th class="p-2 border">Due Date</th>
          <th class="p-2 border">Status</th>
          <th class="p-2 border">Priority</th>
        </tr>
      </thead>
      <tbody>
        <tr 
          v-for="task in tasks"
          :key="task.id"
          class="hover:bg-gray-50 cursor-pointer"
          @click="$emit('taskClick', task.id)"
        >
          <!-- Task Title -->
          <td class="p-2 border font-medium">{{ task.title }}</td>
          <!-- Project -->
          <td class="p-2 border">{{ task.projectTitle }}</td>
          <!-- Creator -->
          <td class="p-2 border">{{ task.creatorName }}</td>
          <!-- Due Date -->
          <td class="p-2 border" :class="getDateClasses(task)">
            {{ task.deadline ? task.deadline.toDate().toLocaleDateString(): "No due date"}}
          </td>
          <!-- Status -->
          <td class="p-2 border">
            <span 
              class="px-2 py-1 rounded text-white text-xs"
              :class="getStatusConfig(task.status).color"
            >
              {{ getStatusConfig(task.status).label }}
            </span>
          </td>
          <!-- Priority -->
          <td class="p-2 border">
            <span 
              class="px-2 py-1 rounded text-xs border"
              :class="getPriorityClasses(task.priority)"
            >
              {{ getPriorityConfig(task.priority).label }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Plus } from 'lucide-vue-next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

// === Props & Emits ===
const props = defineProps({
  tasks: { type: Array, default: () => [] },
  currentUserId: { type: [String, Number], default: 1 }
});
defineEmits(['taskClick', 'createTask']);

// === Local state for enriched tasks ===
const tasks = ref([]);

// === Watch incoming tasks and enrich project/creator info ===
watch(
  () => props.tasks,
  async (newTasks) => {
    if (!newTasks?.length) {
      tasks.value = [];
      return;
    }

    const enrichedTasks = await Promise.all(
      newTasks.map(async (task) => {
        let projectTitle = 'No project';
        let creatorName = 'No creator';

        // Resolve project by ID
        if (task.projectId) {
          try {
            const projectSnap = await getDoc(doc(db, task.projectId.path));
            if (projectSnap.exists()) {
              projectTitle = projectSnap.data().title || 'Untitled Project';
            }
          } catch (err) {
            console.error("Error loading project:", err);
          }
        }

        // Resolve creator reference
        if (task.taskCreatedBy?.path) {
          try {
            const userSnap = await getDoc(doc(db, task.taskCreatedBy.path));
            if (userSnap.exists()) creatorName = userSnap.data().name;
          } catch (err) {
            console.error('Error loading creator:', err);
          }
        }

        return { ...task, projectTitle, creatorName };
      })
    );

    tasks.value = enrichedTasks;
  },
  { immediate: true }
);

// === Stats ===
const totalTasks = computed(() => tasks.value.length);
const completedTasks = computed(() => tasks.value.filter(t => t.status === "done").length);
const inProgressTasks = computed(() => tasks.value.filter(t => t.status === "in-progress").length);
const overdueTasks = computed(() =>
  tasks.value.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length
);
const completionRate = computed(() => totalTasks.value ? (completedTasks.value / totalTasks.value) * 100 : 0);

// === Helpers ===
const formatDate = (date) => {
  if (date?.toDate) return date.toDate().toLocaleDateString();
  if (date instanceof Date) return date.toLocaleDateString();
  return new Date(date).toLocaleDateString();
};

const isTaskOverdue = (task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
const isTaskDueSoon = (task) =>
  task.dueDate &&
  new Date(task.dueDate) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) &&
  new Date(task.dueDate) > new Date() &&
  task.status !== "done";

const getDateClasses = (task) => {
  if (isTaskOverdue(task)) return 'text-red-600 font-semibold';
  if (isTaskDueSoon(task)) return 'text-yellow-600 font-semibold';
  return '';
};

// === Status & Priority Config ===
const statusConfig = {
  todo: { label: "To Do", color: "bg-gray-500" },
  "in-progress": { label: "In Progress", color: "bg-blue-500" },
  review: { label: "In Review", color: "bg-yellow-500" },
  done: { label: "Done", color: "bg-green-500" }
};

const priorityConfig = {
  high: { label: "High", variant: "destructive" },
  medium: { label: "Medium", variant: "secondary" },
  low: { label: "Low", variant: "outline" }
};

const getStatusConfig = (status) => statusConfig[status] || { label: "To Do", color: "bg-gray-500" };
const getPriorityConfig = (priority) => priorityConfig[priority] || { label: "Low", variant: "outline" };

const getPriorityClasses = (priority) => {
  const variant = getPriorityConfig(priority).variant;
  if (variant === 'destructive') return 'bg-red-100 text-red-800 border-red-300';
  if (variant === 'secondary') return 'bg-gray-200 text-gray-800 border-gray-300';
  return 'border-gray-300';
};
</script>
