<template>
  <div class="h-screen bg-background flex">
    <TaskSidebar 
      :activeProject="activeProject" 
      @projectChange="setActiveProject"
      @createTask="() => setIsCreateModalOpen(true)" 
    />
    
    <!-- Loading State -->
    <div v-if="isLoading" class="flex-1 flex flex-col items-center justify-center">
      <div class="loading-spinner"></div>
      <p class="text-muted-foreground">{{ isSubtaskView ? 'Loading subtask...' : 'Loading task...' }}</p>
    </div>

    <!-- Main Content -->
    <div v-else-if="task" class="flex-1 overflow-auto">
      <div class="max-w-7xl mx-auto p-6 my-8">
        
        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
          <button 
            @click="router.push(isSubtaskView ? { name: 'TaskDetail', params: { id: taskId } } : { name: 'AllTasks' })"
            class="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span class="text-sm font-medium">
              {{ isSubtaskView ? 'Back to Parent Task' : 'Back to Task List' }}
            </span>
          </button>
          
          <div class="flex items-center gap-3 bg-blue-50 rounded-lg px-4 py-2">
            <button
              @click="canEdit && openEditModal()"
              :disabled="!canEdit"
              :class="[
                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                canEdit
                  ? 'text-primary bg-blue-100 hover:bg-blue-200'
                  : 'text-gray-400 bg-gray-100 cursor-not-allowed opacity-60'
              ]"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {{ isSubtaskView ? 'Edit Subtask' : 'Edit Task' }}
            </button>

            <button
              v-if="canDelete"
              @click="handleDelete"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-lg transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {{ isSubtaskView ? 'Delete Subtask' : 'Delete Task' }}
            </button>
          </div>
        </div>

        <!-- Task Details Card -->
        <div class="bg-card rounded-xl border border-border p-6 mb-6 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h1 class="text-2xl font-semibold text-foreground">{{ task.title }}</h1>
            <button 
              @click="isTaskDetailsCollapsed = !isTaskDetailsCollapsed"
              class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{{ isTaskDetailsCollapsed ? 'Show Details' : 'Hide Details' }}</span>
              <svg 
                class="w-4 h-4 transition-transform duration-200" 
                :class="{ 'rotate-180': !isTaskDetailsCollapsed }"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          <p class="text-muted-foreground mb-6">{{ task.description || 'No description' }}</p>

          <!-- Collapsible Task Details -->
          <div v-if="!isTaskDetailsCollapsed">
            <!-- Info Grid -->
            <div class="grid grid-cols-4 gap-6 mb-6">
              <div>
                <div class="text-xs font-medium text-muted-foreground mb-1">Project Name</div>
                <div class="text-sm font-medium text-foreground">{{ projectTitle || 'No project' }}</div>
              </div>
              <div>
                <div class="text-xs font-medium text-muted-foreground mb-1">Priority</div>
                <div class="flex items-center gap-1">
                  <span 
                    :class="[
                      'w-2 h-2 rounded-full',
                      task.priority <= 3 ? 'bg-green-500' : task.priority <= 6 ? 'bg-yellow-500' : 'bg-orange-500'
                    ]"
                  ></span>
                  <span 
                    :class="[
                      'text-sm font-semibold',
                      task.priority <= 3 ? 'text-green-600' : task.priority <= 6 ? 'text-yellow-600' : 'text-orange-600'
                    ]"
                  >
                    {{ task.priority }}
                  </span>
                </div>
              </div>
              <div>
                <div class="text-xs font-medium text-muted-foreground mb-1">Status</div>
                <span 
                  :class="[
                    'inline-flex px-2 py-1 text-xs font-medium rounded-md',
                    task.status === 'Done' ? 'bg-green-100 text-green-700' :
                    task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  ]"
                >
                  {{ task.status }}
                </span>
              </div>
              <div>
                <div class="text-xs font-medium text-muted-foreground mb-1">Deadline</div>
                <div class="text-sm font-medium text-foreground flex items-center gap-1">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {{ task.deadline ? formatDate(task.deadline) : 'No due date' }}
                </div>
              </div>
            </div>

            <div class="grid grid-cols-4 gap-6 mb-6">
              <div>
                <div class="text-xs font-medium text-muted-foreground mb-1">Created Date</div>
                <div class="text-sm text-foreground">{{ task.createdDate ? formatDate(task.createdDate) : 'Unknown' }}</div>
              </div>
              <div>
                <div class="text-xs font-medium text-muted-foreground mb-1">Modified Date</div>
                <div class="text-sm text-foreground">{{ task.modifiedDate ? formatDate(task.modifiedDate) : 'Unknown' }}</div>
              </div>
              <div>
                <div class="text-xs font-medium text-muted-foreground mb-1">Overdue</div>
                <div :class="task.isOverdue ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'">
                  {{ task.isOverdue ? 'Yes' : 'No' }}
                </div>
              </div>
              <div>
                <div class="text-xs font-medium text-muted-foreground mb-1">Tags</div>
                <div class="text-sm text-foreground">
                  <template v-if="Array.isArray(task.tags) && task.tags.length">
                    {{ task.tags.join(', ') }}
                  </template>
                  <template v-else>
                    No tags
                  </template>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-4 gap-6 mb-6">
              <div>
                <div class="text-xs font-medium text-muted-foreground mb-1">Creator</div>
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                    {{ creatorName ? creatorName[0].toUpperCase() : 'U' }}
                  </div>
                  <span class="text-sm font-medium text-foreground">{{ creatorName || 'No creator' }}</span>
                </div>
              </div>
              <div>
                <div class="text-xs font-medium text-muted-foreground mb-1">Assignees</div>
                <div class="flex items-center gap-2">
                  <template v-if="assigneeNames.length">
                    <div 
                      v-for="(assignee, idx) in assigneeNames.slice(0, 3)" 
                      :key="idx"
                      class="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-medium"
                    >
                      {{ assignee[0].toUpperCase() }}
                    </div>
                    <span class="text-sm font-medium text-foreground">{{ assigneeNames.join(', ') }}</span>
                  </template>
                  <template v-else>
                    <span class="text-sm text-muted-foreground">No assignees</span>
                  </template>
                </div>
              </div>
            </div>

            <!-- Recurring Info -->
            <div v-if="task.recurring" class="border-t border-border pt-4">
              <div class="text-xs font-medium text-muted-foreground mb-2">Recurring</div>
              <div class="flex items-center gap-2 text-sm">
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span class="text-blue-600 font-semibold">
                  Yes - Every {{ task.recurrenceValue }} {{ task.recurrenceInterval }}
                </span>
              </div>
              
              <div v-if="task.isCurrentInstance && !task.isNewInstance" class="mt-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                This is the current instance. A new task will be created when marked as complete.
              </div>
              
              <div v-if="task.isNewInstance" class="mt-2 flex items-center gap-2 text-sm font-semibold text-green-800 bg-green-50 border-2 border-green-300 rounded-lg px-3 py-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>New Instance - This recurring task instance just started!</span>
              </div>
            </div>
            <div v-else class="border-t border-border pt-4">
              <div class="text-xs font-medium text-muted-foreground mb-1">Recurring</div>
              <span class="text-sm text-gray-600">No</span>
            </div>
          </div>
        </div>

        <!-- Main Content Layout Grid -->
        <div class="grid grid-cols-12 gap-6">
          <!-- Subtasks Section (only for main tasks, not subtasks) - 9/12 width -->
          <div v-if="!isSubtaskView" class="col-span-8 bg-card rounded-xl border border-border p-6 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-semibold text-foreground">Subtasks</h2>
              <!-- <button
                @click="() => isCreateModalOpen = true"
                class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                New Subtask
              </button> -->
            </div>

            <!-- Subtasks List -->
            <TaskList 
              :tasks="subtasks" 
              :indvTask="true"
              :parentTaskId="taskId"
              :hideProjectFilter="true"
              @createTask="() => isCreateModalOpen = true"
              @taskClick="handleSubtaskClick"
            />
          </div>

          <!-- Comments Section - 3/12 width -->
          <div class="col-span-4 bg-card rounded-xl border border-border p-6 shadow-sm">
            <CommentsSection 
              v-if="task && currentUser"
              :taskId="taskId"
              :subtaskId="isSubtaskView ? subtaskId : null"
              :currentUserId="currentUser.uid"
              :taskName="task.title"
              @commentsUpdated="handleCommentsUpdated"
            />
          </div>
        </div>
        />
      </div>
    </div>

    <!-- Modals -->
    <EditTaskModal
      :isOpen="isEditModalOpen"
      :task="{ ...task, id: isSubtaskView ? subtaskId : taskId }"
      :isSubtask="isSubtaskView"
      :parentTaskId="isSubtaskView ? taskId : null"
      @close="isEditModalOpen = false"
      @updated="refreshTask"
    />

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
import CommentsSection from '../components/CommentsSection.vue';
import TaskSidebar from '../components/TaskSidebar.vue';

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
const canDelete = ref(false);
const isManagersProject = ref(false);
const isLoading = ref(true);
const isCreateModalOpen = ref(false);
const currentUser = ref(null);
const isTaskDetailsCollapsed = ref(false); // New reactive variable for collapsible state

const props = defineProps({
  id: String,
});

const isSubtaskView = computed(() => !!route.params.subtaskId);
const taskId = computed(() => route.params.id);
const subtaskId = computed(() => route.params.subtaskId);

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

    const userRes = await fetch(`/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const userData = await userRes.json();
    userRole.value = (userData.user?.role || 'staff').toLowerCase();

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

    isManagersProject.value = false;

    const projId = extractProjectId(taskData.projectId);
    if (userRole.value === 'manager' && projId) {
      try {
        const projRes = await fetch(`/api/projects/${projId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (projRes.ok) {
          const projData = await projRes.json();
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

const fetchSubtasks = async () => {
  if (isSubtaskView.value) {
    subtasks.value = [];
    return;
  }

  try {
    const response = await fetch(`/api/tasks/${taskId.value}/subtasks`);
    const enrichedSubtasks = response.ok ? await response.json() : [];
    subtasks.value = enrichedSubtasks;
  } catch (error) {
    subtasks.value = [];
  }
};

const handleSubtaskCreated = (newSubtask) => {
  fetchSubtasks();
};

const handleSubtaskClick = (subtaskId) => {
  router.push({ name: 'SubtaskDetail', params: { id: taskId.value, subtaskId } });
};

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

const handleCommentsUpdated = () => {
  console.log('Comments updated');
};

const refreshTask = () => {
  fetchTask();
  fetchSubtasks();
};

const openEditModal = () => (isEditModalOpen.value = true);

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

    if (isSubtaskView.value) {
      router.push({ name: 'TaskDetail', params: { id: taskId.value } });
    } else {
      router.push({ name: 'AllTasks' });
    }
  } catch (e) {
    alert('Failed to delete. Please try again.');
  }
};

const formatDate = (date) => {
  if (date?.toDate) return date.toDate().toLocaleString();
  return new Date(date).toLocaleString();
};

onMounted(() => {
  currentUser.value = getCurrentUser();
  
  if (!currentUser.value) {
    console.warn('No user session found');
    return;
  }
  
  fetchTask();
  fetchSubtasks();
});

watch(
  () => [route.params.id, route.params.subtaskId],
  () => {
    fetchTask();
    fetchSubtasks();
  },
  { deep: true }
);
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