<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 bg-black/80" @click="closeDropdowns">
    <div
      class="create-task-modal fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-gray-200 bg-background p-6 shadow-lg duration-200 sm:rounded-lg sm:max-w-[500px]"
      @click.stop
    >
      <div class="flex flex-col space-y-1.5 text-center sm:text-left">
        <h2 class="text-lg font-semibold leading-none tracking-tight">Edit Task</h2>
      </div>

      <div v-if="showSuccessMessage" class="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
        <div class="text-sm text-green-800">✓ Task updated successfully!</div>
      </div>

      <form @submit.prevent="handleUpdate" class="space-y-4">
        <!-- === Title === -->
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <label class="text-sm font-medium">Task Title *</label>
            <span class="text-xs text-muted-foreground">{{ formData.title.length }}/50</span>
          </div>
          <input
            v-model="formData.title"
            type="text"
            placeholder="Enter task title..."
            required
            :class="[
              'flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              errors.title ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-300'
            ]"
            @input="validateTitle"
          />
          <div v-if="errors.title" class="text-sm text-red-500 mt-1">
            {{ errors.title }}
          </div>
        </div>

        <!-- === Description === -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Description</label>
          <textarea
            v-model="formData.description"
            rows="3"
            placeholder="Describe the task..."
            class="flex min-h-[60px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <!-- === Priority & Status (Side by Side) === -->
        <div class="grid grid-cols-2 gap-4">
          <!-- Priority Dropdown -->
          <div class="space-y-2">
            <label class="text-sm font-medium">Priority (1–10)</label>
            <div class="relative">
              <button
                type="button"
                @click="toggleDropdown('priority')"
                class="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <span :class="formData.priority ? 'text-foreground' : 'text-muted-foreground'">
                  {{ formData.priority || 'Select priority (1–10)' }}
                </span>
                <ChevronDown class="h-4 w-4 opacity-50" />
              </button>

              <div
                v-if="dropdownStates.priority"
                class="absolute top-full left-0 mt-1 z-50 w-full rounded-md border border-gray-300 bg-popover shadow-lg max-h-56 overflow-y-auto"
              >
                <div class="p-1">
                  <button
                    v-for="n in 10"
                    :key="n"
                    type="button"
                    @click="selectOption('priority', n)"
                    class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm flex justify-between items-center"
                  >
                    <span>{{ n }}</span>
                    <Check v-if="formData.priority === n" class="w-4 h-4 text-primary" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Status Dropdown -->
          <div class="space-y-2">
            <label class="text-sm font-medium">Status</label>
            <div class="relative">
              <button
                type="button"
                @click="toggleDropdown('status')"
                class="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <span :class="formData.status ? 'text-foreground' : 'text-muted-foreground'">
                  {{ getStatusLabel() }}
                </span>
                <ChevronDown class="h-4 w-4 opacity-50" />
              </button>

              <div
                v-if="dropdownStates.status"
                class="absolute top-full left-0 mt-1 z-50 w-full rounded-md border border-gray-300 bg-popover shadow-lg"
              >
                <div class="p-1">
                  <button
                    v-for="option in statusOptions"
                    :key="option.value"
                    type="button"
                    @click="selectOption('status', option.value)"
                    class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm flex justify-between items-center"
                  >
                    <span>{{ option.label }}</span>
                    <Check v-if="formData.status === option.value" class="w-4 h-4 text-primary" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        
        <!-- === Project & Assignees (Side by Side) === -->
        <div class="grid grid-cols-2 gap-4">
          <!-- Project Dropdown -->
          <div class="space-y-2">
            <label class="text-sm font-medium">Project</label>
            <div class="relative">
              <button
                type="button"
                @click="toggleDropdown('project')"
                class="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-left"
              >
                <span :class="formData.projectId ? 'text-foreground' : 'text-muted-foreground'">
                  {{ getProjectPlaceholder() }}
                </span>
                <ChevronDown class="h-4 w-4 opacity-50" />
              </button>

              <div
                v-if="dropdownStates.project"
                class="absolute top-full left-0 mt-1 z-50 w-full rounded-md border border-gray-300 bg-popover shadow-lg max-h-56 overflow-y-auto"
              >
                <div v-if="projects.length === 0" class="p-3 text-sm text-muted-foreground text-center">
                  No projects available
                </div>
                <div v-else class="p-1">
                  <button
                    v-for="project in projects"
                    :key="project.id"
                    type="button"
                    @click="selectOption('project', project.id)"
                    class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm flex justify-between items-center"
                  >
                    <span>{{ project.name }}</span>
                    <Check v-if="formData.projectId === project.id" class="w-4 h-4 text-primary" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Assignees Dropdown -->
          <div class="space-y-2">
            <label class="text-sm font-medium">Assignees</label>
            <div class="relative">
              <button
                type="button"
                @click="toggleDropdown('assignees')"
                class="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-left"
              >
                <span :class="formData.assignedTo.length > 0 ? 'text-foreground' : 'text-muted-foreground'">
                  {{ getAssigneesPlaceholder() }}
                </span>
                <ChevronDown class="h-4 w-4 opacity-50" />
              </button>

              <div
                v-if="dropdownStates.assignees"
                class="absolute top-full left-0 mt-1 z-50 w-full rounded-md border border-gray-300 bg-popover shadow-lg max-h-56 overflow-y-auto"
              >
                <div v-if="users.length === 0" class="p-3 text-sm text-muted-foreground text-center">
                  No users available
                </div>
                <div v-else class="p-1">
                  <button
                    v-for="user in users"
                    :key="user.id"
                    type="button"
                    @click="toggleAssignee(user.id)"
                    class="w-full text-left px-2 py-1.5 text-sm rounded-sm flex items-center justify-between hover:bg-accent hover:text-accent-foreground"
                    :class="{ 'bg-accent text-accent-foreground': formData.assignedTo.includes(user.id) }"
                  >
                    <span>{{ user.name }}</span>
                    <Check v-if="formData.assignedTo.includes(user.id)" class="w-4 h-4 text-primary" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

       
        <!-- === Deadline === -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Deadline</label>
          <input
            v-model="formData.deadline"
            type="date"
            class="flex h-9 w-full rounded-md border border-gray-300 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <!-- === Tags === -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Tags (comma-separated)</label>
          <input
            v-model="formData.tags"
            type="text"
            placeholder="e.g. bug fix, backend, urgent"
            class="flex h-9 w-full rounded-md border border-gray-300 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <!-- === Buttons === -->
        <div class="flex justify-end gap-2 pt-4">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium border border-gray-300 bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            @click="$emit('close')"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 border border-primary h-9 px-4 py-2"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue';
import { ChevronDown, Check } from 'lucide-vue-next';

const emit = defineEmits(['close', 'updated']);
const props = defineProps({ isOpen: Boolean, task: Object });

const showSuccessMessage = ref(false);
const projects = ref([]);
const users = ref([]);
const dropdownStates = reactive({ priority: false, status: false, project: false, assignees: false });
const errors = reactive({ title: '' });

const formData = reactive({
  title: '',
  description: '',
  priority: null,
  status: '',
  projectId: '',
  assignedTo: [],
  deadline: '',
  tags: ''
});

// Load dropdown data
// --- Fetch project and user lists from backend ---
onMounted(async () => {
  try {
    const [projectRes, userRes] = await Promise.all([
      fetch('/api/projects'),
      fetch('/api/users/users'),
    ])
    const projectData = await projectRes.json()
    const userData = await userRes.json()

    projects.value = Array.isArray(projectData)
      ? projectData
      : projectData.projects || []
    users.value = Array.isArray(userData)
      ? userData
      : userData.users || []
  } catch (err) {
    console.error('❌ Error fetching dropdown data:', err)
  }
})

// --- Handle update through backend ---
const handleUpdate = async () => {
  if (!formData.title.trim()) {
    errors.title = 'Title is required'
    return
  }

  const tagsArray = formData.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  const updatePayload = {
    title: formData.title,
    description: formData.description,
    priority: formData.priority,
    status: formData.status,
    projectId: formData.projectId || null,
    assignedTo: formData.assignedTo,
    deadline: formData.deadline || null,
    tags: tagsArray,
  }

  try {
    const res = await fetch(`/api/tasks/${props.task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    })

    const data = await res.json()
    if (!data.success) throw new Error(data.message || 'Failed to update task')

    showSuccessMessage.value = true
    setTimeout(() => {
      showSuccessMessage.value = false
      emit('updated')
      emit('close')
    }, 1500)
  } catch (err) {
    console.error('❌ Error updating task:', err)
  }
}

// Prefill form from props
watch(
  () => props.task,
  (task) => {
    if (task) {
      formData.title = task.title || '';
      formData.description = task.description || '';
      formData.priority = task.priority || null;
      formData.status = task.status || '';
      formData.projectId = task.projectId?.id || '';
      formData.assignedTo = task.assignedTo?.map((a) => a.id || a) || [];
      formData.deadline = task.deadline
      ? new Date(task.deadline).toISOString().split('T')[0]
      : '';
      formData.tags = Array.isArray(task.tags) ? task.tags.join(', ') : '';
    }
  },
  { immediate: true }
);

// === Dropdown helpers ===
const toggleDropdown = (key) => {
  Object.keys(dropdownStates).forEach((k) => {
    if (k !== key) dropdownStates[k] = false;
  });
  dropdownStates[key] = !dropdownStates[key];
};

const closeDropdowns = () => {
  Object.keys(dropdownStates).forEach((k) => (dropdownStates[k] = false));
};

const selectOption = (key, value) => {
  formData[key] = value;
  closeDropdowns();
};

const toggleAssignee = (id) => {
  const index = formData.assignedTo.indexOf(id);
  if (index > -1) formData.assignedTo.splice(index, 1);
  else formData.assignedTo.push(id);
};

const getStatusLabel = () => {
  const map = { todo: 'To Do', 'in-progress': 'In Progress', review: 'In Review', done: 'Done' };
  return formData.status ? map[formData.status] : 'Select status';
};

const getProjectPlaceholder = () => {
  const project = projects.value.find((p) => p.id === formData.projectId);
  return project ? project.name : 'Select project';
};

const getAssigneesPlaceholder = () =>
  formData.assignedTo.length
    ? users.value.filter((u) => formData.assignedTo.includes(u.id)).map((u) => u.name).join(', ')
    : 'Select assignees';

const statusOptions = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'review', label: 'In Review' },
  { value: 'done', label: 'Done' }
];

// // === Handle Update ===
// const handleUpdate = async () => {
//   if (!formData.title.trim()) {
//     errors.title = 'Title is required';
//     return;
//   }

//   const taskRef = doc(db, 'Tasks', props.task.id);
//   const tagsArray = formData.tags
//     .split(',')
//     .map((t) => t.trim())
//     .filter(Boolean);

//   await updateDoc(taskRef, {
//     title: formData.title,
//     description: formData.description,
//     priority: formData.priority,
//     status: formData.status,
//     projectId: formData.projectId ? doc(db, 'Projects', formData.projectId) : null,
//     assignedTo: formData.assignedTo.map((id) => doc(db, 'Users', id)),
//     deadline: formData.deadline ? new Date(formData.deadline) : null,
//     tags: tagsArray,
//     modifiedDate: new Date()
//   });

//   showSuccessMessage.value = true;
//   setTimeout(() => {
//     showSuccessMessage.value = false;
//     emit('updated');
//     emit('close');
//   }, 1500);
// };

const validateTitle = () => (errors.title = !formData.title ? 'Title is required' : '');
</script>

<style scoped>
@import '../../styles/CreateTaskModal.css';
</style>
