<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
    <div class="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg sm:max-w-[500px]">
      <div class="flex flex-col space-y-1.5 text-center sm:text-left">
        <h2 class="text-lg font-semibold leading-none tracking-tight">Create New Task</h2>
      </div>
      
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="space-y-2">
          <label for="title" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Task Title *</label>
          <input
            id="title"
            v-model="formData.title"
            type="text"
            placeholder="Enter task title..."
            required
            class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div class="space-y-2">
          <label for="description" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Description</label>
          <textarea
            id="description"
            v-model="formData.description"
            placeholder="Describe the task..."
            rows="3"
            class="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Priority</label>
            <select 
              v-model="formData.priority"
              class="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Status</label>
            <select 
              v-model="formData.status"
              class="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="review">In Review</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Project</label>
            <select 
              v-model="formData.project"
              class="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Assignee</label>
            <select 
              v-model="formData.assignee"
              class="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option v-for="assignee in assignees" :key="assignee.id" :value="assignee.id">
                {{ assignee.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Due Date</label>
          <div class="relative">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full justify-start"
              @click="showCalendar = !showCalendar"
            >
              <CalendarIcon class="mr-2 h-4 w-4" />
              {{ formData.dueDate ? new Date(formData.dueDate).toLocaleDateString() : "Select date" }}
            </button>
            
            <div 
              v-if="showCalendar"
              class="absolute top-full left-0 mt-1 z-50 w-auto p-0 border bg-popover text-popover-foreground shadow-md rounded-md p-3"
            >
              <input
                v-model="formData.dueDate"
                type="date"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                @change="showCalendar = false"
              />
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Tags</label>
          <div class="flex gap-2">
            <input
              v-model="newTag"
              type="text"
              placeholder="Add tag..."
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              @keypress.enter.prevent="addTag"
            />
            <button
              type="button"
              @click="addTag"
              class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            >
              Add
            </button>
          </div>
          
          <div v-if="formData.tags.length > 0" class="flex flex-wrap gap-2">
            <span 
              v-for="tag in formData.tags" 
              :key="tag"
              class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 gap-1"
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
            class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            @click="$emit('close')"
          >
            Cancel
          </button>
          <button 
            type="submit"
            class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
          >
            Create Task
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { CalendarIcon, X } from 'lucide-vue-next';
import type { Task } from '../types/Task';

interface Props {
  isOpen: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  close: [];
  createTask: [task: Task];
}>();

const formData = reactive({
  title: "",
  description: "",
  priority: "medium" as Task['priority'],
  status: "todo" as Task['status'],
  project: "website",
  assignee: "john-doe",
  dueDate: "",
  tags: [] as string[],
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

const handleSubmit = () => {
  if (!formData.title.trim()) return;

  const assignee = assignees.find(a => a.id === formData.assignee);
  const project = projects.find(p => p.id === formData.project);

  const newTask: Task = {
    id: Date.now().toString(),
    title: formData.title,
    description: formData.description,
    status: formData.status,
    priority: formData.priority,
    dueDate: formData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assignee: {
      name: assignee?.name || "John Doe",
      initials: assignee?.initials || "JD",
    },
    project: project?.name || "Website Redesign",
    progress: 0,
    comments: 0,
    attachments: 0,
    tags: formData.tags,
  };

  emit('createTask', newTask);
  
  // Reset form
  Object.assign(formData, {
    title: "",
    description: "",
    priority: "medium" as Task['priority'],
    status: "todo" as Task['status'],
    project: "website",
    assignee: "john-doe",
    dueDate: "",
    tags: [],
  });
  newTag.value = "";
  showCalendar.value = false;
  emit('close');
};

const addTag = () => {
  if (newTag.value.trim() && !formData.tags.includes(newTag.value.trim())) {
    formData.tags.push(newTag.value.trim());
    newTag.value = "";
  }
};

const removeTag = (tagToRemove: string) => {
  const index = formData.tags.indexOf(tagToRemove);
  if (index > -1) {
    formData.tags.splice(index, 1);
  }
};
</script>