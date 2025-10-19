
import { ref, computed, onMounted } from 'vue';
import { BarChart3 } from 'lucide-vue-next';
import { getAuth } from 'firebase/auth';
import TaskSidebar from '../components/TaskSidebar.vue';
import CreateTaskModal from '../components/CreateTaskModal.vue';


const activeProject = ref("all");
const isCreateModalOpen = ref(false);
const loading = ref(false);
const reportData = ref(null);
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
    let url = `/api/tasks?userId=${user.uid}`;
    const response = await fetch(url);


    if (!response.ok) throw new Error('Failed to fetch tasks');
   
    const data = await response.json();
    let tasks = data.tasks || [];
    console.log(tasks)


    // Filter tasks by date range
    tasks = tasks.filter(task => {
      const taskDate = new Date(task.createdDate);
      return taskDate >= startDate && taskDate <= endDate;
    });


    // Apply additional filters for task completion report
    if (filters.value.reportType === 'task-completion') {
      if (filters.value.filterBy === 'project' && filters.value.selectedProject) {
        tasks = tasks.filter(task => task.projectId?.id === filters.value.selectedProject);
      } else if (filters.value.filterBy === 'user' && filters.value.selectedUser) {
        tasks = tasks.filter(task =>
          task.assigneeNames?.includes(users.value.find(u => u.id === filters.value.selectedUser)?.name)
        );
      }


      // Calculate stats
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


  } catch (error) {
    console.error('Error generating report:', error);
    alert('Failed to generate report. Please try again.');
  } finally {
    loading.value = false;
  }
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


  // Create CSV headers based on report type
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


  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');


  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filters.value.reportType}-${filters.value.interval}-${Date.now()}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};


// const exportPDF = () => {
//   alert('PDF export feature coming soon!');
//   // TODO: Implement PDF generation using library like jsPDF
// };

async function exportPDF() {
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
      }];
    // const response = await fetch('/api/report/generate-report');
    const response = await fetch('/api/report/generate_pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: taskData,
        reportType: 'Project', // Optional: 'User', 'Project', etc.
        time_Frame: 'June'
      })
    });

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