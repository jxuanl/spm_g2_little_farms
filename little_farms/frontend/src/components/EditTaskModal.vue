<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 bg-black/80" @click="closeDropdowns">
    <div
      class="create-task-modal fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-gray-200 bg-background p-6 shadow-lg duration-200 sm:rounded-lg sm:max-w-[500px]"
      @click.stop
    >
      <div class="flex flex-col space-y-1.5 text-center sm:text-left">
        <h2 class="text-lg font-semibold leading-none tracking-tight">{{ isSubtask ? 'Edit Subtask' : 'Edit Task' }}</h2>
      </div>

      <div v-if="showSuccessMessage" class="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
        <div class="text-sm text-green-800">✓ {{ isSubtask ? 'Subtask' : 'Task' }} updated successfully!</div>
      </div>

      <form @submit.prevent="handleUpdate" class="space-y-4">
        <!-- === Title === -->
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <label class="text-sm font-medium">{{ isSubtask ? 'Subtask' : 'Task' }} Title *</label>
            <span class="text-xs text-muted-foreground">{{ formData.title.length }}/50</span>
          </div>
          <input
            v-model="formData.title"
            type="text"
            :placeholder="isSubtask ? 'Enter subtask title...' : 'Enter task title...'"
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
            :placeholder="isSubtask ? 'Describe the subtask...' : 'Describe the task...'"
            class="flex min-h-[60px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <!-- === Priority & Status (Side by Side) === -->
        <div class="grid grid-cols-2 gap-4">
          <!-- Priority Input -->
          <div class="space-y-2">
            <label class="text-sm font-medium">Priority (1–10)</label>
            <input
              v-model="formData.priority"
              type="number"
              min="1"
              max="10"
              placeholder="Enter priority (1-10)"
              :class="[
                'flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                errors.priority ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-300'
              ]"
              @input="validatePriority"
            />
            <div v-if="errors.priority" class="text-sm text-red-500 mt-1">
              {{ errors.priority }}
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
                @click="!isSubtask && toggleDropdown('project')"
                :disabled="isSubtask"
                :class="[
                  'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-left',
                  isSubtask ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-60' : 'bg-transparent'
                ]"
              >
                <span :class="formData.projectId ? 'text-foreground' : 'text-muted-foreground'">
                  {{ getProjectPlaceholder() }}
                </span>
                <ChevronDown class="h-4 w-4 opacity-50" />
              </button>

              <div
                v-if="dropdownStates.project && !isSubtask"
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

       
        <!-- === Due Date === -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Due Date</label>
          <input
            v-model="formData.deadline"
            type="date"
            :class="[
              'flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              errors.deadline ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-300'
            ]"
            @input="validateDueDate"
          />
          <div v-if="errors.deadline" class="text-sm text-red-500 mt-1">
            {{ errors.deadline }}
          </div>
        </div>

        <!-- === Tags === -->
        <div class="space-y-2">
          <label class="text-sm font-medium">Tags</label>
          
          <!-- Display existing tags -->
          <div v-if="formData.tags.length > 0" class="flex flex-wrap gap-2 mb-2">
            <span
              v-for="tag in formData.tags"
              :key="tag"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs border border-primary/20"
            >
              {{ tag }}
              <button
                type="button"
                @click="removeTag(tag)"
                class="text-primary hover:text-primary/80 text-xs"
              >
                ×
              </button>
            </span>
          </div>

          <!-- Add new tag input -->
          <div class="relative">
            <input
              v-model="newTag"
              type="text"
              placeholder="Add a tag and press Enter"
              class="flex h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              @keyup.enter="addTag"
              @input="updateTagSuggestions"
              @focus="updateTagSuggestions"
              @blur="() => setTimeout(() => showTagSuggestions = false, 200)"
            />
            
            <!-- Tag suggestions dropdown -->
            <div
              v-if="showTagSuggestions && tagSuggestions.length > 0"
              class="absolute top-full left-0 mt-1 z-50 w-full rounded-md border border-gray-300 bg-popover shadow-lg max-h-40 overflow-y-auto"
            >
              <div class="p-1">
                <button
                  v-for="suggestion in tagSuggestions"
                  :key="suggestion"
                  type="button"
                  @click="selectTagSuggestion(suggestion)"
                  class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                >
                  {{ suggestion }}
                </button>
              </div>
            </div>
          </div>
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
import { ChevronDown, Check, X } from 'lucide-vue-next';
// import { doc, updateDoc, getDocs, collection } from 'firebase/firestore';
// import { db } from '../../firebase';

const emit = defineEmits(['close', 'updated']);
const props = defineProps({ 
  isOpen: Boolean, 
  task: Object,
  isSubtask: { type: Boolean, default: false },
  parentTaskId: { type: String, default: null }
});

const showSuccessMessage = ref(false);
const projects = ref([]);
const users = ref([]);
const dropdownStates = reactive({ status: false, project: false, assignees: false });
const errors = reactive({ 
  title: '',
  priority: '',
  deadline: ''
});

const formData = reactive({
  title: '',
  description: '',
  priority: null,
  status: '',
  projectId: '',
  assignedTo: [],
  deadline: '',
  tags: []
});

// Tag-related reactive data
const newTag = ref('');
const showTagSuggestions = ref(false);
const tagSuggestions = ref([]);

// Existing tags for auto-suggestion (would typically come from API)
const existingTags = ref([
  'Frontend', 'Backend', 'Bug Fix', 'Feature', 'Testing', 'Documentation', 'UI/UX', 'API', 'Database', 'Performance'
]);

// Load dropdown data
// --- Fetch project and user lists from backend ---
import { getAuth } from 'firebase/auth';

onMounted(async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return console.warn('⚠️ User not logged in');
    const token = await user.getIdToken();

    const [projectRes, userRes] = await Promise.all([
      fetch('http://localhost:3001/api/allProjects', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('http://localhost:3001/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
    ]);

    const projectData = await projectRes.json();
    const userData = await userRes.json();

    projects.value = Array.isArray(projectData.data)
      ? projectData.data
      : projectData.projects || [];

    users.value = Array.isArray(userData.data)
      ? userData.data
      : userData.users || [];

  } catch (err) {
    console.error('❌ Error fetching dropdown data:', err);
  }
});


// --- Handle update through backend ---
// const handleUpdate = async () => {
//   if (!formData.title.trim()) {
//     errors.title = 'Title is required'
//     return
//   }

//   const tagsArray = formData.tags
//     .split(',')
//     .map((t) => t.trim())
//     .filter(Boolean)

//   const updatePayload = {
//     title: formData.title,
//     description: formData.description,
//     priority: formData.priority,
//     status: formData.status,
//     projectId: formData.projectId || null,
//     assignedTo: formData.assignedTo,
//     deadline: formData.deadline || null,
//     tags: tagsArray,
//   }

//   try {
//     const res = await fetch(`/api/tasks/${props.task.id}`, {
//       method: 'PUT',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(updatePayload),
//     })

//     const data = await res.json()
//     if (!data.success) throw new Error(data.message || 'Failed to update task')

//     showSuccessMessage.value = true
//     setTimeout(() => {
//       showSuccessMessage.value = false
//       emit('updated')
//       emit('close')
//     }, 1500)
//   } catch (err) {
//     console.error('❌ Error updating task:', err)
//   }
// }

// Prefill form from props
watch(
  () => props.task,
  (task) => {
    if (task) {
      formData.title = task.title || '';
      formData.description = task.description || '';
      formData.priority = task.priority || null;
      formData.status = task.status || '';
      
      // Handle projectId for both regular tasks and subtasks
      if (props.isSubtask) {
        // For subtasks, projectId might come as a path object from API
        if (task.projectId?.path) {
          // Extract the project ID from the path (e.g., "Projects/abc123" -> "abc123")
          const pathParts = task.projectId.path.split('/');
          formData.projectId = pathParts[pathParts.length - 1];
        } else if (typeof task.projectId === 'string') {
          formData.projectId = task.projectId;
        } else {
          formData.projectId = '';
        }
      } else {
        // For regular tasks from Firestore
        formData.projectId = task.projectId?.id || '';
      }
      
      // Handle assignedTo for both regular tasks and subtasks
      if (props.isSubtask) {
        // For subtasks, assignedTo might come as path objects from API
        if (Array.isArray(task.assignedTo)) {
          formData.assignedTo = task.assignedTo.map((assignee) => {
            if (assignee?.path) {
              // Extract the user ID from the path (e.g., "Users/user123" -> "user123")
              const pathParts = assignee.path.split('/');
              return pathParts[pathParts.length - 1];
            }
            return assignee.id || assignee;
          }).filter(Boolean);
        } else {
          formData.assignedTo = [];
        }
      } else {
        // For regular tasks from Firestore
        formData.assignedTo = task.assignedTo?.map((a) => a.id || a) || [];
      }
      
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
  showTagSuggestions.value = false;
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

// // === Validation functions ===
const validateTitle = () => {
  errors.title = '';
  if (!formData.title.trim()) {
    errors.title = 'Title is required';
  } else if (formData.title.length > 50) {
    errors.title = 'Title cannot exceed 50 characters';
  }
};

const validatePriority = () => {
  errors.priority = '';
  const priority = Number(formData.priority);
  if (formData.priority && ((priority < 1) || (priority > 10))) {
    errors.priority = 'Priority must be a number between 1 and 10';
  }
};

const validateDueDate = () => {
  errors.deadline = '';
  if (formData.deadline.trim()) {
    const inputDate = new Date(formData.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isNaN(inputDate.getTime())) {
      errors.deadline = 'Please enter a valid date';
    } else if (inputDate < today) {
      errors.deadline = 'Due date cannot be in the past';
    }
  }
};

// === Tag management functions ===
const updateTagSuggestions = () => {
  if (newTag.value.trim().length > 0) {
    tagSuggestions.value = existingTags.value.filter(tag => 
      tag.toLowerCase().includes(newTag.value.toLowerCase()) &&
      !formData.tags.includes(tag)
    ).slice(0, 5);
    showTagSuggestions.value = tagSuggestions.value.length > 0;
  } else {
    showTagSuggestions.value = false;
    tagSuggestions.value = [];
  }
};

const selectTagSuggestion = (tag) => {
  formData.tags.push(tag);
  newTag.value = '';
  showTagSuggestions.value = false;
  tagSuggestions.value = [];
};

const addTag = () => {
  if (newTag.value.trim() && !formData.tags.includes(newTag.value.trim())) {
    formData.tags.push(newTag.value.trim());
    newTag.value = '';
    showTagSuggestions.value = false;
    tagSuggestions.value = [];
  }
};

const removeTag = (tagToRemove) => {
  const index = formData.tags.indexOf(tagToRemove);
  if (index > -1) {
    formData.tags.splice(index, 1);
  }
};

// === Handle Update ===
const handleUpdate = async () => {
  validateTitle();
  validatePriority();
  validateDueDate();

  if (errors.title || errors.priority || errors.deadline) {
    return;
  }

  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      errors.title = 'User not logged in.';
      return;
    }
    const token = await user.getIdToken();

    const tagsArray = Array.isArray(formData.tags) ? formData.tags : [];

    const updateData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      priority: Number(formData.priority) || null,
      status: formData.status || 'todo',
      assignedTo: formData.assignedTo || [],
      projectId: formData.projectId || null,
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
      tags: tagsArray,
      userId: user.uid // for backend access control
    };

    const endpoint = props.isSubtask
      ? `http://localhost:3001/api/tasks/${props.parentTaskId}/subtasks/${props.task.id}`
      : `http://localhost:3001/api/tasks/${props.task.id}`;

    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updateData),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to update: ${res.status} ${text}`);
    }

    showSuccessMessage.value = true;
    setTimeout(() => {
      showSuccessMessage.value = false;
      emit('updated');
      emit('close');
    }, 1500);

  } catch (error) {
    console.error('❌ Error updating task:', error);
    errors.title = `Failed to update ${props.isSubtask ? 'subtask' : 'task'}. Please try again.`;
  }
};

</script>

<style scoped>
@import '../../styles/CreateTaskModal.css';
</style>
