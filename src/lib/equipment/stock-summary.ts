import { Asset } from './api';

export interface StockSummary {
  /** Không tính máy đã thanh lý và máy đã mất — chúng không còn là tài sản dùng được. */
  total: number;
  available: number;
  onLoan: number;
  maintenance: number;
  pendingCheck: number;
}

export interface CategoryStock {
  categoryId: string;
  categoryName: string;
  available: number;
  total: number;
}

const OUT_OF_STOCK = ['DISPOSED', 'LOST'];
const MAINTENANCE = ['UNDER_MAINTENANCE', 'BROKEN'];
/** Hai trạng thái này đều là "máy đang nằm ở bàn nhận, chưa cho mượn được" nên gộp một chỉ số. */
const PENDING_CHECK = ['PENDING_INSPECTION', 'POST_RETURN_CHECK'];

export function stockSummary(assets: Asset[]): StockSummary {
  const live = assets.filter((a) => !OUT_OF_STOCK.includes(a.status));
  return {
    total: live.length,
    available: live.filter((a) => a.status === 'AVAILABLE').length,
    onLoan: live.filter((a) => a.status === 'ON_LOAN').length,
    maintenance: live.filter((a) => MAINTENANCE.includes(a.status)).length,
    pendingCheck: live.filter((a) => PENDING_CHECK.includes(a.status)).length,
  };
}

export function stockByCategory(assets: Asset[]): CategoryStock[] {
  const byCategory = new Map<string, CategoryStock>();

  for (const asset of assets) {
    if (OUT_OF_STOCK.includes(asset.status)) continue;

    const { id, name } = asset.model.category;
    const row =
      byCategory.get(id) ?? { categoryId: id, categoryName: name, available: 0, total: 0 };
    row.total += 1;
    if (asset.status === 'AVAILABLE') row.available += 1;
    byCategory.set(id, row);
  }

  // Danh mục căng nhất lên đầu: thủ kho cần thấy ngay chỗ sắp hết máy.
  return [...byCategory.values()].sort(
    (a, b) => a.available / a.total - b.available / b.total,
  );
}
