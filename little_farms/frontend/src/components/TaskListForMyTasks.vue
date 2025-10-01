<template>
    <div>
      <div v-if="tasks.length === 0" class="text-center py-10">
        No tasks assigned
      </div>
      <ul v-else>
        <li v-for="task in tasks" :key="task.id" class="border-b py-2">
          <div class="font-semibold">{{ task.title }}</div>
          <div class="text-sm text-muted-foreground">{{ task.description }}</div>
        </li>
      </ul>
    </div>
  </template>
  
  <script setup>
  const props = defineProps({
    tasks: Array
  });
  </script>