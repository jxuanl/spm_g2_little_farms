<template>
  <div class="w-64 bg-card border-r border-border h-full flex flex-col">
    <div class="p-6">
      <div class="flex items-center gap-2 mb-8">
        <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Folder class="w-4 h-4 text-primary-foreground" />
        </div>
        <h1 class="text-lg font-semibold">TaskManager</h1>
      </div>

      <!-- <button 
        class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full mb-8"
        @click="$emit('createTask')"
      >
        <Plus class="w-4 h-4 mr-2" />
        New Task
      </button> -->

      <!-- Menu Items -->
      <nav class="space-y-2">
        <router-link
          v-for="item in menuItems"
          :key="item.id"
          :to="item.path"
          :class="[ 
            'inline-flex items-center justify-start gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all w-full h-10 px-4 py-2',
            $route.path === item.path
              ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              : 'hover:bg-accent hover:text-accent-foreground'
          ]"
        >
          <component :is="item.icon" class="w-4 h-4 mr-2" />
          {{ item.label }}
        </router-link>
      </nav>
    </div>

    <!-- === Bottom User Card (sticks to bottom) === -->
    <div class="p-6 border-t">
      <div class="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span class="text-xs text-primary-foreground font-medium">JD</span>
          </div>
          <div class="flex-1">
            <div class="text-sm font-medium">John Doe</div>
            <div class="text-xs text-muted-foreground">john@company.com</div>
          </div>
          <ChevronDown class="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  </div>
</template>


<script setup>
import { 
  Home, 
  BarChart3, 
  Plus, 
  ChevronDown, 
  LucideFolderKanban 
} from 'lucide-vue-next';

defineProps({
  activeProject: String
});

defineEmits(['projectChange', 'createTask']);

const menuItems = [
  { id: "all-tasks", label: "All Tasks", icon: Home, path: "/all-tasks" },
  { id: "project", label: "All Projects", icon: LucideFolderKanban, path: "/project" },
  { id: "reports", label: "Reports", icon: BarChart3, path: "/reports" },
  { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  { id: "projects", label: "All Projects", icon: LucideFolderKanban, path: "/projects" },
];

</script>
