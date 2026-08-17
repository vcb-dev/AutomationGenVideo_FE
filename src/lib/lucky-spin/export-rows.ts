import { GiftRecord, WinRecord } from '@/types/lucky-spin';

/** Định dạng thời gian dùng chung cho bảng lịch sử trên màn hình và file xuất ra. */
export function formatSpinTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN');
}

export function memberHistoryToExcelRows(history: WinRecord[]): Record<string, string>[] {
  return history.map((h) => ({
    Tên: h.name,
    Team: h.team,
    'Thời gian': formatSpinTime(h.time),
  }));
}

export function memberHistoryToPdfBody(history: WinRecord[]): string[][] {
  return history.map((h) => [h.name, h.team, formatSpinTime(h.time)]);
}

export function giftHistoryToExcelRows(history: GiftRecord[]): Record<string, string>[] {
  return history.map((h) => ({
    'Người nhận': h.name,
    Team: h.team,
    Quà: h.gift,
    'Thời gian': formatSpinTime(h.time),
  }));
}

export function giftHistoryToPdfBody(history: GiftRecord[]): string[][] {
  return history.map((h) => [h.name, h.team, h.gift, formatSpinTime(h.time)]);
}
