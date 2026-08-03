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
  memberId: string;
  name: string;
  team: string;
  time: string;
}

export interface TeamWinRecord {
  id: string;
  teamId: string;
  name: string;
  time: string;
}

export interface GiftRecord {
  id: string;
  memberId?: string;
  teamId?: string;
  name: string;
  team: string;
  gift: string;
  time: string;
}

export interface SpinState {
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
export type SpinAccent = 'gold' | 'teal';

/** Một ô trên vòng quay — dùng chung cho vòng quay thành viên và vòng quay quà. */
export interface WheelSegment {
  id: string;
  name: string;
}
