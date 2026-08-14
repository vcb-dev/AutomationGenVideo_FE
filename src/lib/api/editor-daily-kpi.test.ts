/**
 * Editor Daily KPI — KPI ngày set tay cho editor (a640172). BE ưu tiên số set tay này, chưa
 * set thì fallback về số task giao trong ngày (xem daily-kpi-date.spec.ts phía BE). Test này
 * khoá phần dễ vỡ nhất ở tầng FE: query string chỉ chứa tham số THẬT SỰ có giá trị (không
 * gửi `date=undefined` hay `team_id=` rỗng lên BE), và upsert theo lô gửi đúng shape.
 */

jest.mock('@/lib/api-client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

import { apiClient } from '@/lib/api-client';
import { getEditorDailyKpis, upsertEditorDailyKpis, deleteEditorDailyKpi } from './task-auto';

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockDelete = apiClient.delete as jest.Mock;

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({ data: [] });
  mockPost.mockReset().mockResolvedValue({ data: [] });
  mockDelete.mockReset().mockResolvedValue({ data: {} });
});

describe('getEditorDailyKpis', () => {
  it('không truyền tham số nào thì gọi endpoint KHÔNG có query string', async () => {
    await getEditorDailyKpis({});

    expect(mockGet).toHaveBeenCalledWith('/task-auto/kpi/editors/daily');
  });

  it('chỉ đưa vào query string các tham số THẬT SỰ có giá trị', async () => {
    await getEditorDailyKpis({ date: '2026-08-14', team_id: undefined, user_id: '' });

    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('date=2026-08-14');
    expect(url).not.toContain('team_id');
    expect(url).not.toContain('user_id');
  });

  it('truyền đủ from/to/team_id thì query string có đủ, đúng giá trị', async () => {
    await getEditorDailyKpis({ from: '2026-08-01', to: '2026-08-31', team_id: 'team-1' });

    const url = mockGet.mock.calls[0][0] as string;
    const query = new URLSearchParams(url.split('?')[1]);
    expect(query.get('from')).toBe('2026-08-01');
    expect(query.get('to')).toBe('2026-08-31');
    expect(query.get('team_id')).toBe('team-1');
  });
});

describe('upsertEditorDailyKpis', () => {
  it('gửi đúng endpoint và nguyên vẹn body (team_id, date, entries)', async () => {
    const body = {
      team_id: 'team-1',
      date: '2026-08-14',
      entries: [
        { user_id: 'u1', target: 5 },
        { user_id: 'u2', target: 0, note: 'nghỉ phép' },
      ],
    };

    await upsertEditorDailyKpis(body);

    expect(mockPost).toHaveBeenCalledWith('/task-auto/kpi/editors/daily', body);
  });

  it('target=0 (bỏ set) vẫn được gửi nguyên vẹn, KHÔNG bị lọc khỏi entries', async () => {
    const body = { team_id: 't1', date: '2026-08-14', entries: [{ user_id: 'u1', target: 0 }] };

    await upsertEditorDailyKpis(body);

    expect(mockPost.mock.calls[0][1].entries).toEqual([{ user_id: 'u1', target: 0 }]);
  });
});

describe('deleteEditorDailyKpi', () => {
  it('gọi đúng DELETE /task-auto/kpi/editors/daily/:id', async () => {
    await deleteEditorDailyKpi('kpi-42');

    expect(mockDelete).toHaveBeenCalledWith('/task-auto/kpi/editors/daily/kpi-42');
  });
});
