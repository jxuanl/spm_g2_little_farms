<template>
  <div class="reporting-page">
    <TaskSidebar :activeProject="activeProject" @projectChange="setActiveProject"
      @createTask="() => setIsCreateModalOpen(true)" />
    <div class="layout">
      <!-- Left Sidebar -->
      <div class="sidebar">
        <h2>Report Generator</h2>

        <!-- Report Type -->
        <div class="form-group">
          <label>Report Type</label>
          <select v-model="filters.reportType" class="select-field">
            <option value="team-summary">Team Summary</option>
            <option value="task-completion">Task Completion</option>
            <option value="logged-time">Logged Time</option>
          </select>
        </div>

        <!-- Interval -->
        <div class="form-group">
          <label>Interval</label>
          <div class="button-group">
            <button 
              @click="filters.interval = 'weekly'; handleIntervalChange()" 
              :class="{ active: filters.interval === 'weekly' }"
              class="btn-period"
            >
              Weekly
            </button>
            <button 
              @click="filters.interval = 'monthly'; handleIntervalChange()" 
              :class="{ active: filters.interval === 'monthly' }"
              class="btn-period"
            >
              Monthly
            </button>
          </div>
        </div>

        <!-- Time Frame -->
        <div class="form-group">
          <label>Time Frame</label>
          <div v-if="filters.interval === 'monthly'">
            <input v-model="filters.month" type="month" class="input-field" />
          </div>
          <div v-else class="date-row">
            <div class="form-group half">
              <label>Start Date</label>
              <input v-model="filters.startDate" type="date" class="input-field" />
            </div>
            <div class="form-group half">
              <label>End Date</label>
              <input v-model="filters.endDate" type="date" class="input-field" />
            </div>
          </div>
        </div>

        <!-- Filter By Project -->
        <div class="form-group">
          <label>Filter By Project</label>
          <select v-model="filters.selectedProject" class="select-field">
            <option value="">Select Project</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.title || project.name }}
            </option>
          </select>
        </div>

        <!-- Generate Button -->
        <button 
          @click="generateReport" 
          class="btn-generate" 
          :disabled="loading"
        >
          <span class="icon">📊</span>
          {{ loading ? 'Generating...' : 'Generate Report' }}
        </button>
      </div>

      <!-- Right Content Area -->
      <div class="content">
        <div class="content-header">
          <h1>{{ reportData && !loading ? reportTitle : 'Report Generator' }}</h1>
          
          <!-- Export Dropdown -->
          <div class="export-dropdown" v-if="reportData && reportData.length > 0">
            <button @click="toggleExportMenu" class="btn-export-main">
              Export
              <span class="arrow">▼</span>
            </button>
            <div class="export-menu" v-if="showExportMenu">
              <button @click="exportReport('csv')" class="export-option">
                <span class="icon">📄</span>
                Export as CSV
              </button>
              <button @click="exportReport('pdf')" class="export-option">
                <span class="icon">📑</span>
                Export as PDF
              </button>
            </div>
          </div>
        </div>

        <div class="content-body">
          <!-- Empty State -->
          <div v-if="!reportData && !loading" class="empty-state">
            <div class="report-icon">📊</div>
            <h3>No Report Generated</h3>
            <p>Select filters and click "Generate Report" to view analytics</p>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="empty-state">
            <div class="loading-spinner"></div>
            <p>Generating report...</p>
          </div>

          <!-- Report Display -->
          <div v-if="reportData && !loading" class="report-display">
            <!-- Team Summary Report -->
            <div v-if="filters.reportType === 'team-summary'" class="table-container">
              <h3 class="report-subtitle">Team Summary</h3>
              <table class="report-table">
                <thead>
                  <tr>
                    <th>Task Name</th>
                    <th>Assigned To</th>
                    <th>Status</th>
                    <th>Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="task in reportData" :key="task.id">
                    <td>{{ task.taskTitle }}</td>
                    <td>
                      <span v-if="Array.isArray(task.assignedTo)">
                        <span v-for="(assignee, idx) in task.assignedTo" :key="idx">
                          {{ assignee.name }}<span v-if="idx < task.assignedTo.length - 1">, </span>
                        </span>
                      </span>
                      <span v-else>
                        {{ task.assignedTo || 'Unassigned' }}
                      </span>
                    </td>
                    <td>
                      <span :class="getStatusBadgeClass(task.status)" class="status-badge">
                        {{ task.status }}
                      </span>
                    </td>
                    <td>{{ formatDate(task.deadline) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Add other report types here as needed -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { getAuth } from 'firebase/auth';
import TaskSidebar from '../components/TaskSidebar.vue';

export default {
  name: 'EnhancedReportingPage',
  components: {
    TaskSidebar
  },
  setup() {
    // Reactive state
    const activeProject = ref("all");
    const isCreateModalOpen = ref(false);
    const loading = ref(false);
    const reportData = ref(null);
    const projects = ref([]);
    const users = ref([]);
    const departments = ref([]);
    const showExportMenu = ref(false);
    const error = ref('');

    const filters = ref({
      reportType: 'team-summary',
      interval: 'monthly',
      month: new Date().toISOString().slice(0, 7),
      startDate: '',
      endDate: '',
      selectedProject: ''
    });

    // Computed properties
    const reportTitle = computed(() => {
      const titles = {
        'team-summary': 'Team Summary Report',
        'task-completion': 'Task Completion Report',
        'logged-time': 'Logged Time Report'
      };
      return titles[filters.value.reportType] || 'Report';
    });

    // Utility functions
    const formatDate = (date) => {
      if (!date) return '-';
      
      // Handle Firestore timestamp objects
      if (date._seconds !== undefined && date._nanoseconds !== undefined) {
        const d = new Date(date._seconds * 1000 + date._nanoseconds / 1000000);
        return d.toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      
      // Handle regular date strings or Date objects
      const d = new Date(date);
      return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };

    const getStatusBadgeClass = (status) => {
      const classes = {
        'todo': 'status-todo',
        'in-progress': 'status-in-progress',
        'review': 'status-review',
        'done': 'status-done'
      };
      return classes[status] || classes['todo'];
    };

    // API functions
    const fetchWithAuth = async (url, options = {}) => {
      const { token } = await getCurrentUserAuth();
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    };

    const getCurrentUserAuth = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return { auth, user, token };
    };

    const loadProjectsAndUsers = async () => {
      try {
        const [projectsRes] = await Promise.all([
          fetchWithAuth('/api/allProjects')
        ]);

        projects.value = projectsRes.data || projectsRes.projects || [];
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    };

    const handleIntervalChange = () => {
      if (filters.value.interval === 'monthly') {
        filters.value.month = new Date().toISOString().slice(0, 7);
        filters.value.startDate = '';
        filters.value.endDate = '';
      } else {
        filters.value.month = '';
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        filters.value.startDate = weekAgo.toISOString().split('T')[0];
        filters.value.endDate = today.toISOString().split('T')[0];
      }
    };

    const generateReport = async () => {
      loading.value = true;
      reportData.value = null;
      
      try {
        // Simulate API call - replace with actual implementation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data for demonstration
        reportData.value = [
          {
            id: 1,
            taskTitle: 'Design System Implementation',
            assignedTo: [{ name: 'John Doe' }, { name: 'Jane Smith' }],
            status: 'in-progress',
            deadline: new Date('2024-10-15')
          },
          {
            id: 2,
            taskTitle: 'API Integration',
            assignedTo: [{ name: 'Mike Johnson' }],
            status: 'todo',
            deadline: new Date('2024-10-20')
          },
          {
            id: 3,
            taskTitle: 'User Testing',
            assignedTo: [{ name: 'Sarah Wilson' }],
            status: 'done',
            deadline: new Date('2024-10-10')
          }
        ];
        
      } catch (error) {
        console.error('Error generating report:', error);
        alert('Failed to generate report. Please try again.');
      } finally {
        loading.value = false;
      }
    };

    const exportReport = async (format) => {
      if (!reportData.value || !reportData.value.length) return;

      loading.value = true;
      try {
        if (format === 'csv') {
          // CSV export logic
          alert('CSV export functionality would be implemented here');
        } else {
          // PDF export logic
          alert('PDF export functionality would be implemented here');
        }
      } catch (e) {
        console.error('Export error:', e);
        error.value = e.message || 'Unknown error';
      } finally {
        loading.value = false;
        showExportMenu.value = false;
      }
    };

    const setActiveProject = (project) => {
      activeProject.value = project;
    };

    const setIsCreateModalOpen = (open) => {
      isCreateModalOpen.value = open;
    };

    const toggleExportMenu = () => {
      showExportMenu.value = !showExportMenu.value;
    };

    onMounted(() => {
      loadProjectsAndUsers();
      
      // Close export menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.export-dropdown')) {
          showExportMenu.value = false;
        }
      });
    });

    return {
      activeProject,
      isCreateModalOpen,
      loading,
      reportData,
      projects,
      showExportMenu,
      error,
      filters,
      reportTitle,
      formatDate,
      getStatusBadgeClass,
      generateReport,
      handleIntervalChange,
      exportReport,
      setActiveProject,
      setIsCreateModalOpen,
      toggleExportMenu
    };
  }
};
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.reporting-page {
  min-height: 100vh;
  background: #f7fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  color: #2d3748;
  display: flex;
}

.layout {
  display: flex;
  flex: 1;
  min-height: 100vh;
}

/* Sidebar */
.sidebar {
  width: 360px;
  background: #ffffff;
  padding: 2rem;
  border-right: 1px solid #e2e8f0;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.sidebar h2 {
  color: #1a202c;
  font-size: 1.5rem;
  margin: 0 0 2rem 0;
  font-weight: 600;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group.half {
  flex: 1;
}

.date-row {
  display: flex;
  gap: 1rem;
}

.form-group label {
  display: block;
  color: #4a5568;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.select-field,
.input-field {
  width: 100%;
  padding: 0.75rem;
  background: #ffffff;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  color: #2d3748;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.select-field:focus,
.input-field:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.button-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.btn-period {
  padding: 0.75rem;
  background: #ffffff;
  border: 1px solid #cbd5e0;
  color: #4a5568;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-period:hover {
  background: #f7fafc;
  border-color: #667eea;
}

.btn-period.active {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.btn-generate {
  width: 100%;
  padding: 1rem;
  background: #667eea;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: background 0.2s;
  margin-top: 1rem;
}

.btn-generate:hover:not(:disabled) {
  background: #5568d3;
}

.btn-generate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-generate .icon {
  font-size: 1.2rem;
}

/* Content Area */
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* Prevents flex item from overflowing */
}

.content-header {
  padding: 2rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  flex-shrink: 0;
}

.content-header h1 {
  font-size: 1.75rem;
  margin: 0;
  color: #1a202c;
  font-weight: 600;
}

/* Export Dropdown */
.export-dropdown {
  position: relative;
}

.btn-export-main {
  padding: 0.75rem 1.5rem;
  background: #ffffff;
  border: 1px solid #cbd5e0;
  color: #2d3748;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-export-main:hover {
  background: #f7fafc;
  border-color: #667eea;
}

.btn-export-main .arrow {
  font-size: 0.75rem;
}

.export-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  min-width: 180px;
  z-index: 10;
}

.export-option {
  width: 100%;
  padding: 0.875rem 1rem;
  background: transparent;
  border: none;
  color: #2d3748;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.95rem;
  transition: background 0.2s;
  text-align: left;
}

.export-option:hover {
  background: #f7fafc;
}

.export-option .icon {
  font-size: 1.1rem;
}

/* Content Body */
.content-body {
  flex: 1;
  padding: 2rem;
  background: #f7fafc;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  text-align: center;
}

.report-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.7;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #2d3748;
}

.empty-state p {
  color: #718096;
  font-size: 1rem;
  max-width: 300px;
}

.loading-spinner {
  width: 3rem;
  height: 3rem;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Table */
.report-display {
  height: 100%;
}

.table-container {
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.report-subtitle {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1.5rem;
  color: #1a202c;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  flex: 1;
}

.report-table th {
  background: #f7fafc;
  color: #4a5568;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid #e2e8f0;
}

.report-table td {
  padding: 1rem;
  border-top: 1px solid #e2e8f0;
  color: #2d3748;
  font-size: 0.95rem;
}

.report-table tbody tr:hover {
  background: #f7fafc;
}

.status-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  display: inline-block;
}

.status-todo {
  background: #f7fafc;
  color: #4a5568;
  border: 1px solid #e2e8f0;
}

.status-in-progress {
  background: #ebf8ff;
  color: #3182ce;
  border: 1px solid #bee3f8;
}

.status-review {
  background: #fefcbf;
  color: #d69e2e;
  border: 1px solid #faf089;
}

.status-done {
  background: #f0fff4;
  color: #38a169;
  border: 1px solid #c6f6d5;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .layout {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }

  .content-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
}

@media (max-width: 768px) {
  .date-row {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .content-body {
    padding: 1rem;
  }
  
  .sidebar {
    padding: 1.5rem;
  }
}
</style>