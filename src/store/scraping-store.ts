import { create } from 'zustand';

export interface ScrapeNotification {
  id: string;
  platform: 'tiktok' | 'instagram' | 'facebook' | 'xiaohongshu' | 'douyin';
  label: string;
  status: 'scraping' | 'done' | 'error';
  startedAt: Date;
  completedAt?: Date;
  newCount?: number;
}

interface ScrapingStore {
  notifications: ScrapeNotification[];
  addNotification: (n: Omit<ScrapeNotification, 'id'>) => string;
  updateNotification: (id: string, patch: Partial<ScrapeNotification>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useScrapingStore = create<ScrapingStore>((set) => ({
  notifications: [],

  addNotification: (n) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set(s => ({ notifications: [{ ...n, id }, ...s.notifications] }));
    return id;
  },

  updateNotification: (id, patch) =>
    set(s => ({
      notifications: s.notifications.map(n => n.id === id ? { ...n, ...patch } : n),
    })),

  removeNotification: (id) =>
    set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })),

  clearAll: () => set({ notifications: [] }),
}));
