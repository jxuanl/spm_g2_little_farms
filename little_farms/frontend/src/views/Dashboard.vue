<template>
  <div class="h-screen bg-background flex">
    <TaskSidebar
      :activeProject="activeProject"
      @projectChange="setActiveProject"
      @createTask="() => setIsCreateModalOpen(true)"
    />

    <div class="flex-1 flex flex-col">
      <TaskHeader />

      <TaskList
        :tasks="filteredTasks"
        @taskClick="handleTaskClick"
        @createTask="() => setIsCreateModalOpen(true)"
        :searchQuery="searchQuery"
        @searchChange="setSearchQuery"
        :statusFilter="statusFilter"
        @statusFilterChange="setStatusFilter"
        :priorityFilter="priorityFilter"
        @priorityFilterChange="setPriorityFilter"
      />
    </div>

    <CreateTaskModal
      :isOpen="isCreateModalOpen"
      @close="() => setIsCreateModalOpen(false)"
      @taskCreated="handleTaskCreated"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { auth, db } from '../../firebase';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import TaskSidebar from '../components/TaskSidebar.vue';
import TaskHeader from '../components/TaskHeader.vue';
import TaskList from '../components/TaskList.vue';
import CreateTaskModal from '../components/CreateTaskModal.vue';

const tasks = ref([]);
const activeProject = ref("all");
const searchQuery = ref("");
const statusFilter = ref("all");
const priorityFilter = ref("all");
const isCreateModalOpen = ref(false);

// track current user
const currentUserId = ref(auth.currentUser?.uid || null);

// Fetch tasks from Firestore
onSnapshot(collection(db, "Tasks"), (snapshot) => {
  tasks.value = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
});

// Filters
const filteredTasks = computed(() => {
  return tasks.value.filter(task => {
    const matchesProject = activeProject.value === "all" || task.project?.toLowerCase().includes(activeProject.value);
    const matchesSearch = task.title?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesStatus = statusFilter.value === "all" || task.status === statusFilter.value;
    const matchesPriority = priorityFilter.value === "all" || task.priority === priorityFilter.value;
    
    // no assignee filter here → everyone sees all tasks
    return matchesProject && matchesSearch && matchesStatus && matchesPriority;
  });
});


const setActiveProject = (project) => activeProject.value = project;
const setSearchQuery = (query) => searchQuery.value = query;
const setStatusFilter = (status) => statusFilter.value = status;
const setPriorityFilter = (priority) => priorityFilter.value = priority;
const setIsCreateModalOpen = (open) => isCreateModalOpen.value = open;

const handleTaskCreated = (newTask) => {
  console.log('Task created:', newTask);
  // For now, we'll just log it. In a real app, you might want to refresh the tasks list
  // or add the new task to the existing list with proper formatting
};

const handleTaskClick = (taskId) => {
  console.log("Edit task:", taskId);
};
</script>
