<template>
  <div class="h-screen bg-background flex">
    <!-- Sidebar -->
     <TaskSidebar
      :activeProject="activeProject"
      @projectChange="setActiveProject"
      @createTask="() => setIsCreateModalOpen(true)"
    />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="bg-card border-b border-border p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-semibold">User Management</h2>
            <p class="text-sm text-muted-foreground mt-1">
              Manage users, roles, and permissions
            </p>
          </div>
        </div>
      </div>
      
      <!-- User Management Content -->
      <div class="flex-1 p-6 overflow-auto">
        <div class="max-w-7xl mx-auto">
          <!-- Action Bar -->
          <div class="flex justify-between items-center mb-6">
            <div class="flex gap-3">
              <div class="relative flex-1 max-w-md">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search users..."
                  class="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <button
              @click="openCreateModal"
              class="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Add User
            </button>
          </div>

          <!-- Users Table -->
          <div class="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
            <table class="w-full">
              <thead class="bg-muted/50 border-b border-border">
                <tr>
                  <th class="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Name</th>
                  <th class="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Email</th>
                  <th class="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Role</th>
                  <th class="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th class="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Joined</th>
                  <th class="text-right px-6 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-muted/30 transition-colors">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {{ user.initials }}
                      </div>
                      <div>
                        <div class="font-medium">{{ user.name }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-muted-foreground">{{ user.email }}</td>
                  <td class="px-6 py-4">
                    <span :class="getRoleBadgeClass(user.role)" class="px-2.5 py-1 rounded-full text-xs font-medium">
                      {{ user.role }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <span :class="getStatusBadgeClass(user.status)" class="px-2.5 py-1 rounded-full text-xs font-medium">
                      {{ user.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-muted-foreground">{{ user.joinedDate }}</td>
                  <td class="px-6 py-4">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        @click="openEditModal(user)"
                        class="p-2 hover:bg-muted rounded-md transition-colors"
                        title="Edit user"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button
                        @click="openDeleteModal(user)"
                        class="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
                        title="Delete user"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="filteredUsers.length === 0">
                  <td colspan="6" class="px-6 py-12 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit User Modal -->
    <div v-if="isUserModalOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="closeUserModal">
      <div class="bg-card border border-border rounded-lg w-full max-w-md p-6 shadow-xl">
        <h3 class="text-xl font-semibold mb-4">{{ editingUser ? 'Edit User' : 'Create New User' }}</h3>
        
        <form @submit.prevent="handleUserSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Name</label>
            <input
              v-model="userForm.name"
              type="text"
              required
              class="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Email</label>
            <input
              v-model="userForm.email"
              type="email"
              required
              class="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Role</label>
            <select
              v-model="userForm.role"
              class="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Member">Member</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Status</label>
            <select
              v-model="userForm.status"
              class="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
          
          <div class="flex gap-3 pt-4">
            <button
              type="button"
              @click="closeUserModal"
              class="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              {{ editingUser ? 'Update' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="isDeleteModalOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="closeDeleteModal">
      <div class="bg-card border border-border rounded-lg w-full max-w-md p-6 shadow-xl">
        <div class="flex items-start gap-4 mb-4">
          <div class="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-semibold mb-2">Delete User</h3>
            <p class="text-muted-foreground">
              Are you sure you want to delete <strong>{{ userToDelete?.name }}</strong>? This action cannot be undone.
            </p>
          </div>
        </div>
        
        <div class="flex gap-3">
          <button
            @click="closeDeleteModal"
            class="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="handleDeleteUser"
            class="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import TaskSidebar from '../components/TaskSidebar.vue';
import { ref, computed } from 'vue';

const activeView = ref('users');
const searchQuery = ref('');
const isUserModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const editingUser = ref(null);
const userToDelete = ref(null);

// Sample users data
const users = ref([
  { id: 1, name: 'John Doe', email: 'john.doe@example.com', role: 'Admin', status: 'Active', joinedDate: 'Jan 15, 2024', initials: 'JD' },
  { id: 2, name: 'Jane Smith', email: 'jane.smith@example.com', role: 'Manager', status: 'Active', joinedDate: 'Feb 20, 2024', initials: 'JS' },
  { id: 3, name: 'Bob Johnson', email: 'bob.johnson@example.com', role: 'Member', status: 'Active', joinedDate: 'Mar 10, 2024', initials: 'BJ' },
  { id: 4, name: 'Alice Williams', email: 'alice.williams@example.com', role: 'Viewer', status: 'Inactive', joinedDate: 'Apr 5, 2024', initials: 'AW' },
  { id: 5, name: 'Charlie Brown', email: 'charlie.brown@example.com', role: 'Member', status: 'Pending', joinedDate: 'May 12, 2024', initials: 'CB' },
]);

const userForm = ref({
  name: '',
  email: '',
  role: 'Member',
  status: 'Active'
});

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value;
  
  const query = searchQuery.value.toLowerCase();
  return users.value.filter(user => 
    user.name.toLowerCase().includes(query) ||
    user.email.toLowerCase().includes(query) ||
    user.role.toLowerCase().includes(query)
  );
});

const getRoleBadgeClass = (role) => {
  const classes = {
    'Admin': 'bg-red-100 text-red-700',
    'Manager': 'bg-blue-100 text-blue-700',
    'Member': 'bg-green-100 text-green-700',
    'Viewer': 'bg-gray-100 text-gray-700'
  };
  return classes[role] || 'bg-gray-100 text-gray-700';
};

const getStatusBadgeClass = (status) => {
  const classes = {
    'Active': 'bg-green-100 text-green-700',
    'Inactive': 'bg-gray-100 text-gray-700',
    'Pending': 'bg-yellow-100 text-yellow-700'
  };
  return classes[status] || 'bg-gray-100 text-gray-700';
};

const openCreateModal = () => {
  editingUser.value = null;
  userForm.value = {
    name: '',
    email: '',
    role: 'Member',
    status: 'Active'
  };
  isUserModalOpen.value = true;
};

const openEditModal = (user) => {
  editingUser.value = user;
  userForm.value = {
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status
  };
  isUserModalOpen.value = true;
};

const closeUserModal = () => {
  isUserModalOpen.value = false;
  editingUser.value = null;
};

const handleUserSubmit = () => {
  if (editingUser.value) {
    // Update existing user
    const index = users.value.findIndex(u => u.id === editingUser.value.id);
    if (index !== -1) {
      users.value[index] = {
        ...users.value[index],
        ...userForm.value,
        initials: userForm.value.name.split(' ').map(n => n[0]).join('').toUpperCase()
      };
    }
  } else {
    // Create new user
    const newUser = {
      id: users.value.length + 1,
      ...userForm.value,
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      initials: userForm.value.name.split(' ').map(n => n[0]).join('').toUpperCase()
    };
    users.value.push(newUser);
  }
  closeUserModal();
};

const openDeleteModal = (user) => {
  userToDelete.value = user;
  isDeleteModalOpen.value = true;
};

const closeDeleteModal = () => {
  isDeleteModalOpen.value = false;
  userToDelete.value = null;
};

const handleDeleteUser = () => {
  if (userToDelete.value) {
    users.value = users.value.filter(u => u.id !== userToDelete.value.id);
  }
  closeDeleteModal();
};
</script>

<style scoped>
/* Additional custom styles if needed */
</style>