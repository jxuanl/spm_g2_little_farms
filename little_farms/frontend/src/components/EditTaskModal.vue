<template>
  <div>
    <!-- ====================== Edit Task Modal ====================== -->
    <Teleport to="body">
      <div v-if="isOpen" class="fixed inset-0 z-9998">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/80" @click="closeDropdowns"></div>

        <!-- Centered card -->
        <div class="pointer-events-none fixed inset-0 grid place-items-center p-4">
          <div
            class="pointer-events-auto w-full max-w-[700px] rounded-lg bg-background p-6 shadow-2xl ring-1 ring-black/5
                   max-h-[85vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Edit task"
            @click.stop
          >
            <div class="flex flex-col space-y-1.5 text-center sm:text-left">
              <h2 class="text-lg font-semibold leading-none tracking-tight">
                {{ isSubtask ? 'Edit Subtask' : 'Edit Task' }}
              </h2>
            </div>

            <div v-if="showSuccessMessage" class="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
              <div class="text-sm text-green-800">✓ {{ isSubtask ? 'Subtask' : 'Task' }} updated successfully!</div>
            </div>

            <form @submit.prevent="saveClicked" class="space-y-4">
              <!-- Title -->
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
                  maxlength="50"
                  :class="[
                    'flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    errors.title ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-300'
                  ]"
                  @input="validateTitle"
                />
                <p v-if="errors.title" class="text-sm text-red-500 mt-1">{{ errors.title }}</p>
              </div>

              <!-- Description -->
              <div class="space-y-2">
                <label class="text-sm font-medium">Description</label>
                <textarea
                  v-model="formData.description"
                  rows="3"
                  :placeholder="isSubtask ? 'Describe the subtask...' : 'Describe the task...'"
                  class="flex min-h-[60px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <!-- Priority & Status -->
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-sm font-medium">Priority (1–10) *</label>
                  <input
                    v-model.number="formData.priority"
                    type="number"
                    min="1"
                    max="10"
                    placeholder="Enter priority (1-10)"
                    required
                    :class="[
                      'flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                      errors.priority ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-300'
                    ]"
                    @input="validatePriority"
                  />
                  <p v-if="errors.priority" class="text-sm text-red-500 mt-1">{{ errors.priority }}</p>
                </div>

                <div class="space-y-2">
                  <label class="text-sm font-medium">Status *</label>
                  <div class="relative">
                    <button
                      type="button"
                      @click="toggleDropdown('status')"
                      :class="[
                        'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring',
                        errors.status ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                      ]"
                    >
                      <span :class="[formData.status ? 'text-foreground' : 'text-muted-foreground', 'truncate']">
                        {{ getStatusLabel() }}
                      </span>
                      <ChevronDown class="h-4 w-4 opacity-50 shrink-0" />
                    </button>
                    <div
                      v-if="dropdownStates.status"
                      class="absolute top-full left-0 mt-1 z-10001 w-full max-h-60 overflow-y-auto rounded-md border border-gray-300 bg-popover shadow-lg"
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
                  <p v-if="errors.status" class="text-sm text-red-500 mt-1">{{ errors.status }}</p>
                </div>
              </div>

              <!-- Project & Assignees -->
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-sm font-medium">Project</label>
                  <div class="relative">
                    <button
                      type="button"
                      @click="!isSubtask && toggleDropdown('project')"
                      :disabled="isSubtask"
                      :class="[
                        'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-left',
                        isSubtask ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-60' : 'bg-transparent'
                      ]"
                    >
                      <span :class="[formData.projectId ? 'text-foreground' : 'text-muted-foreground', 'truncate']">
                        {{ getProjectPlaceholder() }}
                      </span>
                      <ChevronDown class="h-4 w-4 opacity-50 shrink-0" />
                    </button>

                    <div
                      v-if="dropdownStates.project && !isSubtask"
                      class="absolute top-full left-0 mt-1 z-10001 w-full max-h-60 overflow-y-auto rounded-md border border-gray-300 bg-popover shadow-lg"
                    >
                      <div v-if="projects.length === 0" class="p-3 text-sm text-muted-foreground text-center">
                        No projects available
                      </div>
                      <div v-else class="p-1">
                        <button
                          v-for="project in projects"
                          :key="project.id"
                          type="button"
                          @click="selectOption('projectId', project.id)"
                          class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm flex justify-between items-center"
                        >
                          <span>{{ project.name }}</span>
                          <Check v-if="formData.projectId === project.id" class="w-4 h-4 text-primary" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="space-y-2">
                  <label class="text-sm font-medium">Assignees *</label>
                  <div class="relative">
                    <button
                      type="button"
                      @click="toggleDropdown('assignees')"
                      :class="[
                        'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-left',
                        errors.assignedTo ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                      ]"
                    >
                      <span :class="[formData.assignedTo.length > 0 ? 'text-foreground' : 'text-muted-foreground', 'truncate']">
                        {{ getAssigneesPlaceholder() }}
                      </span>
                      <ChevronDown class="h-4 w-4 opacity-50 shrink-0" />
                    </button>

                    <div
                      v-if="dropdownStates.assignees"
                      class="absolute top-full left-0 mt-1 z-10001 w-full max-h-60 overflow-y-auto rounded-md border border-gray-300 bg-popover shadow-lg"
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
                  <p v-if="errors.assignedTo" class="text-sm text-red-500 mt-1">{{ errors.assignedTo }}</p>
                </div>
              </div>

              <!-- Due Date -->
              <div class="space-y-2">
                <label class="text-sm font-medium">Due Date</label>
                <input
                  v-model="formData.deadline"
                  type="date"
                  :class="[
                    'flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    errors.deadline ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-300'
                  ]"
                  @change="validateDueDate"
                />
                <p v-if="errors.deadline" class="text-sm text-red-500 mt-1">{{ errors.deadline }}</p>
              </div>

              <!-- Tags -->
              <div class="space-y-2">
                <label class="text-sm font-medium">Tags</label>
                <div v-if="formData.tags.length > 0" class="flex flex-wrap gap-2 mb-2">
                  <span
                    v-for="tag in formData.tags"
                    :key="tag"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs border border-primary/20"
                  >
                    {{ tag }}
                    <button type="button" @click="removeTag(tag)" class="text-primary hover:text-primary/80 text-xs">×</button>
                  </span>
                </div>

                <div class="relative">
                  <div class="flex gap-2">
                    <input
                      v-model="newTag"
                      type="text"
                      placeholder="Add a tag and press Enter"
                      class="flex h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      @keypress.enter.prevent="addTag"
                      @input="updateTagSuggestions"
                      @focus="updateTagSuggestions"
                      @blur="() => setTimeout(() => (showTagSuggestions = false), 200)"
                    />
                    <button
                      type="button"
                      @click="addTag"
                      class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                    >
                      Add
                    </button>
                  </div>

                  <div
                    v-if="showTagSuggestions && tagSuggestions.length > 0"
                    class="absolute top-full left-0 mt-1 z-10001 w-full rounded-md border border-gray-300 bg-popover shadow-lg max-h-40 overflow-y-auto"
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

              <!-- Buttons -->
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
      </div>
    </Teleport>

    <!-- ====================== Log Time Modal (Card) ====================== -->
    <Teleport to="body">
      <div v-if="showLogTimePrompt" class="fixed inset-0 z-10000">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/80" @click.stop></div>

        <!-- Centered card -->
        <div class="pointer-events-none fixed inset-0 grid items-start justify-center p-4 pt-[10vh]">
          <div
            class="pointer-events-auto w-full max-w-md rounded-2xl bg-background shadow-2xl ring-1 ring-black/5
                   max-h-[85vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Log time spent"
            @click.stop
          >
            <div class="p-6">
              <h3 class="text-lg font-semibold mb-4">Log Time Spent</h3>
              <p class="text-sm text-gray-600 mb-4">
                You've marked this {{ isSubtask ? 'subtask' : 'task' }} as complete. Please log the time spent by each assignee.
              </p>

              <div v-for="userId in formData.assignedTo" :key="userId" class="mb-4">
                <label class="text-sm font-medium">Time Spent by {{ getUserLabel(userId) }} (hours)</label>
                <input
                  v-model.number="loggedTimes[userId]"
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="e.g., 2.5"
                  required
                  :class="[
                    'mt-1 flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    loggedTimeErrors[userId] ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-300'
                  ]"
                />
                <p v-if="loggedTimeErrors[userId]" class="text-sm text-red-500 mt-1">
                  {{ loggedTimeErrors[userId] }}
                </p>
              </div>

              <p class="text-xs text-gray-500 mb-6">
                Enter hours for each assignee (e.g., 2.5 for 2 hours 30 minutes)
              </p>

              <div class="flex justify-end gap-2">
                <button
                  type="button"
                  class="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 border border-primary h-9 px-4 py-2"
                  @click="submitLoggedTime"
                >
                  Submit &amp; Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue';
import { ChevronDown, Check } from 'lucide-vue-next';
import { getAuth } from 'firebase/auth';

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
const allUsers = ref([]); // Store all users before filtering
const currentUserRole = ref('staff'); // Store current user's role
const dropdownStates = reactive({ status: false, project: false, assignees: false });
const errors = reactive({ title: '', priority: '', deadline: '', status: '', assignedTo: '' });

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

const originalValues = reactive({
  title: '',
  description: '',
  priority: null,
  status: '',
  projectId: '',
  assignedTo: [],
  deadline: '',
  tags: []
});

// tag state
const newTag = ref('');
const showTagSuggestions = ref(false);
const tagSuggestions = ref([]);
const existingTags = ref([
  'Frontend',
  'Backend',
  'Bug Fix',
  'Feature',
  'Testing',
  'Documentation',
  'UI/UX',
  'API',
  'Database',
  'Performance'
]);

// log time modal state
const showLogTimePrompt = ref(false);
const loggedTimes = reactive({});
const loggedTimeErrors = reactive({});

// status options
const statusOptions = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'review', label: 'In Review' },
  { value: 'done', label: 'Done' }
];

// Helper function to filter users based on role
const filterUsersByRole = (usersList, currentRole) => {
  return usersList.filter(user => {
    const userRole = user.role || 'staff';
    
    // Exclude HR users
    if (userRole === 'HR' || userRole === 'hr') {
      return false;
    }
    
    // Staff can only see other staff
    if (currentRole === 'staff') {
      return userRole === 'staff';
    }
    
    // Manager can see staff and other managers
    if (currentRole === 'manager') {
      return userRole === 'staff' || userRole === 'manager';
    }
    
    // Default: show all non-HR users
    return true;
  });
};

// 1. fetch projects/users
onMounted(async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();

    const [projectRes, userRes] = await Promise.all([
      fetch('/api/allProjects', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
    ]);

    const projectData = await projectRes.json();
    const userData = await userRes.json();

    projects.value = Array.isArray(projectData?.data)
      ? projectData.data.map((p) => ({ id: p.id, name: p.name || p.title || 'Unnamed Project' }))
      : (projectData.projects || []).map((p) => ({ id: p.id, name: p.name || p.title || 'Unnamed Project' }));

    // Store all users with role information
    allUsers.value = Array.isArray(userData?.data)
      ? userData.data.map((u) => ({ id: u.uid || u.id, name: u.name || 'Unknown User', role: u.role || 'staff' }))
      : (userData.users || []).map((u) => ({ id: u.uid || u.id, name: u.name || 'Unknown User', role: u.role || 'staff' }));
    
    // Get current user's role
    const currentUserId = user.uid;
    const currentUserData = allUsers.value.find(u => u.id === currentUserId);
    currentUserRole.value = currentUserData?.role || 'staff';
    
    // Filter users based on role
    users.value = filterUsersByRole(allUsers.value, currentUserRole.value);
  } catch (err) {
    console.error('❌ Error fetching dropdown data:', err);
  }
});

// helper to normalize any shape of assignee -> userId string
const normalizeAssignee = (a) => {
  if (!a) return '';
  // already a string
  if (typeof a === 'string') return a;
  // object with id or uid
  if (typeof a === 'object') {
    if (a.id) return a.id;
    if (a.uid) return a.uid;
    // Firestore doc ref style .path
    if (a.path && typeof a.path === 'string') {
      const parts = a.path.split('/');
      return parts[parts.length - 1];
    }
    // Firestore doc ref style ._path.segments (YOUR CASE)
    if (a._path?.segments?.length) {
      const segs = a._path.segments;
      return segs[segs.length - 1];
    }
  }
  // fallback
  return String(a);
};

// when task changes, populate form
watch(
  () => props.task,
  (task) => {
    if (!task) return;

    formData.title = task.title || '';
    formData.description = task.description || '';
    formData.priority = task.priority || null;
    formData.status = task.status || '';

    // project
    if (props.isSubtask) {
      if (task.projectId?.path) {
        const parts = task.projectId.path.split('/');
        formData.projectId = parts[parts.length - 1];
      } else if (typeof task.projectId === 'string') {
        formData.projectId = task.projectId;
      } else {
        formData.projectId = '';
      }
    } else {
      formData.projectId = task.projectId?.id || task.projectId || '';
    }

    // assignees (normalize ALL)
    const rawAssignees = Array.isArray(task.assignedTo) ? task.assignedTo : [];
    formData.assignedTo = rawAssignees.map((a) => normalizeAssignee(a));

    // deadline
    formData.deadline = task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '';

    // tags
    formData.tags = Array.isArray(task.tags) ? [...task.tags] : [];

    // save originals
    originalValues.title = formData.title;
    originalValues.description = formData.description;
    originalValues.priority = formData.priority;
    originalValues.status = formData.status;
    originalValues.projectId = formData.projectId;
    originalValues.assignedTo = [...formData.assignedTo];
    originalValues.deadline = formData.deadline;
    originalValues.tags = [...formData.tags];

    // init log time map
    Object.keys(loggedTimes).forEach((k) => delete loggedTimes[k]);
    formData.assignedTo.forEach((id) => {
      loggedTimes[id] = '';
    });
  },
  { immediate: true }
);

// validation
const validateTitle = () => {
  if (!formData.title.trim()) errors.title = 'Task title is required';
  else if (formData.title.length > 50) errors.title = 'Task title cannot exceed 50 characters';
  else errors.title = '';
};

const validatePriority = () => {
  errors.priority = '';
  if (!formData.priority) {
    errors.priority = 'Priority is required';
  } else {
    const p = Number(formData.priority);
    if (p < 1 || p > 10) errors.priority = 'Priority must be a number between 1 and 10';
    else errors.priority = '';
  }
};

const validateStatus = () => {
  errors.status = '';
  if (!formData.status) {
    errors.status = 'Status is required';
  }
};

const validateAssignees = () => {
  errors.assignedTo = '';
  if (!formData.assignedTo || formData.assignedTo.length === 0) {
    errors.assignedTo = 'At least one assignee is required';
    return;
  }
  
  // Staff must include themselves as an assignee
  if (currentUserRole.value === 'staff') {
    const auth = getAuth();
    const currentUserId = auth.currentUser?.uid;
    if (!formData.assignedTo.includes(currentUserId)) {
      errors.assignedTo = 'Staff members must include themselves as an assignee';
    }
  }
};

const validateDueDate = () => {
  if (!formData.deadline) {
    errors.deadline = '';
    return;
  }
  const d = new Date(formData.deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(d.getTime())) errors.deadline = 'Please enter a valid date';
  else if (d < today) errors.deadline = 'Due date cannot be in the past';
  else errors.deadline = '';
};

const validateForm = () => {
  validateTitle();
  validatePriority();
  validateDueDate();
  validateStatus();
  validateAssignees();
  return !errors.title && !errors.priority && !errors.deadline && !errors.status && !errors.assignedTo;
};

// dropdown helpers
const toggleDropdown = (key) => {
  Object.keys(dropdownStates).forEach((k) => {
    dropdownStates[k] = k === key ? !dropdownStates[k] : false;
  });
};

const closeDropdowns = () => {
  Object.keys(dropdownStates).forEach((k) => (dropdownStates[k] = false));
  showTagSuggestions.value = false;
};

const selectOption = (key, value) => {
  formData[key] = value;
  if (key === 'status') {
    validateStatus();
  }
  closeDropdowns();
};

const toggleAssignee = (id) => {
  const idx = formData.assignedTo.indexOf(id);
  if (idx > -1) {
    formData.assignedTo.splice(idx, 1);
    delete loggedTimes[id];
    delete loggedTimeErrors[id];
  } else {
    formData.assignedTo.push(id);
    loggedTimes[id] = '';
  }
  validateAssignees();
};

const getStatusLabel = () => {
  const m = { todo: 'To Do', 'in-progress': 'In Progress', review: 'In Review', done: 'Done' };
  return m[formData.status] || 'Select status';
};

const getProjectPlaceholder = () => {
  const p = projects.value.find((pr) => pr.id === formData.projectId);
  return p ? p.name : 'Select project';
};

const getAssigneesPlaceholder = () => {
  if (!formData.assignedTo.length) return 'Select assignees';
  return formData.assignedTo
    .map((id) => getUserLabel(id))
    .join(', ');
};

// label helper for modal
const getUserLabel = (maybeId) => {
  // if it somehow comes as object again, normalize it
  const id = typeof maybeId === 'string' ? maybeId : normalizeAssignee(maybeId);
  const u = users.value.find((x) => x.id === id);
  return u ? u.name : id;
};

// tags helpers
const updateTagSuggestions = () => {
  const q = newTag.value.trim().toLowerCase();
  if (!q) {
    showTagSuggestions.value = false;
    tagSuggestions.value = [];
    return;
  }
  tagSuggestions.value = existingTags.value
    .filter((t) => t.toLowerCase().includes(q) && !formData.tags.includes(t))
    .slice(0, 5);
  showTagSuggestions.value = tagSuggestions.value.length > 0;
};

const selectTagSuggestion = (tag) => {
  if (!formData.tags.includes(tag)) formData.tags.push(tag);
  newTag.value = '';
  showTagSuggestions.value = false;
  tagSuggestions.value = [];
};

const addTag = () => {
  const t = newTag.value.trim();
  if (t && !formData.tags.includes(t)) formData.tags.push(t);
  newTag.value = '';
  showTagSuggestions.value = false;
  tagSuggestions.value = [];
};

const removeTag = (tag) => {
  const i = formData.tags.indexOf(tag);
  if (i > -1) formData.tags.splice(i, 1);
};

const saveClicked = async () => {
  if (!validateForm()) return;
  const changingToDone = formData.status === 'done' && originalValues.status !== 'done';
 
  if (changingToDone) {
    // First update the task status to "done"
    const success = await saveTaskUpdate();
    if (success) {
      // Close the edit modal immediately
      emit('close');
      // Then show the log time prompt after a brief delay
      setTimeout(() => {
        showLogTimePrompt.value = true;
      }, 300);
    }
  } else {
    // For non-status changes, just update normally
    await saveTaskUpdate();
  }
};

const submitLoggedTime = async () => {
  let hasError = false;
  formData.assignedTo.forEach((id) => {
    if (!loggedTimes[id] || loggedTimes[id] <= 0) {
      loggedTimeErrors[id] = 'Please enter a valid time in hours';
      hasError = true;
    } else {
      delete loggedTimeErrors[id];
    }
  });
  if (hasError) return;

  try {
    // Create API calls for each assignee who has logged time
    const timeLogPromises = formData.assignedTo
      .filter(userId => loggedTimes[userId] && loggedTimes[userId] > 0)
      .map(async (userId) => {
        const hours = parseFloat(loggedTimes[userId]);
       
        // Construct the task reference based on whether it's a task or subtask
        const taskRef = props.isSubtask
          ? `/Tasks/${props.parentTaskId}/Subtasks/${props.task.id}`
          : `/Tasks/${props.task.id}`;
       
        // Construct the user reference
        const userRef = `/Users/${userId}`;

        const payload = {
          task: taskRef,
          user: userRef,
          amtOfTime: hours
        };

        console.log('Logging time for user:', userId, 'Payload:', payload);

        const response = await fetch(`/api/logTime`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} for user ${userId}`);
        }

        const result = await response.json();
        console.log(`Time logged successfully for user ${userId}:`, result);
        return result;
      });

    // Wait for all time log requests to complete
    await Promise.all(timeLogPromises);
    console.log('All time entries logged successfully');
   
    // Close the log time modal and show success
    showLogTimePrompt.value = false;
    showSuccessMessage.value = true;
   
    setTimeout(() => {
      showSuccessMessage.value = false;
      emit('updated');
      emit('close');
    }, 1500);
   
  } catch (error) {
    console.error('Error logging time:', error);
    // Handle error (show message to user, etc.)
    errors.title = 'Failed to log time entries. Please try again.';
  }
};

const saveTaskUpdate = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      errors.title = 'User not logged in.';
      return;
    }
    const token = await user.getIdToken();
    const updateData = {
      id: props.task.id,
      title: formData.title.trim(),
      description: formData.description.trim(),
      priority: formData.priority ? Number(formData.priority) : null,
      status: formData.status || 'todo',
      assignedTo: formData.assignedTo || [],
      projectId: formData.projectId || null,
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
      tags: Array.isArray(formData.tags) ? formData.tags : [],
      userId: user.uid
    };

    const endpoint = props.isSubtask
      ? `/api/tasks/${props.parentTaskId}/subtasks/${props.task.id}`
      : `/api/tasks/${props.task.id}`;

    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to update: ${res.status} ${text}`);
    }

    // build a change-diff payload for notificationService (only include changed fields)
    const changes = {};
    const addChange = (key, oldV, newV) => {
      const isEqual =
        (Array.isArray(oldV) && Array.isArray(newV) && JSON.stringify(oldV) === JSON.stringify(newV)) ||
        (!Array.isArray(oldV) && !Array.isArray(newV) && String(oldV) === String(newV));
      if (!isEqual) changes[key] = { old: oldV, new: newV };
    };

    addChange('title', originalValues.title, formData.title);
    addChange('priority', originalValues.priority, formData.priority);
    addChange('status', originalValues.status, formData.status);
    addChange('projectId', originalValues.projectId, formData.projectId);
    addChange('assignedTo', originalValues.assignedTo, formData.assignedTo);
    addChange('deadline', originalValues.deadline, formData.deadline);
    addChange('tags', originalValues.tags, formData.tags);

    if (Object.keys(changes).length > 0) {
      const notifPayload = { id: props.task.id, ...changes };
      try {
        await fetch('/api/notifications/update/tasks/manager', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(notifPayload)
        });
      } catch (e) {
        // log but do not block user
        console.warn('Failed to send manager notification payload', e);
      }
    }

    // Only show success message if we're NOT changing to "done" status
    if (formData.status !== 'done' || originalValues.status === 'done') {
      showSuccessMessage.value = true;
      setTimeout(() => {
        showSuccessMessage.value = false;
        emit('updated');
        emit('close');
      }, 1500);
    }

    return true; // Return success status

  } catch (err) {
    console.error('❌ Error updating task:', err);
    errors.title = err.message || 'Failed to update task. Please try again.';
    return false; // Return failure status
  }
};

// Lock page scroll when any modal is open
watch([showLogTimePrompt, () => props.isOpen], ([logOpen, editOpen]) => {
  const open = logOpen || editOpen;
  document.documentElement.style.overflow = open ? 'hidden' : '';
  document.body.style.overflow = open ? 'hidden' : '';
});
</script>

<style scoped>
/* Ensure red error text always shows */
.text-red-500 {
  color: #ef4444 !important;
}

/* Red error borders */
.border-red-500 {
  border-color: #ef4444 !important;
}

.focus-visible\:ring-red-500:focus-visible,
.focus\:ring-red-500:focus {
  --tw-ring-color: #ef4444 !important;
}

/* Truncate text with ellipsis */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

/* Success message styling */
.text-green-800 {
  color: #166534 !important;
}

.bg-green-50 {
  background-color: #f0fdf4 !important;
}

.border-green-200 {
  border-color: #bbf7d0 !important;
}

/* Dark mode adjustments */
.dark .text-red-500 {
  color: #f87171 !important;
}

.dark .border-red-500 {
  border-color: #f87171 !important;
}
</style>