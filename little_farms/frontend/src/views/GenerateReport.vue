<!-- <template>
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
        "Status": "Bob Smith",
        "Completion date": "10/7/2025"
      },
      {
        "Task Name": "Develop Login API",
        "Project Name": "Mobile App Launch",
        "Owner of Task": "Bob Smith",
        "Status": "Bob Smith",
        "Completion date": "11/7/2025"
      }
    ];

    const response = await fetch('/api/report/generate_pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "reportType": "task_completion",
        "reportTitle": "User Performance",
        "timeFrame": "Q1 2024",
        "filterType": "project",
        tasks: [
          {
            "Task Name": "Design Database",
            "Owner of Task": "John Doe",
            "Assignee List": "System Upgrade",
            "Status": "Jane Smith",
            "Completion date": "12/3/2025"
          },
          {
            "Task Name": "Develop Login API",
            "Owner of Task": "Bob Smith",
            "Assignee List": "Mobile App Launch",
            "Status": "Bob Smith",
            "Completion date": "11/7/2025"
          },
          {
            "Task Name": "Develop Login API",
            "Owner of Task": "Bob Smith",
            "Assignee List": "Mobile App Launch",
            "Status": "Bob Smith",
            "Completion date": "11/7/2025"
          }
          // ... more tasks
        ]
        // "projects": [
        //   {
        //     "Project Name": "System Upgrade",
        //     "Manager": "Jane Smith",
        //     "Total Tasks": 15,
        //     "Completed": 10,
        //     "Progress": 67
        //   }
          // ... more projects
        // ]
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
</style> -->


<template>
  <div class="time-report">
    <div class="header">
      <h1>⏱️ Time Logging Report</h1>
      <p>{{ projectName }}</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card stat-card-1">
        <div class="stat-label">Total Hours</div>
        <div class="stat-value">{{ totalHours }}</div>
      </div>
      <div class="stat-card stat-card-2">
        <div class="stat-label">Total Entries</div>
        <div class="stat-value">{{ totalEntries }}</div>
      </div>
      <div class="stat-card stat-card-3">
        <div class="stat-label">Team Members</div>
        <div class="stat-value">{{ teamCount }}</div>
      </div>
      <div class="stat-card stat-card-4">
        <div class="stat-label">Active Tasks</div>
        <div class="stat-value">{{ taskCount }}</div>
      </div>
    </div>

    <div class="tabs">
      <button 
        class="tab" 
        :class="{ active: activeTab === 'overview' }" 
        @click="activeTab = 'overview'"
      >
        📊 Overview
      </button>
      <button 
        class="tab" 
        :class="{ active: activeTab === 'detailed' }" 
        @click="activeTab = 'detailed'"
      >
        📋 Detailed View
      </button>
    </div>

    <transition name="fade" mode="out-in">
      <div v-if="activeTab === 'overview'" key="overview">
        <div class="charts-grid">
          <div class="chart-container">
            <div class="chart-title">Hours by Team Member</div>
            <div class="chart-wrapper">
              <canvas ref="userChart"></canvas>
            </div>
          </div>
          <div class="chart-container">
            <div class="chart-title">Hours by Task</div>
            <div class="chart-wrapper">
              <canvas ref="taskChart"></canvas>
            </div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="table-container">
            <div class="table-title">👥 Team Member Summary</div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Department</th>
                  <th class="text-center">Hours</th>
                  <th class="text-center">Entries</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in userSummary" :key="user.userId">
                  <td><strong>{{ user.name }}</strong></td>
                  <td>
                    <span class="badge" :class="`badge-${user.dept.toLowerCase()}`">
                      {{ user.dept }}
                    </span>
                  </td>
                  <td class="text-center">
                    <span class="hours-badge">{{ user.hours }}h</span>
                  </td>
                  <td class="text-center">{{ user.entries }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="table-container">
            <div class="table-title">📝 Task Summary</div>
            <table>
              <thead>
                <tr>
                  <th>Task Name</th>
                  <th class="text-center">Hours</th>
                  <th class="text-center">Entries</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="task in taskSummary" :key="task.taskId">
                  <td><strong>{{ task.name }}</strong></td>
                  <td class="text-center">
                    <span class="hours-badge">{{ task.hours }}h</span>
                  </td>
                  <td class="text-center">{{ task.entries }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-else key="detailed">
        <div class="table-container">
          <div class="table-title">🔍 All Time Entries</div>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Department</th>
                <th>Task</th>
                <th class="text-center">Hours</th>
                <th>Last Modified</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in timeData" :key="entry.loggedTimeId">
                <td><strong>{{ entry.userName }}</strong></td>
                <td>
                  <span class="badge" :class="`badge-${entry.userDept.toLowerCase()}`">
                    {{ entry.userDept }}
                  </span>
                </td>
                <td>{{ entry.taskName }}</td>
                <td class="text-center">
                  <span class="hours-badge">{{ entry.amtOfTime }}h</span>
                </td>
                <td>{{ formatDate(entry.lastModified) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import Chart from 'chart.js/auto';

export default {
  name: 'TimeLoggingReport',
  setup() {
    const activeTab = ref('overview');
    const userChart = ref(null);
    const taskChart = ref(null);
    let userChartInstance = null;
    let taskChartInstance = null;

    const timeData = ref([
      { loggedTimeId: "8T14S1F6RQZFwVkOTrOK", amtOfTime: 10, lastModified: "2025-10-25T17:37:15.514Z", prjId: "kXTrzL1uPqwWRa8VK3RW", prjName: "Project to Test Logged Time Report", taskId: "dNnBTvAeXZHYJQNnRtuW", taskName: "Task 2 - Logged Time Report", userId: "KJB4a6qWXwhGUzaiautgx53sEFr1", userName: "Jerry Tan", userDept: "IT", userEmail: "staff@gmail.com", userRole: "staff" },
      { loggedTimeId: "OKdAK51ZCies6JuqpYQi", amtOfTime: 5.5, lastModified: "2025-10-25T16:47:40.832Z", prjId: "kXTrzL1uPqwWRa8VK3RW", prjName: "Project to Test Logged Time Report", taskId: "suGhO1SMyN5h7Ozs6WXH", taskName: "Task 1", userId: "KJB4a6qWXwhGUzaiautgx53sEFr1", userName: "Jerry Tan", userDept: "IT", userEmail: "staff@gmail.com", userRole: "staff" },
      { loggedTimeId: "X4Q1P1TRmhojpSWQhpOH", amtOfTime: 10.5, lastModified: "2025-10-25T17:08:34.827Z", prjId: "kXTrzL1uPqwWRa8VK3RW", prjName: "Project to Test Logged Time Report", taskId: "dNnBTvAeXZHYJQNnRtuW", taskName: "Task 2 - Logged Time Report", userId: "vMRUo4AWfnaovIjOdN4rVREfog13", userName: "John", userDept: "Sales", userEmail: "staff3@gmail.com", userRole: "staff" },
      { loggedTimeId: "ZdMs5Piv7dqNzMYXIgni", amtOfTime: 6, lastModified: "2025-10-25T17:37:07.632Z", prjId: "kXTrzL1uPqwWRa8VK3RW", prjName: "Project to Test Logged Time Report", taskId: "dNnBTvAeXZHYJQNnRtuW", taskName: "Task 2 - Logged Time Report", userId: "3YcX3jfkurbKukDg4x29CxYtvPt2", userName: "Tom", userDept: "IT", userEmail: "staff2@gmail.com", userRole: "staff" },
      { loggedTimeId: "fhssxD2HDMnV9IlGIImx", amtOfTime: 10.5, lastModified: "2025-10-25T17:40:23.234Z", prjId: "kXTrzL1uPqwWRa8VK3RW", prjName: "Project to Test Logged Time Report", taskId: "5Gcdzyg2oMYle7mqAFJV", taskName: "Task 3 - Logged Time Report", userId: "KJB4a6qWXwhGUzaiautgx53sEFr1", userName: "Jerry Tan", userDept: "IT", userEmail: "staff@gmail.com", userRole: "staff" }
    ]);

    const projectName = computed(() => timeData.value[0]?.prjName || '');
    
    const totalHours = computed(() => 
      timeData.value.reduce((sum, entry) => sum + Number(entry.amtOfTime), 0)
    );
    
    const totalEntries = computed(() => timeData.value.length);

    const userSummary = computed(() => {
      const summary = {};
      timeData.value.forEach(entry => {
        if (!summary[entry.userId]) {
          summary[entry.userId] = {
            userId: entry.userId,
            name: entry.userName,
            dept: entry.userDept,
            hours: 0,
            entries: 0
          };
        }
        summary[entry.userId].hours += Number(entry.amtOfTime);
        summary[entry.userId].entries += 1;
      });
      return Object.values(summary);
    });

    const taskSummary = computed(() => {
      const summary = {};
      timeData.value.forEach(entry => {
        if (!summary[entry.taskId]) {
          summary[entry.taskId] = {
            taskId: entry.taskId,
            name: entry.taskName,
            hours: 0,
            entries: 0
          };
        }
        summary[entry.taskId].hours += Number(entry.amtOfTime);
        summary[entry.taskId].entries += 1;
      });
      return Object.values(summary);
    });

    const teamCount = computed(() => userSummary.value.length);
    const taskCount = computed(() => taskSummary.value.length);

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const createUserChart = () => {
      if (userChartInstance) {
        userChartInstance.destroy();
      }
      if (!userChart.value) return;

      const ctx = userChart.value.getContext('2d');
      userChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: userSummary.value.map(u => u.name),
          datasets: [{
            label: 'Hours',
            data: userSummary.value.map(u => u.hours),
            backgroundColor: [
              'rgba(102, 126, 234, 0.8)',
              'rgba(240, 147, 251, 0.8)',
              'rgba(79, 172, 254, 0.8)',
              'rgba(67, 233, 123, 0.8)'
            ],
            borderColor: [
              'rgba(102, 126, 234, 1)',
              'rgba(240, 147, 251, 1)',
              'rgba(79, 172, 254, 1)',
              'rgba(67, 233, 123, 1)'
            ],
            borderWidth: 2,
            borderRadius: 10
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          }
        }
      });
    };

    const createTaskChart = () => {
      if (taskChartInstance) {
        taskChartInstance.destroy();
      }
      if (!taskChart.value) return;

      const ctx = taskChart.value.getContext('2d');
      taskChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: taskSummary.value.map(t => t.name),
          datasets: [{
            data: taskSummary.value.map(t => t.hours),
            backgroundColor: [
              'rgba(102, 126, 234, 0.8)',
              'rgba(240, 147, 251, 0.8)',
              'rgba(79, 172, 254, 0.8)',
              'rgba(67, 233, 123, 0.8)'
            ],
            borderColor: 'white',
            borderWidth: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 20,
                font: {
                  size: 12
                }
              }
            }
          }
        }
      });
    };

    const createCharts = () => {
      nextTick(() => {
        createUserChart();
        createTaskChart();
      });
    };

    watch(activeTab, (newTab) => {
      if (newTab === 'overview') {
        createCharts();
      }
    });

    onMounted(() => {
      createCharts();
    });

    return {
      activeTab,
      userChart,
      taskChart,
      timeData,
      projectName,
      totalHours,
      totalEntries,
      teamCount,
      taskCount,
      userSummary,
      taskSummary,
      formatDate
    };
  }
};
</script>

<style scoped>
.time-report {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.header {
  background: white;
  border-radius: 20px;
  padding: 2.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  position: relative;
  overflow: hidden;
}

.header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: linear-gradient(90deg, #667eea, #764ba2, #f093fb);
}

.header h1 {
  font-size: 2.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.header p {
  color: #666;
  font-size: 1.1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
}

.stat-card-1::before {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-card-2::before {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-card-3::before {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-card-4::before {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 40px rgba(0,0,0,0.15);
}

.stat-label {
  color: #666;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 3rem;
  font-weight: bold;
}

.stat-card-1 .stat-value {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-card-2 .stat-value {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-card-3 .stat-value {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-card-4 .stat-value {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tabs {
  background: white;
  border-radius: 16px;
  padding: 0.5rem;
  margin-bottom: 2rem;
  display: flex;
  gap: 0.5rem;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.tab {
  flex: 1;
  padding: 1rem 2rem;
  border: none;
  background: transparent;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  color: #666;
  transition: all 0.3s ease;
}

.tab:hover {
  background: #f5f5f5;
}

.tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.chart-container {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.chart-title {
  font-size: 1.3rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 1.5rem;
}

.chart-wrapper {
  position: relative;
  height: 350px;
}

.table-container {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  overflow: hidden;
}

.table-title {
  font-size: 1.3rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 1.5rem;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

thead {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

th {
  padding: 1.2rem;
  text-align: left;
  color: white;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
}

th:first-child {
  border-radius: 12px 0 0 0;
}

th:last-child {
  border-radius: 0 12px 0 0;
}

tbody tr {
  transition: all 0.3s ease;
}

tbody tr:hover {
  background: #f8f9ff;
  transform: scale(1.01);
}

td {
  padding: 1.2rem;
  border-bottom: 1px solid #f0f0f0;
  color: #333;
}

tbody tr:last-child td {
  border-bottom: none;
}

.text-center {
  text-align: center;
}

.badge {
  display: inline-block;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.badge-it {
  background: #e0e7ff;
  color: #4c51bf;
}

.badge-sales {
  background: #fef3c7;
  color: #d97706;
}

.hours-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.5rem 1.2rem;
  border-radius: 20px;
  font-weight: bold;
  min-width: 60px;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .header h1 {
    font-size: 2rem;
  }

  .stat-value {
    font-size: 2.5rem;
  }

  table {
    font-size: 0.9rem;
  }
}
</style>