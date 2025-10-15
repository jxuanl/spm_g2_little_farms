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
        class="px-4 py-2 font-medium rounded-md h-9 transition-all"
        :class="[
          canEdit
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer opacity-100'
            : 'bg-gray-300 text-gray-600 cursor-default opacity-60'
        ]"
        :disabled="!canEdit"
        @click="canEdit && openEditModal()"
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
import { defineProps } from 'vue';
import { getAuth } from 'firebase/auth';
import EditTaskModal from '../components/EditTaskModal.vue';

const route = useRoute();
const task = ref(null);
const projectTitle = ref('');
const assigneeNames = ref([]);
const creatorName = ref('');
const isEditModalOpen = ref(false);
const currentUserId = ref('');
const userRole = ref('');
const canEdit = ref(false);
const props = defineProps({
  id: String, // comes from route   -> id should be a reference
})

// === Fetch Task, Project, Creator, and Assignees ===
const fetchTask = async () => {
  const auth = getAuth()
  const user = auth.currentUser
  if (!user) {
    console.warn('⚠️ User not logged in')
    window.location.href = '/login'
    return
  }

  currentUserId.value = user.uid

  // 🧠 Fetch user role
  try {
    // const userRes = await fetch(`/api/users/${user.uid}`)
    const userRes = await fetch(`/api/auth/users/${user.uid}`)
    const userData = await userRes.json()
    userRole.value = (userData.user?.role || 'staff').toLowerCase()
  } catch (err) {
    console.error('❌ Failed to load user role:', err)
    userRole.value = 'staff'
  }

  const taskId = route.params.id
  try {
    const res = await fetch(`/api/tasks/${taskId}?userId=${user.uid}`)
    const data = await res.json()

    if (!data.success || !data.task) {
      console.warn('❌ Task not found or access denied')
      task.value = null
      return
    }

    task.value = data.task
    projectTitle.value = data.task.projectTitle
    creatorName.value = data.task.creatorName
    assigneeNames.value = data.task.assigneeNames || []

    // ✅ Determine if user can edit
    const isCreator = data.task.creatorId === user.uid
    canEdit.value = userRole.value === 'manager' || isCreator

    console.log('🧩 Role:', userRole.value, '| Creator:', isCreator, '| canEdit:', canEdit.value)
  } catch (err) {
    console.error('❌ Error fetching task:', err)
  }
}

onMounted(fetchTask);

const refreshTask = () => fetchTask();
const openEditModal = () => (isEditModalOpen.value = true);

// === Format Firestore Dates ===
// === Safe date converter ===
const toJsDate = (value) => {
  if (!value) return null
  // Firestore Timestamp object
  if (typeof value?.toDate === 'function') return value.toDate()
  // Admin SDK timestamp ({ seconds / nanoseconds } or {_seconds/_nanoseconds})
  if (typeof value === 'object') {
    const s = value.seconds ?? value._seconds
    const ns = value.nanoseconds ?? value._nanoseconds
    if (typeof s === 'number') return new Date(s * 1000 + Math.floor((ns ?? 0) / 1e6))
  }
  // ISO string or number
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return isNaN(d) ? null : d
  }
  // Already a Date
  if (value instanceof Date) return value
  return null
}

const formatDate = (date) => {
  if (date?.toDate) return date.toDate().toLocaleString(); // show both date & time
  return new Date(date).toLocaleString();
};
</script>
