<template>
  <div v-if="tasks.length === 0" class="flex-1 p-6">
    <div class="flex flex-col items-center justify-center h-96 text-center">
      <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <CheckCircle2 class="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 class="text-lg font-medium mb-2">No tasks found</h3>
      <p class="text-muted-foreground mb-4">
        Get started by creating your first task or adjust your filters.
      </p>
      <button 
        class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
        @click="$emit('createTask')"
      >
        <Plus class="w-4 h-4 mr-2" />
        Create Task
      </button>
    </div>
  </div>

  <div v-else class="flex-1 p-6 space-y-8">
    <!-- Statistics Cards -->
    <div class="grid grid-cols-4 gap-6">
      <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div class="p-6">
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <p class="text-sm font-medium text-muted-foreground">Total Tasks</p>
              <p class="text-3xl font-bold">{{ totalTasks }}</p>
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 class="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div class="p-6">
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <p class="text-sm font-medium text-muted-foreground">In Progress</p>
              <p class="text-3xl font-bold">{{ inProgressTasks }}</p>
            </div>
            <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Clock class="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div class="p-6">
          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <p class="text-sm font-medium text-muted-foreground">Completed</p>
              <p class="text-3xl font-bold">{{ completedTasks }}</p>
            </div>
            <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp class="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div class="p-6">
          <div class="space-y-3">
            <div class="flex justify-between items-center text-sm">
              <span class="font-medium text-muted-foreground">Completion Rate</span>
              <span class="text-lg font-bold">{{ Math.round(completionRate) }}%</span>
            </div>
            <div class="relative w-full overflow-hidden rounded-full bg-secondary h-3">
              <div 
                class="h-full w-full flex-1 bg-primary transition-all rounded-full"
                :style="{ transform: `translateX(-${100 - completionRate}%)` }"
              ></div>
            </div>
            <p v-if="overdueTasks > 0" class="text-xs font-medium text-destructive">
              {{ overdueTasks }} overdue
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Tasks Table -->
    <div class="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div class="flex flex-col space-y-1.5 p-6">
        <div class="flex items-center justify-between">
          <h3 class="text-2xl font-semibold leading-none tracking-tight">All Tasks</h3>
          <button 
            class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
            @click="$emit('createTask')"
          >
            <Plus class="w-4 h-4 mr-2" />
            New Task
          </button>
        </div>
        
        <!-- Search and Filters -->
        <div class="flex flex-col gap-4 mt-6">
          <div class="flex items-center gap-4 flex-wrap">
            <div class="relative flex-1 max-w-md">
              <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tasks..."
                :value="searchQuery"
                @input="$emit('searchChange', $event.target.value)"
                class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-10"
              />
            </div>

            <div class="relative">
              <select 
                :value="statusFilter" 
                @change="$emit('statusFilterChange', $event.target.value)"
                class="flex h-10 w-40 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="all">All Status</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div class="relative">
              <select 
                :value="priorityFilter" 
                @change="$emit('priorityFilterChange', $event.target.value)"
                class="flex h-10 w-40 items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="all">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <button class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-10 px-4">
              <Filter class="w-4 h-4 mr-2" />
              More Filters
            </button>

            <button class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-10 px-4">
              <SortAsc class="w-4 h-4 mr-2" />
              Sort
            </button>
          </div>

          <!-- Active filters -->
          <div class="flex items-center gap-2">
            <span 
              v-if="statusFilter !== 'all'" 
              class="inline-flex items-center rounded-md border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 gap-1"
            >
              Status: {{ statusFilter }}
              <button
                @click="$emit('statusFilterChange', 'all')"
                class="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
              >
                ×
              </button>
            </span>
            <span 
              v-if="priorityFilter !== 'all'" 
              class="inline-flex items-center rounded-md border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 gap-1"
            >
              Priority: {{ priorityFilter }}
              <button
                @click="$emit('priorityFilterChange', 'all')"
                class="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
              >
                ×
              </button>
            </span>
          </div>
        </div>
      </div>
      
      <div class="p-6 pt-0">
        <div class="relative w-full overflow-auto">
          <table class="w-full caption-bottom text-sm">
            <thead class="[&_tr]:border-b">
              <tr class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] w-[300px]">Task</th>
                <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Status</th>
                <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Priority</th>
                <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Project</th>
                <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Assignee</th>
                <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Due Date</th>
                <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Progress</th>
                <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">Activity</th>
                <th class="h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] w-[50px]"></th>
              </tr>
            </thead>
            <tbody class="[&_tr:last-child]:border-0">
              <tr 
                v-for="task in tasks" 
                :key="task.id" 
                class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer"
                @click="$emit('taskClick', task.id)"
              >
                <td class="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                  <div class="space-y-1">
                    <div class="font-medium">{{ task.title }}</div>
                    <div class="text-sm text-muted-foreground line-clamp-1">
                      {{ task.description }}
                    </div>
                    <div v-if="task.tags.length > 0" class="flex flex-wrap gap-1">
                      <span 
                        v-for="tag in task.tags.slice(0, 2)" 
                        :key="tag"
                        class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 px-2 py-0"
                      >
                        {{ tag }}
                      </span>
                      <span 
                        v-if="task.tags.length > 2"
                        class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 px-2 py-0"
                      >
                        +{{ task.tags.length - 2 }}
                      </span>
                    </div>
                  </div>
                </td>
                
                <td class="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                  <div class="flex items-center gap-2">
                    <div :class="['w-2 h-2 rounded-full', getStatusConfig(task.status).color]" />
                    <span class="text-sm">{{ getStatusConfig(task.status).label }}</span>
                  </div>
                </td>
                
                <td class="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                  <span :class="['inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', getPriorityClasses(task.priority)]">
                    <Flag class="w-3 h-3 mr-1" />
                    {{ getPriorityConfig(task.priority).label }}
                  </span>
                </td>
                
                <td class="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                  <span class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                    {{ task.project }}
                  </span>
                </td>
                
                <td class="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                  <div class="flex items-center gap-2">
                    <div class="relative flex h-6 w-6 shrink-0 overflow-hidden rounded-full">
                      <span class="flex h-full w-full items-center justify-center rounded-full bg-muted text-xs">
                        {{ task.assignee.initials }}
                      </span>
                    </div>
                    <span class="text-sm">{{ task.assignee.name }}</span>
                  </div>
                </td>
                
                <td class="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                  <div class="flex items-center gap-1 text-sm">
                    <Calendar class="w-3 h-3" />
                    <span :class="getDateClasses(task)">
                      {{ new Date(task.dueDate).toLocaleDateString() }}
                    </span>
                    <Clock v-if="isTaskOverdue(task)" class="w-3 h-3 text-destructive ml-1" />
                  </div>
                </td>
                
                <td class="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                  <div v-if="task.progress > 0" class="space-y-1">
                    <div class="flex justify-between text-xs">
                      <span>{{ task.progress }}%</span>
                    </div>
                    <div class="relative w-16 overflow-hidden rounded-full bg-secondary h-2">
                      <div 
                        class="h-full w-full flex-1 bg-primary transition-all"
                        :style="{ transform: `translateX(-${100 - task.progress}%)` }"
                      ></div>
                    </div>
                  </div>
                  <span v-else class="text-xs text-muted-foreground">Not started</span>
                </td>
                
                <td class="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                  <div class="flex items-center gap-3 text-xs text-muted-foreground">
                    <div v-if="task.comments > 0" class="flex items-center gap-1">
                      <MessageSquare class="w-3 h-3" />
                      <span>{{ task.comments }}</span>
                    </div>
                    <div v-if="task.attachments > 0" class="flex items-center gap-1">
                      <Paperclip class="w-3 h-3" />
                      <span>{{ task.attachments }}</span>
                    </div>
                  </div>
                </td>
                
                <td class="p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                  <div class="relative">
                    <button 
                      class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 rounded-md gap-1.5 px-3"
                      @click.stop="toggleTaskDropdown(task.id)"
                    >
                      <MoreVertical class="w-4 h-4" />
                    </button>
                    
                    <div 
                      v-if="openDropdown === task.id"
                      class="absolute right-0 top-full mt-1 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md z-50"
                      @click.stop
                    >
                      <div 
                        class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
                        @click="$emit('taskClick', task.id)"
                      >
                        Edit Task
                      </div>
                      <div 
                        class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      >
                        Assign to
                      </div>
                      <div 
                        class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      >
                        Change Status
                      </div>
                      <div 
                        class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground text-destructive cursor-pointer"
                      >
                        Delete Task
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { 
  Plus, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  MoreVertical, 
  Calendar, 
  MessageSquare, 
  Paperclip, 
  Flag,
  Search,
  Filter,
  SortAsc
} from 'lucide-vue-next';

const props = defineProps({
  tasks: Array,
  searchQuery: String,
  statusFilter: String,
  priorityFilter: String
});

defineEmits([
  'taskClick',
  'createTask',
  'searchChange',
  'statusFilterChange',
  'priorityFilterChange'
]);

const openDropdown = ref(null);

// Calculate statistics
const totalTasks = computed(() => props.tasks.length);
const completedTasks = computed(() => props.tasks.filter(task => task.status === "done").length);
const inProgressTasks = computed(() => props.tasks.filter(task => task.status === "in-progress").length);
const overdueTasks = computed(() => 
  props.tasks.filter(task => 
    new Date(task.dueDate) < new Date() && task.status !== "done"
  ).length
);
const completionRate = computed(() => 
  totalTasks.value > 0 ? (completedTasks.value / totalTasks.value) * 100 : 0
);

const statusConfig = {
  todo: { label: "To Do", color: "bg-gray-500" },
  "in-progress": { label: "In Progress", color: "bg-blue-500" },
  review: { label: "In Review", color: "bg-yellow-500" },
  done: { label: "Done", color: "bg-green-500" },
};

const priorityConfig = {
  high: { label: "High", variant: "destructive" },
  medium: { label: "Medium", variant: "secondary" },
  low: { label: "Low", variant: "outline" },
};

const getStatusConfig = (status) => statusConfig[status];
const getPriorityConfig = (priority) => priorityConfig[priority];

const getPriorityClasses = (priority) => {
  const variant = getPriorityConfig(priority).variant;
  switch (variant) {
    case 'destructive':
      return 'bg-destructive text-destructive-foreground border-destructive';
    case 'secondary':
      return 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-transparent';
    case 'outline':
      return 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground';
    default:
      return 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-transparent';
  }
};

const isTaskOverdue = (task) => 
  new Date(task.dueDate) < new Date() && task.status !== "done";

const isTaskDueSoon = (task) => 
  new Date(task.dueDate) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) && 
  new Date(task.dueDate) > new Date() && task.status !== "done";

const getDateClasses = (task) => {
  if (isTaskOverdue(task)) return 'text-destructive';
  if (isTaskDueSoon(task)) return 'text-yellow-600';
  return '';
};

const toggleTaskDropdown = (taskId) => {
  openDropdown.value = openDropdown.value === taskId ? null : taskId;
};
</script>