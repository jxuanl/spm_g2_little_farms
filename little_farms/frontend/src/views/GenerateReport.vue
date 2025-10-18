<template>
  <div>
    <h2>Test Report PDF and CSV Generation</h2>
    
    <button @click="generatePdf" :disabled="loading">
      {{ loading ? "Generating PDF..." : "Generate Report PDF" }}
    </button>
    
    <button @click="generateCsv" :disabled="loading" style="margin-left: 1rem;">
      {{ loading ? "Generating CSV..." : "Generate Routes CSV" }}
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
    const taskData = [
      {
        "Task Name": "Design Homepage Mockup",
        "Project Name": "Website Redesign", 
        "Owner of Task": "Alice Chen",
        "Owner of Project": "Bob Smith",
        "Completion date": "10/7/2025"
      },
      {
        "Task Name": "Develop Login API",
        "Project Name": "Mobile App Launch",
        "Owner of Task": "Bob Smith", 
        "Owner of Project": "Bob Smith",
        "Completion date": "11/7/2025"
      }
    ];

    const response = await fetch('/api/report/generate_pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: taskData,
        reportType: 'Project',
        time_Frame: 'June'
      })
    });

    if (!response.ok) throw new Error('Failed to generate PDF');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const newTab = window.open(url, '_blank');
    if (!newTab || newTab.closed || typeof newTab.closed == 'undefined') {
      const embed = document.createElement('embed');
      embed.src = url;
      embed.type = 'application/pdf';
      embed.style.width = '100%';
      embed.style.height = '100vh';

      const container = document.getElementById('pdf-container') || createPdfContainer();
      container.innerHTML = '';
      container.appendChild(embed);
    }

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);

  } catch (e) {
    error.value = e.message || 'Unknown error';
  }
  loading.value = false;
}

async function generateCsv() {
  loading.value = true;
  error.value = '';
  try {
    // Mocked route and service data
    const routeData = [
      { route_code: 'R1', service: 'Express' },
      { route_code: 'R2', service: 'Local', note: 'Peak hours' },
      { route_code: 'R3', service: 'Express' }
    ];

    const response = await fetch('/api/report/generate_csv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(routeData)
    });

    if (!response.ok) throw new Error('Failed to generate CSV');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'routes.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);

  } catch (e) {
    error.value = e.message || 'Unknown error';
  }
  loading.value = false;
}

// Helper function to create PDF container
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
