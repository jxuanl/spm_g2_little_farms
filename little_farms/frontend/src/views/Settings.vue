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
            <h2 class="text-2xl font-semibold">Settings</h2>
            <p class="text-sm text-muted-foreground mt-1">
              Configure your workspace and preferences
            </p>
          </div>
        </div>
      </div>
      
      <div class="flex-1 p-6">
        <div class="flex flex-col items-center justify-center h-96 text-center">
          <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <SettingsIcon class="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 class="text-lg font-medium mb-2">Settings</h3>
          <p class="text-muted-foreground mb-4">
            User preferences and workspace settings will be here.
          </p>
        </div>
      </div>
    </div>

    <CreateTaskModal
      :isOpen="isCreateModalOpen"
      @close="() => setIsCreateModalOpen(false)"
      @taskCreated="handleTaskCreated"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Settings as SettingsIcon } from 'lucide-vue-next';
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

const handleTaskCreated = (newTask) => {
  console.log('Task created:', newTask);
  // For now, we'll just log it. In a real app, you might want to refresh the tasks list
  // or add the new task to the existing list with proper formatting
};
</script>
