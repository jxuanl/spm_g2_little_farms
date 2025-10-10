<template>
  <div class="w-64 bg-white border-r border-gray-300 h-full flex flex-col">
    <div class="p-4">
      <div class="flex items-center gap-3 mb-5">
        <div class="w-8 h-8 bg-muted rounded-xl flex items-center justify-center">
          <Folder class="w-4 h-4 text-black" />
        </div>
        <h1 class="text-lg font-semibold text-gray-800">TaskManager</h1>
      </div>

      <!-- <button 
        class="w-full mb-4 rounded-xl flex items-center justify-center gap-2 py-2 bg-gray-600 text-white hover:bg-gray-700 transition-colors"
        @click="$emit('createTask')">
        <Plus class="w-4 h-4" />
        New Task
      </button> -->

      <nav class="flex flex-col gap-2">
        <router-link 
          v-for="item in menuItems" 
          :key="item.id" 
          :to="item.path"
          class="text-gray-700 text-start rounded-xl py-2 px-3 border-0 flex items-center no-underline transition-colors"
          :class="{
            'bg-gray-800 text-black': $route.path === item.path,
            'hover:bg-gray-100': $route.path !== item.path
          }">
          <component :is="item.icon" class="w-4 h-4 mr-3" />
          <span class="font-medium">{{ item.label }}</span>
        </router-link>
      </nav>
    </div>

    <!-- <div class="border-t border-gray-300 my-2" /> -->

    <!-- <div class="p-4 flex-grow">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-gray-500 text-sm font-medium">Projects</h3>
        <button class="rounded-xl p-2 border-0 hover:bg-gray-100 text-gray-600 transition-colors">
          <Plus class="w-3 h-3" />
        </button>
      </div>

      <div class="flex flex-col gap-2">
        <button 
          v-for="project in projects" 
          :key="project.id" 
          class="text-start rounded-xl p-3 border-0 flex items-center w-full transition-colors"
          :class="{
            'bg-gray-600 text-white': activeProject === project.id,
            'hover:bg-gray-100': activeProject !== project.id
          }" 
          @click="$emit('projectChange', project.id)">
          <div class="flex items-center gap-3 w-full">
            <div :class="['rounded-full', project.color]" style="width: 12px; height: 12px;" />
            <div class="flex-grow">
              <div class="text-sm">{{ project.name }}</div>
            </div>
            <span class="bg-gray-600 text-white rounded-full text-xs px-2 py-1">
              {{ project.tasksCount }}
            </span>
          </div>
        </button>
      </div>
    </div> -->

    <div class="border-t border-gray-300 my-2" />

    <!-- User Profile Section -->
    <div class="p-4 relative mt-auto">
      <button @click="toggleDropdown"
        class="w-full text-start rounded-2xl p-3 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-all">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
            <span class="text-sm text- black font-medium">
              <UserRound />
            </span>
          </div>
          <div class="flex-grow">
            <div class="text-sm font-medium text-gray-800">{{ username }}</div>
            <div class="text-xs text-gray-500">{{ email }}</div>
          </div>
          <ChevronUpIcon class="w-4 h-4 text-gray-500" />
        </div>
      </button>

      <!-- Dropdown Menu -->
      <div v-if="isDropdownOpen"
        class="absolute bottom-full left-0 right-0 mx-4 mb-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm bg-white/95 animate-in slide-in-from-bottom-4">
        <div class="p-2">
          <button @click="handleLogout"
            class="w-full text-start py-2.5 px-3 flex items-center gap-3 text-destructive hover:bg-destructive/10 hover:rounded-xl rounded-lg transition-all duration-200 group">
            <div class="w-8 h-8 bg-destructive/10 rounded-lg flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
              <LogOut class="w-4 h-4 text-destructive" />
            </div>
            <div class="flex flex-col">
              <span class="text-sm font-medium">Log out</span>
              <span class="text-xs text-destructive/80">Sign out of your account</span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <div v-if="showSuccessMessage" class="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
  <div class="bg-green-100 border border-green-400 text-green-700 flex items-center gap-3 rounded-2xl shadow-sm mx-auto max-w-md px-6 py-4"
  style="margin-top: 20px; padding: 15px;">
    <CheckCircle class="w-5 h-5 text-green-600" />
    <span class="text-sm font-medium">
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
  LucideFolderKanban,
  CheckCircle,
  ChevronUpIcon,
  UserRound,
  LogOut,
} from 'lucide-vue-next';
import { ref, watch } from 'vue';
import { auth } from '../../firebase'

const userSession = JSON.parse(sessionStorage.getItem('userSession'));
const username = userSession.name;
const email = userSession.email;
const isDropdownOpen = ref(false);
const showSuccessMessage = ref(false);
// const showSuccessMessage = true;

function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value;
  console.log("Drop down is working")
}

async function handleLogout() {
  console.log("Logging out...");
  try {
    await auth.signOut()
    sessionStorage.removeItem('userSession')
    showSuccessMessage.value = true;
    await new Promise(resolve => setTimeout(resolve, 1500));
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout error:', error)
  }
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
</script>

<style scoped>
/* Custom rounded corners for specific elements */
.rounded-2xl {
  border-radius: 1rem;
}

.rounded-xl {
  border-radius: 0.75rem;
}
</style>