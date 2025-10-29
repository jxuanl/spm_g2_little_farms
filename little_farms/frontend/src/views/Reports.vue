<template>
  <div class="h-screen bg-background flex">
    <TaskSidebar :activeProject="activeProject" @projectChange="setActiveProject"
      @createTask="() => setIsCreateModalOpen(true)" />

    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="bg-card border-b border-border p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-semibold">Reports</h2>
            <p class="text-sm text-muted-foreground mt-1">
              Analytics and project insights
            </p>
          </div>
        </div>
      </div>


      <div class="flex-1 flex overflow-hidden">
        <!-- Filters Sidebar -->
        <div class="w-1/4 border-r border-border bg-card p-4 overflow-y-auto">
          <h3 class="text-lg font-semibold mb-4">Report Filters</h3>


          <!-- Export Format -->
          <!-- <div class="mb-6">
            <label class="block text-sm font-medium mb-2">Export As</label>
            <select v-model="filters.exportFormat" @change="onFilterChange"
              class="w-full px-3 py-2 border border-border rounded-md bg-background">
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
          </div> -->


          <!-- Report Type -->
          <div class="mb-6">
            <label class="block text-sm font-medium mb-2">Report Type</label>
            <select v-model="filters.reportType" @change="onFilterChange"
              class="w-full px-3 py-2 border border-border rounded-md bg-background">
              <option value="team-summary">Team Summary</option>
              <option value="task-completion">Task Completion</option>
              <option value="logged-time">Logged Time</option>
            </select>
          </div>


          <!-- Interval -->
          <div class="mb-6">
            <label class="block text-sm font-medium mb-2">Interval</label>
            <select v-model="filters.interval" @change="handleIntervalChange"
              class="w-full px-3 py-2 border border-border rounded-md bg-background">
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>


          <!-- Time Frame (conditional) -->
          <div class="mb-6">
            <label class="block text-sm font-medium mb-2">Time Frame</label>

            <!-- Monthly Selection -->
            <div v-if="filters.interval === 'monthly'" class="space-y-2">
              <input v-model="filters.month" type="month" @change="onFilterChange"
                class="w-full px-3 py-2 border border-border rounded-md bg-background" />
            </div>


            <!-- Weekly Selection -->
            <div v-else class="space-y-2">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-xs text-muted-foreground mb-1">Start Date</label>
                  <input v-model="filters.startDate" @change="updateEndDate" type="date"
                    class="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background" />
                </div>
                <div>
                  <label class="block text-xs text-muted-foreground mb-1">End Date</label>
                  <input v-model="filters.endDate" type="date" readonly
                    class="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background bg-muted cursor-not-allowed" />
                  <p class="text-xs text-muted-foreground mt-1">Automatically set to 1 week later</p>
                </div>
              </div>
            </div>
          </div>


          <!-- Filter By (only for Task Completion Report) -->
          <div v-if="filters.reportType === 'task-completion'" class="mb-6">
            <label class="block text-sm font-medium mb-2">Filter By</label>
            <select v-model="filters.filterBy" @change="onFilterChange"
              class="w-full px-3 py-2 border border-border rounded-md bg-background">
              <option value="all">All Tasks</option>
              <option value="project">Project</option>
              <option value="user">User</option>
            </select>


            <!-- Project Selection -->
            <div v-if="filters.filterBy === 'project'" class="mt-3">
              <select v-model="filters.selectedProject" @change="onFilterChange"
                class="w-full px-3 py-2 border border-border rounded-md bg-background">
                <option value="">Select Project</option>
                <option v-for="project in projects" :key="project.id" :value="project.id">
                  {{ project.title || project.name }}
                </option>
              </select>
            </div>


            <!-- User Selection -->
            <div v-if="filters.filterBy === 'user'" class="mt-3">
              <select v-model="filters.selectedUser" @change="onFilterChange"
                class="w-full px-3 py-2 border border-border rounded-md bg-background">
                <option value="">Select User</option>
                <option v-for="user in users" :key="user.id" :value="user.id">
                  {{ user.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Filter By (only for Team Summary Report) -->
          <div v-if="filters.reportType === 'team-summary'" class="mb-6">
            <label class="block text-sm font-medium mb-2">Filter By Project</label>



            <!-- Project Selection -->
            <div class="mt-3">
              <select v-model="filters.selectedProject" @change="onFilterChange"
                class="w-full px-3 py-2 border border-border rounded-md bg-background">
                <option value="">Select Project</option>
                <option v-for="project in projects" :key="project.id" :value="project.id">
                  {{ project.title || project.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Filter By (only for Logged Time Report) -->
          <div v-if="filters.reportType === 'logged-time'" class="mb-6">
            <label class="block text-sm font-medium mb-2">Filter By</label>
            <select v-model="filters.filterBy" @change="onFilterChange"
              class="w-full px-3 py-2 border border-border rounded-md bg-background">
              <option value="all">All Tasks</option>
              <option value="project">Project</option>
              <option value="departments">Department</option>
            </select>


            <!-- Project Selection -->
            <div v-if="filters.filterBy === 'project'" class="mt-3">
              <select v-model="filters.selectedProject" @change="onFilterChange"
                class="w-full px-3 py-2 border border-border rounded-md bg-background">
                <option value="">Select Project</option>
                <option v-for="project in projects" :key="project.id" :value="project.id">
                  {{ project.title || project.name }}
                </option>
              </select>
            </div>


            <!-- User Selection -->
            <div v-if="filters.filterBy === 'departments'" class="mt-3">
              <select v-model="filters.selectedDepartment" @change="onFilterChange"
                class="w-full px-3 py-2 border border-border rounded-md bg-background">
                <option value="">Select Department</option>
                <option v-for="dept in departments" :key="dept" :value="dept">
                  {{ dept }}
                </option>
              </select>
            </div>
          </div>


          <!-- Action Buttons -->
          <div class="space-y-4">
            <button @click="generateReport" :disabled="loading"
              class="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50">
              {{ loading ? 'Generating...' : 'Generate Report' }}
            </button>
          </div>

          <!-- <div class="p-4 bg-yellow-100 mb-4">
            <h3 class="font-bold">Debug Info:</h3>
            <p>Report Type: {{ filters.reportType }}</p>
            <p>Selected Project: {{ filters.selectedProject }}</p>
            <p>Projects Loaded: {{ projects.length }}</p>
          </div> -->
        </div>


        <!-- Main Report Display Area -->
        <div class="flex-1 p-6 overflow-y-auto">
          <!-- Empty State -->
          <div v-if="reportData.length == 0 && !loading"
            class="flex flex-col items-center justify-center h-full text-center">
            <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <BarChart3 class="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 class="text-lg font-medium mb-2">No Report Generated</h3>
            <p class="text-muted-foreground mb-4">
              Select filters and click "Generate Report" to view analytics
            </p>
          </div>


          <!-- Loading State -->
          <div v-if="loading" class="flex flex-col items-center justify-center h-full">
            <div class="loading-spinner mb-4">
              <div class="spinner-circle"></div>
            </div>
            <p class="text-muted-foreground">Generating report...</p>
          </div>


          <!-- Report Display -->
          <div v-if="reportData.length != 0 && !loading && !filtersChanged" class="space-y-6">
            <!-- Report Header -->
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <h3 class="text-xl font-semibold mb-2">{{ reportTitle }}</h3>
                <p class="text-sm text-muted-foreground">
                  {{ reportPeriod }}
                </p>
              </div>
              <div class="flex items-center space-x-3 mr-4">
                <div class="relative inline-block text-left">
                  <button type="button"
                    class="inline-flex justify-center items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                    @click="showExportMenu = !showExportMenu">
                    Export
                    <svg class="ml-2 -mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                      <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        d="M6 8l4 4 4-4" />
                    </svg>
                  </button>

                  <!-- Dropdown Menu -->
                  <div v-if="showExportMenu"
                    class="absolute right-0 mt-2 w-40 bg-card border border-border rounded-md shadow-lg z-50">
                    <button @click="filters.exportFormat = 'csv'; exportReport(); showExportMenu = false"
                      class="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors">
                      Export as CSV
                    </button>
                    <button @click="filters.exportFormat = 'pdf'; exportReport(); showExportMenu = false"
                      class="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors">
                      Export as PDF
                    </button>
                  </div>
                </div>

              </div>
            </div>


            <!-- Team Summary Report -->
            <div v-if="filters.reportType === 'team-summary'" class="bg-card border border-border rounded-lg p-6">
              <h4 class="text-lg font-semibold mb-4">Team Summary</h4>
              <div class="overflow-x-auto">
                <table class="w-full border-collapse">
                  <thead>
                    <tr class="bg-muted">
                      <th class="border p-3 text-left">Task Name</th>
                      <th class="border p-3 text-left">Assigned To</th>
                      <th class="border p-3 text-left">Status</th>
                      <th class="border p-3 text-left">Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="task in reportData" :key="task.id" class="hover:bg-muted/50">
                      <td class="border p-3">{{ task.taskTitle }}</td>
                      <!-- <td class="border p-3">{{ task.assignedTo || 'Unassigned' }}</td> -->
                      <td class="border p-3">
                        <span v-if="Array.isArray(task.assignedTo)">
                          <span v-for="(assignee, idx) in task.assignedTo" :key="idx">
                            {{ assignee.name }}<span v-if="idx < task.assignedTo.length - 1">, </span>
                          </span>
                        </span>
                        <span v-else>
                          {{ task.assignedTo || 'Unassigned' }}
                        </span>
                      </td>
                      <td class="border p-3">
                        <span :class="getStatusBadgeClass(task.status)" class="px-2 py-1 rounded text-xs">
                          {{ task.status }}
                        </span>
                      </td>
                      <td class="border p-3 text-sm text-muted-foreground">
                        {{ formatDate(task.deadline) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>


            <!-- Task Completion Report -->
            <div v-if="filters.reportType === 'task-completion'" class="space-y-4">


              <!-- Task Details -->
              <div class="bg-card border border-border rounded-lg p-6">
                <h4 class="text-lg font-semibold mb-4">Task Details</h4>
                <div class="overflow-x-auto">
                  <table class="w-full border-collapse">
                    <thead>
                      <tr class="bg-muted">
                        <th class="border p-3 text-left">Task</th>
                        <th class="border p-3 text-left">Task Owner</th>
                        <th v-if="filters.filterBy === 'user'" class="border p-3 text-left">Project</th>
                        <th v-else class="border p-3 text-left">Assignee</th>
                        <th class="border p-3 text-left">Status</th>
                        <th class="border p-3 text-left">Completion Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="task in reportData" :key="task.title" class="hover:bg-muted/50">
                        <td class="border p-3">{{ task.taskTitle }}</td>
                        <td class="border p-3">{{ task.taskOwner.name || 'Unkown Owner' }}</td>
                        <td v-if="filters.filterBy === 'user'" class="border p-3">{{ task.prjTitle || 'Unassigned' }}
                        </td>
                        <!-- <td v-else class="border p-3">{{ task.assignedTo || 'Unassigned' }}</td> -->
                        <td v-else class="border p-3">
                          <span v-if="Array.isArray(task.assignedTo)">
                            <span v-for="(assignee, idx) in task.assignedTo" :key="idx">
                              {{ assignee.name }}<span v-if="idx < task.assignedTo.length - 1">, </span>
                            </span>
                          </span>
                          <span v-else>
                            {{ task.assignedTo || 'Unassigned' }}
                          </span>
                        </td>

                        <td class="border p-3">
                          <span :class="getStatusBadgeClass(task.status)" class="px-2 py-1 rounded text-xs">
                            {{ task.status }}
                          </span>
                        </td>
                        <td class="border p-3">{{ task.status === 'done' ? formatDate(task.completedDate) : '-' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>


            <!-- Logged Time Report (Placeholder) -->
            <!-- <div v-if="filters.reportType === 'logged-time'" class="bg-card border border-border rounded-lg p-6">
              <h4 class="text-lg font-semibold mb-4">Logged Time Report</h4>
              <p class="text-muted-foreground">Time tracking feature coming soon...</p>
            </div> -->

            <div v-if="filters.reportType === 'logged-time'" class="space-y-4">


              <!-- Task Details -->
              <div class="bg-card border border-border rounded-lg p-6">
                <h4 class="text-lg font-semibold mb-4">Logged Time</h4>
                <div class="overflow-x-auto">
                  <table class="w-full border-collapse">
                    <thead>
                      <tr class="bg-muted">
                        <th class="border p-3 text-left">Project</th>
                        <th class="border p-3 text-left">Task</th>
                        <th class="border p-3 text-left">Staff Name</th>
                        <th class="border p-3 text-left">Department</th>
                        <th class="border p-3 text-left">No. of Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="task in reportData" :key="task.loggedTimeId" class="hover:bg-muted/50">
                        <td class="border p-3">{{ task.prjName }}</td>
                        <td class="border p-3">{{ task.taskName || 'Unkown Owner' }}</td>
                        <td class="border p-3">{{ task.userName || 'Unassigned' }}</td>
                        <td class="border p-3">{{ task.userDept || 'Unassigned' }}</td>
                        <td class="border p-3">{{ task.amtOfTime || 'Unassigned' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>

          <!-- Filters Changed State -->
          <div v-if="filtersChanged && !loading" class="flex flex-col items-center justify-center h-full text-center">
            <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <BarChart3 class="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 class="text-lg font-medium mb-2">Filters Updated</h3>
            <p class="text-muted-foreground mb-4">
              Click "Generate Report" to view updated analytics with new filters
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { BarChart3 } from 'lucide-vue-next';
import { getAuth } from 'firebase/auth';
import TaskSidebar from '../components/TaskSidebar.vue';

// Reactive state
const activeProject = ref("all");
const isCreateModalOpen = ref(false);
const loading = ref(false);
const reportData = ref([]);
const projects = ref([]);
const users = ref([]);
const departments = ref([]);
const error = ref('');
const filtersChanged = ref(false);
const showExportMenu = ref(false);

const filters = ref({
  exportFormat: 'csv',
  reportType: 'team-summary',
  interval: 'monthly',
  month: new Date().toISOString().slice(0, 7),
  startDate: '',
  endDate: '',
  filterBy: 'all',
  selectedProject: '',
  selectedUser: '',
  selectedDepartment: ''
});

// Auth helper
const getCurrentUserAuth = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  return { auth, user, token };
};

// Computed properties this is for frontend
const reportTitle = computed(() => {
  const titles = {
    'team-summary': 'Team Summary Report',
    'task-completion': 'Task Completion Report',
    'logged-time': 'Logged Time Report'
  };
  return titles[filters.value.reportType] || 'Report';
});

const reportPeriod = computed(() => {
  if (filters.value.interval === 'monthly') {
    const date = new Date(filters.value.month + '-01');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  return `${filters.value.startDate} to ${filters.value.endDate}`;
});

// Utility functions
const formatDate = (date) => {
  if (!date) return '-';

  // Handle Firestore timestamp objects
  if (date._seconds !== undefined && date._nanoseconds !== undefined) {
    // Convert Firestore timestamp to JavaScript Date
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
    'todo': 'bg-gray-100 text-gray-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    'review': 'bg-yellow-100 text-yellow-800',
    'done': 'bg-green-100 text-green-800'
  };
  return classes[status] || classes['todo'];
};

// Date calculation functions
const calculateEndDate = (startDate) => {
  if (!startDate) return '';

  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Add 6 days to get 7 days total (including start date)

  return end.toISOString().split('T')[0];
};

const updateEndDate = () => {
  if (filters.value.interval === 'weekly' && filters.value.startDate) {
    filters.value.endDate = calculateEndDate(filters.value.startDate);
  }
  onFilterChange();
};

// Filter change handler
const onFilterChange = () => {
  filtersChanged.value = true;
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

const getUser = async (uid) => {
  return fetchWithAuth(`/api/users/users/${uid}`);
};

const getProject = async (pid) => {
  return fetchWithAuth(`/api/projects/${pid}`);
};

const loadProjectsAndUsers = async () => {
  try {
    const [projectsRes, usersRes, departmentsRes] = await Promise.all([
      fetchWithAuth('/api/allProjects'),
      fetchWithAuth('/api/users/users'),
      fetchWithAuth('/api/users/departments'),
    ]);

    projects.value = projectsRes.data || projectsRes.projects || [];
    users.value = usersRes.data || usersRes.users || [];
    departments.value = departmentsRes.departments || departmentsRes.data || [];
  } catch (error) {
    console.error('Error loading projects/users:', error);
  }
};

// Filter and data processing
const getDateRange = () => {
  if (filters.value.interval === 'monthly') {
    const date = new Date(filters.value.month + '-01');
    return {
      startDate: new Date(date.getFullYear(), date.getMonth(), 1),
      endDate: new Date(date.getFullYear(), date.getMonth() + 1, 0)
    };
  }
  return {
    startDate: new Date(filters.value.startDate),
    endDate: new Date(filters.value.endDate)
  };
};

const filterTasks = (tasks) => {
  const { startDate, endDate } = getDateRange();

  // console.log(startDate);
  // console.log(endDate);
  let filteredTasks = tasks.filter(task => {
    const taskDate = new Date(task.createdDate._seconds * 1000);
    return taskDate >= startDate && taskDate <= endDate;
  });
  // console.log(filteredTasks)

  return filteredTasks;
};

// Main functions
const generateReport = async () => {
  loading.value = true;
  reportData.value = [];
  filtersChanged.value = false; // Reset the filters changed flag

  try {
    const { reportType, selectedProject, selectedUser, selectedDepartment, filterBy } = filters.value;

    // console.log(filterBy)
    // Define report configurations
    const reportConfigs = {
      'team-summary': {
        urlBuilder: () => selectedProject ? `/api/reportData/project/${selectedProject}` : null,
        requiresFilter: true
      },
      'task-completion': {
        urlBuilder: () => {
          if (filterBy == 'project') return `/api/reportData/project/${selectedProject}/filtered?status=done`;
          if (filterBy == 'user') return `/api/reportData/user/${selectedUser}/filtered?status=done`;
          return '/api/reportData';
        },
        requiresFilter: true
      },
      'logged-time': {
        urlBuilder: () => {
          if (filterBy == 'project') return `/api/logTime/details/project/${selectedProject}`;
          if (filterBy == 'departments') return `/api/logTime/details/department/${selectedDepartment}`;
          return '/api/logTime/details';
        },
        requiresFilter: true
      }
    };

    const config = reportConfigs[reportType];
    if (!config) {
      throw new Error(`Unsupported report type: ${reportType}`);
    }
    const url = config.urlBuilder();
    // console.log("URL: " + url)
    if (!url) {
      throw new Error('Missing required filters for this report type');
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch report data');

    let data = await response.json();
    data = data || [];

    // Apply filtering if required
    const tasks = config.requiresFilter ? filterTasks(data) : data;

    reportData.value = tasks;

    // Debug logging
    // console.log('Fetched data:', data);
    // console.log('Processed report data:', reportData.value);
    // console.log('Selected project:', selectedProject);

  } catch (error) {
    console.error('Error generating report:', error);
    alert('Failed to generate report. Please try again.');
  } finally {
    loading.value = false;
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
    filters.value.endDate = calculateEndDate(filters.value.startDate);
  }
  onFilterChange();
};


const formatDateDisplay = (timeFrame) => {
  const data = timeFrame?.__v_raw || timeFrame;

  if (data.interval === "monthly" && data.month) {
    const [year, month] = data.month.split('-');
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  } else if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    return `${start.getDate()}-${new Date(data.endDate).getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
  }
  return "Date not specified";
};

const exportReport = async () => {
  if (!reportData.value.length) return;

  if (filters.value.exportFormat === 'csv') {
    await exportCSV();
  } else {
    await exportPDF();
  }
};

const exportCSV = async () => {
  loading.value = true;
  error.value = '';

  try {
    // Reuse the same mapper!
    const mappedData = reportMappers[filters.value.reportType](reportData.value);

    // console.log(`Exporting ${filters.value.reportType} CSV:`);
    // console.log('Mapped data count:', mappedData.length);
    // console.log('Sample data:', mappedData.slice(0, 2));

    const response = await fetch('/api/report/generate_csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportType: filters.value.reportType,
        data: mappedData
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'Failed to generate CSV');
    }

    const blob = await response.blob();

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${filters.value.reportType}_report_${timestamp}.csv`;

    downloadBlob(blob, filename);

  } catch (e) {
    console.error('CSV export error:', e);
    error.value = e.message || 'Unknown error';
  } finally {
    loading.value = false;
  }
};

const exportPDF = async () => {
  // console.log("Export PDF");
  loading.value = true;
  error.value = '';

  try {
    const reportTitle = await getReportTitle();
    const cleanedTimeFrame = formatDateDisplay(filters.value);

    // Get properly mapped data for the specific report type
    const mappedData = getMappedReportData(reportData.value, filters.value.reportType);

    // console.log('Sending data:', {
    //   reportType: filters.value.reportType,
    //   reportTitle,
    //   timeFrame: cleanedTimeFrame,
    //   filterType: filters.value.filterBy,
    //   data: mappedData
    // });

    const response = await fetch('/api/report/generate_pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportType: filters.value.reportType,
        reportTitle,
        timeFrame: cleanedTimeFrame,
        filterType: filters.value.filterBy,
        data: mappedData
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'Failed to generate PDF');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);

  } catch (e) {
    console.error('PDF export error:', e);
    error.value = e.message || 'Unknown error';
  } finally {
    loading.value = false;
  }
};

// Helper function to get report title
const getReportTitle = async () => {
  switch (filters.value.filterBy) {
    case "project":
      const project = await getProject(filters.value.selectedProject);
      return project.title;
    case "user":
      const user = await getUser(filters.value.selectedUser);
      return user.user.name;
    case "department":
      return filters.value.selectedDepartment;
    default:
      return "Report";
  }
};

// Report-specific data mappers
const reportMappers = {
  'task-completion': (data) => data.map(item => ({
    "Task Name": item.taskTitle || item.taskName || '',
    "Owner of Task": item.taskOwner?.name || '',
    "Assignee List": Array.isArray(item.assignedTo)
      ? item.assignedTo.map(person => person.name).join(', ')
      : item.assignedTo?.name || 'Unassigned',
    "Status": (item.status || '').toUpperCase(),
    "Completion date": formatDate(item.completedDate) || '',
    "Project Name": item.prjTitle || item.prjName || '' // Only for project filter
  })),

  'team-summary': (data) => data.map(item => ({
    "Task Name": item.taskTitle || item.taskName || '',
    "Assignee List": Array.isArray(item.assignedTo)
      ? item.assignedTo.map(person => person.name).join(', ')
      : item.assignedTo?.name || 'Unassigned',
    "Status": (item.status || '').toUpperCase(),
    "Deadline": formatDate(item.deadline) || ''
  })),

  'logged-time': (data) => data.map(item => ({
    "Project Name": item.prjTitle || item.prjName || '',
    "Task Name": item.taskTitle || item.taskName || '',
    "Staff Name": item.userName || item.taskOwner?.name || '',
    "Department": item.userDept || '',
    "No. of Hours": item.amtOfTime || '0'
  }))
};

// Main mapping function
const getMappedReportData = (inputData, reportType) => {
  const mapper = reportMappers[reportType];
  if (!mapper) {
    console.warn(`No mapper found for report type: ${reportType}, using default`);
    return inputData;
  }

  const mappedData = mapper(inputData);
  // console.log(`Mapped ${reportType} data:`, mappedData);
  return mappedData;
};

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

// Component functions
const setActiveProject = (project) => {
  activeProject.value = project;
};

const setIsCreateModalOpen = (open) => {
  isCreateModalOpen.value = open;
};

onMounted(() => {
  loadProjectsAndUsers();
});
</script>

<style scoped>
/* Enhanced Loading Spinner Styles */
.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-circle {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  /* Light gray border */
  border-top: 4px solid #3b82f6;
  /* Primary blue color */
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

/* Optional: Add a subtle pulse effect to the loading text */
.loading-spinner+p {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.7;
  }
}

/* Add any custom styles here */
</style>