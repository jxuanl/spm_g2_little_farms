<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-card border border-border rounded-lg w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
      <h3 class="text-xl font-semibold mb-4">{{ editingUser ? 'Edit User' : 'Create New User' }}</h3>
      
      <form @submit.prevent="$emit('submit')" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">
            Name <span class="text-destructive">*</span>
            <span v-if="editingUser" class="text-muted-foreground font-normal">(read-only)</span>
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
            <span v-if="editingUser" class="text-muted-foreground font-normal">(read-only)</span>
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
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">Department</label>
          <input
            :value="userForm.department"
            @input="updateForm('department', $event.target.value)"
            type="text"
            placeholder="e.g., Human Resource, Sales"
            class="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
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
            <option value="sms">SMS</option>
            <option value="push">Push Notification</option>
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
            <option :value="7">1 week before</option>
            <option :value="14">2 weeks before</option>
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

const updateForm = (field, value) => {
  emit('update:userForm', { ...props.userForm, [field]: value });
};
</script>