<template>
  <div class="h-screen bg-background flex flex-col">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex-1 flex flex-col items-center justify-center">
      <div class="loading-spinner"></div>
      <p class="text-muted-foreground">Loading project...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center">
      <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h3 class="text-lg font-medium mb-2 text-red-800">Failed to Load Project</h3>
      <p class="text-muted-foreground mb-4">{{ error }}</p>
      <div class="flex gap-3">
        <button 
          @click="loadProject"
          class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
        <button 
          @click="router.push({ name: 'Projects' })"
          class="px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors"
        >
          Back to Projects
        </button>
      </div>
    </div>

    <!-- Content -->
    <template v-else-if="project">
      <div class="bg-card border-b border-border p-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-semibold">{{ project.title }}</h1>
            <p class="text-sm text-muted-foreground mt-1">
              <strong>Owner:</strong> {{ project.ownerName || 'Unknown' }}
            </p>
            <p class="text-sm text-muted-foreground">
              <strong>Description:</strong> {{ project.description || 'No description' }}
            </p>
          </div>
          <button 
            @click="router.push({ name: 'Projects' })"
            class="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Projects
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-auto">
        <TaskList 
          v-if="project.tasks && project.tasks.length > 0"
          :tasks="enrichedTasks" 
          :hideProjectFilter="true"
          @taskClick="handleTaskClick"
          @createTask="() => canCreateTask ? isCreateModalOpen = true : showPermissionError()"
        />
        <div v-else class="flex flex-col items-center justify-center h-96 text-center">
          <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <span class="text-2xl">📋</span>
          </div>
          <h3 class="text-lg font-medium mb-2">No Tasks Yet</h3>
          <p class="text-muted-foreground">
            {{ canCreateTask 
              ? "You don't have any tasks assigned in this project." 
              : "You don't have permission to create tasks in this project." 
            }}
          </p>
        </div>
      </div>
    </template>

    <!-- Permission Error Toast -->
    <div 
      v-if="showPermissionMessage"
      class="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg z-50 max-w-md"
    >
      <div class="flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
        <div>
          <h4 class="font-semibold text-red-800">Permission Denied</h4>
          <p class="text-sm text-red-700 mt-1">{{ permissionMessage }}</p>
        </div>
      </div>
    </div>

    <CreateTaskModal
      :isOpen="isCreateModalOpen"
      :parentProject="{ id: project?.id, name: project?.title }"
      @close="() => isCreateModalOpen = false"
      @taskCreated="handleTaskCreated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getAuth } from 'firebase/auth';
import TaskList from '../components/TaskList.vue';
import CreateTaskModal from '../components/CreateTaskModal.vue';

const route = useRoute();
const router = useRouter();
const project = ref(null);
const isCreateModalOpen = ref(false);
const currentUserId = ref('');
const userRole = ref('');
const showPermissionMessage = ref(false);
const permissionMessage = ref('');
const isLoading = ref(true);
const error = ref(null);

// ✅ Role-based access control
const canCreateTask = computed(() => {
  // HR cannot create tasks
  if (userRole.value === 'hr') return false;
  
  // Managers and Staff can create tasks
  if (userRole.value === 'manager' || userRole.value === 'staff') return true;
  
  return false;
});

const canEditTask = (task) => {
  // HR cannot edit tasks
  if (userRole.value === 'hr') return false;
  
  // Managers can edit all tasks
  if (userRole.value === 'manager') return true;
  
  // Staff can only edit tasks they created
  if (userRole.value === 'staff') {
    const creatorId = 
      task.creatorId || 
      task.taskCreatedBy?.id || 
      task.taskCreatedBy?._path?.segments?.slice(-1)[0] ||
      null;
    return creatorId === currentUserId.value;
  }
  
  return false;
};

// ✅ Enrich tasks with edit permission flag
const enrichedTasks = computed(() => {
  if (!project.value?.tasks) return [];
  
  return project.value.tasks.map(task => ({
    ...task,
    canEdit: canEditTask(task)
  }));
});

const showPermissionError = () => {
  if (userRole.value === 'hr') {
    permissionMessage.value = 'HR users cannot create or edit tasks.';
  } else {
    permissionMessage.value = 'You do not have permission to perform this action.';
  }
  
  showPermissionMessage.value = true;
  setTimeout(() => {
    showPermissionMessage.value = false;
  }, 3000);
};

const handleTaskClick = (taskId) => {
  router.push({ name: 'TaskDetail', params: { id: taskId } });
};

const handleTaskCreated = () => {
  // Reload project data after task creation
  loadProject();
};

const loadProject = async () => {
  isLoading.value = true;
  error.value = null;
  
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      router.push('/login');
      return;
    }

    const token = await user.getIdToken();
    currentUserId.value = user.uid;

    // Fetch user role
    const userRes = await fetch(`/api/users/${user.uid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!userRes.ok) {
      throw new Error('Failed to fetch user data');
    }
    
    const userData = await userRes.json();
    userRole.value = (userData.user?.role || 'staff').toLowerCase();

    console.log('🔐 User role:', userRole.value);

    // Fetch project details (backend now returns ownerName)
    const projectId = route.params.id;
    const res = await fetch(`http://localhost:3001/api/projects/${projectId}?userId=${user.uid}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('Project not found');
      } else if (res.status === 403) {
        throw new Error('You do not have permission to view this project');
      } else {
        throw new Error('Failed to load project');
      }
    }
    
    project.value = await res.json();
    
    console.log('✅ Project loaded with owner:', project.value.ownerName);

  } catch (err) {
    console.error('Error loading project:', err);
    error.value = err.message || 'An unexpected error occurred';
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadProject();
});
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