<template>
  <div class="p-6 max-w-2xl mx-auto min-h-screen flex flex-col">
    <h2 class="text-2xl font-semibold mb-4">Task Details</h2>

    <div v-if="task">
      <p><strong>Title:</strong> {{ task.title }}</p>
      <p><strong>Deadline:</strong> {{ task.deadline ? formatDate(task.deadline) : 'No due date' }}</p>
      <p><strong>Project:</strong> {{ task.projectTitle || 'No project' }}</p>
      <p><strong>Status:</strong> {{ task.status }}</p>
      <p><strong>Priority:</strong> {{ task.priority }}</p>
      <p><strong>Description:</strong> {{ task.description || 'No description' }}</p>
    </div>

    <div v-else class="text-gray-500">Loading task details...</div>

    <!-- Edit button -->
    <div class="mt-10 flex justify-end">
      <button
        class="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 cursor-pointer"
        @click="openEditModal"
      >
        Edit Task
      </button>
    </div>

    <!-- Edit Modal -->
    <EditTaskModal
      :isOpen="isEditModalOpen"
      :task="{ id: route.params.id, ...task }"
      @close="isEditModalOpen = false"
      @updated="refreshTask"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import EditTaskModal from '../components/EditTaskModal.vue';

const route = useRoute();
const task = ref(null);
const isEditModalOpen = ref(false);

const fetchTask = async () => {
  const taskId = route.params.id;
  const taskRef = doc(db, 'Tasks', taskId);
  const snapshot = await getDoc(taskRef);
  if (snapshot.exists()) task.value = { id: taskId, ...snapshot.data() };
};

onMounted(fetchTask);

const refreshTask = () => fetchTask();
const openEditModal = () => (isEditModalOpen.value = true);

const formatDate = (date) => {
  if (date?.toDate) return date.toDate().toLocaleDateString();
  return new Date(date).toLocaleDateString();
};
</script>
