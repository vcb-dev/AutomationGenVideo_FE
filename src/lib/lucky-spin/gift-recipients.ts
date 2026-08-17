import { GiftRecipientMode, Member, Team } from '@/types/lucky-spin';

export const ALL_TEAMS_SCOPE = '__all__';

export interface Recipient {
  id: string;
  label: string;
}

/** Ba lựa chọn của tab quay quà luôn phải đổi cùng nhau nên gom vào một state. */
export interface GiftSelection {
  mode: GiftRecipientMode;
  scope: string;
  recipientId: string;
}

export const INITIAL_SELECTION: GiftSelection = {
  mode: 'member',
  scope: ALL_TEAMS_SCOPE,
  recipientId: '',
};

/** Team đang lọc có thể vừa bị xóa ở tab Thành viên, khi đó coi như không lọc. */
export function activeScopeOf(selection: GiftSelection, teams: Team[]): string {
  if (selection.scope === ALL_TEAMS_SCOPE) return ALL_TEAMS_SCOPE;
  return teams.some((t) => t.id === selection.scope) ? selection.scope : ALL_TEAMS_SCOPE;
}

/** Danh sách người/team có thể nhận quà theo chế độ và phạm vi lọc đang chọn. */
export function listRecipients(
  mode: GiftRecipientMode,
  scopeId: string,
  teams: Team[],
  members: Member[],
): Recipient[] {
  if (mode === 'team') {
    return teams.map((t) => ({ id: t.id, label: t.name + (t.giftReceived ? ' (đã nhận quà)' : '') }));
  }
  return members
    .filter((m) => scopeId === ALL_TEAMS_SCOPE || m.teamId === scopeId)
    .map((m) => ({ id: m.id, label: m.name + (m.giftReceived ? ' (đã nhận quà)' : '') }));
}

export function recipientsOf(selection: GiftSelection, teams: Team[], members: Member[]): Recipient[] {
  return listRecipients(selection.mode, activeScopeOf(selection, teams), teams, members);
}

/** Giữ nguyên lựa chọn nếu còn trong danh sách, không còn thì lấy mục đầu tiên. */
function resolve(recipients: Recipient[], currentId: string): string {
  if (recipients.some((r) => r.id === currentId)) return currentId;
  return recipients[0]?.id ?? '';
}

/**
 * Người nhận đang thực sự được chọn.
 *
 * Vẫn phải chốt lại lúc đọc vì danh sách có thể thay đổi từ tab khác (xóa thành viên ở tab
 * Thành viên) mà tab quay quà không nhận được thao tác nào để cập nhật state.
 */
export function activeRecipientIdOf(selection: GiftSelection, teams: Team[], members: Member[]): string {
  return resolve(recipientsOf(selection, teams, members), selection.recipientId);
}

/**
 * Đổi chế độ Cá nhân/Team — danh sách thay hoàn toàn nên luôn về mục đầu tiên.
 *
 * Lựa chọn mới phải được ghi vào state ngay tại đây. Nếu chỉ tính lúc render, id cũ vẫn nằm
 * trong state và sẽ sống lại khi danh sách chứa nó quay trở lại, đè lên người đang hiển thị.
 */
export function selectMode(
  selection: GiftSelection,
  mode: GiftRecipientMode,
  teams: Team[],
  members: Member[],
): GiftSelection {
  const next = { ...selection, mode };
  return { ...next, recipientId: resolve(recipientsOf(next, teams, members), '') };
}

/** Đổi phạm vi lọc — giữ người đang chọn nếu họ vẫn thuộc phạm vi mới. */
export function selectScope(
  selection: GiftSelection,
  scope: string,
  teams: Team[],
  members: Member[],
): GiftSelection {
  const dangChon = activeRecipientIdOf(selection, teams, members);
  const next = { ...selection, scope };
  return { ...next, recipientId: resolve(recipientsOf(next, teams, members), dangChon) };
}

export function selectRecipient(selection: GiftSelection, recipientId: string): GiftSelection {
  return { ...selection, recipientId };
}
