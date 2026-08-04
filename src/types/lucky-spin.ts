// ─────────────────────────────────────────────
//  LUCKY SPIN MODULE — TypeScript Types
//  Vòng quay thành viên & quà tặng cho sự kiện nội bộ
// ─────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  /** 'done' = đã được quay trúng ở chế độ quay team, bị loại khỏi vòng quay cho tới khi reset */
  status: 'active' | 'done';
  giftReceived?: boolean;
}

export interface Member {
  id: string;
  name: string;
  teamId: string;
  /** 'done' = đã trúng và được xác nhận loại khỏi vòng quay */
  status: 'active' | 'done';
  giftReceived?: boolean;
}

export interface Gift {
  id: string;
  name: string;
  total: number;
  remaining: number;
}

export interface WinRecord {
  id: string;
  /** Rỗng khi thành viên đã bị xóa khỏi danh sách — lịch sử vẫn giữ tên đã chụp lúc quay. */
  memberId: string;
  name: string;
  team: string;
  time: string;
  /** Người bấm xác nhận, do server ghi lại. */
  by?: string;
}

export interface TeamWinRecord {
  id: string;
  teamId: string;
  name: string;
  time: string;
  by?: string;
}

export interface GiftRecord {
  id: string;
  memberId?: string;
  teamId?: string;
  name: string;
  team: string;
  gift: string;
  time: string;
  by?: string;
}

/** Ai đang giữ quyền điều khiển vòng quay; null nghĩa là đang trống. */
export interface ControlState {
  controllerId: string | null;
  controllerName: string | null;
  expiresAt: string | null;
}

/** Một ô trên vòng quay — dùng chung cho vòng quay thành viên và vòng quay quà. */
export interface WheelSegment {
  id: string;
  name: string;
}

/** Một lượt quay do server bốc — mọi màn hình dựng lại cùng một bánh xe từ đây. */
export interface SpinRoundView {
  id: string;
  kind: 'member' | 'team' | 'gift';
  pool: WheelSegment[];
  winnerIndexes: number[];
  recipientId?: string;
  recipientType?: 'member' | 'team';
  startedAt: string;
  durationMs: number;
}

export interface SpinState {
  control: ControlState;
  /** Tổng số dòng thực có trên server; bảng chỉ hiển thị `historyLimit` dòng gần nhất. */
  historyCounts: { members: number; teams: number; gifts: number };
  historyLimit: number;
  /** Lượt quay đang chạy, để người xem thấy vòng quay chứ không chỉ thấy kết quả. */
  activeRound: SpinRoundView | null;
  teams: Team[];
  members: Member[];
  history: WinRecord[];
  teamHistory: TeamWinRecord[];
  gifts: Gift[];
  giftHistory: GiftRecord[];
}

export interface Workspace {
  id: string;
  name: string;
}

export type TabId = 'spin' | 'giftspin' | 'members' | 'gifts' | 'history';
export type SpinMode = 'members' | 'team';
export type GiftRecipientMode = 'member' | 'team';
export type HistoryTabId = 'members' | 'teams' | 'gifts';

