import { uid } from '@/lib/lucky-spin/storage';
import { Gift, SpinState, WheelSegment } from '@/types/lucky-spin';

/**
 * Ghi kết quả một lượt quay vào lịch sử.
 *
 * Trả về phần state cần đổi (đưa thẳng vào patchState) thay vì tự sửa state, để mọi thay đổi
 * của một lượt quay xảy ra trong đúng một lần cập nhật — lịch sử và trạng thái người trúng
 * không bao giờ lệch nhau.
 */

const NO_TEAM = '—';

/**
 * @param removeFromPool true = "Xác nhận, xóa khỏi vòng quay"; false = "Tiếp tục quay",
 *   vẫn ghi lịch sử nhưng người trúng ở lại vòng quay cho lượt sau.
 */
export function recordMemberWin(prev: SpinState, winner: WheelSegment, removeFromPool: boolean): Partial<SpinState> {
  const member = prev.members.find((m) => m.id === winner.id);
  const team = prev.teams.find((t) => t.id === member?.teamId);

  return {
    members: removeFromPool
      ? prev.members.map((m) => (m.id === winner.id ? { ...m, status: 'done' as const } : m))
      : prev.members,
    history: [
      { id: uid(), memberId: winner.id, name: winner.name, team: team ? team.name : NO_TEAM, time: nowIso() },
      ...prev.history,
    ],
  };
}

export function recordTeamWin(prev: SpinState, winner: WheelSegment, removeFromPool: boolean): Partial<SpinState> {
  return {
    teams: removeFromPool
      ? prev.teams.map((t) => (t.id === winner.id ? { ...t, status: 'done' as const } : t))
      : prev.teams,
    teamHistory: [{ id: uid(), teamId: winner.id, name: winner.name, time: nowIso() }, ...prev.teamHistory],
  };
}

/** Trừ tồn kho một món quà; món đã hết thì giữ nguyên 0 thay vì tụt xuống âm. */
function takeOneGift(gifts: Gift[], giftId: string): Gift[] {
  return gifts.map((g) => (g.id === giftId && g.remaining > 0 ? { ...g, remaining: g.remaining - 1 } : g));
}

export function awardGiftToMember(prev: SpinState, memberId: string, gift: Gift): Partial<SpinState> {
  const member = prev.members.find((m) => m.id === memberId);
  if (!member) return {};
  const team = prev.teams.find((t) => t.id === member.teamId);

  return {
    gifts: takeOneGift(prev.gifts, gift.id),
    members: prev.members.map((m) => (m.id === member.id ? { ...m, giftReceived: true } : m)),
    giftHistory: [
      {
        id: uid(),
        memberId: member.id,
        name: member.name,
        team: team ? team.name : NO_TEAM,
        gift: gift.name,
        time: nowIso(),
      },
      ...prev.giftHistory,
    ],
  };
}

export function awardGiftToTeam(prev: SpinState, teamId: string, gift: Gift): Partial<SpinState> {
  const team = prev.teams.find((t) => t.id === teamId);
  if (!team) return {};

  return {
    gifts: takeOneGift(prev.gifts, gift.id),
    teams: prev.teams.map((t) => (t.id === team.id ? { ...t, giftReceived: true } : t)),
    giftHistory: [
      {
        id: uid(),
        teamId: team.id,
        name: `${team.name} (cả team)`,
        team: team.name,
        gift: gift.name,
        time: nowIso(),
      },
      ...prev.giftHistory,
    ],
  };
}

/** Đưa mọi người/team về trạng thái chưa quay để quay lại từ đầu; lịch sử giữ nguyên. */
export function resetSpinStatuses(prev: SpinState, mode: 'members' | 'team'): Partial<SpinState> {
  if (mode === 'team') {
    return { teams: prev.teams.map((t) => ({ ...t, status: 'active' as const })) };
  }
  return { members: prev.members.map((m) => ({ ...m, status: 'active' as const })) };
}

/** Khôi phục tồn kho quà và xóa dấu "đã nhận quà" của mọi người và team. */
export function resetGiftStock(prev: SpinState): Partial<SpinState> {
  return {
    gifts: prev.gifts.map((g) => ({ ...g, remaining: g.total })),
    members: prev.members.map((m) => ({ ...m, giftReceived: false })),
    teams: prev.teams.map((t) => ({ ...t, giftReceived: false })),
  };
}

function nowIso(): string {
  return new Date().toISOString();
}
