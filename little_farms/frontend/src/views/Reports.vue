<template>
  <div class="h-screen bg-background flex">
    <TaskSidebar
      :activeProject="activeProject"
      @projectChange="setActiveProject"
      @createTask="() => setIsCreateModalOpen(true)"
    />
    
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

      <!-- Main Content Area -->
      <div class="flex-1 overflow-y-auto">
        <!-- Filter Configuration Page -->
        <div v-if="!showReport" class="max-w-2xl mx-auto p-8">
          <div class="bg-card border border-border rounded-lg p-8 space-y-6">
            <h3 class="text-xl font-semibold mb-6">Configure Report</h3>

            <!-- Export Format -->
            <div>
              <label class="block text-sm font-medium mb-2">Export As</label>
              <select 
                v-model="filters.exportFormat"
                class="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </select>
            </div>

            <!-- Report Type -->
            <div>
              <label class="block text-sm font-medium mb-2">Report Type</label>
              <select 
                v-model="filters.reportType"
                class="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="team-summary">Team Summary</option>
                <option value="task-completion">Task Completion</option>
                <option value="logged-time">Logged Time</option>
              </select>
            </div>

            <!-- Interval -->
            <div>
              <label class="block text-sm font-medium mb-2">Interval</label>
              <select 
                v-model="filters.interval"
                @change="handleIntervalChange"
                class="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <!-- Time Frame -->
            <div>
              <label class="block text-sm font-medium mb-2">Time Frame</label>
              
              <!-- Monthly Selection -->
              <div v-if="filters.interval === 'monthly'">
                <input 
                  v-model="filters.month"
                  type="month"
                  class="w-full px-3 py-2 border border-border rounded-md bg-background"
                />
              </div>

              <!-- Weekly Selection -->
              <div v-else class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-muted-foreground mb-1">Start Date</label>
                  <input 
                    v-model="filters.startDate"
                    type="date"
                    class="w-full px-3 py-2 border border-border rounded-md bg-background"
                  />
                </div>
                <div>
                  <label class="block text-xs text-muted-foreground mb-1">End Date</label>
                  <input 
                    v-model="filters.endDate"
                    type="date"
                    class="w-full px-3 py-2 border border-border rounded-md bg-background"
                  />
                </div>
              </div>
            </div>

            <!-- Filter By (only for Task Completion Report) -->
            <div v-if="filters.reportType === 'task-completion'">
              <label class="block text-sm font-medium mb-2">Filter By</label>
              <select 
                v-model="filters.filterBy"
                class="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="all">All Tasks</option>
                <option value="project">Project</option>
                <option value="user">User</option>
              </select>

              <!-- Project Selection -->
              <div v-if="filters.filterBy === 'project'" class="mt-3">
                <select 
                  v-model="filters.selectedProject"
                  class="w-full px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="">Select Project</option>
                  <option v-for="project in projects" :key="project.id" :value="project.id">
                    {{ project.title || project.name }}
                  </option>
                </select>
              </div>

              <!-- User Selection -->
              <div v-if="filters.filterBy === 'user'" class="mt-3">
                <select 
                  v-model="filters.selectedUser"
                  class="w-full px-3 py-2 border border-border rounded-md bg-background"
                >
                  <option value="">Select User</option>
                  <option v-for="user in users" :key="user.id" :value="user.id">
                    {{ user.name }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Generate Button -->
            <div class="pt-4">
              <button 
                @click="generateReport"
                :disabled="loading"
                class="w-full px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
              >
                {{ loading ? 'Generating...' : 'Generate Report' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Generated Report Display Page -->
        <div v-else class="p-8">
          <div class="max-w-6xl mx-auto space-y-6">
            <!-- Report Header with Actions -->
            <div class="bg-card border border-border rounded-lg p-6">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-xl font-semibold mb-2">{{ reportTitle }}</h3>
                  <p class="text-sm text-muted-foreground">{{ reportPeriod }}</p>
                </div>
                <div class="flex gap-3">
                  <button 
                    @click="exportReport"
                    class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Export {{ filters.exportFormat.toUpperCase() }}
                  </button>
                  <button 
                    @click="backToFilters"
                    class="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
                  >
                    Back to Filters
                  </button>
                </div>
              </div>
            </div>

            <!-- Team Summary Report -->
            <div v-if="filters.reportType === 'team-summary'" class="bg-card border border-border rounded-lg p-6">
              <h4 class="text-lg font-semibold mb-4">Team Summary</h4>
              <div class="overflow-x-auto">
                <table class="w-full border-collapse text-sm">
                  <thead>
                    <tr class="bg-muted">
                      <th class="border border-border p-3 text-left font-semibold">Task Name</th>
                      <th class="border border-border p-3 text-left font-semibold w-32">Assigned To</th>
                      <th class="border border-border p-3 text-left font-semibold w-28">Start Date</th>
                      <th class="border border-border p-3 text-left font-semibold w-28">End Date</th>
                      <th class="border border-border p-3 text-left font-semibold w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="task in reportData.tasks" :key="task.id" class="hover:bg-muted/50">
                      <td class="border border-border p-3">{{ task.title }}</td>
                      <td class="border border-border p-3">{{ task.assigneeName || 'Unassigned' }}</td>
                      <td class="border border-border p-3">{{ formatDate(task.createdDate) }}</td>
                      <td class="border border-border p-3">{{ formatDate(task.deadline) }}</td>
                      <td class="border border-border p-3">
                        <span :class="getStatusBadgeClass(task.status)" class="px-2 py-1 rounded text-xs font-medium">
                          {{ task.status }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Task Completion Report -->
            <div v-if="filters.reportType === 'task-completion'" class="space-y-4">
              <!-- Summary Stats -->
              <div class="grid grid-cols-3 gap-4">
                <div class="bg-card border border-border rounded-lg p-4">
                  <div class="text-sm text-muted-foreground">Total Tasks</div>
                  <div class="text-2xl font-bold">{{ reportData.totalTasks }}</div>
                </div>
                <div class="bg-card border border-border rounded-lg p-4">
                  <div class="text-sm text-muted-foreground">Completed</div>
                  <div class="text-2xl font-bold text-green-600">{{ reportData.completedTasks }}</div>
                </div>
                <div class="bg-card border border-border rounded-lg p-4">
                  <div class="text-sm text-muted-foreground">Completion Rate</div>
                  <div class="text-2xl font-bold">{{ reportData.completionRate }}%</div>
                </div>
              </div>

              <!-- Task Details -->
              <div class="bg-card border border-border rounded-lg p-6">
                <h4 class="text-lg font-semibold mb-4">Task Details</h4>
                <div class="overflow-x-auto">
                  <table class="w-full border-collapse">
                    <thead>
                      <tr class="bg-muted">
                        <th class="border p-3 text-left">Task</th>
                        <th class="border p-3 text-left">Project</th>
                        <th class="border p-3 text-left">Assignee</th>
                        <th class="border p-3 text-left">Status</th>
                        <th class="border p-3 text-left">Completion Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="task in reportData.tasks" :key="task.id" class="hover:bg-muted/50">
                        <td class="border p-3">{{ task.title }}</td>
                        <td class="border p-3">{{ task.projectTitle || 'No Project' }}</td>
                        <td class="border p-3">{{ task.assigneeName || 'Unassigned' }}</td>
                        <td class="border p-3">
                          <span :class="getStatusBadgeClass(task.status)" class="px-2 py-1 rounded text-xs">
                            {{ task.status }}
                          </span>
                        </td>
                        <td class="border p-3">{{ task.status === 'done' ? formatDate(task.modifiedDate) : '-' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Logged Time Report -->
            <div v-if="filters.reportType === 'logged-time'" class="bg-card border border-border rounded-lg p-6">
              <h4 class="text-lg font-semibold mb-4">Logged Time Report</h4>
              <p class="text-muted-foreground">Time tracking feature coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CreateTaskModal
      :isOpen="isCreateModalOpen"
      @close="() => setIsCreateModalOpen(false)"
      @createTask="handleCreateTask"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getAuth } from 'firebase/auth';
import TaskSidebar from '../components/TaskSidebar.vue';
import CreateTaskModal from '../components/CreateTaskModal.vue';

const activeProject = ref("all");
const isCreateModalOpen = ref(false);
const loading = ref(false);
const reportData = ref(null);
const showReport = ref(false);
const projects = ref([]);
const users = ref([]);

const filters = ref({
  exportFormat: 'csv',
  reportType: 'team-summary',
  interval: 'monthly',
  month: new Date().toISOString().slice(0, 7),
  startDate: '',
  endDate: '',
  filterBy: 'all',
  selectedProject: '',
  selectedUser: ''
});

const reportTitle = computed(() => {
  const titles = {
    'team-summary': 'Monthly Work Summary Report - Team Plan',
    'task-completion': 'Task Completion Report',
    'logged-time': 'Logged Time Report'
  };
  return titles[filters.value.reportType] || 'Report';
});

const reportPeriod = computed(() => {
  if (filters.value.interval === 'monthly') {
    const date = new Date(filters.value.month + '-01');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } else {
    return `${filters.value.startDate} to ${filters.value.endDate}`;
  }
});

const setActiveProject = (project) => {
  activeProject.value = project;
};

const setIsCreateModalOpen = (open) => {
  isCreateModalOpen.value = open;
};

const handleCreateTask = (newTask) => {
  console.log("Create task:", newTask);
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
  
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const token = await user.getIdToken();
    
    // Determine date range
    let startDate, endDate;
    if (filters.value.interval === 'monthly') {
      const date = new Date(filters.value.month + '-01');
      startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    } else {
      startDate = new Date(filters.value.startDate);
      endDate = new Date(filters.value.endDate);
    }

    // Fetch tasks
    let url = `/api/tasks?userId=${user.uid}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch tasks');
    
    const data = await response.json();
    let tasks = data.tasks || [];

    // Filter by date range
    tasks = tasks.filter(task => {
      const taskDate = new Date(task.createdDate);
      return taskDate >= startDate && taskDate <= endDate;
    });

    // Apply additional filters for task completion
    if (filters.value.reportType === 'task-completion') {
      if (filters.value.filterBy === 'project' && filters.value.selectedProject) {
        tasks = tasks.filter(task => task.projectId?.id === filters.value.selectedProject);
      } else if (filters.value.filterBy === 'user' && filters.value.selectedUser) {
        tasks = tasks.filter(task => 
          task.assigneeNames?.includes(users.value.find(u => u.id === filters.value.selectedUser)?.name)
        );
      }

      const completedTasks = tasks.filter(t => t.status === 'done').length;
      reportData.value = {
        tasks,
        totalTasks: tasks.length,
        completedTasks,
        completionRate: tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0
      };
    } else {
      reportData.value = { tasks };
    }

    // Show the report page
    showReport.value = true;

  } catch (error) {
    console.error('Error generating report:', error);
    alert('Failed to generate report. Please try again.');
  } finally {
    loading.value = false;
  }
};

const backToFilters = () => {
  showReport.value = false;
};

const exportReport = () => {
  if (!reportData.value) return;

  if (filters.value.exportFormat === 'csv') {
    exportCSV();
  } else {
    exportPDF();
  }
};

const exportCSV = () => {
  const tasks = reportData.value.tasks;
  if (!tasks || tasks.length === 0) return;

  let headers, rows;
  
  if (filters.value.reportType === 'team-summary') {
    headers = ['Task Name', 'Assigned To', 'Start Date', 'End Date', 'Status', 'Comments/Issues'];
    rows = tasks.map(task => [
      task.title,
      task.assigneeName || 'Unassigned',
      formatDate(task.createdDate),
      formatDate(task.deadline),
      task.status,
      task.description || '-'
    ]);
  } else {
    headers = ['Task', 'Project', 'Assignee', 'Status', 'Completion Date'];
    rows = tasks.map(task => [
      task.title,
      task.projectTitle || 'No Project',
      task.assigneeName || 'Unassigned',
      task.status,
      task.status === 'done' ? formatDate(task.modifiedDate) : '-'
    ]);
  }

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filters.value.reportType}-${filters.value.interval}-${Date.now()}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

const exportPDF = () => {
  alert('PDF export feature coming soon!');
};

const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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

const loadProjectsAndUsers = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const token = await user.getIdToken();

    const [projectsRes, usersRes] = await Promise.all([
      fetch('/api/allProjects', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
    ]);

    if (projectsRes.ok) {
      const projectsData = await projectsRes.json();
      projects.value = projectsData.data || projectsData.projects || [];
    }

    if (usersRes.ok) {
      const usersData = await usersRes.json();
      users.value = usersData.data || usersData.users || [];
    }
  } catch (error) {
    console.error('Error loading projects/users:', error);
  }
};

onMounted(() => {
  loadProjectsAndUsers();
});
</script>

<style scoped>
/* Custom styles */
</style>