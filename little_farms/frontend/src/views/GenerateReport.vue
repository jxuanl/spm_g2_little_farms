<template>
  <div>
    <h2>Test Report PDF Generation</h2>
    <button @click="generatePdf" :disabled="loading">
      {{ loading ? "Generating..." : "Generate Report" }}
    </button>
    <p v-if="error" style="color:red;">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const loading = ref(false);
const error = ref('');

async function generatePdf() {
  loading.value = true;
  error.value = '';
  try {
    const response = await fetch('/api/report/generate-schedule-report');
    if (!response.ok) throw new Error('Failed to generate PDF');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    // Create and trigger a download link
    const a = document.createElement('a');
    a.href = url;
    a.download = 'report.pdf';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);

  } catch (e) {
    error.value = e.message || 'Unknown error';
  }
  loading.value = false;
}
</script>

<style scoped>
button {
  padding: 0.5rem 1rem;
  font-size: 1.2em;
}
</style>
