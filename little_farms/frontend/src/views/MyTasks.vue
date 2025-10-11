<template>
  <div class="h-screen bg-background flex">
    <TaskSidebar :activeProject="activeProject" @projectChange="setActiveProject"
      @createTask="() => setIsCreateModalOpen(true)" />

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

        <!-- <TaskListForMyTasks 
          v-else
          :tasks="myTasks" 
          @taskClick="handleTaskClick" 
          @createTask="() => setIsCreateModalOpen(true)"
        /> -->

        <div v-else class="overflow-x-auto">
          <div class="mb-4 flex gap-4 items-center">
            <input type="text" v-model="searchQuery" placeholder="Search tasks..." class="border p-2 rounded" />
            <select v-model="statusFilter" class="border p-2 rounded">
              <option value="all">All Status</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
            <select v-model="priorityFilter" class="border p-2 rounded">
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <table class="min-w-full bg-white">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Project</th>
                <th>Assignee</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="task in filteredTasks" :key="task.id" @click="handleTaskClick(task.id)" class="cursor-pointer hover:bg-gray-500">
                <td>{{ task.title }}</td>
                <td>{{ task.status }}</td>
                <td>{{ task.priority }}</td>
                <td>{{ task.project }}</td>
                <td>{{ task.assignedTo }}</td>
                <td>{{ task.deadline }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <CreateTaskModal :isOpen="isCreateModalOpen" @close="() => setIsCreateModalOpen(false)"
    @createTask="handleCreateTask" />
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { Users } from 'lucide-vue-next';
import TaskSidebar from '../components/TaskSidebar.vue';
import CreateTaskModal from '../components/CreateTaskModal.vue';
import TaskListForMyTasks from '../components/TaskListForMyTasks.vue';

const searchQuery = ref('');
const statusFilter = ref('all');
const priorityFilter = ref('all');
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

const handleTaskClick = (taskId) => {
  console.log('Task clicked:', taskId);
};

// async function fetchTasks() {
//   if (!currentUser.value?.id) {
//     console.error("No ID found for current user");
//     return;
//   }

//   try {
//     // const response = await fetch(`/api/tasks/${currentUser.value.id}`);
//     const response = await fetch(`/api/tasks?userId=${currentUser.value.id}`);
//     // const response = await fetch(`/api/tasks?userId=nDEfuE5zYzMPtZX33xJUY88qpy13`);
//     console.log(response)
//     if (!response.ok) throw new Error("Failed to fetch tasks");

//     const tasks = await response.json();
//     myTasks.value = tasks.map(task => ({
//       id: task.id,
//       title: task.title,
//       description: task.description,
//       tags: task.tags || [],
//       status: task.status,
//       priority: task.priority,
//       project: task.projectId || "No Project",
//       assignee: {
//         name: currentUser.value.name,
//         initials: currentUser.value.name
//           .split(" ")
//           .map(n => n[0])
//           .join("")
//           .toUpperCase(),
//       },
//       dueDate: task.deadline || task.createdDate,
//       progress: task.progress || 0,
//       comments: task.comments || 0,
//       attachments: task.attachments || 0,
//     }));
//   } catch (err) {
//     console.error("Error fetching tasks:", err);
//   } finally {
//     loading.value = false;
//   }
// }

const fetchTasks = async () => {
  loading.value = true;
  try {
    const response = await fetch(`/api/tasks?userId=${currentUser.value.id}`);
    if (!response.ok) throw new Error('Failed to fetch tasks');
    const tasks = await response.json();
    myTasks.value = tasks.map(task => ({
      ...task,
      project: task.projectId || 'No Project'
    }));
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
};


const filteredTasks = computed(() => {
  return myTasks.value.filter(task => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.value.toLowerCase());

    const matchesStatus =
      statusFilter.value === 'all' || task.status === statusFilter.value;

    const matchesPriority =
      priorityFilter.value === 'all' || task.priority === priorityFilter.value;

    const matchesProject =
      activeProject.value === 'all' || task.project === activeProject.value;

    return matchesSearch && matchesStatus && matchesPriority && matchesProject;
  });
});

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