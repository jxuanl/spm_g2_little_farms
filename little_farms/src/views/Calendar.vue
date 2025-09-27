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
            <h2 class="text-2xl font-semibold">Calendar</h2>
            <p class="text-sm text-muted-foreground mt-1">
              View tasks in calendar format
            </p>
          </div>
        </div>
      </div>
      
      <div class="flex-1 p-6">
        <div class="flex flex-col items-center justify-center h-96 text-center">
          <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <CalendarIcon class="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 class="text-lg font-medium mb-2">Calendar View</h3>
          <p class="text-muted-foreground mb-4">
            Calendar functionality will be implemented here.
          </p>
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
import { ref } from 'vue';
import { Calendar as CalendarIcon } from 'lucide-vue-next';
import TaskSidebar from '../components/TaskSidebar.vue';
import CreateTaskModal from '../components/CreateTaskModal.vue';

const activeProject = ref("all");
const isCreateModalOpen = ref(false);

const setActiveProject = (project) => {
  activeProject.value = project;
};

const setIsCreateModalOpen = (open) => {
  isCreateModalOpen.value = open;
};

const handleCreateTask = (newTask) => {
  console.log("Create task:", newTask);
};
</script>
