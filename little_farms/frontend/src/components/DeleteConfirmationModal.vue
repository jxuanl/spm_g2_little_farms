<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="$emit('close')">
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
            Are you sure you want to delete <strong>{{ userName }}</strong>? This action cannot be undone.
          </p>
        </div>
      </div>
      
      <div class="flex gap-3">
        <button
          @click="$emit('close')"
          :disabled="isDeleting"
          class="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          @click="$emit('confirm')"
          :disabled="isDeleting"
          class="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span v-if="isDeleting" class="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive-foreground"></span>
          <span>{{ isDeleting ? 'Deleting...' : 'Delete' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  userName: {
    type: String,
    default: ''
  },
  isDeleting: {
    type: Boolean,
    default: false
  }
});

defineEmits(['close', 'confirm']);
</script>