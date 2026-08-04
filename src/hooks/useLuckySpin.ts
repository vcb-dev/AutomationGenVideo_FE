'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import * as api from '@/lib/lucky-spin/api';
import { HistoryTabId, SpinMode, SpinState } from '@/types/lucky-spin';

/** Vòng quay chạy trực tiếp trước khán giả nên màn hình mọi người phải bám sát dữ liệu server. */
const POLL_INTERVAL_MS = 5000;

/** Gia hạn khóa trong lúc MC nói chuyện giữa hai lượt quay, ngắn hơn hạn 3 phút của server. */
const CONTROL_HEARTBEAT_MS = 60_000;

/**
 * Ngừng gia hạn khóa sau ngần này không thao tác.
 *
 * Nếu cứ gia hạn vô hạn theo tab đang mở thì một tab bị quên sẽ khóa vòng quay của cả công ty
 * cả ngày. Quá mốc này (hoặc khi tab bị ẩn) thì để khóa tự hết hạn, ai cần thì dùng.
 */
const CONTROL_IDLE_LIMIT_MS = 15 * 60_000;

const EMPTY_STATE: SpinState = {
  control: { controllerId: null, controllerName: null, expiresAt: null },
  historyCounts: { members: 0, teams: 0, gifts: 0 },
  historyLimit: 100,
  activeRound: null,
  teams: [],
  members: [],
  history: [],
  teamHistory: [],
  gifts: [],
  giftHistory: [],
};

export const LUCKY_SPIN_KEY = {
  workspaces: ['lucky-spin', 'workspaces'] as const,
  state: (workspace: string) => ['lucky-spin', 'state', workspace] as const,
};

export function useLuckySpin() {
  const queryClient = useQueryClient();
  const [workspaceId, setWorkspaceId] = useState<string>('');

  const workspacesQuery = useQuery({
    queryKey: LUCKY_SPIN_KEY.workspaces,
    queryFn: api.fetchWorkspaces,
    staleTime: Infinity, // danh sách vòng quay cố định trong code BE, không đổi lúc chạy
  });

  const workspaces = useMemo(() => workspacesQuery.data ?? [], [workspacesQuery.data]);
  const activeWorkspace = workspaceId || workspaces[0]?.id || '';

  // Trong lúc bánh xe đang quay, dữ liệu mới về sẽ vẽ lại vòng quay giữa chừng và mũi tên dừng
  // sai ô — tạm ngưng poll cho tới khi quay xong.
  const [pollPaused, setPollPaused] = useState(false);

  const stateQuery = useQuery({
    queryKey: LUCKY_SPIN_KEY.state(activeWorkspace),
    queryFn: () => api.fetchState(activeWorkspace),
    enabled: !!activeWorkspace,
    refetchInterval: pollPaused ? false : POLL_INTERVAL_MS,
    refetchOnWindowFocus: !pollPaused,
    placeholderData: (prev) => prev, // đổi vòng quay không nháy trắng màn hình
  });

  const state = stateQuery.data ?? EMPTY_STATE;

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: LUCKY_SPIN_KEY.state(activeWorkspace) }),
    [queryClient, activeWorkspace],
  );

  /** Mốc thao tác thật gần nhất — quyết định có còn gia hạn khóa hay không. */
  const lastActionAtRef = useRef(Date.now());

  /** Mọi thao tác ghi đều nạp lại state ngay, không đợi tới nhịp poll kế tiếp. */
  const mutation = useMutation({
    mutationFn: (run: () => Promise<unknown>) => run(),
    onSuccess: () => {
      lastActionAtRef.current = Date.now();
      return invalidate();
    },
  });

  const run = useCallback(
    (fn: () => Promise<unknown>) => mutation.mutateAsync(fn),
    [mutation],
  );

  const actions = useMemo(
    () => ({
      addTeam: (name: string) => run(() => api.createTeam(activeWorkspace, name)),
      removeTeam: (teamId: string) => run(() => api.deleteTeam(activeWorkspace, teamId)),

      addMember: (name: string, teamId: string) => run(() => api.createMember(activeWorkspace, name, teamId)),
      bulkAddMembers: (members: { name: string; teamName: string }[]) =>
        mutation.mutateAsync(() => api.bulkCreateMembers(activeWorkspace, members)),
      editMember: (memberId: string, patch: { name?: string; teamId?: string }) =>
        run(() => api.updateMember(activeWorkspace, memberId, patch)),
      removeMember: (memberId: string) => run(() => api.deleteMember(activeWorkspace, memberId)),

      addGift: (name: string, total: number) => run(() => api.createGift(activeWorkspace, name, total)),
      bulkAddGifts: (gifts: { name: string; total: number }[]) =>
        mutation.mutateAsync(() => api.bulkCreateGifts(activeWorkspace, gifts)),
      editGift: (giftId: string, patch: { name?: string; total?: number; remaining?: number }) =>
        run(() => api.updateGift(activeWorkspace, giftId, patch)),
      removeGift: (giftId: string) => run(() => api.deleteGift(activeWorkspace, giftId)),

      recordMemberWin: (memberId: string, removeFromPool: boolean) =>
        run(() => api.recordMemberWin(activeWorkspace, memberId, removeFromPool)),
      recordTeamWin: (teamId: string, removeFromPool: boolean) =>
        run(() => api.recordTeamWin(activeWorkspace, teamId, removeFromPool)),
      awardGift: (giftId: string, recipientType: 'member' | 'team', recipientId: string) =>
        run(() => api.awardGift(activeWorkspace, giftId, recipientType, recipientId)),

      drawRound: (body: Parameters<typeof api.drawRound>[1]) => api.drawRound(activeWorkspace, body),
      confirmRound: (roundId: string, removeFromPool: boolean) =>
        run(() => api.confirmRound(activeWorkspace, roundId, removeFromPool)),
      cancelRound: (roundId: string) => run(() => api.cancelRound(activeWorkspace, roundId)),

      resetStatuses: (mode: SpinMode) => run(() => api.resetStatuses(activeWorkspace, mode)),
      resetGifts: () => run(() => api.resetGifts(activeWorkspace)),

      deleteHistoryEntry: (kind: HistoryTabId, id: string) =>
        run(() => api.deleteHistoryEntry(activeWorkspace, kind, id)),
      clearHistory: (kind: HistoryTabId) => run(() => api.clearHistory(activeWorkspace, kind)),
      /** Lấy đủ lịch sử để xuất file — bảng trên màn hình chỉ giữ phần gần nhất. */
      fetchFullHistory: <T,>(kind: HistoryTabId) => api.fetchFullHistory<T>(activeWorkspace, kind),
    }),
    [run, mutation, activeWorkspace],
  );

  const currentUserId = useAuthStore((st) => st.user?.id);
  const control = state.control;
  /** Khóa đang trống cũng cho thao tác: dùng một mình thì không phải bấm thêm nút nào. */
  const canControl = !control.controllerId || control.controllerId === currentUserId;
  const isController = !!control.controllerId && control.controllerId === currentUserId;

  // Giữ khóa sống giữa hai lượt quay, nhưng chỉ khi người dùng thật sự còn ở đó: tab đang hiện
  // và vừa thao tác trong vòng 15 phút. Tab bị quên sẽ tự nhả khóa sau khi server hết hạn.
  useEffect(() => {
    if (!isController || !activeWorkspace) return;
    const timer = setInterval(() => {
      const idle = Date.now() - lastActionAtRef.current > CONTROL_IDLE_LIMIT_MS;
      if (document.hidden || idle) return;
      api.claimControl(activeWorkspace).catch(() => undefined);
    }, CONTROL_HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [isController, activeWorkspace]);

  const takeControl = useCallback(
    async (force = false) => {
      await api.claimControl(activeWorkspace, force);
      lastActionAtRef.current = Date.now();
      await invalidate();
    },
    [activeWorkspace, invalidate],
  );

  const releaseControl = useCallback(async () => {
    await api.releaseControl(activeWorkspace);
    await invalidate();
  }, [activeWorkspace, invalidate]);

  const winCountFor = useCallback(
    (memberId: string) => state.history.filter((h) => h.memberId === memberId).length,
    [state.history],
  );

  const giftCountFor = useCallback(
    (memberId: string) => state.giftHistory.filter((h) => h.memberId === memberId).length,
    [state.giftHistory],
  );

  return {
    workspaces,
    workspaceId: activeWorkspace,
    switchWorkspace: setWorkspaceId,
    state,
    actions,
    control,
    canControl,
    isController,
    takeControl,
    releaseControl,
    /** Chỉ true ở lần tải đầu; các nhịp poll sau không được làm trắng màn hình. */
    isLoading: workspacesQuery.isLoading || (stateQuery.isLoading && !stateQuery.data),
    isSaving: mutation.isPending,
    setPollPaused,
    error: workspacesQuery.error ?? stateQuery.error,
    winCountFor,
    giftCountFor,
  };
}

export type LuckySpinStore = ReturnType<typeof useLuckySpin>;
