<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-card border border-border rounded-lg w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
      <h3 class="text-xl font-semibold mb-4">{{ editingUser ? 'Edit User' : 'Create New User' }}</h3>
      
      <form @submit.prevent="$emit('submit')" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">
            Name <span class="text-destructive">*</span>
          </label>
          <input
            :value="userForm.name"
            @input="updateForm('name', $event.target.value)"
            type="text"
            required
            :disabled="!!editingUser"
            :class="[
              'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring',
              editingUser ? 'bg-muted cursor-not-allowed opacity-60' : 'bg-background'
            ]"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">
            Email <span class="text-destructive">*</span>
          </label>
          <input
            :value="userForm.email"
            @input="updateForm('email', $event.target.value)"
            type="email"
            required
            :disabled="!!editingUser"
            :class="[
              'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring',
              editingUser ? 'bg-muted cursor-not-allowed opacity-60' : 'bg-background'
            ]"
          />
        </div>

        <div v-if="!editingUser">
          <label class="block text-sm font-medium mb-2">Password <span class="text-destructive">*</span></label>
          <input
            :value="userForm.password"
            @input="updateForm('password', $event.target.value)"
            type="password"
            :required="!editingUser"
            minlength="6"
            class="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p class="text-xs text-muted-foreground mt-1">Minimum 6 characters</p>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">Role <span class="text-destructive">*</span></label>
          <select
            :value="userForm.role"
            @change="updateForm('role', $event.target.value)"
            required
            class="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="hr">HR</option>
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">Department</label>
          <div class="relative">
            <input
              v-if="showCustomDepartment"
              :value="userForm.department"
              @input="handleCustomDepartmentInput($event.target.value)"
              type="text"
              placeholder="Enter new department name"
              class="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring pr-20"
              ref="departmentInput"
            />
            <button
              v-if="showCustomDepartment"
              type="button"
              @click="switchToDropdown"
              class="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs bg-muted text-foreground rounded hover:bg-muted/80 transition-colors"
            >
              Back to list
            </button>
            <select
              v-else
              :value="userForm.department"
              @change="handleDepartmentChange($event)"
              class="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a department</option>
              <option v-for="dept in departments" :key="dept" :value="dept">
                {{ dept }}
              </option>
              <option value="custom">+ Add New Department</option>
            </select>
          </div>
          <p v-if="showCustomDepartment" class="text-xs text-muted-foreground mt-1">
            Type the new department name or click "Back to list" to choose from existing
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Channel <span class="text-destructive">*</span></label>
          <select
            :value="userForm.channel"
            @change="updateForm('channel', $event.target.value)"
            required
            class="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="in-app">In-App</option>
            <option value="email">Email</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Reminder Preference <span class="text-destructive">*</span></label>
          <select
            :value="userForm.reminderPreference"
            @change="updateForm('reminderPreference', parseInt($event.target.value))"
            required
            class="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option :value="1">1 day before</option>
            <option :value="2">2 days before</option>
            <option :value="3">3 days before</option>
            <option :value="4">4 days before</option>
            <option :value="5">5 days before</option>
          </select>
        </div>
        
        <div class="flex gap-3 pt-4">
          <button
            type="button"
            @click="$emit('close')"
            :disabled="isSubmitting"
            class="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span v-if="isSubmitting" class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></span>
            <span>{{ isSubmitting ? 'Saving...' : (editingUser ? 'Update' : 'Create') }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  editingUser: {
    type: Object,
    default: null
  },
  userForm: {
    type: Object,
    required: true
  },
  isSubmitting: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'submit', 'update:userForm']);

// Departments state
const departments = ref([])
const showCustomDepartment = ref(false)
const departmentInput = ref(null)

const updateForm = (field, value) => {
  emit('update:userForm', { ...props.userForm, [field]: value });
};

// Capitalize department name
const capitalizeDepartment = (department) => {
  if (!department) return department;
  
  // Convert to lowercase first, then capitalize first letter of each word
  return department
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Handle custom department input with capitalization
const handleCustomDepartmentInput = (value) => {
  const capitalizedValue = capitalizeDepartment(value);
  updateForm('department', capitalizedValue);
};

// Fetch departments from API
const fetchDepartments = async () => {
  try {
    const response = await fetch('/api/users/departments')
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.departments) {
        departments.value = data.departments
      }
    }
  } catch (error) {
    console.error('Failed to fetch departments:', error)
    // Fallback to default departments based on your API response
    departments.value = ["HR", "IT", "Legal", "Logistics", "Sales", "admin"]
  }
}

const handleDepartmentChange = (event) => {
  const value = event.target.value
  if (value === 'custom') {
    showCustomDepartment.value = true
    updateForm('department', '')
    nextTick(() => {
      departmentInput.value?.focus()
    })
  } else {
    updateForm('department', value)
  }
}

const switchToDropdown = () => {
  showCustomDepartment.value = false
  // Clear the department field when switching back to dropdown
  // so the user can make a fresh selection
  updateForm('department', '')
}

// Reset department state when dialog opens/closes
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    // If the current department value is not in the list, show custom input
    if (props.userForm.department && !departments.value.includes(props.userForm.department)) {
      showCustomDepartment.value = true
    } else {
      showCustomDepartment.value = false
    }
  }
})

// Watch for changes to userForm.department and adjust showCustomDepartment accordingly
watch(() => props.userForm.department, (newDept) => {
  if (newDept && !departments.value.includes(newDept)) {
    showCustomDepartment.value = true
  }
})

// Fetch departments when component mounts
onMounted(() => {
  fetchDepartments()
})
</script>