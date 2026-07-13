/**
 * Tracks which queue job IDs are currently being polled by the compose page.
 * BackgroundTaskManager uses this to avoid duplicate polling for the same jobs.
 */
const _active = new Set<string>();

export const pollRegistry = {
  register(ids: string[]) {
    ids.forEach(id => _active.add(id));
  },
  unregister(ids: string[]) {
    ids.forEach(id => _active.delete(id));
  },
  isActive(id: string): boolean {
    return _active.has(id);
  },
};
