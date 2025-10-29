<template>
  <div class="reporting-page">
    <div class="layout">
      <!-- Left Sidebar -->
      <div class="sidebar">
        <h2>Report Generator</h2>

        <!-- Report Type -->
        <div class="form-group">
          <label>Report Type</label>
          <select v-model="reportType" class="select-field">
            <option value="">Select Report Type</option>
            <option value="task-completion">Task Completion</option>
            <option value="team-summary">Team Summary</option>
            <option value="time-logged">Logged Time</option>
          </select>
        </div>

        <!-- Report By (for task completion and time logged) -->
        <div class="form-group" v-if="reportType === 'task-completion' || reportType === 'logged-time'">
          <label>Report By</label>
          <select v-model="reportBy" class="select-field">
            <option value="">Select</option>
            <option v-if="reportType === 'task-completion'" value="user">User</option>
            <option value="project">Project</option>
            <option v-if="reportType === 'logged-time'" value="department">Department</option>
          </select>
        </div>

        <!-- Specific Selection (User/Project/Department) -->
        <div class="form-group" v-if="reportBy">
          <label>{{ reportBy === 'user' ? 'User' : reportBy === 'project' ? 'Project' : 'Department' }}</label>
          <select v-model="selectedItem" class="select-field">
            <option value="">Select {{ reportBy }}</option>
            <option v-for="item in getItemsList" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </div>

        <!-- Task Status (for task completion) -->
        <div class="form-group" v-if="reportType === 'task-completion'">
          <label>Task Status</label>
          <select v-model="taskStatus" class="select-field">
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="in-progress">In Progress</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <!-- Period Type -->
        <div class="form-group" v-if="reportType === 'team-summary' || reportType === 'logged-time'">
          <label>Period</label>
          <div class="button-group">
            <button 
              @click="periodType = 'weekly'" 
              :class="{ active: periodType === 'weekly' }"
              class="btn-period"
            >
              Weekly
            </button>
            <button 
              @click="periodType = 'monthly'" 
              :class="{ active: periodType === 'monthly' }"
              class="btn-period"
            >
              Monthly
            </button>
          </div>
        </div>

        <!-- Date Selection -->
        <div v-if="reportType === 'team-summary' || reportType === 'time-logged'">
          <div v-if="periodType === 'weekly'" class="date-row">
            <div class="form-group half">
              <label>Start Date</label>
              <input 
                type="date" 
                v-model="startDate" 
                @change="calculateEndDate"
                class="input-field"
              />
            </div>
            <div class="form-group half">
              <label>End Date</label>
              <input 
                type="date" 
                v-model="endDate" 
                class="input-field"
                readonly
              />
            </div>
          </div>

          <div v-if="periodType === 'monthly'" class="form-group">
            <label>Month</label>
            <input 
              type="month" 
              v-model="selectedMonth"
              class="input-field"
            />
          </div>
        </div>

        <!-- Date Selection for Task Completion -->
        <div v-if="reportType === 'task-completion'" class="date-row">
          <div class="form-group half">
            <label>Start Date</label>
            <input 
              type="date" 
              v-model="startDate" 
              class="input-field"
            />
          </div>
          <div class="form-group half">
            <label>End Date</label>
            <input 
              type="date" 
              v-model="endDate" 
              class="input-field"
            />
          </div>
        </div>

        <!-- Generate Button -->
        <button 
          @click="generateReport" 
          class="btn-generate" 
          :disabled="!canGenerateReport"
        >
          <span class="icon">📊</span>
          Generate Report
        </button>
      </div>

      <!-- Right Content Area -->
      <div class="content">
        <div class="content-header">
          <h1>{{ reportGenerated ? reportTitle : 'Logged Time Report' }}</h1>
          
          <!-- Export Dropdown -->
          <div class="export-dropdown" v-if="reportGenerated">
            <button @click="toggleExportMenu" class="btn-export-main">
              Export
              <span class="arrow">▼</span>
            </button>
            <div class="export-menu" v-if="showExportMenu">
              <button @click="exportCSV" class="export-option">
                <span class="icon">📄</span>
                Export as CSV
              </button>
              <button @click="exportPDF" class="export-option">
                <span class="icon">📑</span>
                Export as PDF
              </button>
            </div>
          </div>
        </div>

        <div class="content-body">
          <!-- Empty State -->
          <div v-if="!reportGenerated" class="empty-state">
            <div class="error-icon">⚠️</div>
            <p class="error-message">Could not connect to the API. Please ensure the server is running and accessible.</p>
          </div>

          <!-- Report Table -->
          <div v-else class="table-container">
            <table class="report-table">
              <thead>
                <tr>
                  <th v-for="header in reportHeaders" :key="header">{{ header }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in reportData" :key="idx">
                  <td v-for="(value, key) in row" :key="key">{{ value }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ReportingPage',
  data() {
    return {
      reportType: '',
      reportBy: '',
      selectedItem: '',
      taskStatus: 'all',
      periodType: 'weekly',
      startDate: '',
      endDate: '',
      selectedMonth: '',
      reportGenerated: false,
      reportData: [],
      reportHeaders: [],
      showExportMenu: false,
      
      // Mock data
      users: [
        { value: 'user1', label: 'John Doe' },
        { value: 'user2', label: 'Jane Smith' },
        { value: 'user3', label: 'Mike Johnson' },
        { value: 'user4', label: 'Sarah Williams' }
      ],
      projects: [
        { value: 'proj1', label: 'Project kX1TzL...' },
        { value: 'proj2', label: 'Website Redesign' },
        { value: 'proj3', label: 'Mobile App' },
        { value: 'proj4', label: 'API Integration' }
      ],
      departments: [
        { value: 'dept1', label: 'Engineering' },
        { value: 'dept2', label: 'Design' },
        { value: 'dept3', label: 'Marketing' },
        { value: 'dept4', label: 'Sales' }
      ]
    };
  },
  computed: {
    canGenerateReport() {
      if (!this.reportType) return false;
      
      if (this.reportType === 'task-completion') {
        return this.reportBy && this.startDate && this.endDate;
      }
      
      if (this.reportType === 'team-summary') {
        if (this.periodType === 'weekly') {
          return this.startDate && this.endDate;
        }
        return this.selectedMonth;
      }
      
      if (this.reportType === 'time-logged') {
        if (this.periodType === 'weekly') {
          return this.reportBy && this.startDate && this.endDate;
        }
        return this.reportBy && this.selectedMonth;
      }
      
      return false;
    },
    reportTitle() {
      let title = '';
      if (this.reportType === 'task-completion') {
        title = 'Task Completion Report';
      } else if (this.reportType === 'team-summary') {
        title = 'Team Summary Report';
      } else if (this.reportType === 'time-logged') {
        title = 'Logged Time Report';
      }
      return title;
    },
    getItemsList() {
      if (this.reportBy === 'user') return this.users;
      if (this.reportBy === 'project') return this.projects;
      if (this.reportBy === 'department') return this.departments;
      return [];
    }
  },
  methods: {
    calculateEndDate() {
      if (this.startDate) {
        const start = new Date(this.startDate);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        this.endDate = end.toISOString().split('T')[0];
      }
    },
    toggleExportMenu() {
      this.showExportMenu = !this.showExportMenu;
    },
    generateReport() {
      this.reportGenerated = true;
      this.showExportMenu = false;
      
      if (this.reportType === 'task-completion') {
        this.generateTaskCompletionData();
      } else if (this.reportType === 'team-summary') {
        this.generateTeamSummaryData();
      } else if (this.reportType === 'time-logged') {
        this.generateTimeLoggedData();
      }
    },
    generateTaskCompletionData() {
      if (this.reportBy === 'user') {
        this.reportHeaders = ['User', 'Tasks Assigned', 'Tasks Completed', 'Completion Rate', 'Overdue'];
        this.reportData = [
          { user: 'John Doe', assigned: 15, completed: 12, rate: '80%', overdue: 2 },
          { user: 'Jane Smith', assigned: 20, completed: 18, rate: '90%', overdue: 1 },
          { user: 'Mike Johnson', assigned: 12, completed: 10, rate: '83%', overdue: 0 },
          { user: 'Sarah Williams', assigned: 18, completed: 15, rate: '83%', overdue: 3 }
        ];
      } else {
        this.reportHeaders = ['Project', 'Tasks Assigned', 'Tasks Completed', 'Completion Rate', 'Team Members'];
        this.reportData = [
          { project: 'Website Redesign', assigned: 25, completed: 20, rate: '80%', members: 4 },
          { project: 'Mobile App', assigned: 30, completed: 25, rate: '83%', members: 5 },
          { project: 'API Integration', assigned: 15, completed: 13, rate: '87%', members: 3 }
        ];
      }
    },
    generateTeamSummaryData() {
      this.reportHeaders = ['Metric', 'Value', 'Change', 'Status'];
      this.reportData = [
        { metric: 'Total Tasks Completed', value: 65, change: '+12%', status: '✓' },
        { metric: 'Average Completion Rate', value: '82%', change: '+5%', status: '✓' },
        { metric: 'Total Hours Logged', value: 320, change: '+8%', status: '✓' },
        { metric: 'Overdue Tasks', value: 6, change: '-15%', status: '✓' },
        { metric: 'Team Members Active', value: 12, change: '0%', status: '-' }
      ];
    },
    generateTimeLoggedData() {
      if (this.reportBy === 'project') {
        this.reportHeaders = ['Project', 'Total Hours', 'Billable Hours', 'Team Members', 'Avg Hours/Member'];
        this.reportData = [
          { project: 'Website Redesign', total: 120, billable: 100, members: 4, avg: 30 },
          { project: 'Mobile App', total: 150, billable: 140, members: 5, avg: 30 },
          { project: 'API Integration', total: 80, billable: 75, members: 3, avg: 27 }
        ];
      } else {
        this.reportHeaders = ['Department', 'Total Hours', 'Projects', 'Team Members', 'Avg Hours/Person'];
        this.reportData = [
          { department: 'Engineering', total: 250, projects: 5, members: 8, avg: 31 },
          { department: 'Design', total: 120, projects: 3, members: 4, avg: 30 },
          { department: 'Marketing', total: 80, projects: 2, members: 3, avg: 27 }
        ];
      }
    },
    exportCSV() {
      const headers = Object.values(this.reportHeaders).join(',');
      const rows = this.reportData.map(row => Object.values(row).join(',')).join('\n');
      const csv = `${headers}\n${rows}`;
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      this.showExportMenu = false;
    },
    exportPDF() {
      alert('PDF export functionality would integrate with a library like jsPDF or pdfmake.');
      this.showExportMenu = false;
    }
  },
  watch: {
    reportType() {
      this.reportGenerated = false;
      this.reportBy = '';
      this.selectedItem = '';
      this.startDate = '';
      this.endDate = '';
      this.selectedMonth = '';
    },
    reportBy() {
      this.selectedItem = '';
      this.reportGenerated = false;
    },
    periodType() {
      this.startDate = '';
      this.endDate = '';
      this.selectedMonth = '';
      this.reportGenerated = false;
    }
  },
  mounted() {
    // Close export menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.export-dropdown')) {
        this.showExportMenu = false;
      }
    });
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
}

.layout {
  display: flex;
  min-height: 100vh;
}

/* Sidebar */
.sidebar {
  width: 360px;
  background: #ffffff;
  padding: 2rem;
  border-right: 1px solid #e2e8f0;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
}

.sidebar h2 {
  color: #1a202c;
  font-size: 1.5rem;
  margin: 0 0 2rem 0;
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

.select-field option {
  background: #ffffff;
  color: #2d3748;
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
}

.content-header {
  padding: 2rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
}

.content-header h1 {
  font-size: 1.75rem;
  margin: 0;
  color: #1a202c;
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
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.7;
}

.error-message {
  color: #f87171;
  font-size: 1rem;
  text-align: center;
  max-width: 500px;
}

/* Table */
.table-container {
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.report-table {
  width: 100%;
  border-collapse: collapse;
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
</style>