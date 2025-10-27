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
          <div class="mb-6">
            <label class="block text-sm font-medium mb-2">Export As</label>
            <select v-model="filters.exportFormat"
              class="w-full px-3 py-2 border border-border rounded-md bg-background">
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
          </div>


          <!-- Report Type -->
          <div class="mb-6">
            <label class="block text-sm font-medium mb-2">Report Type</label>
            <select v-model="filters.reportType" class="w-full px-3 py-2 border border-border rounded-md bg-background">
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
              <input v-model="filters.month" type="month"
                class="w-full px-3 py-2 border border-border rounded-md bg-background" />
            </div>


            <!-- Weekly Selection -->
            <div v-else class="space-y-2">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-xs text-muted-foreground mb-1">Start Date</label>
                  <input v-model="filters.startDate" type="date"
                    class="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background" />
                </div>
                <div>
                  <label class="block text-xs text-muted-foreground mb-1">End Date</label>
                  <input v-model="filters.endDate" type="date"
                    class="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background" />
                </div>
              </div>
            </div>
          </div>


          <!-- Filter By (only for Task Completion Report) -->
          <div v-if="filters.reportType === 'task-completion'" class="mb-6">
            <label class="block text-sm font-medium mb-2">Filter By</label>
            <select v-model="filters.filterBy" class="w-full px-3 py-2 border border-border rounded-md bg-background">
              <option value="all">All Tasks</option>
              <option value="project">Project</option>
              <option value="user">User</option>
            </select>


            <!-- Project Selection -->
            <div v-if="filters.filterBy === 'project'" class="mt-3">
              <select v-model="filters.selectedProject"
                class="w-full px-3 py-2 border border-border rounded-md bg-background">
                <option value="">Select Project</option>
                <option v-for="project in projects" :key="project.id" :value="project.id">
                  {{ project.title || project.name }}
                </option>
              </select>
            </div>


            <!-- User Selection -->
            <div v-if="filters.filterBy === 'user'" class="mt-3">
              <select v-model="filters.selectedUser"
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
              <select v-model="filters.selectedProject"
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
            <select v-model="filters.filterBy" class="w-full px-3 py-2 border border-border rounded-md bg-background">
              <option value="all">All Tasks</option>
              <option value="project">Project</option>
              <option value="departments">Department</option>
            </select>


            <!-- Project Selection -->
            <div v-if="filters.filterBy === 'project'" class="mt-3">
              <select v-model="filters.selectedProject"
                class="w-full px-3 py-2 border border-border rounded-md bg-background">
                <option value="">Select Project</option>
                <option v-for="project in projects" :key="project.id" :value="project.id">
                  {{ project.title || project.name }}
                </option>
              </select>
            </div>


            <!-- User Selection -->
            <div v-if="filters.filterBy === 'departments'" class="mt-3">
              <select v-model="filters.selectedDepartment"
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


            <button v-if="reportData.length > 0" @click="exportReport"
              class="w-full px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors my-4">
              Export {{ filters.exportFormat.toUpperCase() }}
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
          <div v-if="!reportData && !loading" class="flex flex-col items-center justify-center h-full text-center">
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
            <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p class="text-muted-foreground">Generating report...</p>
          </div>


          <!-- Report Display -->
          <div v-if="reportData && !loading" class="space-y-6">
            <!-- Report Header -->
            <div class="bg-card border border-border rounded-lg p-6">
              <h3 class="text-xl font-semibold mb-2">{{ reportTitle }}</h3>
              <p class="text-sm text-muted-foreground">
                {{ reportPeriod }}
              </p>
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
                            {{ assignee }}<span v-if="idx < task.assignedTo.length - 1">, </span>
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
                        <td class="border p-3">{{ task.taskOwner || 'Unkown Owner' }}</td>
                        <td v-if="filters.filterBy === 'user'" class="border p-3">{{ task.prjTitle || 'Unassigned' }}
                        </td>
                        <!-- <td v-else class="border p-3">{{ task.assignedTo || 'Unassigned' }}</td> -->
                        <td v-else class="border p-3">
                          <span v-if="Array.isArray(task.assignedTo)">
                            <span v-for="(assignee, idx) in task.assignedTo" :key="idx">
                              {{ assignee }}<span v-if="idx < task.assignedTo.length - 1">, </span>
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
        </div>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, computed, onMounted } from 'vue';
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
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
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

  console.log(startDate);
  console.log(endDate);
  let filteredTasks = tasks.filter(task => {
    const taskDate = new Date(task.createdDate._seconds * 1000);
    return taskDate >= startDate && taskDate <= endDate;
  });
  console.log(filteredTasks)

  // Process data for Task Compeletion
  if (filters.value.reportType === 'task-completion') {
    if (filters.value.filterBy === 'project' && filters.value.selectedProject) {
      filteredTasks = filteredTasks.filter(task =>
        task.projectId?._path?.segments?.[1] === filters.value.selectedProject
      );
    } else if (filters.value.filterBy === 'user' && filters.value.selectedUser) {
      filteredTasks = filteredTasks.filter(task =>
        task.assignedTo?.some(assignee =>
          assignee?._path?.segments?.[1] === filters.value.selectedUser
        )
      );
    }
    filteredTasks = filteredTasks.filter(t => t.status === "done");
  }


  // Process data for Team Summary
  else if (filters.value.reportType === 'team-summary') {
    filteredTasks = filteredTasks.filter(task =>
      task.projectId?._path?.segments?.[1] === filters.value.selectedProject
    );
    console.log(filteredTasks);
  }

  return filteredTasks;
};

const processTaskSummaryData = async (task) => {
  const data = {
    taskTitle: task.title,
    status: task.status,
    completedDate: formatDate(task.modifiedDate._seconds * 1000)
  };

  // Get task owner
  const taskOwnerId = task.taskCreatedBy._path.segments[1];
  const taskOwnerDetails = await getUser(taskOwnerId);
  data.taskOwner = taskOwnerDetails.user.name;

  // Get project details
  const projectId = task.projectId._path.segments[1];
  const projectDetails = await getProject(projectId);
  data.prjTitle = projectDetails.title;

  // Get assignees
  const assigneePromises = task.assignedTo.map(async (assignee) => {
    const assigneeId = assignee._path.segments[1];
    const assigneeDetails = await getUser(assigneeId);
    return assigneeDetails.user.name;
  });

  data.assignedTo = await Promise.all(assigneePromises);

  return data;
};

const processTaskCompletionData = async (task) => {
  const data = {
    taskTitle: task.title,
    status: task.status,
    deadline: formatDate(task.deadline._seconds * 1000)
  };

  // Get assignees
  const assigneePromises = task.assignedTo.map(async (assignee) => {
    const assigneeId = assignee._path.segments[1];
    const assigneeDetails = await getUser(assigneeId);
    return assigneeDetails.user.name;
  });

  data.assignedTo = await Promise.all(assigneePromises);

  return data;
};

// Main functions
const generateReport = async () => {
  loading.value = true;
  reportData.value = [];
  if (filters.value.reportType === 'logged-time') {

    try {
      let url = '/api/logTime/details';

      if (filters.value.selectedProject) {
        const prjId = filters.value.selectedProject;
        url = '/api/logTime/details/project/' + prjId;
      } else if (filters.value.selectedDepartment) {
        const deptID = filters.value.selectedDepartment;
        url = '/api/logTime/details/department/' + deptID;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch tasks');

      const data = await response.json();
      let tasks = data || [];
      console.log(data)

      tasks = filterTasks(tasks);
      reportData.value = tasks;
      console.log(reportData)
      console.log(filters.value.selectedProject);
    }
    catch (error) {
      console.error('Error generating logged time  report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      loading.value = false;
    }
  }
  else {
    try {
      const response = await fetch('/api/tasks/allTasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');

      const data = await response.json();
      let tasks = data.data || [];

      tasks = filterTasks(tasks);

      if (filters.value.reportType === 'task-completion') {
        const processedTasks = await Promise.all(
          tasks.map(task => processTaskSummaryData(task))
        );
        reportData.value = processedTasks;
        console.log(reportData)
      }
      else if (filters.value.reportType === 'team-summary') {
        const processedTasks = await Promise.all(
          tasks.map(task => processTaskCompletionData(task))
        );
        reportData.value = processedTasks;
      }

    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      loading.value = false;
    }
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

// Export functions
const mapReportData = (inputData) => ({
  "Task Name": inputData.taskTitle || '',
  "Owner of Task": inputData.taskOwner || '',
  "Project Name": inputData.prjTitle || '',
  "Assignee List": Array.isArray(inputData.assignedTo)
    ? inputData.assignedTo.join(', ')
    : inputData.assignedTo,
  "Status": inputData.status.toUpperCase(),
  "Completion date": inputData.completedDate || '',
  "Deadline": inputData.deadline || ''
});

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
    const response = await fetch('/api/report/generate_csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData.value)
    });

    if (!response.ok) throw new Error('Failed to generate CSV');

    const blob = await response.blob();
    downloadBlob(blob, 'report.csv');

  } catch (e) {
    error.value = e.message || 'Unknown error';
  } finally {
    loading.value = false;
  }
};

const exportPDF = async () => {
  loading.value = true;
  error.value = '';

  try {
    let reportTitle = "";
    if (filters.value.filterBy === "project") {
      const project = await getProject(filters.value.selectedProject);
      reportTitle = project.title;
    } else if (filters.value.filterBy === "user") {
      const user = await getUser(filters.value.selectedUser);
      reportTitle = user.user.name;
    }

    const mappedReports = reportData.value.map(mapReportData);
    console.log(mappedReports);
    const cleanedTimeFrame = formatDateDisplay(filters.value);

    const response = await fetch('/api/report/generate_pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportType: filters.value.reportType,
        reportTitle,
        timeFrame: cleanedTimeFrame,
        filterType: filters.value.filterBy,
        data: mappedReports
      })
    });

    if (!response.ok) throw new Error('Failed to generate PDF');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');

    setTimeout(() => window.URL.revokeObjectURL(url), 1000);

  } catch (e) {
    error.value = e.message || 'Unknown error';
  } finally {
    loading.value = false;
  }
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
/* Add any custom styles here */
</style>
