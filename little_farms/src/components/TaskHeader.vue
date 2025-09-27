<template>
  <div class="bg-card border-b border-border p-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-semibold">Task Dashboard</h2>
        <p class="text-sm text-muted-foreground mt-1">
          Manage and track your team's tasks and projects
        </p>
      </div>
      
      <div class="flex items-center gap-3">
        <button class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-9 px-4">
          <Bell class="w-4 h-4" />
        </button>
        
        <div class="relative">
          <button 
            class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-9 px-4"
            @click="showDropdown = !showDropdown"
          >
            <MoreVertical class="w-4 h-4" />
          </button>
          
          <div 
            v-if="showDropdown"
            class="absolute right-0 top-full mt-2 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md z-50"
            @click="showDropdown = false"
          >
            <div 
              class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
            >
              Export Tasks
            </div>
            <div 
              class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
            >
              Import Tasks
            </div>
            <div class="h-px bg-border my-1" />
            <div 
              class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
            >
              Settings
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { 
  MoreVertical,
  Bell
} from 'lucide-vue-next';

const showDropdown = ref(false);
</script>