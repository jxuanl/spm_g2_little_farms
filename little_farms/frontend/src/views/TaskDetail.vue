<template>
  <div class="p-6 max-w-2xl mx-auto min-h-screen flex flex-col justify-between">
    <div>
      <h2 class="text-2xl font-semibold mb-4">Task Details</h2>

      <div v-if="task">
        <p><strong>Title:</strong> {{ task.title }}</p>
        <p><strong>Deadline:</strong> 
          {{ task.deadline ? formatDate(task.deadline) : 'No due date' }}
        </p>
        <p><strong>Project:</strong> {{ task.projectTitle || 'No project' }}</p>
        <p><strong>Status:</strong> {{ task.status }}</p>
        <p><strong>Priority:</strong> {{ task.priority }}</p>
        <p><strong>Description:</strong> {{ task.description || 'No description' }}</p>
      </div>

      <div v-else class="text-gray-500">Loading task details...</div>
    </div>

    <!-- === Button at bottom of page === -->
    <div class="mt-10 flex justify-end">
      <button
        class="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 cursor-pointer"
        @click="editTask"
      >
        Edit Task
      </button>
    </div>
  </div>
</template>


<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const route = useRoute();
const task = ref(null);

// ✅ Fetch task details from Firestore
onMounted(async () => {
  const taskId = route.params.id;
  const taskRef = doc(db, 'Tasks', taskId);
  const snapshot = await getDoc(taskRef);
  if (snapshot.exists()) {
    task.value = snapshot.data();
  }
});

// ✅ Helper for formatting Firestore timestamps
const formatDate = (date) => {
  if (date?.toDate) return date.toDate().toLocaleDateString();
  if (date instanceof Date) return date.toLocaleDateString();
  return new Date(date).toLocaleDateString();
};

// ✅ Handle Edit Button click
const editTask = () => {
  alert(`Editing task: ${task.value?.title || 'Unknown task'}`);
  // Later, replace this with opening a modal or navigating to an edit page
};
</script>
