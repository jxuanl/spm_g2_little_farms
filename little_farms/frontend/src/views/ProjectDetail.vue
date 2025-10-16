<template>
  <div class="h-screen bg-background flex flex-col">
    <div class="bg-card border-b border-border p-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold">{{ project?.title || 'Project Details' }}</h1>
          <p class="text-sm text-muted-foreground mt-1">
            <strong>Owner:</strong> {{ ownerName || 'Unknown' }}
          </p>
          <p class="text-sm text-muted-foreground">
            <strong>Description:</strong> {{ project?.description || 'No description' }}
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
        v-if="project?.tasks && project.tasks.length > 0"
        :tasks="enrichedTasks" 
        @taskClick="handleTaskClick"
        @createTask="() => canCreateTask ? isCreateModalOpen = true : showPermissionError()"
      />
      <div v-else class="flex flex-col items-center justify-center h-96 text-center">
        <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <span class="text-2xl">📋</span>
        </div>
        <h3 class="text-lg font-medium mb-2">No Tasks Yet</h3>
        <p class="text-muted-foreground mb-4">
          {{ canCreateTask 
            ? "You don't have any tasks assigned in this project." 
            : "You don't have permission to create tasks in this project." 
          }}
        </p>
        <button 
          v-if="canCreateTask"
          @click="isCreateModalOpen = true"
          class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Create First Task
        </button>
      </div>
    </div>

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
const ownerName = ref('');
const showPermissionMessage = ref(false);
const permissionMessage = ref('');

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
    const userData = await userRes.json();
    userRole.value = (userData.user?.role || 'staff').toLowerCase();

    console.log('🔐 User role:', userRole.value);

    // Fetch project details
    const projectId = route.params.id;
    const res = await fetch(`http://localhost:3001/api/projects/${projectId}?userId=${user.uid}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Failed to load project');
    
    project.value = await res.json();

    // Fetch owner name if owner is a DocumentReference
    if (project.value.owner) {
      try {
        let ownerId;
        if (typeof project.value.owner === 'string') {
          ownerId = project.value.owner;
        } else if (project.value.owner.path) {
          const pathParts = project.value.owner.path.split('/');
          ownerId = pathParts[pathParts.length - 1];
        }

        if (ownerId) {
          const ownerRes = await fetch(`http://localhost:3001/api/users/${ownerId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (ownerRes.ok) {
            const ownerData = await ownerRes.json();
            ownerName.value = ownerData.user?.name || ownerData.name || 'Unknown';
          }
        }
      } catch (err) {
        console.warn('Failed to fetch owner name:', err);
        ownerName.value = 'Unknown';
      }
    }

  } catch (error) {
    console.error('Error loading project:', error);
  }
};

onMounted(() => {
  loadProject();
});
</script>

<style scoped>
/* Add any additional styles here if needed */
</style>