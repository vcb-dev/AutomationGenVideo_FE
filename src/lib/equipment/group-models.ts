import { Asset } from './api';

export interface ModelOption {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  /** Tổng số máy thuộc model, KHÔNG phải số máy mượn được — số mượn được phải hỏi /mems/availability. */
  totalUnits: number;
}

/**
 * Gom danh sách máy thành danh sách model, dùng cho các bộ lọc suy ra từ chính dữ liệu đang hiện.
 *
 * Máy đã thanh lý hoặc mất bị loại khỏi tổng số vì chúng không bao giờ quay lại kho được nữa,
 * để trong tổng sẽ khiến người mượn tưởng kho nhiều máy hơn thực tế.
 */
const DEAD_STATUSES = ['DISPOSED', 'LOST'];

export function groupModels(assets: Asset[]): ModelOption[] {
  const byModel = new Map<string, ModelOption>();

  for (const asset of assets) {
    if (DEAD_STATUSES.includes(asset.status)) continue;

    const existing = byModel.get(asset.model.id);
    if (existing) {
      existing.totalUnits += 1;
      continue;
    }
    byModel.set(asset.model.id, {
      id: asset.model.id,
      name: asset.model.name,
      categoryId: asset.model.category.id,
      categoryName: asset.model.category.name,
      totalUnits: 1,
    });
  }

  // Xếp theo danh mục rồi tới tên model: người mượn tìm "đèn" trước, tìm tên cụ thể sau.
  return [...byModel.values()].sort(
    (a, b) =>
      a.categoryName.localeCompare(b.categoryName, 'vi') ||
      a.name.localeCompare(b.name, 'vi'),
  );
}

export function listCategories(assets: Asset[]): { id: string; name: string }[] {
  const byId = new Map<string, string>();
  for (const asset of assets) byId.set(asset.model.category.id, asset.model.category.name);
  return [...byId.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}
