<template>
  <div class="w-64 bg-light border-end border-gray-300 h-full flex flex-column">
    <div class="p-4">
      <div class="d-flex align-items-center gap-3 mb-5">
        <div class="w-8 h-8 bg-dark rounded-2 d-flex align-items-center justify-content-center">
          <Folder class="w-4 h-4 text-white" />
        </div>
        <h1 class="h5 fw-semibold mb-0 text-dark">TaskManager</h1>
      </div>

      <!-- <button 
        class="btn btn-secondary w-100 mb-4 rounded-2 d-flex align-items-center justify-content-center gap-2 py-2"
        @click="$emit('createTask')">
        <Plus class="w-4 h-4" />
        New Task
      </button> -->

      <nav class="d-flex flex-column gap-2">
        <router-link v-for="item in menuItems" :key="item.id" :to="item.path"
          class="btn btn-outline-light text-dark text-start rounded-2 py-2 px-3 border-0 d-flex align-items-center text-decoration-none"
          :class="{
            'bg-dark text-white': $route.path === item.path,
            'hover-bg-gray-200': $route.path !== item.path
          }">
          <component :is="item.icon" class="w-4 h-4 me-3" />
          <span class="fw-medium">{{ item.label }}</span>
        </router-link>
      </nav>
    </div>

    <!-- <div class="border-top border-gray-300 my-2" /> -->

    <!-- <div class="p-4 flex-grow-1">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <h3 class="text-muted small fw-medium">Projects</h3>
        <button class="btn btn-outline-light rounded-2 p-2 border-0 hover-bg-gray-200">
          <Plus class="w-3 h-3" />
        </button>
      </div>

      <div class="d-flex flex-column gap-2">
        <button 
          v-for="project in projects" 
          :key="project.id" 
          class="btn btn-outline-light text-start rounded-2 p-3 border-0 d-flex align-items-center w-100"
          :class="{
            'bg-secondary text-white': activeProject === project.id,
            'hover-bg-gray-200': activeProject !== project.id
          }" 
          @click="$emit('projectChange', project.id)">
          <div class="d-flex align-items-center gap-3 w-100">
            <div :class="['rounded-circle', project.color]" style="width: 12px; height: 12px;" />
            <div class="flex-grow-1">
              <div class="small">{{ project.name }}</div>
            </div>
            <span class="badge bg-secondary rounded-pill small">
              {{ project.tasksCount }}
            </span>
          </div>
        </button>
      </div>
    </div> -->

    <div class="border-top border-gray-300 my-2" />

    <!-- User Profile Section -->
    <div class="p-4 position-relative mt-auto">
      <button 
        @click="toggleDropdown"
        class="btn btn-light border text-start rounded-3 p-3 w-100 shadow-sm hover-bg-gray-200 transition-all">
        <div class="d-flex align-items-center gap-3">
          <div class="w-8 h-8 bg-dark rounded-circle d-flex align-items-center justify-content-center">
            <span class="small text-white fw-medium">
              <UserRound />
            </span>
          </div>
          <div class="flex-grow-1">
            <div class="small fw-medium text-dark">{{ username }}</div>
            <div class="x-small text-muted">{{ email }}</div>
          </div>
          <ChevronUpIcon class="w-4 h-4 text-muted" />
        </div>
      </button>


      <!-- Dropdown Menu -->
      <div v-if="isDropdownOpen"
        class="position-absolute bottom-100 start-0 end-0 mx-4 bg-white border rounded-3 shadow-lg overflow-hidden">
        <button @click="handleLogout"
          class="btn btn-outline-danger w-100 text-start py-3 border-0 rounded-0 d-flex align-items-center text-danger hover-bg-danger hover-text-white transition-all">
          <LogOut class="w-4 h-4" />
          <span class="small fw-medium">Logout</span>
        </button>
      </div>
    </div>

      <div v-if="showSuccessMessage" class="position-fixed top-0 start-50 translate-middle-x mt-3" style="z-index: 9999;">
    <div class="alert alert-success d-flex align-items-center gap-2 rounded-3 shadow-sm mx-auto" style="max-width: 400px;" role="alert">
      <CheckCircle class="w-4 h-4 text-muted"/>
      <span class="small fw-medium">
        Logged out successfully
      </span>
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
  CheckCircle,
  ChevronUp,
  ChevronUpIcon,
  UserRound,
} from 'lucide-vue-next';
import { ref, watch } from 'vue'; // Import ref for reactivity

const userSession = JSON.parse(sessionStorage.getItem('userSession'));
const username = userSession.name;
const email = userSession.email;
var isDropdownOpen = ref(false);
var showSuccessMessage = ref(false);
// var showSuccessMessage = true;

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
<style scoped>
.hover-bg-gray-200:hover {
  background-color: #f8f9fa !important;
}

.hover-bg-danger:hover {
  background-color: #dc3545 !important;
  color: white !important;
}

.hover-text-white:hover {
  color: white !important;
}

.transition-all {
  transition: all 0.2s ease-in-out;
}

.x-small {
  font-size: 0.75rem;
}

/* Custom shadow for better depth */
.shadow-sm {
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075) !important;
}

.shadow-lg {
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
}
</style>