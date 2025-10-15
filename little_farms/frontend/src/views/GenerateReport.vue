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
    const response = await fetch('/api/report/generate-report');
    if (!response.ok) throw new Error('Failed to generate PDF');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    // Open PDF in a new tab
    const newTab = window.open(url, '_blank');
    
    // Fallback if popup is blocked
    if (!newTab || newTab.closed || typeof newTab.closed == 'undefined') {
      // Alternative: create an iframe or embed element
      const embed = document.createElement('embed');
      embed.src = url;
      embed.type = 'application/pdf';
      embed.style.width = '100%';
      embed.style.height = '100vh';
      
      // Clear any existing content and show the PDF
      const container = document.getElementById('pdf-container') || createPdfContainer();
      container.innerHTML = '';
      container.appendChild(embed);
    }

    // Clean up the URL after a delay (optional, as browser will handle it when tab closes)
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);

  } catch (e) {
    error.value = e.message || 'Unknown error';
  }
  loading.value = false;
}

// Helper function to create a PDF container if it doesn't exist
function createPdfContainer() {
  const container = document.createElement('div');
  container.id = 'pdf-container';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.background = 'white';
  container.style.zIndex = '1000';
  
  // Add close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '10px';
  closeButton.style.right = '10px';
  closeButton.style.zIndex = '1001';
  closeButton.style.padding = '10px';
  closeButton.style.background = '#f44336';
  closeButton.style.color = 'white';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '5px';
  closeButton.style.cursor = 'pointer';
  
  closeButton.onclick = () => {
    document.body.removeChild(container);
  };
  
  container.appendChild(closeButton);
  document.body.appendChild(container);
  
  return container;
}
</script>

<style scoped>
button {
  padding: 0.5rem 1rem;
  font-size: 1.2em;
}
</style>
