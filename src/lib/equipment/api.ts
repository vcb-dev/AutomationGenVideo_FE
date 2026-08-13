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
