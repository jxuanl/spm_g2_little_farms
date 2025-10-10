<template>
  <div class="h-screen bg-background flex">
    <!-- Sidebar -->
    <TaskSidebar
      :activeProject="activeProject"
      :projects="projects"
      @projectChange="setActiveProject"
      @createTask="() => (isCreateModalOpen = true)"
    />

    <!-- Main content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="bg-card border-b border-border p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-semibold">All Projects</h2>
            <p class="text-sm text-muted-foreground mt-1">View and manage your projects</p>
          </div>

          <button
            @click="handleNewProjectClick"
            :disabled="!isLoggedIn"
            class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusIcon class="w-4 h-4" />
            {{ showCreateForm ? 'Cancel' : 'New Project' }}
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="flex-1 p-6 overflow-auto">
        <!-- Auth error -->
        <div
          v-if="authError && !isLoggedIn"
          class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700"
        >
          <h4 class="font-semibold text-red-800">Authentication Required</h4>
          <p class="text-sm mt-1">{{ authError }}</p>
        </div>

        <!-- Create Project Form -->
        <div v-if="showCreateForm" class="bg-card border border-border rounded-lg p-6 mb-6">
          <h3 class="text-lg font-semibold mb-4">Create New Project</h3>

          <form @submit.prevent="handleCreateProject" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">
                Project Title <span class="text-red-500">*</span>
              </label>
              <input
                v-model="formData.title"
                type="text"
                placeholder="Enter project title"
                class="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Description</label>
              <textarea
                v-model="formData.desc"
                placeholder="Enter project description"
                rows="3"
                class="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              ></textarea>
            </div>

            <!-- Alerts -->
            <div v-if="error" class="text-red-500 text-sm bg-red-50 p-3 rounded-md">
              {{ error }}
            </div>
            <div v-if="successMessage" class="text-green-600 text-sm bg-green-50 p-3 rounded-md">
              {{ successMessage }}
            </div>

            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="cancelForm"
                class="flex-1 px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="loading"
                class="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ loading ? 'Creating...' : 'Create Project' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Loading -->
        <div v-if="loadingProjects" class="flex items-center justify-center h-96">
          <div class="text-muted-foreground">Loading projects...</div>
        </div>

        <!-- No Projects -->
        <div
          v-else-if="projects.length === 0 && !showCreateForm && isLoggedIn"
          class="flex flex-col items-center justify-center h-96 text-center"
        >
          <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <SettingsIcon class="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 class="text-lg font-medium mb-2">No Projects Yet</h3>
          <p class="text-muted-foreground mb-4">Create your first project to get started.</p>
          <button
            @click="showCreateForm = true"
            class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Create Project
          </button>
        </div>

        <!-- Project List -->
        <!-- <div v-else-if="projects.length > 0" class="space-y-4">
          <h3 class="text-lg font-semibold mb-4">Your Projects</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="project in projects"
              :key="project.id"
              class="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <h4 class="font-semibold text-lg mb-2">{{ project.title }}</h4>
              <p class="text-sm text-muted-foreground mb-3 line-clamp-2">
                {{ project.description || 'No description' }}
              </p>
            </div>
          </div>
        </div> -->
      </div>
    </div>

    <!-- Task Modal -->
    <CreateTaskModal
      :isOpen="isCreateModalOpen"
      @close="() => (isCreateModalOpen = false)"
      @createTask="handleCreateTask"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Settings as SettingsIcon, Plus as PlusIcon } from 'lucide-vue-next';
import TaskSidebar from '../components/TaskSidebar.vue';
import CreateTaskModal from '../components/CreateTaskModal.vue';

/* ----------------------- Reactive States ----------------------- */
const activeProject = ref('all');
const isCreateModalOpen = ref(false);
const projects = ref([]);
const loadingProjects = ref(false);
const showCreateForm = ref(false);
const loading = ref(false);
const error = ref('');
const successMessage = ref('');
const isLoggedIn = ref(false);
const authError = ref('');

const formData = ref({
  title: '',
  desc: ''
});

/* ----------------------- Auth Check ----------------------- */
const checkAuth = () => {
  try {
    const sessionStr = sessionStorage.getItem('userSession');
    if (!sessionStr) {
      isLoggedIn.value = false;
      authError.value = 'You must be logged in to create projects.';
      return false;
    }
    const session = JSON.parse(sessionStr);
    if (!session.uid) {
      isLoggedIn.value = false;
      authError.value = 'Invalid session. Please log in again.';
      return false;
    }
    isLoggedIn.value = true;
    authError.value = '';
    return true;
  } catch {
    isLoggedIn.value = false;
    authError.value = 'Authentication error. Please log in again.';
    return false;
  }
};

/* ----------------------- Project Actions ----------------------- */
const loadProjects = async () => {
  if (!checkAuth()) return;

  loadingProjects.value = true;
  error.value = '';

  try {
    const response = await fetch('/api/projects');
    if (!response.ok) throw new Error('Failed to fetch projects');
    const data = await response.json();
    projects.value = data;
  } catch (err) {
    console.error('Error loading projects:', err);
    error.value = 'Could not load projects. Please try again.';
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

/* ----------------------- Helper Methods ----------------------- */
const resetForm = () => {
  formData.value = { title: '', desc: '' };
  error.value = '';
  successMessage.value = '';
};

const cancelForm = () => {
  showCreateForm.value = false;
  resetForm();
};

const handleNewProjectClick = () => {
  if (!checkAuth()) return;
  showCreateForm.value = !showCreateForm.value;
  if (showCreateForm.value) resetForm();
};

const setActiveProject = (project) => {
  activeProject.value = project;
};

const handleCreateTask = (newTask) => {
  console.log('Created Task:', newTask);
  isCreateModalOpen.value = false;
};

/* ----------------------- Lifecycle ----------------------- */
onMounted(() => {
  if (checkAuth()) loadProjects();
});
</script>
