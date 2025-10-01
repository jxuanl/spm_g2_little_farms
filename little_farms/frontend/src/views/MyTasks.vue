<template>
  <div class="h-screen bg-background flex">
    <TaskSidebar 
      :activeProject="activeProject" 
      @projectChange="setActiveProject"
      @createTask="() => setIsCreateModalOpen(true)" 
    />
  
    <div class="flex-1 flex flex-col">
      <div class="bg-card border-b border-border p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-semibold">My Tasks</h2>
            <p class="text-sm text-muted-foreground mt-1">
              View and manage your assigned tasks
            </p>
          </div>
        </div>
      </div>

      <div class="flex-1 p-6">
        <!-- Loading state -->
        <div v-if="loading" class="flex flex-col items-center justify-center h-96 text-center">
          <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 class="text-lg font-medium mb-2">Loading your tasks...</h3>
          <p class="text-muted-foreground">
            Fetching tasks assigned to you from all projects.
          </p>
        </div>

        <!-- Empty state -->
        <div v-else-if="myTasks.length === 0" class="flex flex-col items-center justify-center h-96 text-center">
          <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Users class="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 class="text-lg font-medium mb-2">No tasks assigned</h3>
          <p class="text-muted-foreground mb-4">
            You don't have any tasks assigned to you across all projects.
          </p>
        </div>

        <TaskListForMyTasks 
          v-else
          :tasks="myTasks" 
          @taskClick="handleTaskClick" 
          @createTask="() => setIsCreateModalOpen(true)"
        />
      </div>
    </div>
  </div>

  <CreateTaskModal 
    :isOpen="isCreateModalOpen" 
    @close="() => setIsCreateModalOpen(false)"
    @createTask="handleCreateTask" 
  />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Users } from 'lucide-vue-next';
import TaskSidebar from '../components/TaskSidebar.vue';
import CreateTaskModal from '../components/CreateTaskModal.vue';
import TaskListForMyTasks from '../components/TaskListForMyTasks.vue';

const activeProject = ref("all");
const isCreateModalOpen = ref(false);
const loading = ref(false);
const myTasks = ref([]);
const currentUser = ref(null);

// simple layout; no extra filters needed

const setActiveProject = (project) => {
  activeProject.value = project;
};

const setIsCreateModalOpen = (open) => {
  isCreateModalOpen.value = open;
};

const handleCreateTask = (newTask) => {
  console.log("Create task:", newTask);
};

async function fetchTasks() {
  if (!currentUser.value?.id) {
    console.error("No ID found for current user");
    return;
  }

  try {
    // const response = await fetch(`/api/tasks/${currentUser.value.id}`);
    const response = await fetch(`/api/tasks?userId=${currentUser.value.id}`);
    // const response = await fetch(`/api/tasks?userId=nDEfuE5zYzMPtZX33xJUY88qpy13`);
    console.log(response)
    if (!response.ok) throw new Error("Failed to fetch tasks");

    const tasks = await response.json();
    myTasks.value = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      tags: task.tags || [],
      status: task.status,
      priority: task.priority,
      project: task.projectId || "No Project",
      assignee: {
        name: currentUser.value.name,
        initials: currentUser.value.name
          .split(" ")
          .map(n => n[0])
          .join("")
          .toUpperCase(),
      },
      dueDate: task.deadline || task.createdDate,
      progress: task.progress || 0,
      comments: task.comments || 0,
      attachments: task.attachments || 0,
    }));
  } catch (err) {
    console.error("Error fetching tasks:", err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loading.value = true;
  console.log(JSON.parse(sessionStorage.getItem('userSession')));

  // Read sessionStorage only on mount
  const storedUser = sessionStorage.getItem("userSession");
  if (!storedUser) {
    console.error("No user found in session storage");
    loading.value = false;
    return;
  }

  currentUser.value = JSON.parse(storedUser);

  // Only fetch tasks if ID exists
  if (currentUser.value?.id) {
    fetchTasks();
  } else {
    console.error("User session missing ID");
    loading.value = false;
  }
});
</script>