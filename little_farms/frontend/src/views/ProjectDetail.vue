<template>
  <div v-if="project">
    <h1>{{ project.title }}</h1>
    <p><strong>Owner:</strong> {{ project.owner }}</p>
    <p><strong>Description:</strong> {{ project.description }}</p>

    <h2>Your Tasks</h2>
    <ul>
      <li v-for="task in project.tasks" :key="task.id">{{ task.title }}</li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const project = ref(null);

onMounted(async () => {
  const userSession = JSON.parse(sessionStorage.getItem('userSession') || '{}');
  const projectId = route.params.id;

  const res = await fetch(`http://localhost:3001/api/projects/${projectId}?userId=${userSession.uid}`);
  if (!res.ok) throw new Error('Failed to load project');
  project.value = await res.json();
});
</script>