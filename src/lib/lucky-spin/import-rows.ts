import { findColumn, SheetRow } from '@/lib/lucky-spin/sheet-io';

/**
 * Đọc file Excel thành dữ liệu sạch để gửi lên server.
 *
 * Phần dò tên cột nằm ở FE vì file do người dùng chọn ngay trên máy họ; server chỉ nhận
 * danh sách đã chuẩn hoá. Việc gộp team trùng tên và sinh id do server lo.
 */

export interface MemberRow {
  name: string;
  teamName: string;
  avatarUrl?: string;
}

export interface GiftRow {
  name: string;
  total: number;
}

export interface ParsedRows<T> {
  rows: T[];
  /** Số dòng bị bỏ vì thiếu ô — báo lại để người dùng biết file có vấn đề. */
  skipped: number;
}

export interface ImportError {
  error: string;
}

export function parseMemberRows(rows: SheetRow[]): ParsedRows<MemberRow> | ImportError {
  if (!rows || rows.length === 0) return { error: 'Không có dữ liệu để nhập.' };

  const nameKey = findColumn(rows, ['tên', 'ten', 'name']);
  const teamKey = findColumn(rows, ['team']);
  const avatarKey = findColumn(rows, ['ảnh', 'anh', 'avatar', 'image', 'photo', 'hình', 'hinh', 'link ảnh', 'link anh', 'url', 'link']);

  if (!nameKey) return { error: 'Không tìm thấy cột "Tên" trong dữ liệu.' };
  if (!teamKey) return { error: 'Không tìm thấy cột "Team" trong dữ liệu.' };

  const parsed: MemberRow[] = [];
  let skipped = 0;

  for (const row of rows) {
    const name = String(row[nameKey] ?? '').trim();
    const teamName = String(row[teamKey] ?? '').trim();
    const rawAvatar = avatarKey ? String(row[avatarKey] ?? '').trim() : '';
    const avatarUrl = rawAvatar || undefined;

    if (!name || !teamName) {
      skipped++;
      continue;
    }
    parsed.push({ name, teamName, ...(avatarUrl ? { avatarUrl } : {}) });
  }

  return { rows: parsed, skipped };
}

export function parseGiftRows(rows: SheetRow[]): ParsedRows<GiftRow> | ImportError {
  if (!rows || rows.length === 0) return { error: 'Không có dữ liệu để nhập.' };

  const nameKey = findColumn(rows, ['tên quà', 'ten qua', 'tên', 'ten', 'name', 'quà', 'qua']);
  const qtyKey = findColumn(rows, ['số lượng', 'so luong', 'quantity', 'tổng', 'tong', 'total', 'sl']);
  if (!nameKey) return { error: 'Không tìm thấy cột "Tên quà" trong dữ liệu.' };
  if (!qtyKey) return { error: 'Không tìm thấy cột "Số lượng" trong dữ liệu.' };

  const parsed: GiftRow[] = [];
  let skipped = 0;

  for (const row of rows) {
    const name = String(row[nameKey] ?? '').trim();
    const total = parseInt(String(row[qtyKey]), 10);
    if (!name || !total || total < 1) {
      skipped++;
      continue;
    }
    parsed.push({ name, total });
  }

  return { rows: parsed, skipped };
}

export function isImportError(result: ParsedRows<unknown> | ImportError): result is ImportError {
  return 'error' in result;
}
