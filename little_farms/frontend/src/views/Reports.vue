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


          <!-- Action Buttons -->
          <div class="space-y-4">
            <button @click="generateReport" :disabled="loading"
              class="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50">
              {{ loading ? 'Generating...' : 'Generate Report' }}
            </button>


            <button v-if="reportData" @click="exportReport"
              class="w-full px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors my-4">
              Export {{ filters.exportFormat.toUpperCase() }}
            </button>
          </div>
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
                      <th class="border p-3 text-left">Start Date</th>
                      <th class="border p-3 text-left">End Date</th>
                      <th class="border p-3 text-left">Status</th>
                      <th class="border p-3 text-left">Comments/Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="task in reportData.tasks" :key="task.id" class="hover:bg-muted/50">
                      <td class="border p-3">{{ task.title }}</td>
                      <td class="border p-3">{{ task.assigneeName || 'Unassigned' }}</td>
                      <td class="border p-3">{{ formatDate(task.createdDate) }}</td>
                      <td class="border p-3">{{ formatDate(task.deadline) }}</td>
                      <td class="border p-3">
                        <span :class="getStatusBadgeClass(task.status)" class="px-2 py-1 rounded text-xs">
                          {{ task.status }}
                        </span>
                      </td>
                      <td class="border p-3 text-sm text-muted-foreground">
                        {{ task.description || '-' }}
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
            <div v-if="filters.reportType === 'logged-time'" class="bg-card border border-border rounded-lg p-6">
              <h4 class="text-lg font-semibold mb-4">Logged Time Report</h4>
              <p class="text-muted-foreground">Time tracking feature coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </div>


    <!-- <CreateTaskModal
      :isOpen="isCreateModalOpen"
      @close="() => setIsCreateModalOpen(false)"
      @createTask="handleCreateTask"
    /> -->
  </div>
</template>


<script setup>
import { ref, computed, onMounted } from 'vue';
import { BarChart3 } from 'lucide-vue-next';
import { getAuth } from 'firebase/auth';
import TaskSidebar from '../components/TaskSidebar.vue';
import CreateTaskModal from '../components/CreateTaskModal.vue';


const activeProject = ref("all");
const isCreateModalOpen = ref(false);
const loading = ref(false);
// const reportData = ref(null);
const reportData = [];
const projects = ref([]);
const users = ref([]);
const error = ref('');


const filters = ref({
  exportFormat: 'csv',
  reportType: 'team-summary',
  interval: 'monthly',
  month: new Date().toISOString().slice(0, 7), // Current month
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


// const handleCreateTask = (newTask) => {
//   console.log("Create task:", newTask);
// };


const handleIntervalChange = () => {
  // Reset time frame when interval changes
  if (filters.value.interval === 'monthly') {
    filters.value.month = new Date().toISOString().slice(0, 7);
    filters.value.startDate = '';
    filters.value.endDate = '';
  } else {
    filters.value.month = '';
    // Set default to current week
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    filters.value.startDate = weekAgo.toISOString().split('T')[0];
    filters.value.endDate = today.toISOString().split('T')[0];
  }
};


const generateReport = async () => {
  loading.value = true;

  reportData.length = 0;

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


    // Fetch all tasks based on userID
    // let url = `/api/tasks?userId=${user.uid}`;
    let url = `/api/tasks/allTasks`;
    const response = await fetch(url);


    if (!response.ok) throw new Error('Failed to fetch tasks');

    const data = await response.json();
    let tasks = data.data || []; //this gets all the tasks
    // console.log(tasks)


    // Filter tasks by date range
    tasks = tasks.filter(task => {
      // Convert Firestore timestamp to Date object
      const taskDate = new Date(task.createdDate._seconds * 1000); // Convert seconds to milliseconds
      return taskDate >= startDate && taskDate <= endDate;
    });
    console.log(tasks)


    // Apply additional filters for task completion report
    if (filters.value.reportType === 'task-completion') {
      // console.log("Project id: " + filters.value.selectedProject)
      // console.log("Task: " + tasks)
      console.log("Task Completion Hit")
      if (filters.value.filterBy === 'project' && filters.value.selectedProject) {
        tasks = tasks.filter(task => {
          // Based on your data structure: segments: (2) ['Projects', "CLGW96yugsTjEWYmCzrp']
          return task.projectId?._path?.segments?.[1] === filters.value.selectedProject;
        });
      } else if (filters.value.filterBy === 'user' && filters.value.selectedUser) {
        console.log("Users Filter Hit")

        console.log("User id: " + filters.value.selectedUser)
        tasks = tasks.filter(task =>
          task.assignedTo?.some(assignee =>
            assignee?._path?.segments?.[1] === filters.value.selectedUser
          )
        );
      }
      console.log(tasks)


      // Calculate stats
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      console.log("completedTasks: " + completedTasks)
      console.log(tasks.length)
      tasks = tasks.filter(t => t.status === "done");
      console.log(tasks.length)

        // reportData.value = {
        //   tasks,
        //   totalTasks: tasks.length,
        //   completedTasks,
        //   completionRate: tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0
        // };


        ;

      for (let task of tasks) {
        const data = {}
        console.log(task)
        // Basic conversions
        data.taskTitle = task.title;
        data.status = task.status;


        const formattedDate = formatDate(task.modifiedDate._seconds * 1000);
        // console.log(formattedDate); // "Oct 12, 2025"

        data.completedDate = formattedDate;

        // convert task owner
        const taskOwner = task.taskCreatedBy._path.segments[1];
        const taskOwnerDetails = await getUser(taskOwner);
        // console.log(taskOwnerDetails.user.name);
        data.taskOwner = taskOwnerDetails.user.name

        // Project details
        const prjid = task.projectId._path.segments[1];
        const prjDetails = await getProject(prjid);
        // console.log(prjDetails.title)
        data.prjTitle = prjDetails.title;

        // Assignee
        const newAssigneeList = [];
        const assigneeList = task.assignedTo;
        console.log(assigneeList)
        for (let i of assigneeList) {
          // console.log(i)
          const assigneeID = i._path.segments[1];
          const assigneeDetails = await getUser(assigneeID);
          newAssigneeList.push(assigneeDetails.user.name);
        }
        data.assignedTo = newAssigneeList
        console.log(data)
        reportData.push(data);

      }

      console.log(reportData);


    }
    //  else {
    //   reportData.value = { tasks };
    // }


  } catch (error) {
    console.error('Error generating report:', error);
    alert('Failed to generate report. Please try again.');
  } finally {
    loading.value = false;
  }
};

async function getUser(uid) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;


  const token = await user.getIdToken();
  try {
    const response = await fetch(`/api/users/users/${uid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

async function getProject(pid) {

  try {
    const response = await fetch(`/api/projects/${pid}`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const prjData = await response.json();
    return prjData;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

const exportReport = () => {
  console.log("export report")
  if (!reportData) return;
  console.log(reportData)


  if (filters.value.exportFormat === 'csv') {
    console.log("Exporting CSV...")
    exportCSV();
  } else {
    console.log("Exporting PDF...")
    exportPDF();
  }
};


// const exportCSV = () => {
//   const tasks = reportData.value.tasks;
//   if (!tasks || tasks.length === 0) return;


//   // Create CSV headers based on report type
//   let headers, rows;

//   if (filters.value.reportType === 'team-summary') {
//     headers = ['Task Name', 'Assigned To', 'Start Date', 'End Date', 'Status', 'Comments/Issues'];
//     rows = tasks.map(task => [
//       task.title,
//       task.assigneeName || 'Unassigned',
//       formatDate(task.createdDate),
//       formatDate(task.deadline),
//       task.status,
//       task.description || '-'
//     ]);
//   } else if (filters.value.reportType === 'task-completion') {
//     if (filters.value.filterBy === 'project') {
//       headers = ['Task', 'Project', 'Assignee', 'Status', 'Completion Date'];
//       rows = tasks.map(task => [
//         task.title,
//         task.projectTitle || 'No Project',
//         task.assigneeName || 'Unassigned',
//         task.status,
//         task.status === 'done' ? formatDate(task.modifiedDate) : '-'
//       ]);
//     }
//     else {
//       headers = ['Task', 'Project', 'Assignee', 'Status', 'Completion Date'];
//       rows = tasks.map(task => [
//         task.title,
//         task.projectTitle || 'No Project',
//         task.assigneeName || 'Unassigned',
//         task.status,
//         task.status === 'done' ? formatDate(task.modifiedDate) : '-'
//       ]);
//     }

//   }


//   // Create CSV content
//   const csvContent = [
//     headers.join(','),
//     ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
//   ].join('\n');


//   // Download CSV
//   const blob = new Blob([csvContent], { type: 'text/csv' });
//   const url = window.URL.createObjectURL(blob);
//   const a = document.createElement('a');
//   a.href = url;
//   a.download = `${filters.value.reportType}-${filters.value.interval}-${Date.now()}.csv`;
//   a.click();
//   window.URL.revokeObjectURL(url);
// };


// const exportPDF = () => {
//   alert('PDF export feature coming soon!');
//   // TODO: Implement PDF generation using library like jsPDF
// };

async function exportCSV() {
  loading.value = true;
  error.value = '';
  try {

    const response = await fetch('/api/report/generate_csv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData)
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

async function exportPDF() {
  console.log(filters.value)
  loading.value = true;
  error.value = '';
  try {
    const mappedReports = reportData.map(mapReportData);
    console.log(mappedReports)

    // Get Report Title
        let prjTitle = "";
        if (filters.value.filterBy =="project") {
          const prjID = filters.value.selectedProject;
          prjTitle = await getProject(prjID);
          prjTitle = prjTitle.title
        } else if (filters.value.filterBy =="user") {
          const userID = filters.value.selectedUser;
          prjTitle = await getUser(userID);
          prjTitle = prjTitle.user.name
        }

    const cleanedTimeFrame = formatDateDisplay(filters.value)
    const response = await fetch('/api/report/generate_pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // "reportType": filters.value.reportType,
        "reportType": "task_completion",
        "reportTitle": prjTitle,
        "timeFrame": cleanedTimeFrame,
        "filterType": filters.value.filterBy,
        tasks: mappedReports
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

function mapReportData(inputData) {
  const status = inputData.status.toUpperCase();
  return {
    "Task Name": inputData.taskTitle,
    "Owner of Task": inputData.taskOwner,
    "Project Name": inputData.prjTitle,
    "Assignee List": Array.isArray(inputData.assignedTo)
      ? inputData.assignedTo.join(', ')
      : inputData.assignedTo,
    "Status": status,
    "Completion date": inputData.completedDate
  };
}

function formatDateDisplay(timeFrame) {
  const data = timeFrame?.__v_raw || timeFrame;

  if (data.interval === "monthly" && data.month) {
    const [year, month] = data.month.split('-');
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  } else if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    return `${start.getDate()}-${end.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
  } else {
    return "Date not specified";
  }
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


const loadProjectsAndUsers = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;


    const token = await user.getIdToken();


    const [projectsRes, usersRes] = await Promise.all([
      fetch('/api/allProjects', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/users/users', { headers: { Authorization: `Bearer ${token}` } })
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
/* Add any custom styles here */
</style>
