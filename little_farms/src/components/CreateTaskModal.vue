<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" @click="closeDropdowns">
    <div 
      class="create-task-modal fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-gray-200 bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg sm:max-w-[500px]"
      @click.stop
    >
      <div class="flex flex-col space-y-1.5 text-center sm:text-left">
        <h2 class="text-lg font-semibold leading-none tracking-tight">Create New Task</h2>
      </div>
      
      <div v-if="showSuccessMessage" class="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
        <div class="text-sm text-green-800">
          ✓ Task created successfully!
        </div>
      </div>
      
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <label for="title" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Task Title *</label>
            <span class="text-xs text-muted-foreground">{{ formData.title.length }}/50</span>
          </div>
          <input
            id="title"
            v-model="formData.title"
            type="text"
            placeholder="Enter task title..."
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
            <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Priority</label>
            <div class="relative">
              <button
                type="button"
                @click="toggleDropdown('priority')"
                class="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span :class="formData.priority ? 'text-foreground' : 'text-muted-foreground'">
                  {{ getPriorityPlaceholder() }}
                </span>
                <ChevronDown class="h-4 w-4 opacity-50" />
              </button>
              <div 
                v-if="dropdownStates.priority"
                class="absolute top-full left-0 mt-1 z-50 w-full rounded-md border border-gray-300 bg-popover shadow-lg"
              >
                <div class="p-1">
                  <button
                    type="button"
                    @click="selectOption('priority', 'high')"
                    class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                  >
                    High
                  </button>
                  <button
                    type="button"
                    @click="selectOption('priority', 'medium')"
                    class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                  >
                    Medium
                  </button>
                  <button
                    type="button"
                    @click="selectOption('priority', 'low')"
                    class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                  >
                    Low
                  </button>
                </div>
              </div>
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
                  {{ getStatusPlaceholder() }}
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
            <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Project</label>
            <div class="relative">
              <button
                type="button"
                @click="toggleDropdown('project')"
                class="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span :class="formData.project ? 'text-foreground' : 'text-muted-foreground'">
                  {{ getProjectPlaceholder() }}
                </span>
                <ChevronDown class="h-4 w-4 opacity-50" />
              </button>
              <div 
                v-if="dropdownStates.project"
                class="absolute top-full left-0 mt-1 z-50 w-full rounded-md border border-gray-300 bg-popover shadow-lg"
              >
                <div class="p-1">
                  <button
                    type="button"
                    v-for="project in projects" 
                    :key="project.id"
                    @click="selectOption('project', project.id)"
                    class="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                  >
                    {{ project.name }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Assignees</label>
            <div class="relative">
              <button
                type="button"
                @click="toggleDropdown('assignees')"
                class="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-left"
              >
                <span 
                  :class="formData.assignees.length > 0 ? 'text-foreground' : 'text-muted-foreground'"
                  class="truncate"
                >
                  {{ getAssigneePlaceholder() }}
                </span>
                <ChevronDown class="h-4 w-4 opacity-50 flex-shrink-0" />
              </button>
              <div 
                v-if="dropdownStates.assignees"
                class="absolute top-full left-0 mt-1 z-50 w-full rounded-md border border-gray-300 bg-popover shadow-lg max-h-48 overflow-y-auto"
              >
                <div class="p-1">
                  <div
                    v-for="assignee in assignees" 
                    :key="assignee.id"
                    @click="selectAssignee(assignee.id)"
                    class="flex items-center px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer"
                  >
                    <input 
                      type="checkbox" 
                      :checked="formData.assignees.includes(assignee.id)"
                      class="mr-2 rounded border-gray-300"
                      @click.stop
                    />
                    <div class="flex items-center">
                      <div class="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium mr-2">
                        {{ assignee.initials }}
                      </div>
                      {{ assignee.name }}
                    </div>
                  </div>
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
            Create Task
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { CalendarIcon, X, ChevronDown } from 'lucide-vue-next';

defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close', 'createTask']);

// Error and warning states
const errors = reactive({
  title: '',
  dueDate: ''
});

const showSuccessMessage = ref(false);

const formData = reactive({
  title: "",
  description: "",
  priority: "",
  status: "",
  project: "",
  assignees: [], // Changed to array for multi-select
  dueDate: "",
  tags: [],
});

// Dropdown states
const dropdownStates = reactive({
  priority: false,
  status: false,
  project: false,
  assignees: false
});

const newTag = ref("");
const showCalendar = ref(false);

const projects = [
  { id: "website", name: "Website Redesign" },
  { id: "mobile", name: "Mobile App" },
  { id: "marketing", name: "Marketing Campaign" },
];

const assignees = [
  { id: "john-doe", name: "John Doe", initials: "JD" },
  { id: "jane-smith", name: "Jane Smith", initials: "JS" },
  { id: "mike-johnson", name: "Mike Johnson", initials: "MJ" },
];

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

const validateForm = () => {
  validateTitle();
  validateDueDate();
  return !errors.title && !errors.dueDate;
};

// Dropdown helper functions
const toggleDropdown = (dropdown) => {
  Object.keys(dropdownStates).forEach(key => {
    if (key !== dropdown) dropdownStates[key] = false;
  });
  dropdownStates[dropdown] = !dropdownStates[dropdown];
};

const selectOption = (dropdown, value) => {
  formData[dropdown] = value;
  dropdownStates[dropdown] = false;
};

const selectAssignee = (assigneeId) => {
  if (formData.assignees.includes(assigneeId)) {
    formData.assignees = formData.assignees.filter(id => id !== assigneeId);
  } else {
    formData.assignees.push(assigneeId);
  }
};

const getSelectedAssigneeNames = () => {
  return formData.assignees.map(id => {
    const assignee = assignees.find(a => a.id === id);
    return assignee ? assignee.name : '';
  }).join(', ');
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
const getPriorityPlaceholder = () => {
  const priorityMap = { high: 'High', medium: 'Medium', low: 'Low' };
  return formData.priority ? priorityMap[formData.priority] : 'Select priority';
};

const getStatusPlaceholder = () => {
  const statusMap = { todo: 'To Do', 'in-progress': 'In Progress', review: 'In Review', done: 'Done' };
  return formData.status ? statusMap[formData.status] : 'Select status';
};

const getProjectPlaceholder = () => {
  const project = projects.find(p => p.id === formData.project);
  return project ? project.name : 'Select project';
};

const getAssigneePlaceholder = () => {
  return formData.assignees.length > 0 ? getSelectedAssigneeNames() : 'Select assignees';
};

const handleSubmit = () => {
  if (!validateForm()) {
    return;
  }

  const selectedAssignees = assignees.filter(a => formData.assignees.includes(a.id));
  const project = projects.find(p => p.id === formData.project);

  const newTask = {
    id: Date.now().toString(),
    title: formData.title.trim(),
    description: formData.description.trim(),
    status: formData.status || 'To Do',
    priority: formData.priority || 'Medium',
    dueDate: formData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assignees: selectedAssignees.map(a => ({
      id: a.id,
      name: a.name,
      initials: a.initials,
    })),
    // Keep single assignee for backward compatibility
    assignee: selectedAssignees.length > 0 ? {
      name: selectedAssignees[0].name,
      initials: selectedAssignees[0].initials,
    } : {
      name: "Unassigned",
      initials: "UA",
    },
    project: project?.name || "Website Redesign",
    progress: 0,
    comments: 0,
    attachments: 0,
    tags: formData.tags,
  };

  emit('createTask', newTask);
  
  // Show success message
  showSuccessMessage.value = true;
  
  // Hide success message after 2 seconds and close modal
  setTimeout(() => {
    showSuccessMessage.value = false;
    resetForm();
    emit('close');
  }, 2000);
};

const resetForm = () => {
  Object.assign(formData, {
    title: "",
    description: "",
    priority: "",
    status: "",
    project: "",
    assignees: [],
    dueDate: "",
    tags: [],
  });
  newTag.value = "";
  showCalendar.value = false;
  errors.title = '';
  errors.dueDate = '';
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
</script>

<style scoped>
@import '../styles/CreateTaskModal.css';

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
</style>