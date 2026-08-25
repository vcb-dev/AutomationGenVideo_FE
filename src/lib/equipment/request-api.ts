import { apiClient } from '../api-client';
import { Asset, Accessory } from './api';

/**
 * Tầng gọi API cho luồng duyệt — gán serial — bàn giao — trả.
 *
 * Kiểu dữ liệu giữ đúng khoá snake_case của BE: đó là hợp đồng giữa hai đầu, đổi tên ở đây
 * là tự tạo thêm một bảng dịch phải bảo trì và một chỗ để sai.
 */

export interface RequestLine {
  id: string;
  model_id: string;
  quantity: number;
  status: string;
  model: { id: string; name: string; category: { id: string; name: string } };
  reservations?: { id: string; asset_id: string | null; asset: Asset | null }[];
}

export interface ApprovalRecord {
  id: string;
  level: number;
  decision: 'APPROVED' | 'REJECTED';
  decided_by: string;
  reason: string | null;
  decided_at: string;
}

export interface BorrowRequest {
  id: string;
  request_code: string;
  owner_id: string;
  project: string;
  place: string;
  from_time: string;
  to_time: string;
  status: string;
  department: { id: string; name: string };
  lines: RequestLine[];
  approvals: ApprovalRecord[];
  /** BE tính sẵn để FE không phải dựng lại BR-22 lần thứ hai. */
  total_value: number;
  required_levels: 1 | 2;
  approval_reasons: string[];
  approved_levels: number;
}

export async function fetchRequests(status?: string) {
  const { data } = await apiClient.get<BorrowRequest[]>('/mems/requests', {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function fetchMyRequests() {
  const { data } = await apiClient.get<BorrowRequest[]>('/mems/my-requests');
  return data;
}

export async function cancelRequest(id: string, reason?: string) {
  const { data } = await apiClient.post<BorrowRequest>(`/mems/requests/${id}/cancel`, { reason });
  return data;
}

export async function fetchRequest(id: string) {
  const { data } = await apiClient.get<BorrowRequest>(`/mems/requests/${id}`);
  return data;
}

export async function approveRequest(id: string, reason?: string) {
  const { data } = await apiClient.post(`/mems/requests/${id}/approve`, { reason });
  return data as BorrowRequest;
}

export async function rejectRequest(id: string, reason: string) {
  const { data } = await apiClient.post(`/mems/requests/${id}/reject`, { reason });
  return data as BorrowRequest;
}

export async function fetchAssignableAssets(lineId: string) {
  const { data } = await apiClient.get<Asset[]>(
    `/mems/request-lines/${lineId}/assignable-assets`,
  );
  return data;
}

export async function assignSerials(
  requestId: string,
  lines: { lineId: string; assetIds: string[] }[],
) {
  const { data } = await apiClient.post(`/mems/requests/${requestId}/assign`, { lines });
  return data as BorrowRequest;
}

export interface HandoverSheetUnit {
  asset: Asset;
  model: { id: string; name: string };
  accessories: Accessory[];
}

export async function fetchHandoverSheet(requestId: string) {
  const { data } = await apiClient.get<{ request: BorrowRequest; units: HandoverSheetUnit[] }>(
    `/mems/requests/${requestId}/handover-sheet`,
  );
  return data;
}

export interface AccessoryCheckPayload {
  accessoryId: string;
  isPresent: boolean;
}

export async function createHandover(
  requestId: string,
  payload: {
    receivedBy: string;
    note?: string;
    units: {
      assetId: string;
      condition: string;
      photoKeys: string[];
      accessories?: AccessoryCheckPayload[];
      note?: string;
    }[];
  },
) {
  const { data } = await apiClient.post(`/mems/requests/${requestId}/handover`, payload);
  return data;
}

export interface PendingReturnUnit {
  id: string;
  asset_id: string;
  condition: string;
  asset: Asset & { model: { id: string; name: string; accessories: Accessory[] } };
  photos: { id: string; storage_key: string }[];
  accessories: { accessory_id: string; is_present: boolean }[];
}

export async function fetchPendingReturns(requestId: string) {
  const { data } = await apiClient.get<{ request: BorrowRequest; units: PendingReturnUnit[] }>(
    `/mems/requests/${requestId}/pending-returns`,
  );
  return data;
}

export async function createReturn(
  requestId: string,
  payload: {
    note?: string;
    units: {
      assetId: string;
      condition: string;
      photoKeys: string[];
      accessories?: AccessoryCheckPayload[];
      note?: string;
    }[];
  },
) {
  const { data } = await apiClient.post(`/mems/requests/${requestId}/return`, payload);
  return data as {
    lines: { asset_id: string; resulting_status: string; incidents: { kind: string }[] }[];
  };
}

export interface AssetEvent {
  id: string;
  kind: string;
  title: string;
  detail: string | null;
  occurred_at: string;
}

export interface AssetDetail {
  asset: Asset & {
    condition: string;
    purchase_price: string | null;
    model: { id: string; name: string; category: { id: string; name: string } };
  };
  events: AssetEvent[];
  next_reservation:
    | {
        from_time: string;
        to_time: string;
        request_line: { request: { request_code: string; project: string } };
      }
    | null;
  siblings_available: number;
}

export async function fetchAssetDetail(assetCode: string) {
  const { data } = await apiClient.get<AssetDetail>(
    `/mems/assets/${encodeURIComponent(assetCode)}`,
  );
  return data;
}

/** Một lượt mượn của máy — BE đã tính sẵn số ngày giữ và số ngày trễ. */
export interface AssetBorrowHistoryRow {
  borrowerId: string;
  borrowerName: string | null;
  project: string | null;
  handedOverAt: string | null;
  dueAt: string | null;
  returnedAt: string | null;
  status: 'HOLDING' | 'OVERDUE' | 'RETURNED' | 'UNKNOWN';
  heldDays: number | null;
  lateDays: number | null;
}

/**
 * Lịch sử máy này từng ai mượn.
 *
 * BE tự lọc theo quyền người gọi: thành viên thường chỉ nhận về lượt mượn của chính mình,
 * ADMIN/quản lý kho nhận toàn bộ. FE không tự lọc lại — lọc hai nơi là sớm muộn lệch nhau.
 */
export async function fetchAssetBorrowHistory(assetId: string) {
  const { data } = await apiClient.get<AssetBorrowHistoryRow[]>(
    `/mems/assets/${encodeURIComponent(assetId)}/borrow-history`,
  );
  return data;
}

export interface BorrowLogRow extends AssetBorrowHistoryRow {
  assetId: string;
  assetCode: string;
}

export interface BorrowLogResponse {
  rows: BorrowLogRow[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchBorrowHistoryLog(params?: Record<string, any>) {
  const { data } = await apiClient.get<BorrowLogResponse>('/mems/borrow-history', { params });
  return data;
}

export interface IncidentItem {
  id: string;
  asset_id: string;
  request_id: string | null;
  return_line_id: string | null;
  responsible_id: string | null;
  kind: 'CONDITION_WORSENED' | 'MISSING_ACCESSORY' | 'OVERDUE';
  description: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'WRITTEN_OFF';
  created_at: string;
  asset: Asset;
}

export async function fetchIncidents(status?: string) {
  const { data } = await apiClient.get<IncidentItem[]>('/mems/incidents', {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function resolveIncident(id: string, note?: string) {
  const { data } = await apiClient.post(`/mems/incidents/${id}/resolve`, { note });
  return data;
}

export interface MaintenanceItem {
  id: string;
  asset_id: string;
  reason: string;
  from_time: string;
  to_time: string | null;
  cost: number | string | null;
  created_at: string;
  asset: Asset;
}

export async function fetchMaintenances(openOnly = false) {
  const { data } = await apiClient.get<MaintenanceItem[]>('/mems/maintenances', {
    params: openOnly ? { openOnly: 'true' } : undefined,
  });
  return data;
}

export async function finishMaintenance(
  id: string,
  payload: { cost?: number; condition?: string; note?: string },
) {
  const { data } = await apiClient.post(`/mems/maintenances/${id}/finish`, payload);
  return data;
}
