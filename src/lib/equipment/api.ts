import { apiClient } from '../api-client';

export interface Asset {
  id: string;
  asset_code: string;
  serial_number: string;
  status: string;
  condition: string;
  model: { id: string; name: string; category: { id: string; name: string } };
  location: { id: string; name: string } | null;
  /** Danh sách kho chỉ kèm ảnh đại diện; màn chi tiết trả đủ bộ. */
  photos?: AssetPhoto[];
}

export interface AvailabilityResponse {
  available: number;
  enough: boolean;
  shortBy: number;
  bufferMinutes: number;
  bufferedTo: string;
}

export async function fetchAssets(params: { categoryId?: string; status?: string } = {}) {
  const { data } = await apiClient.get<Asset[]>('/mems/assets', { params });
  return data;
}

export async function checkAvailability(params: {
  modelId: string;
  fromTime: string;
  toTime: string;
  quantity: number;
}) {
  const { data } = await apiClient.get<AvailabilityResponse>('/mems/availability', { params });
  return data;
}

export interface BorrowLine {
  modelId: string;
  quantity: number;
  note?: string;
}

export interface CreateBorrowRequestPayload {
  project: string;
  place: string;
  fromTime: string;
  toTime: string;
  lines: BorrowLine[];
}

export async function createBorrowRequest(payload: CreateBorrowRequestPayload) {
  const { data } = await apiClient.post('/mems/requests', payload);
  return data as { id: string; request_code: string; status: string };
}

export interface EquipmentCategory {
  id: string;
  code: string;
  name: string;
  buffer_minutes: number;
}

export interface Accessory {
  id: string;
  name: string;
  is_required?: boolean;
}

export interface EquipmentModel {
  id: string;
  name: string;
  manufacturer: string | null;
  reference_price: string | null;
  category: EquipmentCategory;
  accessories: Accessory[];
  _count: { assets: number };
}

export interface StorageLocation {
  id: string;
  name: string;
}

export async function fetchCategories() {
  const { data } = await apiClient.get<EquipmentCategory[]>('/mems/categories');
  return data;
}

/**
 * Lấy model từ endpoint riêng chứ không gom từ danh sách máy: model vừa khai mà chưa nhập máy
 * nào sẽ không có trong danh sách máy, mà đó đúng là lúc form nhập kho cần tới nó.
 */
export async function fetchModels(categoryId?: string) {
  const { data } = await apiClient.get<EquipmentModel[]>('/mems/models', {
    params: categoryId ? { categoryId } : undefined,
  });
  return data;
}

export async function fetchLocations() {
  const { data } = await apiClient.get<StorageLocation[]>('/mems/locations');
  return data;
}

export async function createModel(payload: {
  categoryId: string;
  name: string;
  manufacturer?: string;
  referencePrice?: number;
  accessories?: string[];
}) {
  const { data } = await apiClient.post<EquipmentModel>('/mems/models', payload);
  return data;
}

export async function createAsset(payload: {
  modelId: string;
  serialNumber: string;
  locationId?: string;
  purchaseDate?: string;
  purchasePrice?: number;
}) {
  const { data } = await apiClient.post<Asset>('/mems/assets', payload);
  return data;
}

export interface AssetPhoto {
  id: string;
  url: string;
  storage: string;
  caption: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

/**
 * Ảnh lưu trên đĩa máy chủ trả về đường dẫn tương đối `/api/mems/photos/...`. Ghép với gốc của
 * API để thẻ <img> trỏ đúng — nếu không, trình duyệt tìm ảnh ở cổng của FE và ra 404.
 *
 * Giá trị mặc định phải TRÙNG với api-client.ts. Lúc đầu tôi để chuỗi rỗng và ảnh hỏng ngay khi
 * .env trống, đúng tình trạng máy này đang gặp.
 *
 * Ảnh trên Google Drive đã là URL đầy đủ nên giữ nguyên.
 */
export function photoSrc(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(
    /\/api\/?$/,
    '',
  );
  return `${base}${url}`;
}

export async function fetchAssetPhotos(assetCode: string) {
  const { data } = await apiClient.get<AssetPhoto[]>(
    `/mems/assets/${encodeURIComponent(assetCode)}/photos`,
  );
  return data;
}

export async function uploadAssetPhoto(assetCode: string, file: File, caption?: string) {
  const form = new FormData();
  form.append('photo', file);
  if (caption) form.append('caption', caption);
  const { data } = await apiClient.post<AssetPhoto>(
    `/mems/assets/${encodeURIComponent(assetCode)}/photos`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function setPrimaryPhoto(photoId: string) {
  const { data } = await apiClient.post<AssetPhoto>(`/mems/photos/${photoId}/primary`);
  return data;
}

export async function deleteAssetPhoto(photoId: string) {
  await apiClient.delete(`/mems/photos/${photoId}`);
}
