<template>
  <div class="p-6">
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
    <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div class="flex flex-col space-y-1.5 p-6">
        <div class="flex items-center justify-between">
          <h3 class="text-2xl font-semibold leading-none tracking-tight">Tasks</h3>
          <button 
            class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
            @click="$emit('createTask')"
          >
            <Plus class="w-4 h-4 mr-2" />
            New Task
          </button>
        </div>
      </div>
  
      <table class="w-full border-collapse border text-sm">
        <thead>
          <tr class="bg-gray-100 text-left">
            <th class="p-2 border">Task</th>
            <th class="p-2 border">Project</th>
            <th class="p-2 border">Creator</th>
            <th class="p-2 border">Assignees</th>
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
            <!-- Assignees -->
            <td class="p-2 border">
              <template v-if="task.assigneeNames && task.assigneeNames.length">
                <span v-for="(name, index) in task.assigneeNames.slice(0, 3)" :key="index">
                  {{ name }}<span v-if="index < Math.min(task.assigneeNames.length, 3) - 1">, </span>
                </span>
                <span v-if="task.assigneeNames.length > 3">...</span>
              </template>
              <template v-else>
                No assignees
              </template>
            </td>
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
                {{ task.priority }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Plus } from 'lucide-vue-next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  currentUserId: { type: [String, Number], default: 1 }
});
defineEmits(['taskClick', 'createTask']);

const tasks = ref([]);

// === Watch incoming tasks and enrich project, creator, assignees ===
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
        let assigneeNames = [];

        // === Resolve Project Title ===
        if (task.projectId) {
          try {
            const projectRef =
              typeof task.projectId === 'string'
                ? doc(db, 'Projects', task.projectId)
                : task.projectId?.path
                ? doc(db, task.projectId.path)
                : null;

            if (projectRef) {
              const projectSnap = await getDoc(projectRef);
              if (projectSnap.exists()) {
                projectTitle = projectSnap.data().title || 'Untitled Project';
              }
            }
          } catch (err) {
            console.error('Error loading project:', err);
          }
        }

        // === Resolve Creator ===
        if (task.taskCreatedBy?.path) {
          try {
            const userSnap = await getDoc(doc(db, task.taskCreatedBy.path));
            if (userSnap.exists()) creatorName = userSnap.data().name;
          } catch (err) {
            console.error('Error loading creator:', err);
          }
        }

        // === Resolve Assignees ===
        if (Array.isArray(task.assignedTo) && task.assignedTo.length > 0) {
          try {
            const names = [];
            for (const assignee of task.assignedTo) {
              if (typeof assignee === 'string') {
                names.push(assignee);
              } else if (assignee?.path) {
                const userSnap = await getDoc(doc(db, assignee.path));
                if (userSnap.exists()) names.push(userSnap.data().name || 'Unnamed');
              }
            }
            assigneeNames = names;
          } catch (err) {
            console.error('Error loading assignees:', err);
          }
        }

        return { ...task, projectTitle, creatorName, assigneeNames };
      })
    );

    tasks.value = enrichedTasks;
  },
  { immediate: true }
);

// === Stats ===
const totalTasks = computed(() => tasks.value.length);
const completedTasks = computed(() => tasks.value.filter(t => t.status === 'done').length);
const inProgressTasks = computed(() => tasks.value.filter(t => t.status === 'in-progress').length);
const overdueTasks = computed(() =>
  tasks.value.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length
);
const completionRate = computed(() =>
  totalTasks.value ? (completedTasks.value / totalTasks.value) * 100 : 0
);

// === Date helpers ===
const formatDate = (date) => {
  if (date?.toDate) return date.toDate().toLocaleDateString();
  if (date instanceof Date) return date.toLocaleDateString();
  return new Date(date).toLocaleDateString();
};

const isTaskOverdue = (task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
const isTaskDueSoon = (task) =>
  task.dueDate &&
  new Date(task.dueDate) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) &&
  new Date(task.dueDate) > new Date() &&
  task.status !== 'done';

const getDateClasses = (task) => {
  if (isTaskOverdue(task)) return 'text-red-600 font-semibold';
  if (isTaskDueSoon(task)) return 'text-yellow-600 font-semibold';
  return '';
};

// === Configs ===
const statusConfig = {
  todo: { label: 'To Do', color: 'bg-gray-500' },
  'in-progress': { label: 'In Progress', color: 'bg-blue-500' },
  review: { label: 'In Review', color: 'bg-yellow-500' },
  done: { label: 'Done', color: 'bg-green-500' }
};

const getStatusConfig = (status) => statusConfig[status] || { label: 'To Do', color: 'bg-gray-500' };
</script>
