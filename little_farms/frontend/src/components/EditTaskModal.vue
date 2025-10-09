<template>
  <!-- === Backdrop === -->
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 bg-black/80"
    @click="$emit('close')"
  >
    <!-- === Modal Container === -->
    <div
      class="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 border border-gray-200 bg-background p-6 shadow-lg sm:rounded-lg sm:max-w-[500px]"
      @click.stop
    >
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold">Edit Task</h2>
        <button
          class="text-gray-500 hover:text-gray-700"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>

      <div v-if="showSuccessMessage" class="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
        <div class="text-sm text-green-800">
          ✓ Task updated successfully!
        </div>
      </div>

      <form @submit.prevent="handleUpdate" class="space-y-4">
        <!-- === Title === -->
        <div>
          <label for="title" class="text-sm font-medium">Task Title *</label>
          <input
            id="title"
            v-model="formData.title"
            type="text"
            class="flex h-9 w-full rounded-md border border-gray-300 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            required
          />
        </div>

        <!-- === Description === -->
        <div>
          <label class="text-sm font-medium">Description</label>
          <textarea
            v-model="formData.description"
            rows="3"
            class="flex min-h-[60px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <!-- === Status & Priority === -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium">Status</label>
            <select
              v-model="formData.status"
              class="flex h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="review">In Review</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div>
            <label class="text-sm font-medium">Priority</label>
            <select
              v-model="formData.priority"
              class="flex h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <!-- === Deadline === -->
        <div>
          <label class="text-sm font-medium">Deadline</label>
          <input
            v-model="formData.deadline"
            type="date"
            class="flex h-9 w-full rounded-md border border-gray-300 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <!-- === Footer Buttons === -->
        <div class="flex justify-end gap-2 pt-4">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium border border-gray-300 bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            @click="$emit('close')"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 border border-primary h-9 px-4 py-2"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const emit = defineEmits(['close', 'updated']);
const props = defineProps({
  isOpen: Boolean,
  task: Object
});

const showSuccessMessage = ref(false);

// Initialize editable form data
const formData = reactive({
  title: '',
  description: '',
  status: '',
  priority: '',
  deadline: ''
});

// Load data from props.task when modal opens
watch(
  () => props.task,
  (newTask) => {
    if (newTask) {
      formData.title = newTask.title || '';
      formData.description = newTask.description || '';
      formData.status = newTask.status || 'todo';
      formData.priority = newTask.priority || 'medium';
      formData.deadline = newTask.deadline
        ? new Date(newTask.deadline.toDate ? newTask.deadline.toDate() : newTask.deadline)
            .toISOString()
            .split('T')[0]
        : '';
    }
  },
  { immediate: true }
);

// Update Firestore
const handleUpdate = async () => {
  if (!props.task?.id) return;

  try {
    const taskRef = doc(db, 'Tasks', props.task.id);
    await updateDoc(taskRef, {
      title: formData.title.trim(),
      description: formData.description.trim(),
      status: formData.status,
      priority: formData.priority,
      deadline: formData.deadline ? new Date(formData.deadline) : null
    });

    showSuccessMessage.value = true;
    setTimeout(() => {
      showSuccessMessage.value = false;
      emit('updated'); // notify parent to refresh
      emit('close');
    }, 1500);
  } catch (error) {
    console.error('Error updating task:', error);
    alert('Failed to update task.');
  }
};
</script>

<style scoped>
.fixed {
  animation: fadeIn 0.2s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
