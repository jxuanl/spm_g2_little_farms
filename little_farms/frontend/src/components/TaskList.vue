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
          <th class="p-2 border">Assignee</th>
          <th class="p-2 border">Due Date</th>
          <th class="p-2 border">Status</th>
          <th class="p-2 border">Priority</th>
          <th class="p-2 border">Actions</th>
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
          <td class="p-2 border">{{ task.project }}</td>
          <!-- Assignee -->
          <td class="p-2 border">{{ task.assignee?.name || 'Unassigned' }}</td>
          <!-- Due Date -->
          <td class="p-2 border" :class="getDateClasses(task)">
            {{ task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No due date' }}
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
          <!-- Actions Dropdown -->
          <td class="p-2 border relative">
            <button @click.stop="toggleTaskDropdown(task.id)">
              <MoreVertical class="w-4 h-4" />
            </button>

            <div 
              v-if="openDropdown === task.id"
              class="absolute right-0 top-full mt-1 min-w-[8rem] overflow-hidden rounded-md border bg-white shadow-md z-50"
              @click.stop
            >
              <!-- If creator -->
              <template v-if="task.creatorId === currentUserId">
                <div 
                  class="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  @click="$emit('taskClick', task.id)"
                >
                  Edit Task
                </div>
                <div class="px-3 py-2 hover:bg-gray-100 cursor-pointer">
                  Assign To
                </div>
                <div class="px-3 py-2 hover:bg-gray-100 cursor-pointer">
                  Change Status
                </div>
                <div class="px-3 py-2 hover:bg-gray-100 text-red-600 cursor-pointer">
                  Delete Task
                </div>
              </template>
              <!-- If not creator -->
              <template v-else>
                <div class="px-3 py-2 text-gray-400 cursor-not-allowed">
                  View Only
                </div>
              </template>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Plus, MoreVertical } from 'lucide-vue-next';

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  currentUserId: { type: [String, Number], default: 1 }
});
defineEmits(['taskClick', 'createTask']);

// === Dropdown state ===
const openDropdown = ref(null);

// === Stats ===
const totalTasks = computed(() => props.tasks.length);
const completedTasks = computed(() => props.tasks.filter(t => t.status === "done").length);
const inProgressTasks = computed(() => props.tasks.filter(t => t.status === "in-progress").length);
const overdueTasks = computed(() => props.tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length);
const completionRate = computed(() => totalTasks.value ? (completedTasks.value / totalTasks.value) * 100 : 0);

// === Config ===
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

const isTaskOverdue = (task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
const isTaskDueSoon = (task) => task.dueDate && new Date(task.dueDate) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) && new Date(task.dueDate) > new Date() && task.status !== "done";
const getDateClasses = (task) => {
  if (isTaskOverdue(task)) return 'text-red-600 font-semibold';
  if (isTaskDueSoon(task)) return 'text-yellow-600 font-semibold';
  return '';
};

// === Dropdown toggle ===
const toggleTaskDropdown = (taskId) => {
  openDropdown.value = openDropdown.value === taskId ? null : taskId;
};
</script>
