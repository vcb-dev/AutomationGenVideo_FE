import { SpinState, Workspace } from '@/types/lucky-spin';

export const WORKSPACES: Workspace[] = [
  { id: 'seci', name: 'SECI' },
  { id: 'tridao', name: 'Tri Đạo' },
];

const PREFIX = 'vcbi_lucky_spin_';
/** Prefix của app desktop "Vòng quay thành viên" — đọc lại để không mất dữ liệu cũ trên cùng trình duyệt. */
const LEGACY_PREFIX = 'vqtv_';

const STATE_KEYS = ['teams', 'members', 'history', 'teamHistory', 'gifts', 'giftHistory'] as const;
type StateKey = (typeof STATE_KEYS)[number];

export const EMPTY_STATE: SpinState = {
  teams: [],
  members: [],
  history: [],
  teamHistory: [],
  gifts: [],
  giftHistory: [],
};

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function readRaw(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const own = localStorage.getItem(PREFIX + key);
    if (own !== null) return own;
    return localStorage.getItem(LEGACY_PREFIX + key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    // Quota hết hoặc trình duyệt chặn — bỏ qua, phía gọi đã báo toast.
  }
}

function wsKey(workspaceId: string, key: StateKey): string {
  return `${workspaceId}__${key}`;
}

export function loadWorkspacePref(): string {
  const saved = readRaw('currentWorkspace');
  return WORKSPACES.some((w) => w.id === saved) ? (saved as string) : WORKSPACES[0].id;
}

export function saveWorkspacePref(workspaceId: string) {
  writeRaw('currentWorkspace', workspaceId);
}

export function loadState(workspaceId: string): SpinState {
  // Mảng mới hoàn toàn, không dùng lại mảng của EMPTY_STATE — hai workspace mà chung một mảng
  // thì sửa bên này lộ sang bên kia.
  const next: SpinState = { teams: [], members: [], history: [], teamHistory: [], gifts: [], giftHistory: [] };
  for (const key of STATE_KEYS) {
    const raw = readRaw(wsKey(workspaceId, key));
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) (next as any)[key] = parsed;
    } catch {
      // Dữ liệu hỏng — giữ mảng rỗng.
    }
  }
  return next;
}

export function saveState(workspaceId: string, state: SpinState): boolean {
  if (typeof window === 'undefined') return false;
  try {
    for (const key of STATE_KEYS) {
      localStorage.setItem(PREFIX + wsKey(workspaceId, key), JSON.stringify(state[key]));
    }
    return true;
  } catch {
    return false;
  }
}
