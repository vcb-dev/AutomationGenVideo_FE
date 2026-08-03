import { findColumn, SheetRow } from '@/lib/lucky-spin/sheet-io';
import { uid } from '@/lib/lucky-spin/storage';
import { Gift, Member, Team } from '@/types/lucky-spin';

/**
 * Biến các dòng đọc từ file Excel thành thành viên và quà.
 *
 * Tách khỏi component vì đây là phần dễ sai nhất của tính năng nhập liệu (dò tên cột có dấu
 * hay không dấu, team trùng tên, dòng thiếu ô) và cần chạy được trong test.
 */

export interface MemberImport {
  /** Team chưa có trong danh sách hiện tại, sẽ được tạo mới. */
  teams: Team[];
  members: Member[];
  /** Số dòng bị bỏ vì thiếu tên hoặc thiếu team. */
  skipped: number;
}

export interface GiftImport {
  gifts: Gift[];
  skipped: number;
}

export interface ImportError {
  error: string;
}

export function importMembersFromRows(rows: SheetRow[], existingTeams: Team[]): MemberImport | ImportError {
  if (!rows || rows.length === 0) return { error: 'Không có dữ liệu để nhập.' };

  const nameKey = findColumn(rows, ['tên', 'ten', 'name']);
  const teamKey = findColumn(rows, ['team']);
  if (!nameKey) return { error: 'Không tìm thấy cột "Tên" trong dữ liệu.' };
  if (!teamKey) return { error: 'Không tìm thấy cột "Team" trong dữ liệu.' };

  const teams: Team[] = [];
  const members: Member[] = [];
  let skipped = 0;

  for (const row of rows) {
    const name = String(row[nameKey] ?? '').trim();
    const teamName = String(row[teamKey] ?? '').trim();
    if (!name || !teamName) {
      skipped++;
      continue;
    }
    // Tên team so khớp không phân biệt hoa thường, tìm cả trong team vừa tạo ở các dòng trước
    // để hai dòng cùng team không sinh ra hai team trùng tên.
    let team =
      existingTeams.find((t) => t.name.toLowerCase() === teamName.toLowerCase()) ??
      teams.find((t) => t.name.toLowerCase() === teamName.toLowerCase());
    if (!team) {
      team = { id: uid(), name: teamName, status: 'active' };
      teams.push(team);
    }
    members.push({ id: uid(), name, teamId: team.id, status: 'active', giftReceived: false });
  }

  return { teams, members, skipped };
}

export function importGiftsFromRows(rows: SheetRow[]): GiftImport | ImportError {
  if (!rows || rows.length === 0) return { error: 'Không có dữ liệu để nhập.' };

  const nameKey = findColumn(rows, ['tên quà', 'ten qua', 'tên', 'ten', 'name', 'quà', 'qua']);
  const qtyKey = findColumn(rows, ['số lượng', 'so luong', 'quantity', 'tổng', 'tong', 'total', 'sl']);
  if (!nameKey) return { error: 'Không tìm thấy cột "Tên quà" trong dữ liệu.' };
  if (!qtyKey) return { error: 'Không tìm thấy cột "Số lượng" trong dữ liệu.' };

  const gifts: Gift[] = [];
  let skipped = 0;

  for (const row of rows) {
    const name = String(row[nameKey] ?? '').trim();
    const qty = parseInt(String(row[qtyKey]), 10);
    if (!name || !qty || qty < 1) {
      skipped++;
      continue;
    }
    gifts.push({ id: uid(), name, total: qty, remaining: qty });
  }

  return { gifts, skipped };
}

export function isImportError(result: MemberImport | GiftImport | ImportError): result is ImportError {
  return 'error' in result;
}
