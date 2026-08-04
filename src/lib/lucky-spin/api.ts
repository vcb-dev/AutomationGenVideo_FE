import { apiClient } from '@/lib/api-client';
import { HistoryTabId, SpinMode, SpinRoundView, SpinState, Workspace } from '@/types/lucky-spin';

/**
 * Lớp gọi API vòng quay.
 *
 * Dữ liệu nằm trên server và dùng chung toàn công ty, nên mọi thao tác đều là một request
 * nhỏ thay vì ghi đè cả bộ state — hai người thao tác cùng lúc không đè mất việc của nhau.
 */

const BASE = '/lucky-spin';

/** Lấy câu báo lỗi BE trả về thay vì để lộ "Request failed with status code 400". */
export function apiErrorMessage(err: any, fallback: string): string {
  const raw = err?.response?.data?.message;
  if (Array.isArray(raw)) return raw[0] ?? fallback;
  return typeof raw === 'string' ? raw : fallback;
}

export async function fetchWorkspaces(): Promise<Workspace[]> {
  const { data } = await apiClient.get<Workspace[]>(`${BASE}/workspaces`);
  return data;
}

export async function fetchState(workspace: string): Promise<SpinState> {
  const { data } = await apiClient.get<SpinState>(`${BASE}/${workspace}/state`);
  return data;
}

/* ───────────────────────────── Teams ───────────────────────────── */

export function createTeam(workspace: string, name: string) {
  return apiClient.post(`${BASE}/${workspace}/teams`, { name });
}

export function deleteTeam(workspace: string, teamId: string) {
  return apiClient.delete(`${BASE}/${workspace}/teams/${teamId}`);
}

/* ──────────────────────────── Members ──────────────────────────── */

export function createMember(workspace: string, name: string, teamId: string) {
  return apiClient.post(`${BASE}/${workspace}/members`, { name, teamId });
}

export function bulkCreateMembers(workspace: string, members: { name: string; teamName: string }[]) {
  return apiClient.post<{ createdMembers: number; createdTeams: number }>(`${BASE}/${workspace}/members/bulk`, {
    members,
  });
}

export function updateMember(workspace: string, memberId: string, patch: { name?: string; teamId?: string }) {
  return apiClient.patch(`${BASE}/${workspace}/members/${memberId}`, patch);
}

export function deleteMember(workspace: string, memberId: string) {
  return apiClient.delete(`${BASE}/${workspace}/members/${memberId}`);
}

/* ───────────────────────────── Gifts ───────────────────────────── */

export function createGift(workspace: string, name: string, total: number) {
  return apiClient.post(`${BASE}/${workspace}/gifts`, { name, total });
}

export function bulkCreateGifts(workspace: string, gifts: { name: string; total: number }[]) {
  return apiClient.post<{ createdGifts: number }>(`${BASE}/${workspace}/gifts/bulk`, { gifts });
}

export function updateGift(
  workspace: string,
  giftId: string,
  patch: { name?: string; total?: number; remaining?: number },
) {
  return apiClient.patch(`${BASE}/${workspace}/gifts/${giftId}`, patch);
}

export function deleteGift(workspace: string, giftId: string) {
  return apiClient.delete(`${BASE}/${workspace}/gifts/${giftId}`);
}

/* ─────────────────────── Kết quả quay ──────────────────────────── */

export function recordMemberWin(workspace: string, memberId: string, removeFromPool: boolean) {
  return apiClient.post(`${BASE}/${workspace}/wins/member`, { memberId, removeFromPool });
}

export function recordTeamWin(workspace: string, teamId: string, removeFromPool: boolean) {
  return apiClient.post(`${BASE}/${workspace}/wins/team`, { teamId, removeFromPool });
}

export function awardGift(
  workspace: string,
  giftId: string,
  recipientType: 'member' | 'team',
  recipientId: string,
) {
  return apiClient.post(`${BASE}/${workspace}/gift-awards`, { giftId, recipientType, recipientId });
}

/* ──────────────────────────── Đặt lại ──────────────────────────── */

export function resetStatuses(workspace: string, mode: SpinMode) {
  return apiClient.post(`${BASE}/${workspace}/reset-statuses`, { mode });
}

export function resetGifts(workspace: string) {
  return apiClient.post(`${BASE}/${workspace}/reset-gifts`);
}

/* ──────────────────────────── Lịch sử ──────────────────────────── */

export function deleteHistoryEntry(workspace: string, kind: HistoryTabId, id: string) {
  return apiClient.delete(`${BASE}/${workspace}/history/${kind}/${id}`);
}

export function clearHistory(workspace: string, kind: HistoryTabId) {
  return apiClient.delete(`${BASE}/${workspace}/history/${kind}`);
}

/** Toàn bộ lịch sử một loại — chỉ gọi khi xuất file, không dùng cho màn hình. */
export async function fetchFullHistory<T>(workspace: string, kind: HistoryTabId): Promise<T[]> {
  const { data } = await apiClient.get<T[]>(`${BASE}/${workspace}/history/${kind}`);
  return data;
}

/* ────────────────────────── Lượt quay ──────────────────────────── */

export async function drawRound(
  workspace: string,
  body: {
    kind: 'member' | 'team' | 'gift';
    count?: number;
    scopeTeamId?: string;
    recipientId?: string;
    recipientType?: 'member' | 'team';
  },
): Promise<SpinRoundView> {
  const { data } = await apiClient.post<SpinRoundView>(`${BASE}/${workspace}/rounds/draw`, body);
  return data;
}

export function confirmRound(workspace: string, roundId: string, removeFromPool: boolean) {
  return apiClient.post(`${BASE}/${workspace}/rounds/${roundId}/confirm`, { removeFromPool });
}

export function cancelRound(workspace: string, roundId: string) {
  return apiClient.post(`${BASE}/${workspace}/rounds/${roundId}/cancel`);
}

/* ─────────────────────── Khóa điều khiển ───────────────────────── */

export function claimControl(workspace: string, force = false) {
  return apiClient.post(`${BASE}/${workspace}/control/claim`, { force });
}

export function releaseControl(workspace: string) {
  return apiClient.post(`${BASE}/${workspace}/control/release`);
}
