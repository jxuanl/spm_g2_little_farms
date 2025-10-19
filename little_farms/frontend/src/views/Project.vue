<template>
  <div class="h-screen bg-background flex">
    <TaskSidebar :activeProject="activeProject" :projects="projects" @projectChange="setActiveProject"
      @createTask="() => setIsCreateModalOpen(true)" />

    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="bg-card border-b border-border p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-semibold">All Projects</h2>
            <p class="text-sm text-muted-foreground mt-1">
              View and manage your projects
            </p>
          </div>
          <button @click="handleNewProjectClick" v-if="canCreateProject"
            class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <PlusIcon class="w-4 h-4" />
            {{ showCreateForm ? 'Cancel' : 'New Project' }}
          </button>
        </div>
      </div>
    <div class="flex-1 p-6 overflow-auto">
        <!-- Authentication Error -->
        <div v-if="authError && !isLoggedIn"
          class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div class="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none"
              stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="lucide lucide-triangle-alert-icon lucide-triangle-alert">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
            <div>
              <h4 class="font-semibold text-red-800 dark:text-red-200" style="color: red;">Authentication Required</h4>
              <p class="text-sm text-red-700 dark:text-red-300 mt-1">{{ authError }}</p>
            </div>
          </div>
        </div>

        <!-- Create Project Form -->
        <div v-if="showCreateForm" class="bg-card border border-border rounded-lg p-6 mb-6">
          <h3 class="text-lg font-semibold mb-4">Create New Project</h3>

          <form @submit.prevent="handleCreateProject" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">
                Project Title <span class="text-red-500">*</span>
              </label>
              <input v-model="formData.title" type="text" placeholder="Enter project title"
                class="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea v-model="formData.desc" placeholder="Enter project description" rows="3"
                class="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"></textarea>
            </div>

            <div v-if="error" class="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
              {{ error }}
            </div>

            <div v-if="successMessage" class="text-green-600 text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
              {{ successMessage }}
            </div>

            <div class="flex gap-3 pt-2">
              <button type="button" @click="cancelForm"
                class="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors">
                Cancel
              </button>
              <button type="submit" :disabled="loading"
                class="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {{ loading ? 'Creating...' : 'Create Project' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Projects List -->
        <div v-if="loadingProjects" class="flex items-center justify-center h-96">
          <div class="text-muted-foreground">Loading projects...</div>
        </div>

        <div v-else-if="projects.length === 0 && !showCreateForm && isLoggedIn"
          class="flex flex-col items-center justify-center h-96 text-center">
          <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <SettingsIcon class="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 class="text-lg font-medium mb-2">No Projects Yet</h3>
          <p class="text-muted-foreground mb-4">
            {{ canCreateProject ? 'Create your first project to get started.' : 'You do not have permission to create projects.' }}
          </p>
          <button v-if="canCreateProject" @click="showCreateForm = true"
            class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            Create Project
          </button>
        </div>

        <div v-else-if="projects.length > 0" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <router-link 
            v-for="project in projects" 
            class="block bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            :key="project.id" 
            :to="`/projects/${project.id}`"
            >
              <h4 class="font-semibold text-lg mb-2">{{ project.title }}</h4>
              <p class="text-sm text-muted-foreground mb-3 line-clamp-2">
                {{ project.description || 'No description' }}
              </p>
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <CreateTaskModal 
    :isOpen="isCreateModalOpen" 
    @close="() => setIsCreateModalOpen(false)"
    @createTask="handleCreateTask" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { Settings as SettingsIcon, Plus as PlusIcon } from 'lucide-vue-next';
import TaskSidebar from '../components/TaskSidebar.vue';
import CreateTaskModal from '../components/CreateTaskModal.vue';

const activeProject = ref("all");
const isCreateModalOpen = ref(false);
const projects = ref([]);
const loadingProjects = ref(false);
const showCreateForm = ref(false);
const loading = ref(false);
const error = ref('');
const successMessage = ref('');
const isLoggedIn = ref(false);
const authError = ref('');
// const permissionError = ref('');
const userRole = ref('');

const formData = ref({
  title: '',
  description: ''
});

// Check if user is logged in and get their role
const checkAuth = () => {
  try {
    const userSessionStr = sessionStorage.getItem('userSession');
    if (!userSessionStr) {
      isLoggedIn.value = false;
      authError.value = 'You must be logged in to create projects';
      userRole.value = '';
      return false;
    }
    const userSession = JSON.parse(userSessionStr);
    if (!userSession.uid) {
      isLoggedIn.value = false;
      authError.value = 'Invalid user session. Please log in again.';
      userRole.value = '';
      return false;
    }
    
    isLoggedIn.value = true;
    authError.value = '';
    userRole.value = userSession.role || '';
    
    
    return true;
  } catch (err) {
    isLoggedIn.value = false;
    authError.value = 'Authentication error. Please log in again.';
    userRole.value = '';
    return false;
  }
};

// Computed property to check if user can create projects
const canCreateProject = computed(() => {
  return isLoggedIn.value && userRole.value !== 'staff';
});

const setActiveProject = (project) => {
  activeProject.value = project;
};

const setIsCreateModalOpen = (open) => {
  isCreateModalOpen.value = open;
};

const handleNewProjectClick = () => {
  if (!checkAuth()) {
    return;
  }
  
  
  showCreateForm.value = !showCreateForm.value;
  if (showCreateForm.value) {
    resetForm();
  }
};

const resetForm = () => {
  formData.value = {
    title: '',
    desc: ''
  };
  error.value = '';
  successMessage.value = '';
};

const cancelForm = () => {
  showCreateForm.value = false;
  resetForm();
};

const loadProjects = async () => {
  loadingProjects.value = true;
    try {
    const userSession = JSON.parse(sessionStorage.getItem('userSession') || '{}');
    console.log("User session:", userSession)

    if (!userSession.uid) {
      throw new Error("User not logged in or session missing UID");
    }
    
    const res = await fetch(`http://localhost:3001/api/projects?userId=${userSession.uid}&userRole=${userSession.role}`);
    console.log(res)
    
    // Check if response is OK
    if (!res.ok) {
      throw new Error(`Failed to fetch projects: ${res.statusText}`);
    }

    // Parse JSON only if response is OK
    const userProjects = await res.json();
    projects.value = userProjects;

  } catch (err) {
    console.error('Error loading projects:', err);
    error.value = 'Failed to load projects. Please try again.';
  } finally {
    loadingProjects.value = false;
  }
};

const handleCreateProject = async () => {
  error.value = '';
  successMessage.value = '';

  if (!checkAuth()) {
    error.value = authError.value;
    return;
  }

  if (!canCreateProject.value) {
    error.value = 'Staff members are not allowed to create projects.';
    return;
  }

  if (!formData.value.title.trim()) {
    error.value = 'Project title is required.';
    return;
  }

  loading.value = true;

  try {
    const sessionStr = sessionStorage.getItem('userSession');
    const session = JSON.parse(sessionStr);
    console.log(formData.value.desc)

    const response = await fetch('/api/projects/createProject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: formData.value.title,
        desc: formData.value.desc,
        userId: session.uid
      })
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to create project');
    }

    successMessage.value = 'Project created successfully!';
    projects.value.push(result.project); // Update UI immediately

    setTimeout(() => {
      showCreateForm.value = false;
      resetForm();
    }, 1000);
  } catch (err) {
    console.error('Error creating project:', err);
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const handleCreateTask = (newTask) => {
  console.log("Create task:", newTask);
  isCreateModalOpen.value = false;
};

onMounted(() => {
  if (checkAuth()) loadProjects();
});
</script>