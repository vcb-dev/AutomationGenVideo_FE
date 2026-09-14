import { fetchWithAuth } from '@/lib/api-client';

export type VoiceActionType = 'ALL' | 'TTS' | 'CLONE' | 'DELETE' | 'TRANSLATE' | 'GRANT_QUOTA';

export type VoiceActionStatus = 'ALL' | 'SUCCESS' | 'FAILED' | 'PENDING';

export interface VoiceHistoryUser {
    id: string;
    full_name: string;
    email: string;
    team?: string | null;
    image_url?: string | null;
}

export interface VoiceActionHistoryItem {
    id: string;
    user_id: string;
    action_type: 'TTS' | 'CLONE' | 'DELETE' | 'TRANSLATE' | 'GRANT_QUOTA';
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    voice_id?: string | null;
    voice_name?: string | null;
    input_text?: string | null;
    output_url?: string | null;
    characters: number;
    duration_ms: number;
    details?: any;
    error_message?: string | null;
    created_at: string;
    user?: VoiceHistoryUser | null;
}

export interface VoiceHistoryPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface VoiceHistoryResponse {
    success: boolean;
    data: VoiceActionHistoryItem[];
    pagination: VoiceHistoryPagination;
}

export interface FetchVoiceHistoryParams {
    page?: number;
    limit?: number;
    action_type?: VoiceActionType;
    status?: VoiceActionStatus;
    user_id?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    apiUrl?: string;
}

export async function fetchVoiceActionHistory(
    params: FetchVoiceHistoryParams = {},
): Promise<VoiceHistoryResponse> {
    const apiUrl = (params.apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
    const query = new URLSearchParams();

    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.action_type && params.action_type !== 'ALL') query.set('action_type', params.action_type);
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.user_id) query.set('user_id', params.user_id);
    if (params.date_from) query.set('date_from', params.date_from);
    if (params.date_to) query.set('date_to', params.date_to);
    if (params.search?.trim()) query.set('search', params.search.trim());

    const res = await fetchWithAuth(`${apiUrl}/ai/voice/history?${query.toString()}`);
    if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || err?.error || 'Không thể tải lịch sử thao tác voice');
    }

    return res.json();
}
