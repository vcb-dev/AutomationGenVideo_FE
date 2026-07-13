import { create } from 'zustand';

export interface BackgroundTask {
  id: string;
  name: string;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  message?: string;
  type: 'post' | 'upload';
}

interface TaskState {
  tasks: BackgroundTask[];
  addTask: (task: BackgroundTask) => void;
  updateTask: (id: string, updates: Partial<BackgroundTask>) => void;
  removeTask: (id: string) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    })),
}));
