'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  EMPTY_STATE,
  loadState,
  loadWorkspacePref,
  saveState,
  saveWorkspacePref,
  WORKSPACES,
} from '@/lib/lucky-spin/storage';
import { SpinState } from '@/types/lucky-spin';

export function useLuckySpin() {
  const [workspaceId, setWorkspaceId] = useState(WORKSPACES[0].id);
  const [state, setState] = useState<SpinState>(EMPTY_STATE);
  // localStorage chỉ đọc được sau khi mount; đọc ngay lúc khởi tạo state sẽ lệch với HTML server dựng.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const ws = loadWorkspacePref();
    setWorkspaceId(ws);
    setState(loadState(ws));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!saveState(workspaceId, state)) {
      toast.error('Không lưu được dữ liệu vòng quay vào trình duyệt.');
    }
  }, [hydrated, workspaceId, state]);

  const switchWorkspace = useCallback((id: string) => {
    saveWorkspacePref(id);
    setWorkspaceId(id);
    setState(loadState(id));
  }, []);

  const patchState = useCallback((patch: (prev: SpinState) => Partial<SpinState>) => {
    setState((prev) => ({ ...prev, ...patch(prev) }));
  }, []);

  const winCountFor = useCallback(
    (memberId: string) => state.history.filter((h) => h.memberId === memberId).length,
    [state.history],
  );

  const giftCountFor = useCallback(
    (memberId: string) => state.giftHistory.filter((h) => h.memberId === memberId).length,
    [state.giftHistory],
  );

  const teamIndexByName = useMemo(() => {
    const map = new Map<string, number>();
    state.teams.forEach((t, i) => map.set(t.name, i));
    return map;
  }, [state.teams]);

  return {
    workspaceId,
    switchWorkspace,
    state,
    patchState,
    hydrated,
    winCountFor,
    giftCountFor,
    teamIndexByName,
  };
}

export type LuckySpinStore = ReturnType<typeof useLuckySpin>;
