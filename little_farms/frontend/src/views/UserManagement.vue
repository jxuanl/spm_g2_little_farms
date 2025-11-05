<template>
  <div class="h-screen bg-background flex">
    <!-- Sidebar -->
    <TaskSidebar :activeProject="activeProject" @projectChange="setActiveProject"
      @createTask="() => setIsCreateModalOpen(true)" />

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
          <!-- Loading State -->
          <div v-if="loading" class="flex justify-center items-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>

          <!-- Error State -->
          <div v-else-if="error"
            class="bg-destructive/10 border border-destructive text-destructive rounded-lg p-4 mb-6">
            <p class="font-medium">Error loading users</p>
            <p class="text-sm mt-1">{{ error }}</p>
          </div>

          <!-- Content -->
          <template v-else>
            <!-- Action Bar -->
            <div class="flex justify-between items-center mb-6">
              <div class="flex gap-3">
                <div class="relative flex-1 max-w-md">
                  <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none"
                    stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input v-model="searchQuery" type="text" placeholder="Search users..."
                    class="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <button @click="openCreateModal"
                class="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
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
                    <th class="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Department</th>
                    <th class="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Last Login</th>
                    <th class="text-right px-6 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  <tr v-for="user in filteredUsers" :key="user.uid || user.id"
                    class="hover:bg-muted/30 transition-colors">
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-3">
                        <!-- <div
                          class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {{ getInitials(user.name) }}
                        </div> -->
                        <div>
                          <div class="font-medium">{{ user.name }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-sm text-muted-foreground">{{ user.email }}</td>
                    <td class="px-6 py-4">
                      <span :class="getRoleBadgeClass(user.role)" class="px-2 py-1 rounded-lg text-xs font-medium">
                        {{ user.role }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-sm text-muted-foreground">{{ user.department || 'N/A' }}</td>
                    <td class="px-6 py-4 text-sm text-muted-foreground">{{ formatDate(user.lastLogin) }}</td>
                    <td class="px-6 py-4">
                      <div class="flex items-center justify-end gap-2">
                        <button @click="openEditModal(user)" class="p-2 hover:bg-muted rounded-md transition-colors"
                          title="Edit user">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button @click="openDeleteModal(user)"
                          class="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
                          title="Delete user">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
          </template>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <UserFormModal :isOpen="isUserModalOpen" :editingUser="editingUser" :userForm="userForm"
      :isSubmitting="isSubmitting" @close="closeUserModal" @submit="handleUserSubmit"
      @update:userForm="userForm = $event" />

    <DeleteConfirmationModal :isOpen="isDeleteModalOpen" :userName="userToDelete?.name" :isDeleting="isDeleting"
      @close="closeDeleteModal" @confirm="handleDeleteUser" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import TaskSidebar from '../components/TaskSidebar.vue';
import UserFormModal from '../components/UserFormModal.vue';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal.vue';

const BASE_URL = 'http://localhost:3001';

// const activeView = ref('users');
const searchQuery = ref('');
const isUserModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const editingUser = ref(null);
const userToDelete = ref(null);
const loading = ref(false);
const error = ref(null);
const isSubmitting = ref(false);
const isDeleting = ref(false);

// Users data from API
const users = ref([]);

const userForm = ref({
  email: '',
  password: '',
  name: '',
  role: 'HR',
  department: '',
  channel: "in-app",
  reminderPreference: 1,
});

// Fetch all users
const fetchUsers = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await fetch(`${BASE_URL}/api/users`);
    if (!response.ok) throw new Error('Failed to fetch users');
    const data = await response.json();
    users.value = data.data;
  } catch (err) {
    error.value = err.message;
    console.error('Error fetching users:', err);
  } finally {
    loading.value = false;
  }
};

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value;

  const query = searchQuery.value.toLowerCase();
  return users.value.filter(user =>
    user.name?.toLowerCase().includes(query) ||
    user.email?.toLowerCase().includes(query) ||
    user.role?.toLowerCase().includes(query) ||
    user.department?.toLowerCase().includes(query)
  );
});

const getRoleBadgeClass = (role) => {
  const classes = {
    // 'staff': 'bg-blue-100 text-blue-700',
    'hr': 'bg-green-100 text-green-700',
    'manager': 'bg-blue-100 text-blue-700',
    'director': 'bg-orange-100 text-orange-700'
  };
  return classes[role?.toLowerCase()] || 'bg-gray-100 text-gray-700';
};

const formatDate = (dateString) => {
  if (!dateString) return 'Never';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Invalid date';
  }
};

const openCreateModal = () => {
  editingUser.value = null;
  userForm.value = {
    email: '',
    password: '',
    name: '',
    role: 'staff',
    department: '',
    channel: "in-app",
    reminderPreference: 1,
  };
  isUserModalOpen.value = true;
};

const openEditModal = (user) => {
  editingUser.value = user;
  userForm.value = {
    email: user.email,
    password: '', // Don't pre-fill password for security
    name: user.name,
    role: user.role,
    department: user.department || '',
    channel: user.channel,
    reminderPreference: user.reminderPreference
  };
  isUserModalOpen.value = true;
};

const closeUserModal = () => {
  isUserModalOpen.value = false;
  editingUser.value = null;
};

const handleUserSubmit = async () => {
  isSubmitting.value = true;
  try {
    if (editingUser.value) {
      // Update existing user - PUT /api/users/updateUser
      const updateData = {
        uid: editingUser.value.uid || editingUser.value.id,
        updates: {}
      };

      // Only include fields that have changed
      if (userForm.value.email && userForm.value.email !== editingUser.value.email) {
        updateData.updates.email = userForm.value.email;
      }
      if (userForm.value.name && userForm.value.name !== editingUser.value.name) {
        updateData.updates.name = userForm.value.name;
      }
      if (userForm.value.role && userForm.value.role !== editingUser.value.role) {
        updateData.updates.role = userForm.value.role;
      }
      if (userForm.value.department && userForm.value.department !== editingUser.value.department) {
        updateData.updates.department = userForm.value.department;
      }
      if (userForm.value.channel && userForm.value.channel !== editingUser.value.channel) {
        updateData.updates.channel = userForm.value.channel;
      }
      if (userForm.value.reminderPreference && userForm.value.reminderPreference !== editingUser.value.reminderPreference) {
        updateData.updates.reminderPreference = userForm.value.reminderPreference;
      }

      const response = await fetch(`${BASE_URL}/api/users/updateUser`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }

      await fetchUsers(); // Refresh the list
    } else {
      // Create new user - POST /api/auth/
      const response = await fetch(`${BASE_URL}/api/auth/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userForm.value)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }

      await fetchUsers(); // Refresh the list
    }

    closeUserModal();
  } catch (err) {
    alert(`Error: ${err.message}`);
    console.error('Error submitting user:', err);
  } finally {
    isSubmitting.value = false;
  }
};

const openDeleteModal = (user) => {
  userToDelete.value = user;
  isDeleteModalOpen.value = true;
};

const closeDeleteModal = () => {
  isDeleteModalOpen.value = false;
  userToDelete.value = null;
};

const handleDeleteUser = async () => {
  if (!userToDelete.value) return;

  isDeleting.value = true;
  try {
    const userId = userToDelete.value.uid || userToDelete.value.id;
    const response = await fetch(`${BASE_URL}/api/auth/deleteUser/${userId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete user');
    }

    await fetchUsers(); // Refresh the list
    closeDeleteModal();
  } catch (err) {
    alert(`Error: ${err.message}`);
    console.error('Error deleting user:', err);
  } finally {
    isDeleting.value = false;
  }
};

// Fetch users on component mount
onMounted(() => {
  fetchUsers();
});
</script>

<style scoped>
/* Additional custom styles if needed */
</style>