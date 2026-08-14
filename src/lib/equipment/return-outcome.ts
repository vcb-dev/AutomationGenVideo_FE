export interface ReturnItem {
  code: string;
  /** Người mượn có mang máy này tới hôm nay không. */
  selected: boolean;
  conditionBefore: string;
  conditionAfter: string;
  photoCount: number;
  accessories: boolean[];
}

export interface ReturnedUnit {
  code: string;
  /** Trạng thái máy sau khi nhận lại — BR-42 quyết định giữa hai giá trị này. */
  nextStatus: 'AVAILABLE' | 'POST_RETURN_CHECK';
  /** Có phải mở bản ghi sự cố gắn với người mượn hay không. */
  opensIncident: boolean;
  missingAccessories: string[];
}

export interface ReturnOutcome {
  canConfirm: boolean;
  selectedCount: number;
  unitsMissingPhoto: string[];
  /** Trả đủ thì phiếu đóng, thiếu một máy cũng vẫn là trả một phần. */
  requestStatus: 'CLOSED' | 'PARTIALLY_RETURNED';
  units: ReturnedUnit[];
}

/** Thang tình trạng theo mức xấu dần — dùng để biết máy có tệ đi so với lúc giao không. */
const CONDITION_RANK = ['GOOD', 'USED', 'NEEDS_CHECK', 'BROKEN'];

const rank = (condition: string) => {
  const index = CONDITION_RANK.indexOf(condition);
  // Tình trạng lạ coi như mức xấu nhất: thà bắt kiểm tra thừa còn hơn cho máy hỏng về kệ.
  return index === -1 ? CONDITION_RANK.length : index;
};

/**
 * BR-42: kết luận của khâu nhận lại thiết bị, tính trước trên máy người dùng để hiện ngay.
 *
 * Máy tệ đi so với lúc giao thì KHÔNG được về thẳng Sẵn sàng — phải qua Kiểm tra sau trả và mở
 * một bản ghi sự cố. Cho về Sẵn sàng ngay là người mượn kế tiếp lãnh hậu quả, và không còn ai
 * quy được trách nhiệm cho lần làm hỏng.
 *
 * Thiếu phụ kiện cũng bắt máy đi kiểm tra: thiếu pin hay sạc thì máy vẫn nguyên vẹn nhưng
 * chưa cho mượn tiếp được.
 */
export function returnOutcome(
  items: ReturnItem[],
  accessoryNames: Record<string, string[]>,
): ReturnOutcome {
  const selected = items.filter((i) => i.selected);
  const unitsMissingPhoto = selected.filter((i) => i.photoCount < 1).map((i) => i.code);

  const units: ReturnedUnit[] = selected.map((item) => {
    const worse = rank(item.conditionAfter) > rank(item.conditionBefore);
    const names = accessoryNames[item.code] ?? [];
    const missingAccessories = item.accessories
      .map((present, index) => (present ? null : names[index] ?? `Phụ kiện ${index + 1}`))
      .filter((name): name is string => name !== null);

    return {
      code: item.code,
      nextStatus: worse || missingAccessories.length > 0 ? 'POST_RETURN_CHECK' : 'AVAILABLE',
      opensIncident: worse,
      missingAccessories,
    };
  });

  return {
    canConfirm: selected.length > 0 && unitsMissingPhoto.length === 0,
    selectedCount: selected.length,
    unitsMissingPhoto,
    requestStatus: selected.length === items.length ? 'CLOSED' : 'PARTIALLY_RETURNED',
    units,
  };
}
