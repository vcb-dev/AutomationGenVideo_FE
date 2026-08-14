import { apiClient } from '../api-client';

export interface Asset {
  id: string;
  asset_code: string;
  serial_number: string;
  status: string;
  condition: string;
  model: { id: string; name: string; category: { id: string; name: string } };
  location: { id: string; name: string } | null;
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
