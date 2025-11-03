<template>
  <div class="p-6 max-w-2xl mx-auto min-h-screen flex flex-col">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex-1 flex flex-col items-center justify-center">
      <div class="loading-spinner"></div>
      <p class="text-muted-foreground">{{ isSubtaskView ? 'Loading subtask...' : 'Loading task...' }}</p>
    </div>

    <!-- Content -->
    <template v-else-if="task">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-semibold">{{ isSubtaskView ? 'Subtask Details' : 'Task Details' }}</h2>
        <button 
          v-if="isSubtaskView" 
          @click="router.push({ name: 'TaskDetail', params: { id: taskId } })"
          class="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          ← Back to Parent Task
        </button>
        <button 
          v-else
          @click="router.push({ name: 'AllTasks'} )"
          class="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          ← Back to Task List
        </button>
      </div>

      <!-- === Edit button === -->
      <div class="mt-10 flex justify-end">
      <button
        class="px-4 py-2 font-medium rounded-md h-9 transition-all"
        :class="[
          canEdit
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer border-transparent opacity-100'
            : 'bg-gray-300 text-gray-600 cursor-not-allowed opacity-60 border-black'
        ]"
        :disabled="!canEdit"
        @click="canEdit && openEditModal()"
      >
        {{ isSubtaskView ? 'Edit Subtask' : 'Edit Task' }}
      </button>
    </div>

      <!-- === Edit Modal === -->
      <EditTaskModal
        :isOpen="isEditModalOpen"
        :task="{ ...task, id: isSubtaskView ? subtaskId : taskId }"
        :isSubtask="isSubtaskView"
        :parentTaskId="isSubtaskView ? taskId : null"
        @close="isEditModalOpen = false"
        @updated="refreshTask"
      />

      <!-- === Task Info === -->
      <div class="space-y-2 text-sm">
        <p><strong>Title:</strong> {{ task.title }}</p>
        <p><strong>Description:</strong> {{ task.description || 'No description' }}</p>
        <p><strong>Project:</strong> {{ projectTitle || 'No project' }}</p>
        <p><strong>Priority:</strong> {{ task.priority }}</p>
        <p><strong>Status:</strong> {{ task.status }}</p>
        <p><strong>Deadline:</strong> {{ task.deadline ? formatDate(task.deadline) : 'No due date' }}</p>
        <p><strong>Created Date:</strong> {{ task.createdDate ? formatDate(task.createdDate) : 'Unknown' }}</p>
        <p><strong>Modified Date:</strong> {{ task.modifiedDate ? formatDate(task.modifiedDate) : 'Unknown' }}</p>
        <p><strong>Overdue: </strong>
          <span :class="task.isOverdue ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'">
            {{ task.isOverdue ? 'Yes' : 'No' }}
          </span>
        </p>

        <p><strong>Tags: </strong>
          <template v-if="Array.isArray(task.tags) && task.tags.length">
            {{ task.tags.join(', ') }}
          </template>
          <template v-else>
            No tags
          </template>
        </p>

        <p><strong>Creator:</strong> {{ creatorName || 'No creator' }}</p>

        <p><strong>Assignees: </strong>
          <template v-if="assigneeNames.length">
            {{ assigneeNames.join(', ') }}
          </template>
          <template v-else>
            No assignees
          </template>
        </p>

        <p><strong>Recurring:</strong> 
          <span v-if="task.recurring" class="text-blue-600 font-semibold">
            Yes - Every {{ task.recurrenceValue }} {{ task.recurrenceInterval }}
          </span>
          <span v-else class="text-gray-600">
            No
          </span>
        </p>

        <div v-if="task.recurring" class="space-y-2">
          <p v-if="task.isCurrentInstance && !task.isNewInstance" class="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1">
            This is the current instance. A new task will be created when marked as complete.
          </p>
          <div v-if="task.isNewInstance" class="flex items-center gap-2 text-sm font-semibold text-green-800 bg-green-50 border-2 border-green-300 rounded px-3 py-2 animate-pulse">
            <span>New Instance - This recurring task instance just started!</span>
          </div>
        </div>
      </div>

      <div v-if="!isSubtaskView" class="flex-1 flex flex-col mt-6">
        <TaskList 
          :tasks="subtasks" 
          :indvTask="true"
          :parentTaskId="taskId"
          :hideProjectFilter="true"
          @createTask="() => isCreateModalOpen = true"
          @taskClick="handleSubtaskClick"
        />
      </div>

      <CreateTaskModal
        v-if="!isSubtaskView"
        :isOpen="isCreateModalOpen"
        :parentTaskId="taskId"
        :parentProject="{ id: task?.projectId?.id || task?.projectId, name: projectTitle }"
        @close="() => isCreateModalOpen = false"
        @taskCreated="handleSubtaskCreated"
      />
    </template>

  </div>

</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { defineProps } from 'vue';
import { getAuth } from 'firebase/auth';
import EditTaskModal from '../components/EditTaskModal.vue';
import TaskList from '../components/TaskList.vue';
import CreateTaskModal from '../components/CreateTaskModal.vue';

const route = useRoute();
const router = useRouter();
const task = ref(null);
const subtasks = ref([]);
const projectTitle = ref('');
const assigneeNames = ref([]);
const creatorName = ref('');
const isEditModalOpen = ref(false);
const currentUserId = ref('');
const userRole = ref('');
const canEdit = ref(false);
const isLoading = ref(true);
const props = defineProps({
  id: String, // comes from route   -> id should be a reference
})
const isCreateModalOpen = ref(false);

// Check if this is a subtask view
const isSubtaskView = computed(() => !!route.params.subtaskId);
const taskId = computed(() => route.params.id);
const subtaskId = computed(() => route.params.subtaskId);

// === Fetch Task, Project, Creator, and Assignees ===
const fetchTask = async () => {
  isLoading.value = true;
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    router.push('/login');
    return;
  }

  const token = await user.getIdToken();
  const userId = user.uid;

  try {
    let res;

    // Fetch user role
    const userRes = await fetch(`/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const userData = await userRes.json();
    userRole.value = (userData.user?.role || 'staff').toLowerCase();

    // --- Determine endpoint ---
    if (isSubtaskView.value) {
      res = await fetch(`/api/tasks/${taskId.value}/subtasks/${subtaskId.value}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } else {
      res = await fetch(`/api/tasks/${taskId.value}?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    if (!res.ok) {
      return;
    }

    const data = await res.json();
    let taskData = isSubtaskView.value ? data : data.task;
    task.value = taskData;

    projectTitle.value = taskData.projectTitle || 'No project';
    creatorName.value = taskData.creatorName || 'No creator';
    assigneeNames.value = taskData.assigneeNames || [];

    // ✅ Edit permission logic
    const creatorId =
      taskData.creatorId ||
      taskData.taskCreatedBy?.id ||
      taskData.taskCreatedBy?._path?.segments?.slice(-1)[0] ||
      null;

    const isCreator = creatorId === userId;

    if (userRole.value === 'hr') {
      canEdit.value = false;
    } else if (userRole.value === 'manager') {
      canEdit.value = true;
    } else if (userRole.value === 'staff') {
      canEdit.value = isCreator;
    } else {
      canEdit.value = false;
    }


  } catch (err) {
  } finally {
    isLoading.value = false;
  }
};


/* === Fetch Subtasks === */
const fetchSubtasks = async () => {
  if (isSubtaskView.value) {
    subtasks.value = [];
    return;
  }

  try {
    const response = await fetch(`/api/tasks/${taskId.value}/subtasks`);
    const rawSubtasks = response.ok ? await response.json() : [];

    const auth = getAuth();
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : null;

    // Enrich each subtask (project + creator)
    const enrichedSubtasks = await Promise.all(
      rawSubtasks.map(async (sub) => {
        let projectName = 'No project';
        let creatorName = 'No creator';
        let assigneeNames = [];

        try {
          // --- Fetch Project Title ---
          if (sub.projectId?.path) {
            const projectPathParts = sub.projectId.path.split('/');
            const projectId = projectPathParts[projectPathParts.length - 1];
            const projectRes = await fetch(`/api/projects/${projectId}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (projectRes.ok) {
              const projectData = await projectRes.json();
              projectName = projectData.project?.title || projectData.title || 'Untitled Project';
            }
          }

          // --- Fetch Creator Name ---
          if (sub.taskCreatedBy?.path) {
            const userPathParts = sub.taskCreatedBy.path.split('/');
            const creatorId = userPathParts[userPathParts.length - 1];
            const creatorRes = await fetch(`/api/users/${creatorId}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (creatorRes.ok) {
              const creatorData = await creatorRes.json();
              creatorName = creatorData.user?.name || creatorData.name || 'Unnamed Creator';
            }
          }

          // --- Fetch Assignee Names ---
          if (Array.isArray(sub.assignedTo)) {
            const assigneeFetches = sub.assignedTo.map(async (ref) => {
              const pathParts = ref.path?.split('/') || [];
              const assigneeId = pathParts[pathParts.length - 1];
              if (assigneeId) {
                const assigneeRes = await fetch(`/api/users/${assigneeId}`, {
                  headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                if (assigneeRes.ok) {
                  const assigneeData = await assigneeRes.json();
                  return assigneeData.user?.name || assigneeData.name || 'Unnamed';
                }
              }
              return null;
            });
            assigneeNames = (await Promise.all(assigneeFetches)).filter(Boolean);
          }

        } catch (err) {
        }

        return {
          ...sub,
          projectTitle: projectName,
          creatorName,
          assigneeNames,
        };
      })
    );

    subtasks.value = enrichedSubtasks;
  } catch (error) {
    subtasks.value = [];
  }
};

// === Handle Subtask Creation ===
const handleSubtaskCreated = (newSubtask) => {
  // Refresh subtasks list
  fetchSubtasks();
};

// === Handle Subtask Click ===
const handleSubtaskClick = (subtaskId) => {
  router.push({ name: 'SubtaskDetail', params: { id: taskId.value, subtaskId } });
};

onMounted(() => {
  fetchTask();
  fetchSubtasks();
});

// Watch for route parameter changes to re-fetch data
watch(
  () => [route.params.id, route.params.subtaskId],
  () => {
    fetchTask();
    fetchSubtasks();
  },
  { deep: true }
);

const refreshTask = () => {
  fetchTask();
  fetchSubtasks();
};
const openEditModal = () => (isEditModalOpen.value = true);

// === Format Firestore Dates ===
// === Safe date converter ===
const toJsDate = (value) => {
  if (!value) return null
  // Firestore Timestamp object
  if (typeof value?.toDate === 'function') return value.toDate()
  // Admin SDK timestamp ({ seconds / nanoseconds } or {_seconds/_nanoseconds})
  if (typeof value === 'object') {
    const s = value.seconds ?? value._seconds
    const ns = value.nanoseconds ?? value._nanoseconds
    if (typeof s === 'number') return new Date(s * 1000 + Math.floor((ns ?? 0) / 1e6))
  }
  // ISO string or number
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return isNaN(d) ? null : d
  }
  // Already a Date
  if (value instanceof Date) return value
  return null
}

const formatDate = (date) => {
  if (date?.toDate) return date.toDate().toLocaleString(); // show both date & time
  return new Date(date).toLocaleString();
};
</script>

<style scoped>
.loading-spinner {
  width: 3rem;
  height: 3rem;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
