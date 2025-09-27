<template>
  <div class="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
    <div class="flex flex-col space-y-1.5 p-6 pb-3">
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-2">
          <div :class="['w-2 h-2 rounded-full', status.color]" />
          <span class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
            {{ task.project }}
          </span>
          <span :class="['inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', priorityClasses]">
            <Flag class="w-3 h-3 mr-1" />
            {{ priority.label }}
          </span>
        </div>
        
        <div class="relative">
          <button 
            class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 rounded-md gap-1.5 px-3 opacity-0 group-hover:opacity-100 transition-opacity"
            @click.stop="showDropdown = !showDropdown"
          >
            <MoreVertical class="w-4 h-4" />
          </button>
          
          <div 
            v-if="showDropdown"
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
      </div>
    </div>

    <div class="p-6 pt-0" @click="$emit('taskClick', task.id)">
      <div class="space-y-3">
        <div>
          <h3 class="font-medium line-clamp-2">{{ task.title }}</h3>
          <p class="text-sm text-muted-foreground line-clamp-2 mt-1">
            {{ task.description }}
          </p>
        </div>

        <div v-if="task.progress > 0" class="space-y-1">
          <div class="flex justify-between text-xs">
            <span class="text-muted-foreground">Progress</span>
            <span>{{ task.progress }}%</span>
          </div>
          <div class="relative w-full overflow-hidden rounded-full bg-secondary h-2">
            <div 
              class="h-full w-full flex-1 bg-primary transition-all"
              :style="{ transform: `translateX(-${100 - task.progress}%)` }"
            />
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4 text-xs text-muted-foreground">
            <div class="flex items-center gap-1">
              <Calendar class="w-3 h-3" />
              <span :class="dateClasses">
                {{ formattedDueDate }}
              </span>
              <Clock v-if="isOverdue" class="w-3 h-3 text-destructive ml-1" />
            </div>
            
            <div v-if="task.comments > 0" class="flex items-center gap-1">
              <MessageSquare class="w-3 h-3" />
              <span>{{ task.comments }}</span>
            </div>
            
            <div v-if="task.attachments > 0" class="flex items-center gap-1">
              <Paperclip class="w-3 h-3" />
              <span>{{ task.attachments }}</span>
            </div>
          </div>

          <div class="relative flex h-7 w-7 shrink-0 overflow-hidden rounded-full">
            <span class="flex h-full w-full items-center justify-center rounded-full bg-muted text-xs">
              {{ task.assignee.initials }}
            </span>
          </div>
        </div>

        <div v-if="task.tags.length > 0" class="flex flex-wrap gap-1">
          <span 
            v-for="(tag, index) in visibleTags" 
            :key="tag"
            class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 px-2 py-0"
          >
            {{ tag }}
          </span>
          <span 
            v-if="task.tags.length > 3"
            class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 px-2 py-0"
          >
            +{{ task.tags.length - 3 }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  Calendar, 
  MessageSquare, 
  Paperclip, 
  MoreVertical,
  Clock,
  Flag
} from 'lucide-vue-next';
import type { Task } from '../types/Task';

interface Props {
  task: Task;
}

const props = defineProps<Props>();

defineEmits<{
  taskClick: [taskId: string];
}>();

const showDropdown = ref(false);

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

const status = computed(() => statusConfig[props.task.status]);
const priority = computed(() => priorityConfig[props.task.priority]);

const priorityClasses = computed(() => {
  const variant = priority.value.variant;
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
});

const isOverdue = computed(() => 
  new Date(props.task.dueDate) < new Date() && props.task.status !== "done"
);

const isDueSoon = computed(() => 
  new Date(props.task.dueDate) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) && 
  new Date(props.task.dueDate) > new Date() && props.task.status !== "done"
);

const dateClasses = computed(() => {
  if (isOverdue.value) return 'text-destructive';
  if (isDueSoon.value) return 'text-yellow-600';
  return '';
});

const formattedDueDate = computed(() => 
  new Date(props.task.dueDate).toLocaleDateString()
);

const visibleTags = computed(() => 
  props.task.tags.slice(0, 3)
);
</script>