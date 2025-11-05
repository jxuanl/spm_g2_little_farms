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
        <div class="flex items-center gap-4">
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
      </div>

      <!-- === Action buttons === -->
      <div class="mt-10 flex justify-end gap-3">
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

        <!-- NEW: Delete button (creator or manager-own-project only) -->
        <button
          v-if="canDelete"
          @click="handleDelete"
          class="px-4 py-2 font-medium rounded-md h-9 bg-destructive text-white hover:bg-destructive/90 transition-colors shadow-sm">
          {{ isSubtaskView ? 'Delete Subtask' : 'Delete Task' }}
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
    
    <!-- === Comments Section === -->
    <CommentsSection 
      v-if="task && currentUser"
      :taskId="taskId"
      :subtaskId="isSubtaskView ? subtaskId : null"
      :currentUserId="currentUser.uid"
      :taskName="task.title"
      @commentsUpdated="handleCommentsUpdated"
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
import CommentsSection from '../components/CommentsSection.vue';

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

/* NEW: delete permission state */
const canDelete = ref(false);
const isManagersProject = ref(false);

const isLoading = ref(true);
const props = defineProps({
  id: String, // comes from route   -> id should be a reference
})
const isCreateModalOpen = ref(false);

// Check if this is a subtask view
const isSubtaskView = computed(() => !!route.params.subtaskId);
const taskId = computed(() => route.params.id);
const subtaskId = computed(() => route.params.subtaskId);

// === helper: extract projectId string from a doc ref-like object ===
const extractProjectId = (proj) => {
  if (!proj) return null;
  if (typeof proj === 'string') return proj;
  if (proj.id) return proj.id;
  if (proj.path) {
    const parts = proj.path.split('/');
    return parts[parts.length - 1] || null;
  }
  if (proj._path?.segments?.length) {
    const parts = proj._path.segments;
    return parts[parts.length - 1] || null;
  }
  return null;
};

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
  currentUserId.value = userId;

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

    // ✅ Edit permission logic (unchanged)
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

    // ✅ Delete permission logic (NEW)
    // Allowed if creator OR (manager AND the project belongs to this manager)
    // We determine manager-owned project by fetching the project and checking its owner.
    isManagersProject.value = false;

    const projId = extractProjectId(taskData.projectId);
    if (userRole.value === 'manager' && projId) {
      try {
        const projRes = await fetch(`/api/projects/${projId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (projRes.ok) {
          const projData = await projRes.json();
          // project owner may be at projData.project.owner or projData.owner
          const ownerPath =
            projData.project?.owner?.path ||
            (projData.project?.owner?._path?.segments?.join('/')) ||
            projData.owner?.path ||
            (projData.owner?._path?.segments?.join('/')) ||
            null;

          let ownerId = null;
          if (ownerPath) {
            const parts = ownerPath.split('/');
            ownerId = parts[parts.length - 1] || null;
          } else if (projData.project?.owner?.id) {
            ownerId = projData.project.owner.id;
          } else if (projData.owner?.id) {
            ownerId = projData.owner.id;
          }

          isManagersProject.value = ownerId === userId;
        }
      } catch (e) {
        isManagersProject.value = false;
      }
    }

    canDelete.value = Boolean(isCreator || isManagersProject.value);

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
    const enrichedSubtasks = response.ok ? await response.json() : [];

    // Backend now returns subtasks already enriched with projectTitle, creatorName, and assigneeNames
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

// === Get Current User ID ===
const getCurrentUserId = () => {
  try {
    const userSession = sessionStorage.getItem('userSession');
    if (userSession) {
      const userData = JSON.parse(userSession);
      return userData.uid || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting user ID from session:', error);
    return null;
  }
};

// Add user state management
const currentUser = ref(null);

// Add function to get full user data
const getCurrentUser = () => {
  try {
    const userSession = sessionStorage.getItem('userSession');
    if (userSession) {
      return JSON.parse(userSession);
    }
    return null;
  } catch (error) {
    console.error('Error getting user from session:', error);
    return null;
  }
};

// Update onMounted to check user session
onMounted(() => {
  currentUser.value = getCurrentUser();
  
  if (!currentUser.value) {
    console.warn('No user session found');
    // Optionally redirect to login
    // router.push({ name: 'Login' });
    return;
  }
  
  fetchTask();
  fetchSubtasks();
});

// === Handle Comments Updated ===
const handleCommentsUpdated = () => {
  // Optional: refresh task data or perform other actions when comments are updated
  console.log('Comments updated');
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

/* NEW: Delete handler */
const handleDelete = async () => {
  if (!canDelete.value || !task.value) return;

  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    router.push('/login');
    return;
  }
  const token = await user.getIdToken();
  const userId = user.uid;

  const confirmed = window.confirm(
    isSubtaskView.value
      ? 'Are you sure you want to delete this subtask? This action cannot be undone.'
      : 'Are you sure you want to delete this task? This action cannot be undone.'
  );
  if (!confirmed) return;

  try {
    let res;
    if (isSubtaskView.value) {
      res = await fetch(`/api/tasks/${taskId.value}/subtasks/${subtaskId.value}?userId=${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    } else {
      res = await fetch(`/api/tasks/${taskId.value}?userId=${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    }

    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))).message || 'Failed to delete';
      alert(msg);
      return;
    }

    // Navigate after deletion
    if (isSubtaskView.value) {
      router.push({ name: 'TaskDetail', params: { id: taskId.value } });
    } else {
      router.push({ name: 'AllTasks' });
    }
  } catch (e) {
    alert('Failed to delete. Please try again.');
  }
};

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
