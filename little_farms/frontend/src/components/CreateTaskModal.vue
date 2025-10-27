<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" @click="closeDropdowns">
    <div 
      class="create-task-modal fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-gray-200 bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg sm:max-w-[500px]"
      @click.stop
    >
      <div class="flex flex-col space-y-1.5 text-center sm:text-left">
        <h2 class="text-lg font-semibold leading-none tracking-tight">{{ props.parentTaskId ? 'Create New Subtask' : 'Create New Task' }}</h2>
      </div>
      
      <div v-if="showSuccessMessage" class="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
        <div class="text-sm text-green-800">
          {{ props.parentTaskId ? '✓ Subtask created successfully!' : '✓ Task created successfully!' }}
        </div>
      </div>
      
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <label for="title" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{{ props.parentTaskId ? 'Subtask Title *' : 'Task Title *' }}</label>
            <span class="text-xs text-muted-foreground">{{ formData.title.length }}/50</span>
          </div>
          <input
            id="title"
            v-model="formData.title"
            type="text"
            :placeholder="indvTask ? 'Enter task title...' : 'Enter subtask title...'"
            required
            :class="[
              'flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
              errors.title ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-300'
            ]"
            @input="validateTitle"
          />
          <div v-if="errors.title" class="text-sm text-red-500 mt-1">
            {{ errors.title }}
          </div>
        </div>

        <div class="space-y-2">
          <label for="description" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Description</label>
          <textarea
            id="description"
            v-model="formData.description"
            placeholder="Describe the task..."
            rows="3"
            class="flex min-h-[60px] w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label for="priority" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Priority (1-10)</label>
            <input
              id="priority"
              v-model.number="formData.priority"
              type="number"
              min="1"
              max="10"
              placeholder="Enter priority (1-10)"
              :class="[
                'flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                errors.priority ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-300'
              ]"
              @input="validatePriority"
            />
            <div v-if="errors.priority" class="text-sm text-red-500 mt-1">
              {{ errors.priority }}
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Status</label>
            <div class="relative">
              <button
                type="button"
                @click="toggleDropdown('status')"
                class="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span :class="formData.status ? 'text-foreground' : 'text-muted-foreground'">
                  {{ getStatusOptions() }}
                </span>
                <ChevronDown class="h-4 w-4 opacity-50" />
              </button>
              <div 
                v-if="dropdownStates.status"
                class="absolute top-full left-0 mt-1 z-50 w-full rounded-md border border-gray-300 bg-popover shadow-lg"
              >
                <div class="p-1">
                  <button
                    type="button"
                    @click="selectOption('status', 'todo')"
                    class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                  >
                    To Do
                  </button>
                  <button
                    type="button"
                    @click="selectOption('status', 'in-progress')"
                    class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                  >
                    In Progress
                  </button>
                  <button
                    type="button"
                    @click="selectOption('status', 'review')"
                    class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                  >
                    In Review
                  </button>
                  <button
                    type="button"
                    @click="selectOption('status', 'done')"
                    class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Project *
            </label>
            <div class="relative">
              <button
                type="button"
                @click="!props.parentTaskId ? toggleDropdown('project') : null"
                :class="[
                  'flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-left',
                  errors.projectId ? 'border-red-500 focus:ring-red-500' : 'border-gray-300',
                  props.parentTaskId ? 'cursor-not-allowed opacity-50' : ''
                ]"
                :disabled="loadingStates.projects || !!props.parentTaskId"
              >
                <span :class="[
                  formData.projectId ? 'text-foreground' : 'text-muted-foreground',
                  'truncate'
                ]">
                  {{ getProjectPlaceholder() }}
                </span>
                <ChevronDown v-if="!loadingStates.projects" class="h-4 w-4 opacity-50" />
                <div v-else class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
              </button>
              <div 
                v-if="dropdownStates.project && !loadingStates.projects && !props.parentTaskId"
                class="absolute top-full left-0 mt-1 z-50 w-full max-h-60 overflow-y-auto rounded-md border border-gray-300 bg-popover shadow-lg"
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
                    class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                  >
                    {{ project.name }}
                  </button>
                </div>
              </div>
            </div>
            <div v-if="errors.projectId" class="text-sm text-red-500 mt-1">
              {{ errors.projectId }}
            </div>
          </div>          <div class="space-y-2">
            <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Assignees</label>
            <div class="relative">
              <button
                type="button"
                @click="toggleDropdown('assignees')"
                :class="[
                  'flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-left',
                  'border-gray-300'
                ]"
                :disabled="loadingStates.users"
              >
                <span :class="[
                  formData.assigneeIds.length > 0 ? 'text-foreground' : 'text-muted-foreground',
                  'truncate'
                ]">
                  {{ getAssigneesPlaceholder() }}
                </span>
                <ChevronDown v-if="!loadingStates.users" class="h-4 w-4 opacity-50" />
                <div v-else class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
              </button>
              <div 
                v-if="dropdownStates.assignees && !loadingStates.users"
                class="absolute top-full left-0 mt-1 z-50 w-full max-h-60 overflow-y-auto rounded-md border border-gray-300 bg-popover shadow-lg"
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
                    :class="[
                      'w-full text-left px-2 py-1.5 text-sm rounded-sm flex items-center justify-between',
                      formData.assigneeIds.includes(user.id) 
                        ? 'bg-accent text-accent-foreground' 
                        : 'hover:bg-accent hover:text-accent-foreground'
                    ]"
                  >
                    <span>{{ user.name }}</span>
                    <Check v-if="formData.assigneeIds.includes(user.id)" class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Due Date</label>
          <input
            v-model="formData.dueDate"
            type="date"
            :class="[
              'flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
              errors.dueDate ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-300'
            ]"
            @change="validateDueDate"
          />
          <div v-if="errors.dueDate" class="text-sm text-red-500 mt-1">
            {{ errors.dueDate }}
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Tags</label>
          <div class="relative">
            <div class="flex gap-2">
              <input
                v-model="newTag"
                type="text"
                placeholder="Add tag..."
                class="flex h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                @input="updateTagSuggestions"
                @keypress.enter.prevent="addTag"
                @blur="() => setTimeout(() => showTagSuggestions = false, 150)"
              />
              <button
                type="button"
                @click="addTag"
                class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              >
                Add
              </button>
            </div>
            
            <!-- Tag suggestions dropdown -->
            <div 
              v-if="showTagSuggestions"
              class="absolute top-full left-0 mt-1 z-50 w-full rounded-md border border-gray-300 bg-popover shadow-lg max-h-32 overflow-y-auto"
            >
              <div class="p-1">
                <button
                  type="button"
                  v-for="suggestion in tagSuggestions" 
                  :key="suggestion"
                  @click="selectTagSuggestion(suggestion)"
                  class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                >
                  {{ suggestion }}
                </button>
              </div>
            </div>
          </div>
          
          <div v-if="formData.tags.length > 0" class="flex flex-wrap gap-2">
            <span 
              v-for="tag in formData.tags" 
              :key="tag"
              class="inline-flex items-center rounded-md border border-gray-200 px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 gap-1"
            >
              {{ tag }}
              <button
                type="button"
                @click="removeTag(tag)"
                class="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
              >
                <X class="w-3 h-3" />
              </button>
            </span>
          </div>
        </div>

        <!-- Recurring Task Section -->
        <div class="space-y-3 border border-gray-300 rounded-md p-4 bg-gray-50">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Recurring Task
            </label>
            <button
              type="button"
              @click="formData.recurring = !formData.recurring"
              :class="[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                formData.recurring ? 'bg-primary' : 'bg-gray-300'
              ]"
            >
              <span
                :class="[
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  formData.recurring ? 'translate-x-6' : 'translate-x-1'
                ]"
              />
            </button>
          </div>

          <div v-if="formData.recurring" class="space-y-3 pt-2">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Repeat Every *
                </label>
                <input
                  v-model.number="formData.recurrenceValue"
                  type="number"
                  min="1"
                  placeholder="e.g., 2"
                  required
                  :class="[
                    'flex h-9 w-full rounded-md border bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                    errors.recurrenceValue ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-300'
                  ]"
                  @input="validateRecurrence"
                />
                <div v-if="errors.recurrenceValue" class="text-sm text-red-500 mt-1">
                  {{ errors.recurrenceValue }}
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Interval *
                </label>
                <div class="relative">
                  <button
                    type="button"
                    @click="toggleDropdown('recurrenceInterval')"
                    :class="[
                      'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border bg-white px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                      errors.recurrenceInterval ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                    ]"
                  >
                    <span :class="formData.recurrenceInterval ? 'text-foreground' : 'text-muted-foreground'">
                      {{ getRecurrenceIntervalLabel() }}
                    </span>
                    <ChevronDown class="h-4 w-4 opacity-50" />
                  </button>
                  <div 
                    v-if="dropdownStates.recurrenceInterval"
                    class="absolute top-full left-0 mt-1 z-50 w-full rounded-md border border-gray-300 bg-popover shadow-lg"
                  >
                    <div class="p-1">
                      <button
                        type="button"
                        @click="selectOption('recurrenceInterval', 'days')"
                        class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                      >
                        Day(s)
                      </button>
                      <button
                        type="button"
                        @click="selectOption('recurrenceInterval', 'weeks')"
                        class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                      >
                        Week(s)
                      </button>
                      <button
                        type="button"
                        @click="selectOption('recurrenceInterval', 'months')"
                        class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                      >
                        Month(s)
                      </button>
                    </div>
                  </div>
                </div>
                <div v-if="errors.recurrenceInterval" class="text-sm text-red-500 mt-1">
                  {{ errors.recurrenceInterval }}
                </div>
              </div>
            </div>

            <div v-if="formData.recurrenceValue && formData.recurrenceInterval" class="text-sm text-muted-foreground bg-blue-50 border border-blue-200 rounded p-2">
              This task will repeat every {{ formData.recurrenceValue }} {{ formData.recurrenceInterval }}. 
              A new instance will be created only when you mark the current one as complete.
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <button 
            type="button" 
            class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            @click="() => { resetForm(); $emit('close'); }"
          >
            Cancel
          </button>
          <button 
            type="submit"
            class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 border border-primary h-9 px-4 py-2"
          >
            {{ props.parentTaskId ? 'Create Subtask' : 'Create Task' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { CalendarIcon, X, ChevronDown, Check } from 'lucide-vue-next';
import { auth } from '../../firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

const emit = defineEmits(['close', 'taskCreated']);

// API functions
const createTaskAPI = async (taskData) => {
  try {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(taskData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create task');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

const fetchProjects = async () => {
  try {
    // Wait for auth state to be ready
    if (!auth.currentUser) {
      console.log('No authenticated user found');
      return [];
    }
    
    const token = await auth.currentUser.getIdToken();
    console.log('Auth token for projects:', token ? 'Token exists' : 'No token');
    
    const response = await fetch('/api/allProjects', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Projects API error:', response.status, errorText);
      throw new Error(`Failed to fetch projects: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
};

const fetchUsers = async () => {
  try {
    // Wait for auth state to be ready
    if (!auth.currentUser) {
      console.log('No authenticated user found');
      return [];
    }
    
    const token = await auth.currentUser.getIdToken();
    console.log('Auth token for users:', token ? 'Token exists' : 'No token');
    console.log('Making request to: http://localhost:3001/api/users/users');
    
    const response = await fetch('/api/users/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Users API response status:', response.status);
    console.log('Users API response headers:', response.headers);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Users API error:', response.status, errorText);
      throw new Error(`Failed to fetch users: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Users API response data:', data);
    
    // Handle different response structures
    if (data.success && data.data) {
      return data.data;
    } else if (Array.isArray(data)) {
      return data;
    } else if (data.users) {
      return data.users;
    } else {
      console.warn('Unexpected users API response structure:', data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

// Get current user from session
const getCurrentUser = () => {
  const userSession = sessionStorage.getItem('userSession');
  return userSession ? JSON.parse(userSession) : null;
};

// Error and warning states
const errors = reactive({
  title: '',
  dueDate: '',
  projectId: '',
  priority: '',
  recurrenceValue: '',
  recurrenceInterval: ''
});

const showSuccessMessage = ref(false);

const formData = reactive({
  title: "",
  description: "",
  priority: null, // Changed to number (1-10)
  status: "",
  projectId: "",
  assigneeIds: [], // Array for multi-select assignees
  dueDate: "",
  tags: [],
  recurring: false,
  recurrenceValue: null,
  recurrenceInterval: ""
});
// Watcher to debug recurring task
watch(() => formData.recurring, (newVal) => {
  console.log('Recurring changed to:', newVal);
});

// Dropdown states
const dropdownStates = reactive({
  priority: false,
  status: false,
  project: false,
  assignees: false,
  recurrenceInterval: false
});

const newTag = ref("");
const showCalendar = ref(false);

// Dynamic data from API
const projects = ref([]);
const users = ref([]);
const loadingStates = reactive({
  projects: false,
  users: false
});

// Existing tags for auto-suggestion (would typically come from API)
const existingTags = ref([
  'Frontend', 'Backend', 'Bug Fix', 'Feature', 'Testing', 'Documentation', 'UI/UX', 'API', 'Database', 'Performance'
]);

const tagSuggestions = ref([]);
const showTagSuggestions = ref(false);

// Validation functions
const validateTitle = () => {
  errors.title = '';
  if (!formData.title.trim()) {
    errors.title = 'Task title is required';
  } else if (formData.title.length > 50) {
    errors.title = 'Task title cannot exceed 50 characters';
  }
};

const validateDueDate = () => {
  errors.dueDate = '';
  if (formData.dueDate.trim()) {
    const inputDate = new Date(formData.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isNaN(inputDate.getTime())) {
      errors.dueDate = 'Please enter a valid date';
    } else if (inputDate < today) {
      errors.dueDate = 'Due date cannot be in the past';
    }
  }
};

const validateProject = () => {
  errors.projectId = '';
  // Skip validation for subtasks if parent project is available
  if (props.parentTaskId && props.parentProject && props.parentProject.id) {
    return;
  }
  if (!formData.projectId) {
    errors.projectId = 'Project is required';
  }
};

const validatePriority = () => {
  errors.priority = '';
  const priority = Number(formData.priority);
  if ((priority && priority < 1) || (priority && priority > 10)) {
    errors.priority = 'Priority must be a number between 1 and 10';
  }
};

const validateRecurrence = () => {
  console.log('Validating recurrence:', formData.recurring, formData.recurrenceValue, formData.recurrenceInterval); // ADD THIS DEBUG LINE
  
  errors.recurrenceValue = '';
  errors.recurrenceInterval = '';
  
  if (formData.recurring) {
    if (!formData.recurrenceValue || formData.recurrenceValue < 1) {
      errors.recurrenceValue = 'Must be at least 1';
    }
    if (!formData.recurrenceInterval) {
      errors.recurrenceInterval = 'Please select an interval';
    }
    if (formData.recurring && !formData.dueDate) {
      errors.dueDate = 'Due date is required for recurring tasks';
    }
  }
};

const getRecurrenceIntervalLabel = () => {
  const labels = {
    days: 'Day(s)',
    weeks: 'Week(s)',
    months: 'Month(s)'
  };
  return formData.recurrenceInterval ? labels[formData.recurrenceInterval] : 'Select interval';
};

const validateForm = () => {
  validateTitle();
  validateDueDate();
  validateProject();
  validatePriority();
  validateRecurrence();
  return !errors.title && !errors.dueDate && !errors.projectId && !errors.priority && !errors.recurrenceValue && !errors.recurrenceInterval;
};

// Dropdown helper functions
const toggleDropdown = (dropdown) => {
  Object.keys(dropdownStates).forEach(key => {
    if (key !== dropdown) dropdownStates[key] = false;
  });
  dropdownStates[dropdown] = !dropdownStates[dropdown];
};

const selectOption = (dropdown, value) => {
  if (dropdown === 'project') {
    formData.projectId = value;
  } else if (dropdown === 'recurrenceInterval') {
    formData.recurrenceInterval = value;
    validateRecurrence();
  } else {
    formData[dropdown] = value;
  }
  dropdownStates[dropdown] = false;
};

const toggleAssignee = (assigneeId) => {
  if (formData.assigneeIds.includes(assigneeId)) {
    formData.assigneeIds = formData.assigneeIds.filter(id => id !== assigneeId);
  } else {
    formData.assigneeIds.push(assigneeId);
  }
};

const getSelectedAssigneeNames = () => {
  return formData.assigneeIds.map(id => {
    const user = users.value.find(u => u.id === id);
    return user ? user.name : '';
  }).filter(name => name).join(', ');
};

// Tag suggestion functions
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

const closeDropdowns = () => {
  Object.keys(dropdownStates).forEach(key => {
    dropdownStates[key] = false;
  });
  showTagSuggestions.value = false;
};

// Placeholder getters
const getStatusOptions = () => {
  const statusMap = { todo: 'To Do', 'in-progress': 'In Progress', review: 'In Review', done: 'Done' };
  return formData.status ? statusMap[formData.status] : 'Select status';
};

const getProjectPlaceholder = () => {
  if (props.parentTaskId && props.parentProject) {
    return props.parentProject.name || 'Parent Project';
  }
  if (loadingStates.projects) return 'Loading projects...';
  const project = projects.value.find(p => p.id === formData.projectId);
  return project ? project.name : 'Select project *';
};

const getAssigneesPlaceholder = () => {
  if (loadingStates.users) return 'Loading users...';
  return formData.assigneeIds.length > 0 ? getSelectedAssigneeNames() : 'Select assignees';
};

// Load data functions
const loadDropdownData = async () => {
  try {
    // Check if user is authenticated
    if (!auth.currentUser) {
      console.log('User not authenticated, skipping data load');
      return;
    }
    
    loadingStates.projects = true;
    loadingStates.users = true;
    
    const [projectsData, usersData] = await Promise.all([
      fetchProjects(),
      fetchUsers()
    ]);
    
    projects.value = projectsData.map(project => ({
      id: project.id,
      name: project.name || project.title || 'Unnamed Project'
    }));
    
    users.value = usersData.map(user => ({
      id: user.uid || user.id,
      name: user.name || 'Unknown User'
    }));
    
  } catch (error) {
    console.error('Error loading dropdown data:', error);
    // Fallback to empty arrays if API fails
    projects.value = [];
    users.value = [];
  } finally {
    loadingStates.projects = false;
    loadingStates.users = false;
  }
};

const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  const currentUser = getCurrentUser();
  if (!currentUser) {
    errors.title = 'User session not found. Please log in again.';
    return;
  }

  try {
    // Clear any previous error messages
    errors.title = '';

    // Debug log to check form data before sending
    console.log('Form data before submit:', {
      recurring: formData.recurring,
      recurrenceInterval: formData.recurrenceInterval,
      recurrenceValue: formData.recurrenceValue
    });
    
    // Map frontend form data to backend API format
    const taskData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      priority: Number(formData.priority) || null,
      status: formData.status || 'todo',
      deadline: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
      assigneeIds: formData.assigneeIds.length > 0 ? formData.assigneeIds : [getCurrentUser()?.uid],
      projectId: formData.projectId,
      createdBy: currentUser.uid || 'default-user',
      tags: formData.tags || [],
      recurring: Boolean(formData.recurring),
      recurrenceInterval: formData.recurring ? formData.recurrenceInterval : null,
      recurrenceValue: formData.recurring ? Number(formData.recurrenceValue) : null,
      ...(props.parentTaskId && { parentTaskId: props.parentTaskId })
    };

    console.log(`Creating ${props.parentTaskId ? 'subtask' : 'task'} with data:`, taskData);
    
    // Call the backend API
    const createdTask = await createTaskAPI(taskData);
    
    console.log(`${props.parentTaskId ? 'Subtask' : 'Task'} created successfully:`, createdTask);
    
    // Show success message
    showSuccessMessage.value = true;
    
    // Emit the created task to parent component
    emit('taskCreated', createdTask);
    
    // Hide success message after 2 seconds and close modal
    setTimeout(() => {
      showSuccessMessage.value = false;
      resetForm();
      emit('close');
    }, 2000);
    
  } catch (error) {
    console.error('Error creating task:', error);
    errors.title = error.message || `Failed to create ${props.parentTaskId ? 'subtask' : 'task'}. Please try again.`;
  }
};

const resetForm = () => {
  Object.assign(formData, {
    title: "",
    description: "",
    priority: null,
    status: "",
    projectId: props.parentTaskId && props.parentProject ? props.parentProject.id : "",
    assigneeIds: [],
    dueDate: "",
    tags: [],
    recurring: false,
    recurrenceValue: null,
    recurrenceInterval: ""
  });
  newTag.value = "";
  showCalendar.value = false;
  errors.title = '';
  errors.dueDate = '';
  errors.projectId = '';
  errors.priority = '';
  errors.recurrenceValue = '';
  errors.recurrenceInterval = ''; 
  closeDropdowns();
};

const addTag = () => {
  if (newTag.value.trim() && !formData.tags.includes(newTag.value.trim())) {
    formData.tags.push(newTag.value.trim());
    newTag.value = "";
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

// Load data when component mounts and user is authenticated
onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadDropdownData();
    }
  });
});

const props = defineProps({
  isOpen: Boolean,
  indvTask: { type: Boolean, default: false },
  parentTaskId: { type: String, default: null },
  parentProject: { type: Object, default: null }
});

// Watch for modal open to reload data if needed
watch(() => props.isOpen, (newVal) => {
  if (newVal && (projects.value.length === 0 || users.value.length === 0)) {
    loadDropdownData();
  }
});

// Watch for parent project changes and auto-populate project field for subtasks
watch(() => props.parentProject, (newParentProject) => {
  if (props.parentTaskId && newParentProject && newParentProject.id) {
    formData.projectId = newParentProject.id;
  }
}, { immediate: true });
</script>

<style scoped>
@import '../../styles/CreateTaskModal.css';

/* Component-specific border overrides */
.border-gray-300 {
  border-color: #d1d5db !important;
  border-width: 1px !important;
}

.border-gray-200 {
  border-color: #e5e7eb !important;
  border-width: 1px !important;
}

/* Ensure all input elements have visible borders */
input, textarea, button[type="button"] {
  border-width: 1px !important;
}

/* Dropdown hover effects */
button:hover .dropdown-option {
  background-color: var(--accent);
  color: var(--accent-foreground);
}

/* Focus ring for better accessibility */
.focus-visible\:ring-1:focus-visible {
  --tw-ring-shadow: 0 0 0 1px var(--ring);
  box-shadow: var(--tw-ring-shadow);
}

/* Dark mode border adjustments */
.dark .border-gray-300 {
  border-color: #6b7280 !important;
}

.dark .border-gray-200 {
  border-color: #4b5563 !important;
}

/* Text truncation for dropdown buttons */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}
</style>