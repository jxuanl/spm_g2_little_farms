<template>
  <div class="p-6 max-w-2xl mx-auto min-h-screen flex flex-col">
    <h2 class="text-2xl font-semibold mb-6">Task Details</h2>

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

    <!-- === Edit button === -->
    <div class="mt-10 flex justify-end">
      <button
        class="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 cursor-pointer"
        @click="openEditModal"
      >
        Edit Task
      </button>
    </div>

    <!-- === Edit Modal === -->
    <EditTaskModal
      :isOpen="isEditModalOpen"
      :task="{ id: route.params.id, ...task }"
      @close="isEditModalOpen = false"
      @updated="refreshTask"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import EditTaskModal from '../components/EditTaskModal.vue';

const route = useRoute();
const task = ref(null);
const projectTitle = ref('');
const assigneeNames = ref([]);
const creatorName = ref('');
const isEditModalOpen = ref(false);

// === Fetch Task, Project, Creator, and Assignees ===
const fetchTask = async () => {
  const taskId = route.params.id;
  const taskRef = doc(db, 'Tasks', taskId);
  const snapshot = await getDoc(taskRef);

  if (!snapshot.exists()) return;
  task.value = { id: taskId, ...snapshot.data() };

  // ✅ --- Fetch Project Title ---
  try {
    if (task.value.projectId) {
      let projectRef;
      if (typeof task.value.projectId === 'string') {
        projectRef = doc(db, 'Projects', task.value.projectId);
      } else if (task.value.projectId?.path) {
        projectRef = doc(db, task.value.projectId.path);
      } else if (task.value.projectId?.id) {
        projectRef = doc(db, 'Projects', task.value.projectId.id);
      }

      if (projectRef) {
        const projectSnap = await getDoc(projectRef);
        projectTitle.value = projectSnap.exists()
          ? projectSnap.data().title || 'Untitled Project'
          : 'Unknown Project';
      } else {
        projectTitle.value = 'No project';
      }
    } else {
      projectTitle.value = 'No project';
    }
  } catch (err) {
    console.error('Error fetching project:', err);
    projectTitle.value = 'Error loading project';
  }

  // ✅ --- Fetch Creator Name ---
  try {
    if (task.value.taskCreatedBy?.path) {
      const creatorSnap = await getDoc(doc(db, task.value.taskCreatedBy.path));
      if (creatorSnap.exists()) {
        creatorName.value = creatorSnap.data().name || 'Unnamed User';
      } else {
        creatorName.value = 'Unknown';
      }
    } else {
      creatorName.value = 'No creator';
    }
  } catch (err) {
    console.error('Error fetching creator:', err);
    creatorName.value = 'Error loading creator';
  }

  // ✅ --- Fetch Assignee Names ---
  try {
    if (Array.isArray(task.value.assignedTo) && task.value.assignedTo.length > 0) {
      const names = [];
      for (const assignee of task.value.assignedTo) {
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
    console.error('Error fetching assignees:', err);
    assigneeNames.value = ['Error loading assignees'];
  }
};

onMounted(fetchTask);

const refreshTask = () => fetchTask();
const openEditModal = () => (isEditModalOpen.value = true);

// === Format Firestore Dates ===
const formatDate = (date) => {
  if (date?.toDate) return date.toDate().toLocaleString(); // show both date & time
  return new Date(date).toLocaleString();
};
</script>
