<template>
  <div class="p-6 max-w-2xl mx-auto min-h-screen flex flex-col">
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

    <div v-if="task">
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
      </div>
    </div>

    <div v-else class="text-gray-500">Loading task details...</div>

    <!-- === Edit button ===
    <div class="mt-10 flex justify-end">
      <button
        class="px-4 py-2 font-medium rounded-md h-9 transition-all"
        :class="[
          canEdit
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer opacity-100'
            : 'bg-gray-300 text-gray-600 cursor-default opacity-60'
        ]"
        :disabled="!canEdit"
        @click="canEdit && openEditModal()"
      >
        Edit Task
      </button>
    </div> -->



    <!-- === Edit Modal === -->
    <EditTaskModal
      :isOpen="isEditModalOpen"
      :task="{ id: route.params.id, ...task }"
      @close="isEditModalOpen = false"
      @updated="refreshTask"
    />

    <div v-if="!isSubtaskView" class="flex-1 flex flex-col">
      <TaskList 
        :tasks="subtasks" 
        :indvTask="true"
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
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    console.warn('⚠️ User not logged in');
    router.push('/login');
    return;
  }

  currentUserId.value = user.uid;

  try {
    // ✅ Get Firebase ID token
    const token = await user.getIdToken();

    // --- Fetch user role securely ---
    const userRes = await fetch(`/api/users/${user.uid}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!userRes.ok) {
      console.error('❌ Failed to fetch user:', await userRes.text());
      return;
    }

    const userData = await userRes.json();
    userRole.value = (userData.user?.role || 'staff').toLowerCase();

    // --- Fetch task details ---
    const res = await fetch(`/api/tasks/${route.params.id}?userId=${user.uid}`);
    if (!res.ok) {
      console.error('❌ Task not found or access denied');
      return;
    }

    const data = await res.json();
    task.value = data.task;
    projectTitle.value = data.task.projectTitle;
    creatorName.value = data.task.creatorName;
    assigneeNames.value = data.task.assigneeNames || [];

    const isCreator = data.task.creatorId === user.uid;
    // Managers and creators can edit; HR cannot edit anything
    if (userRole.value === 'hr') {
      canEdit.value = false;
    } else {
      canEdit.value = userRole.value === 'manager' || isCreator;
    }

  } catch (err) {
    console.error('❌ Error fetching task details:', err);
  }
};


/* === Fetch Subtasks === */
const fetchSubtasks = async () => {
  if (isSubtaskView.value) {
    subtasks.value = [];
    return;
  }

  try {
    const response = await fetch(`http://localhost:3001/api/tasks/${taskId.value}/subtasks`);
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
            const projectRes = await fetch(`http://localhost:3001/api/projects/${projectId}`, {
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
            const creatorRes = await fetch(`http://localhost:3001/api/users/${creatorId}`, {
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
                const assigneeRes = await fetch(`http://localhost:3001/api/users/${assigneeId}`, {
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
          console.warn('Error enriching subtask data:', err);
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
    console.error('Error fetching subtasks:', error);
    subtasks.value = [];
  }
};

// === Handle Subtask Creation ===
const handleSubtaskCreated = (newSubtask) => {
  console.log('Subtask created:', newSubtask);
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
