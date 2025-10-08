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
        @click="$emit('createTask')">
        <Plus class="w-4 h-4 mr-2" />
        New Task
      </button> -->

      <nav class="space-y-2">
        <router-link v-for="item in menuItems" :key="item.id" :to="item.path" :class="[
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50',
          'w-full justify-start h-10 px-4 py-2',
          $route.path === item.path
            ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            : 'hover:bg-accent hover:text-accent-foreground'
        ]">
          <component :is="item.icon" class="w-4 h-4 mr-3" />
          {{ item.label }}
        </router-link>
      </nav>
    </div>

    <div class="h-px bg-border" />

    <!-- <div class="p-6 flex-1">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-muted-foreground">Projects</h3>
        <button
          class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 rounded-md gap-1.5 px-3">
          <Plus class="w-3 h-3" />
        </button>
      </div>

      <div class="space-y-2">
        <button v-for="project in projects" :key="project.id" :class="[
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50',
          'w-full justify-start h-auto p-3',
          activeProject === project.id
            ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            : 'hover:bg-accent hover:text-accent-foreground'
        ]" @click="$emit('projectChange', project.id)">
          <div class="flex items-center gap-3 w-full">
            <div :class="['w-3 h-3 rounded-full', project.color]" />
            <div class="flex-1 text-left">
              <div class="text-sm">{{ project.name }}</div>
            </div>
            <span
              class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-secondary text-secondary-foreground hover:bg-secondary/80">
              {{ project.tasksCount }}
            </span>
          </div>
        </button>
      </div>
    </div> -->

    <div class="h-px bg-border" />

    <!-- <div class="p-6">
      <div class="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span class="text-xs text-primary-foreground font-medium">JD</span>
          </div>
          <div class="flex-1">
            <div class="text-sm font-medium">{{ username }}</div>
            <div class="text-xs text-muted-foreground">{{email}}</div>
          </div>
          <ChevronUp class="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </div> -->

    <div class="p-6 relative">
      <button @click="toggleDropdown"
        class="rounded-lg border bg-card text-card-foreground shadow-sm p-4 w-full hover:bg-accent transition-colors">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span class="text-xs text-primary-foreground font-medium">JD</span>
          </div>
          <div class="flex-1 text-left">
            <div class="text-sm font-medium">{{ username }}</div>
            <div class="text-xs text-muted-foreground">{{ email }}</div>
          </div>
          <ChevronDown class="w-4 h-4 text-muted-foreground" />
        </div>
      </button>

      <div v-if="isDropdownOpen" 
      class="bg-danger buttom-full rounded-lg border bg-card shadow-lg overflow-hidden p-2"
      style="border-color: red; color: red;">
        <button @click="handleLogout"
          class="bg-danger w-full px-4 py-3 text-left text-sm hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2 rounded-md">
          Logout
        </button>

        <!-- Success Message -->
        <div v-if="showSuccessMessage"
          class="fixed top-4 left-1/2 transform -translate-x-1/2 bg-success text-success-foreground px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-in slide-in-from-top duration-300"
          style="background-color: forestgreen; padding: 10px 5px 10px 5px;color: white;" >
          <CheckCircle class="w-4 h-4 text-white" />
          <span>Logout successful!</span>
        </div>
      </div>
    </div>



  </div>
</template>

<script setup>
import {
  Home,
  Folder,
  Users,
  Calendar,
  BarChart3,
  Settings,
  Plus,
  ChevronDown,
  LucideFolderKanban,
  CheckCircle
} from 'lucide-vue-next';
import { ref,watch } from 'vue'; // Import ref for reactivity

const userSession = JSON.parse(sessionStorage.getItem('userSession'));
const username = userSession.name;
const email = userSession.email;
var isDropdownOpen = ref(false);
var showSuccessMessage = ref(false)

function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value;
  console.log("Drop down is working")
}


async function handleLogout() {
  console.log("Logging out...");
  
  // Show success message
  showSuccessMessage.value = true;
  
  // Wait a moment for user to see the message
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Perform logout actions
  sessionStorage.removeItem('userSession');
  window.location.href = '/login';
}

// Auto-hide success message after 3 seconds
watch(showSuccessMessage, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      showSuccessMessage.value = false;
    }, 3000);
  }
});

defineProps({
  activeProject: String
});

defineEmits(['projectChange', 'createTask']);

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: Home, path: "/dashboard" },
  { id: "my-tasks", label: "My Tasks", icon: Users, path: "/my-tasks" },
  { id: "calendar", label: "Calendar", icon: Calendar, path: "/calendar" },
  { id: "reports", label: "Reports", icon: BarChart3, path: "/reports" },
  { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  { id: "projects", label: "All Projects", icon: LucideFolderKanban, path: "/projects" },
];

// const projects = [
//   { id: "all", name: "All Tasks", tasksCount: 24, color: "bg-blue-500" },
//   { id: "website", name: "Website Redesign", tasksCount: 8, color: "bg-green-500" },
//   { id: "mobile", name: "Mobile App", tasksCount: 12, color: "bg-purple-500" },
//   { id: "marketing", name: "Marketing Campaign", tasksCount: 4, color: "bg-orange-500" },
// ];



</script>