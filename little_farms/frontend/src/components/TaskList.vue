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

  <div class="flex flex-wrap items-center gap-4 relative z-20">
    <!-- === Project Filter === -->
    <div class="relative inline-block text-left mb-4">
      <button
        @click="toggleProjectPopover"
        class="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 flex justify-between items-center w-56"
      >
        <span>
          {{ selectedProjects.length === 0 ? 'All Projects' : selectedProjects.join(', ') }}
        </span>
        <svg
          class="ml-2 w-4 h-4 transform"
          :class="{ 'rotate-180': isProjectPopoverOpen }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      <div
        v-if="isProjectPopoverOpen"
        class="absolute z-10 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
      >
        <div class="p-3 max-h-64 overflow-y-auto">
          <div
            v-for="project in projectOptions"
            :key="project"
            class="flex items-center mb-2"
          >
            <input
              type="checkbox"
              :id="`project-${project}`"
              :value="project"
              v-model="selectedProjects"
              class="mr-2"
            />
            <label :for="`project-${project}`" class="text-gray-700 cursor-pointer">
              {{ project }}
            </label>
          </div>
        </div>

        <div class="border-t border-gray-200 px-3 py-2 flex justify-end">
          <button
            @click="toggleProjectPopover"
            class="text-sm text-blue-600 hover:underline"
          >
            Done
          </button>
        </div>
      </div>
    </div>

    <!-- === Creator Filter === -->
    <div class="relative inline-block text-left mb-4 ml-4">
      <button
        @click="toggleCreatorPopover"
        class="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 flex justify-between items-center w-56"
      >
        <span>
          {{ selectedCreators.length === 0 ? 'All Creators' : selectedCreators.join(', ') }}
        </span>
        <svg
          class="ml-2 w-4 h-4 transform"
          :class="{ 'rotate-180': isCreatorPopoverOpen }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      <div
        v-if="isCreatorPopoverOpen"
        class="absolute z-10 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
      >
        <div class="p-3 max-h-64 overflow-y-auto">
          <div
            v-for="creator in creatorOptions"
            :key="creator"
            class="flex items-center mb-2"
          >
            <input
              type="checkbox"
              :id="`creator-${creator}`"
              :value="creator"
              v-model="selectedCreators"
              class="mr-2"
            />
            <label :for="`creator-${creator}`" class="text-gray-700 cursor-pointer">
              {{ creator }}
            </label>
          </div>
        </div>

        <div class="border-t border-gray-200 px-3 py-2 flex justify-end">
          <button
            @click="toggleCreatorPopover"
            class="text-sm text-blue-600 hover:underline"
          >
            Done
          </button>
        </div>
      </div>
    </div>

    <!-- === Assignee Filter === -->
    <div class="relative inline-block text-left mb-4 ml-4">
      <button
        @click="toggleAssigneePopover"
        class="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 flex justify-between items-center w-56"
      >
        <span>
          {{ selectedAssignees.length === 0 ? 'All Assignees' : selectedAssignees.join(', ') }}
        </span>
        <svg
          class="ml-2 w-4 h-4 transform"
          :class="{ 'rotate-180': isAssigneePopoverOpen }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      <div
        v-if="isAssigneePopoverOpen"
        class="absolute z-10 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
      >
        <div class="p-3 max-h-64 overflow-y-auto">
          <div
            v-for="assignee in assigneeOptions"
            :key="assignee"
            class="flex items-center mb-2"
          >
            <input
              type="checkbox"
              :id="`assignee-${assignee}`"
              :value="assignee"
              v-model="selectedAssignees"
              class="mr-2"
            />
            <label :for="`assignee-${assignee}`" class="text-gray-700 cursor-pointer">
              {{ assignee }}
            </label>
          </div>
        </div>

        <div class="border-t border-gray-200 px-3 py-2 flex justify-end">
          <button
            @click="toggleAssigneePopover"
            class="text-sm text-blue-600 hover:underline"
          >
            Done
          </button>
        </div>
      </div>
    </div>

    <!-- === Due Date Filter === -->
    <div class="inline-block mb-4 ml-4">
      <select
        v-model="selectedDueDate"
        class="px-4 py-2 border rounded-md bg-white text-gray-700"
      >
        <option v-for="option in dueDateOptions" :key="option" :value="option">
          {{ option }}
        </option>
      </select>
    </div>

    <!-- === Status Filter === -->
    <div class="relative inline-block text-left mb-4 ml-4">
      <button
        @click="toggleStatusPopover"
        class="px-4 py-2 bg-blue-600 rounded-md hover:bg-blue-700 flex justify-between items-center w-56"
      >
        <span>
          {{ selectedStatuses.length === 0 ? 'All Statuses' : selectedStatuses.join(', ') }}
        </span>
        <svg
          class="ml-2 w-4 h-4 transform"
          :class="{ 'rotate-180': isStatusPopoverOpen }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      <div
        v-if="isStatusPopoverOpen"
        class="absolute z-10 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
      >
        <div class="p-3 max-h-64 overflow-y-auto">
          <div
            v-for="status in statusOptions"
            :key="status"
            class="flex items-center mb-2"
          >
            <input
              type="checkbox"
              :id="`status-${status}`"
              :value="status"
              v-model="selectedStatuses"
              class="mr-2"
            />
            <label :for="`status-${status}`" class="text-gray-700 cursor-pointer">
              {{ statusConfig[status].label }}
            </label>
          </div>
        </div>

        <div class="border-t border-gray-200 px-3 py-2 flex justify-end">
          <button
            @click="toggleStatusPopover"
            class="text-sm text-blue-600 hover:underline"
          >
            Done
          </button>
        </div>
      </div>
    </div>

    <!-- === Priority Filter === -->
    <div class="p-3 w-64 mx-auto border rounded-md bg-white shadow-sm">
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
  
      <table class="w-full border-collapse border text-sm">
        <thead>
          <tr class="bg-gray-100 text-left">
            <th class="p-2 border">{{ indvTask ? 'Subtask' : 'Task' }}</th>
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
            v-for="task in filteredTasks"
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
              {{ task.deadline ? formatDate(task.deadline) : "No due date"}}
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
import Slider from '@vueform/slider'
import '@vueform/slider/themes/default.css'

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  currentUserId: { type: [String, Number], default: 1 },
  indvTask: { type: Boolean, default: false }
});
defineEmits(['taskClick', 'createTask']);

const tasks = ref([]);

// --- Project Filter State ---
const isProjectPopoverOpen = ref(false); // open/close state of dropdown
const selectedProjects = ref([]);        // selected project IDs or names

const toggleProjectPopover = () => {
  isProjectPopoverOpen.value = !isProjectPopoverOpen.value;
};

const projectOptions = computed(() => {
  const map = {};
  tasks.value.forEach(t => {
    if (t.projectTitle) map[t.projectTitle] = t.projectTitle;
  });
  return Object.values(map);
});

// --- Creator Filter State ---
const isCreatorPopoverOpen = ref(false);   // open/close state of creator dropdown
const selectedCreators = ref([]);          // selected creators

const toggleCreatorPopover = () => {
  isCreatorPopoverOpen.value = !isCreatorPopoverOpen.value;
};

const creatorOptions = computed(() => {
  const map = {};
  tasks.value.forEach(t => {
    if (t.creatorName) map[t.creatorName] = t.creatorName;
  });
  return Object.values(map);
});

// --- Assignee Filter State ---
const isAssigneePopoverOpen = ref(false);  // open/close state of assignee dropdown
const selectedAssignees = ref([]);         // selected assignees

const toggleAssigneePopover = () => {
  isAssigneePopoverOpen.value = !isAssigneePopoverOpen.value;
};

const assigneeOptions = computed(() => {
  const map = {};
  tasks.value.forEach(t => {
    if (Array.isArray(t.assigneeNames)) {
      t.assigneeNames.forEach(name => {
        if (name) map[name] = name;
      });
    }
  });
  return Object.values(map);
});

// --- Due Date Filter State ---
const dueDateOptions = ['All Tasks', 'Overdue', 'Due Today', 'Due This Week', 'No Due Date'];
const selectedDueDate = ref('All Tasks'); // default selection

// --- Status Filter State ---
const selectedStatuses = ref([]); // array for multiple selection (checkboxes)
const isStatusPopoverOpen = ref(false); // open/close state of the dropdown

const toggleStatusPopover = () => {
  isStatusPopoverOpen.value = !isStatusPopoverOpen.value;
};

const statusOptions = ['todo', 'in-progress', 'review', 'done'];

// --- Priority Filter State ---
const selectedPriority = ref([1, 10]);

// --- Filtered Tasks ---
const filteredTasks = computed(() => {
  return tasks.value.filter(task => {
    const matchesProject =
      selectedProjects.value.length === 0 || selectedProjects.value.includes(task.projectTitle);

    const matchesCreator =
      selectedCreators.value.length === 0 || selectedCreators.value.includes(task.creatorName);

    const matchesAssignee =
      selectedAssignees.value.length === 0 ||
      (task.assigneeNames && task.assigneeNames.some(name => selectedAssignees.value.includes(name)));

    // --- Due date filtering ---
    let matchesDueDate = true;
    const now = new Date();
    const taskDate = task.deadline?.toDate ? task.deadline.toDate() : task.deadline ? new Date(task.deadline) : null;

    if (selectedDueDate.value === 'Overdue') matchesDueDate = taskDate && taskDate < now && task.status !== 'done';
    else if (selectedDueDate.value === 'Due Today') matchesDueDate = taskDate && taskDate.toDateString() === now.toDateString();
    else if (selectedDueDate.value === 'Due This Week') {
      if (taskDate) {
        const weekFromNow = new Date();
        weekFromNow.setDate(now.getDate() + 7);
        matchesDueDate = taskDate >= now && taskDate <= weekFromNow;
      } else matchesDueDate = false;
    }
    else if (selectedDueDate.value === 'No Due Date') matchesDueDate = !taskDate;
  
    // --- Status filtering ---
    const matchesStatus =
      selectedStatuses.value.length === 0 || selectedStatuses.value.includes(task.status);

    // --- Priority filtering ---
    const matchesPriority =
      task.priority >= selectedPriority.value[0] &&
      task.priority <= selectedPriority.value[1];

    return matchesProject && matchesCreator && matchesAssignee && matchesDueDate && matchesStatus && matchesPriority;
  });
});

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
        if (task.taskCreatedBy) {
          try {
            let creatorRef;
            if (typeof task.taskCreatedBy === 'string') {
              // Direct user ID
              creatorRef = doc(db, 'Users', task.taskCreatedBy);
            } else if (task.taskCreatedBy?.path) {
              // API response format with path
              creatorRef = doc(db, task.taskCreatedBy.path);
            } else if (task.taskCreatedBy?.id) {
              // Firestore reference format with id
              creatorRef = doc(db, 'Users', task.taskCreatedBy.id);
            }

            if (creatorRef) {
              const userSnap = await getDoc(creatorRef);
              if (userSnap.exists()) {
                creatorName = userSnap.data().name || 'Unnamed User';
              }
            }
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
  tasks.value.filter(t => isTaskOverdue(t)).length
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

const isTaskOverdue = (task) => {
  if (!task.deadline) return false;
  const taskDate = task.deadline?.toDate ? task.deadline.toDate() : new Date(task.deadline);
  return taskDate < new Date() && task.status !== 'done';
};
const isTaskDueSoon = (task) => {
  if (!task.deadline) return false;
  const taskDate = task.deadline?.toDate ? task.deadline.toDate() : new Date(task.deadline);
  const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  return taskDate <= twoDaysFromNow && taskDate > new Date() && task.status !== 'done';
};

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