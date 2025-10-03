<template>
  <div class="flex-1 overflow-y-auto p-4">
    <table class="w-full border-collapse">
      <thead>
        <tr class="text-left text-sm text-muted-foreground">
          <th class="p-2">Task</th>
          <th class="p-2">Project</th>
          <th class="p-2">Assignee</th>
          <th class="p-2">Status</th>
          <th class="p-2">Priority</th>
          <th class="p-2">Due Date</th>
          <th class="p-2">Tags</th>
          <th class="p-2"></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="task in tasks"
          :key="task.id"
          class="border-b hover:bg-muted/50"
        >
          <!-- Title -->
          <td class="p-2 align-middle">{{ task.title || "Untitled Task" }}</td>

          <!-- Project -->
          <td class="p-2 align-middle">{{ task.project || "No project" }}</td>

          <!-- Assignee -->
          <td class="p-2 align-middle">
            <div v-if="task.assignee" class="flex items-center gap-2">
              <div class="relative flex h-6 w-6 shrink-0 overflow-hidden rounded-full">
                <span class="flex h-full w-full items-center justify-center rounded-full bg-muted text-xs">
                  {{ task.assignee.initials || task.assignee.name?.charAt(0) }}
                </span>
              </div>
              <span class="text-sm">{{ task.assignee.name }}</span>
            </div>
            <span v-else class="text-xs text-muted-foreground">Unassigned</span>
          </td>

          <!-- Status -->
          <td class="p-2 align-middle">
            <span class="text-sm">{{ task.status || "todo" }}</span>
          </td>

          <!-- Priority -->
          <td class="p-2 align-middle">
            <span class="text-sm capitalize">{{ task.priority || "low" }}</span>
          </td>

          <!-- Due Date -->
          <td class="p-2 align-middle">
            <div v-if="task.dueDate" class="flex items-center gap-1 text-sm">
              <Calendar class="w-3 h-3" />
              <span>{{ new Date(task.dueDate).toLocaleDateString() }}</span>
            </div>
            <span v-else class="text-xs text-muted-foreground">No due date</span>
          </td>

          <!-- Tags -->
          <td class="p-2 align-middle">
            <div v-if="Array.isArray(task.tags) && task.tags.length > 0" class="flex flex-wrap gap-1">
              <span v-for="tag in task.tags.slice(0, 2)" :key="tag" class="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs">
                {{ tag }}
              </span>
              <span v-if="task.tags.length > 2" class="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs">
                +{{ task.tags.length - 2 }}
              </span>
            </div>
            <span v-else class="text-xs text-muted-foreground">No tags</span>
          </td>

          <!-- Dropdown -->
          <td class="p-2 align-middle text-right">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" class="h-8 w-8 p-0">
                  <span class="sr-only">Open menu</span>
                  <MoreHorizontal class="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <!-- Edit only if creator -->
                <div
                  v-if="task.taskCreatedBy === currentUserId"
                  class="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  @click="$emit('taskClick', task.id)"
                >
                  Edit Task
                </div>

                <!-- Assign to (anyone) -->
                <div
                  class="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  Assign to
                </div>

                <!-- Change status (anyone) -->
                <div
                  class="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  Change Status
                </div>

                <!-- Delete only if creator -->
                <div
                  v-if="task.taskCreatedBy === currentUserId"
                  class="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-destructive"
                >
                  Delete Task
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';
import { Calendar, MoreHorizontal } from "lucide-vue-next";
// import { Button } from "@/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuTrigger,
//   DropdownMenuContent
// } from "@/components/ui/dropdown-menu";

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  searchQuery: String,
  statusFilter: String,
  priorityFilter: String,
  currentUserId: String
});
</script>

