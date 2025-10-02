<template>
  <div class="h-screen bg-background flex">
    <TaskSidebar
      :activeProject="activeProject"
      @projectChange="setActiveProject"
      @createTask="() => setIsCreateModalOpen(true)"
    />
    
    <div class="flex-1 flex flex-col">
      <TaskHeader />
      
      <TaskList
        :tasks="filteredTasks"
        @taskClick="handleTaskClick"
        @createTask="() => setIsCreateModalOpen(true)"
        :searchQuery="searchQuery"
        @searchChange="setSearchQuery"
        :statusFilter="statusFilter"
        @statusFilterChange="setStatusFilter"
        :priorityFilter="priorityFilter"
        @priorityFilterChange="setPriorityFilter"
      />
    </div>

    <CreateTaskModal
      :isOpen="isCreateModalOpen"
      @close="() => setIsCreateModalOpen(false)"
      @taskCreated="handleTaskCreated"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import TaskSidebar from '../components/TaskSidebar.vue';
import TaskHeader from '../components/TaskHeader.vue';
import TaskList from '../components/TaskList.vue';
import CreateTaskModal from '../components/CreateTaskModal.vue';

// Mock data for demonstration
const initialTasks = [
  {
    id: "1",
    title: "Redesign landing page header",
    description: "Update the main header section with new branding and improved navigation",
    status: "in-progress",
    priority: "high",
    dueDate: "2024-01-15",
    assignee: { name: "John Doe", initials: "JD" },
    project: "Website Redesign",
    progress: 65,
    comments: 3,
    attachments: 2,
    tags: ["design", "frontend", "urgent"]
  },
  {
    id: "2", 
    title: "Implement user authentication",
    description: "Set up JWT-based authentication system with login and registration flows",
    status: "todo",
    priority: "high",
    dueDate: "2024-01-20",
    assignee: { name: "Jane Smith", initials: "JS" },
    project: "Mobile App",
    progress: 0,
    comments: 1,
    attachments: 0,
    tags: ["backend", "security", "auth"]
  },
  {
    id: "3",
    title: "Create social media campaign",
    description: "Develop content calendar and graphics for Q1 marketing push",
    status: "review",
    priority: "medium",
    dueDate: "2024-01-25",
    assignee: { name: "Mike Johnson", initials: "MJ" },
    project: "Marketing Campaign",
    progress: 80,
    comments: 5,
    attachments: 8,
    tags: ["marketing", "content", "social"]
  },
  {
    id: "4",
    title: "Database optimization",
    description: "Optimize queries and add proper indexing to improve performance",
    status: "done",
    priority: "medium",
    dueDate: "2024-01-10",
    assignee: { name: "John Doe", initials: "JD" },
    project: "Website Redesign",
    progress: 100,
    comments: 2,
    attachments: 1,
    tags: ["backend", "performance", "database"]
  },
  {
    id: "5",
    title: "Mobile app wireframes",
    description: "Create low-fidelity wireframes for all main screens",
    status: "in-progress",
    priority: "high",
    dueDate: "2024-01-18",
    assignee: { name: "Jane Smith", initials: "JS" },
    project: "Mobile App",
    progress: 45,
    comments: 0,
    attachments: 0,
    tags: ["design", "wireframes", "mobile"]
  },
  {
    id: "6",
    title: "SEO audit and improvements",
    description: "Conduct comprehensive SEO analysis and implement recommendations",
    status: "todo",
    priority: "low",
    dueDate: "2024-02-01",
    assignee: { name: "Mike Johnson", initials: "MJ" },
    project: "Website Redesign",
    progress: 0,
    comments: 0,
    attachments: 0,
    tags: ["seo", "marketing", "analytics"]
  }
];

const tasks = ref(initialTasks);
const activeProject = ref("all");
const searchQuery = ref("");
const statusFilter = ref("all");
const priorityFilter = ref("all");
const isCreateModalOpen = ref(false);

// Filter tasks based on active filters
const filteredTasks = computed(() => {
  return tasks.value.filter(task => {
    const matchesProject = activeProject.value === "all" || task.project.toLowerCase().includes(activeProject.value);
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesStatus = statusFilter.value === "all" || task.status === statusFilter.value;
    const matchesPriority = priorityFilter.value === "all" || task.priority === priorityFilter.value;
    
    return matchesProject && matchesSearch && matchesStatus && matchesPriority;
  });
});

const setActiveProject = (project) => {
  activeProject.value = project;
};

const setSearchQuery = (query) => {
  searchQuery.value = query;
};

const setStatusFilter = (status) => {
  statusFilter.value = status;
};

const setPriorityFilter = (priority) => {
  priorityFilter.value = priority;
};

const setIsCreateModalOpen = (open) => {
  isCreateModalOpen.value = open;
};

const handleTaskCreated = (newTask) => {
  console.log('Task created:', newTask);
  // For now, we'll just log it. In a real app, you might want to refresh the tasks list
  // or add the new task to the existing list with proper formatting
};

const handleTaskClick = (taskId) => {
  console.log("Edit task:", taskId);
  // In a real app, this would open an edit modal or navigate to task detail
};
</script>
