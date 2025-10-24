<template>
  <div class="p-6 max-w-2xl mx-auto min-h-screen flex flex-col">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-semibold">{{ isSubtaskView ? 'Subtask Details' : 'Task Details' }}</h2>
      <button 
        v-if="isSubtaskView" 
        @click="router.push({ name: 'TaskDetail', params: { id: taskId } })"
        class="text-sm text-blue-600 hover:text-blue-800 underline"
      >
        ← Back to Parent Task
      </button>
      <button 
        v-else
        @click="router.push({ name: 'AllTasks'} )"
        class="text-sm text-blue-600 hover:text-blue-800 underline"
      >
        ← Back to Task List
      </button>
    </div>

    <!-- === Edit button === -->
    <div class="mt-10 flex justify-end">
      <button
        class="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 cursor-pointer"
        @click="openEditModal"
      >
        {{ isSubtaskView ? 'Edit Subtask' : 'Edit Task' }}
      </button>
    </div>

    <!-- === Edit Modal === -->
    <EditTaskModal
      :isOpen="isEditModalOpen"
      :task="{ ...task, id: isSubtaskView ? subtaskId : taskId }"
      :isSubtask="isSubtaskView"
      :parentTaskId="isSubtaskView ? taskId : null"
      @close="isEditModalOpen = false"
      @updated="refreshTask"
    />

    <div v-if="task">
      <!-- === Task Info === -->
      <div class="space-y-2 text-sm">
        <p><strong>Title:</strong> {{ task.title }}</p>
        <p><strong>Description:</strong> {{ task.description || 'No description' }}</p>
        <p><strong>Project:</strong> {{ projectTitle || 'No project' }}</p>
        <p><strong>Priority:</strong> {{ task.priority }}</p>
        <p><strong>Status:</strong> {{ task.status }}</p>
        <p><strong>Deadline:</strong> {{ task.deadline ? formatDate(task.deadline) : 'No due date' }}</p>
        <p><strong>Created Date:</strong> {{ task.createdDate ? formatDate(task.createdDate) : 'Unknown' }}</p>
        <p><strong>Modified Date:</strong> {{ task.modifiedDate ? formatDate(task.modifiedDate) : 'Unknown' }}</p>
        <p><strong>Overdue: </strong>
          <span :class="task.isOverdue ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'">
            {{ task.isOverdue ? 'Yes' : 'No' }}
          </span>
        </p>

        <p><strong>Tags: </strong>
          <template v-if="Array.isArray(task.tags) && task.tags.length">
            {{ task.tags.join(', ') }}
          </template>
          <template v-else>
            No tags
          </template>
        </p>

        <p><strong>Creator:</strong> {{ creatorName || 'No creator' }}</p>

        <p><strong>Assignees: </strong>
          <template v-if="assigneeNames.length">
            {{ assigneeNames.join(', ') }}
          </template>
          <template v-else>
            No assignees
          </template>
        </p>
      </div>
    </div>

    <div v-else class="text-gray-500">Loading task details...</div>

    <div v-if="!isSubtaskView" class="flex-1 flex flex-col">
      <TaskList 
        :tasks="subtasks" 
        :indvTask="true"
        @createTask="() => isCreateModalOpen = true"
        @taskClick="handleSubtaskClick"
      />
    </div>
    
    <CreateTaskModal
      v-if="!isSubtaskView"
      :isOpen="isCreateModalOpen"
      :parentTaskId="taskId"
      :parentProject="{ id: task?.projectId?.id || task?.projectId, name: projectTitle }"
      @close="() => isCreateModalOpen = false"
      @taskCreated="handleSubtaskCreated"
    />
    
    <!-- === Comments Section === -->
    <CommentsSection 
      v-if="task && currentUser"
      :taskId="taskId"
      :subtaskId="isSubtaskView ? subtaskId : null"
      :currentUserId="currentUser.uid"
      @commentsUpdated="handleCommentsUpdated"
    />

  </div>

</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import EditTaskModal from '../components/EditTaskModal.vue';
import TaskList from '../components/TaskList.vue';
import CreateTaskModal from '../components/CreateTaskModal.vue';
import CommentsSection from '../components/CommentsSection.vue';

const route = useRoute();
const router = useRouter();
const task = ref(null);
const subtasks = ref([]);
const projectTitle = ref('');
const assigneeNames = ref([]);
const creatorName = ref('');
const isEditModalOpen = ref(false);
const isCreateModalOpen = ref(false);

// Check if this is a subtask view
const isSubtaskView = computed(() => !!route.params.subtaskId);
const taskId = computed(() => route.params.id);
const subtaskId = computed(() => route.params.subtaskId);

// === Fetch Task, Project, Creator, and Assignees ===
const fetchTask = async () => {
  try {
    let taskData = null;
    
    if (isSubtaskView.value) {
      // Fetch subtask via API
      const response = await fetch(`http://localhost:3001/api/tasks/${taskId.value}/subtasks/${subtaskId.value}`);
      if (response.ok) {
        taskData = await response.json();
        task.value = taskData;
      } else {
        console.error('Failed to fetch subtask');
        return;
      }
    } else {
      // Fetch regular task from Firestore
      const taskRef = doc(db, 'Tasks', taskId.value);
      const snapshot = await getDoc(taskRef);
      
      if (!snapshot.exists()) return;
      task.value = { id: taskId.value, ...snapshot.data() };
      taskData = task.value;
    }

    // ✅ --- Fetch Project Title ---
    if (taskData.projectId) {
      let projectRef;
      if (typeof taskData.projectId === 'string') {
        projectRef = doc(db, 'Projects', taskData.projectId);
      } else if (taskData.projectId?.path) {
        projectRef = doc(db, taskData.projectId.path);
      } else if (taskData.projectId?.id) {
        projectRef = doc(db, 'Projects', taskData.projectId.id);
      }

      if (projectRef) {
        const projectSnap = await getDoc(projectRef);
        projectTitle.value = projectSnap.exists()
          ? projectSnap.data().title || projectSnap.data().name || 'Untitled Project'
          : 'Unknown Project';
      } else {
        projectTitle.value = 'No project';
      }
    } else {
      projectTitle.value = 'No project';
    }

    // ✅ --- Fetch Creator Name ---
    console.log('taskCreatedBy structure:', taskData.taskCreatedBy);
    if (taskData.taskCreatedBy) {
      let creatorRef;
      if (typeof taskData.taskCreatedBy === 'string') {
        // Direct user ID
        creatorRef = doc(db, 'Users', taskData.taskCreatedBy);
      } else if (taskData.taskCreatedBy?.path) {
        // API response format with path
        creatorRef = doc(db, taskData.taskCreatedBy.path);
      } else if (taskData.taskCreatedBy?.id) {
        // Firestore reference format with id  
        creatorRef = doc(db, 'Users', taskData.taskCreatedBy.id);
      }

      if (creatorRef) {
        const creatorSnap = await getDoc(creatorRef);
        if (creatorSnap.exists()) {
          creatorName.value = creatorSnap.data().name || 'Unnamed User';
        } else {
          creatorName.value = 'Unknown';
        }
      } else {
        creatorName.value = 'No creator';
      }
    } else {
      creatorName.value = 'No creator';
    }

    // ✅ --- Fetch Assignee Names ---
    if (Array.isArray(taskData.assignedTo) && taskData.assignedTo.length > 0) {
      const names = [];
      for (const assignee of taskData.assignedTo) {
        if (typeof assignee === 'string') {
          names.push(assignee);
        } else if (assignee?.path) {
          const assigneeSnap = await getDoc(doc(db, assignee.path));
          if (assigneeSnap.exists()) {
            names.push(assigneeSnap.data().name || 'Unnamed User');
          }
        }
      }
      assigneeNames.value = names;
    } else {
      assigneeNames.value = [];
    }
  } catch (err) {
    console.error('Error fetching task details:', err);
    projectTitle.value = 'Error loading project';
    creatorName.value = 'Error loading creator';
    assigneeNames.value = ['Error loading assignees'];
  }
};

// === Fetch Subtasks ===
const fetchSubtasks = async () => {
  // Don't fetch subtasks if we're viewing a subtask
  if (isSubtaskView.value) {
    subtasks.value = [];
    return;
  }
  
  try {
    const response = await fetch(`http://localhost:3001/api/tasks/${taskId.value}/subtasks`);
    
    if (response.ok) {
      const subtasksData = await response.json();
      subtasks.value = subtasksData;
    } else {
      console.error('Failed to fetch subtasks');
      subtasks.value = [];
    }
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    subtasks.value = [];
  }
};

// === Handle Subtask Creation ===
const handleSubtaskCreated = (newSubtask) => {
  console.log('Subtask created:', newSubtask);
  // Refresh subtasks list
  fetchSubtasks();
};

// === Handle Subtask Click ===
const handleSubtaskClick = (subtaskId) => {
  router.push({ name: 'SubtaskDetail', params: { id: taskId.value, subtaskId } });
};

// === Get Current User ID ===
const getCurrentUserId = () => {
  try {
    const userSession = sessionStorage.getItem('userSession');
    if (userSession) {
      const userData = JSON.parse(userSession);
      return userData.uid || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting user ID from session:', error);
    return null;
  }
};

// Add user state management
const currentUser = ref(null);

// Add function to get full user data
const getCurrentUser = () => {
  try {
    const userSession = sessionStorage.getItem('userSession');
    if (userSession) {
      return JSON.parse(userSession);
    }
    return null;
  } catch (error) {
    console.error('Error getting user from session:', error);
    return null;
  }
};

// Update onMounted to check user session
onMounted(() => {
  currentUser.value = getCurrentUser();
  
  if (!currentUser.value) {
    console.warn('No user session found');
    // Optionally redirect to login
    // router.push({ name: 'Login' });
    return;
  }
  
  fetchTask();
  fetchSubtasks();
});

// === Handle Comments Updated ===
const handleCommentsUpdated = () => {
  // Optional: refresh task data or perform other actions when comments are updated
  console.log('Comments updated');
};

onMounted(() => {
  fetchTask();
  fetchSubtasks();
});

// Watch for route parameter changes to re-fetch data
watch(
  () => [route.params.id, route.params.subtaskId],
  () => {
    fetchTask();
    fetchSubtasks();
  },
  { deep: true }
);

const refreshTask = () => {
  fetchTask();
  fetchSubtasks();
};
const openEditModal = () => (isEditModalOpen.value = true);

// === Format Firestore Dates ===
const formatDate = (date) => {
  if (date?.toDate) return date.toDate().toLocaleString(); // show both date & time
  return new Date(date).toLocaleString();
};
</script>
