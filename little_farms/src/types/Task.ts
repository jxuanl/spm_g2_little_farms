export interface Task {
    id: string;
    title: string;
    description: string;
    status: "todo" | "in-progress" | "review" | "done";
    priority: "high" | "medium" | "low";
    dueDate: string;
    assignee: {
      name: string;
      avatar?: string;
      initials: string;
    };
    project: string;
    progress: number;
    comments: number;
    attachments: number;
    tags: string[];
  }