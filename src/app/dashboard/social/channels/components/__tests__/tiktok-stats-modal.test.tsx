import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import TikTokStatsModal from '../TikTokStatsModal';
import TikTokChannelStats from '../TikTokChannelStats';
import { SocialLanguageProvider } from '@/contexts/SocialLanguageContext';

const stats = jest.fn();
const syncStats = jest.fn();
jest.mock('@/lib/api/social', () => ({
  socialApi: { tiktok: { stats: (id: string) => stats(id), syncStats: (id: string) => syncStats(id) } },
}));
const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) } }));
// FilterSelect thật là dropdown tuỳ biến — thay bằng <select> tối giản để đổi giá trị trong test
jest.mock('@/app/dashboard/internalChannels/components/FilterFields', () => ({
  FilterSelect: ({ value, onChange, options }: any) => (
    <select data-testid="sort" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  ),
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const FULL = 'user.info.basic,video.list,user.info.stats,user.info.profile';
const ACCOUNT: any = {
  id: 'tt1', platform: 'TIKTOK', name: 'Viễn Chí Bảo', is_active: true, created_at: '',
  extra_data: { openId: 'o', scope: FULL, stats: { followers: 1500, likes: 12345, videoCount: 42, following: 1, username: 'vcb', displayName: 'Viễn Chí Bảo', syncedAt: '2026-11-17T03:00:00Z' } },
};
const DATA = {
  accountId: 'tt1', hasStatsScope: true, stats: ACCOUNT.extra_data.stats,
  videos: [
    { postId: 'a', title: 'Video A', url: 'https://www.tiktok.com/@vcb/video/a', publishedAt: '2026-11-01T00:00:00Z', views: 100, likes: 90, comments: 1, shares: 0 },
    { postId: 'b', title: 'Video B', url: null, publishedAt: '2026-11-05T00:00:00Z', views: 2500, likes: 10, comments: 4, shares: 2 },
  ],
  totals: { views: 2600, likes: 100, comments: 5, shares: 2 },
};
const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  jest.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  localStorage.removeItem('social_lang');
});

async function render(el: React.ReactElement, lang?: 'en') {
  if (lang) localStorage.setItem('social_lang', lang);
  await act(async () => { root.render(<SocialLanguageProvider>{el}</SocialLanguageProvider>); });
  await act(async () => { await Promise.resolve(); });
}
const rowIds = () => Array.from(container.querySelectorAll('[data-post-id]')).map((e) => e.getAttribute('data-post-id'));

describe('TikTokStatsModal', () => {
  it('hiện tổng và danh sách video, mặc định xếp theo lượt xem', async () => {
    stats.mockResolvedValue(DATA);
    await render(<TikTokStatsModal account={ACCOUNT} onClose={jest.fn()} />);
    expect(stats).toHaveBeenCalledWith('tt1');
    expect(container.querySelector('[data-testid="tiktok-stats-totals"]')!.textContent).toContain('2.6K');
    expect(rowIds()).toEqual(['b', 'a']);
  });

  it('đổi sắp xếp sang lượt thích', async () => {
    stats.mockResolvedValue(DATA);
    await render(<TikTokStatsModal account={ACCOUNT} onClose={jest.fn()} />);
    const sel = container.querySelector('[data-testid="sort"]') as HTMLSelectElement;
    await act(async () => {
      sel.value = 'likes';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(rowIds()).toEqual(['a', 'b']);
  });

  it('chưa có video → câu hướng dẫn bấm Đồng bộ', async () => {
    stats.mockResolvedValue({ ...DATA, videos: [], totals: { views: 0, likes: 0, comments: 0, shares: 0 } });
    await render(<TikTokStatsModal account={ACCOUNT} onClose={jest.fn()} />);
    expect(container.textContent).toContain('Chưa có video nào được đồng bộ');
  });

  it('EN: không còn chữ tiếng Việt (trừ tên kênh), lỗi TikTok dịch theo mã', async () => {
    stats.mockResolvedValue(DATA);
    await render(<TikTokStatsModal account={ACCOUNT} onClose={jest.fn()} />, 'en');
    const text = (container.textContent || '').replace(/Viễn Chí Bảo/g, '');
    expect(text).toContain('TikTok stats');
    expect(text).toContain('Total · Views');
    expect(text).not.toMatch(VI);

    await act(async () => root.render(<div />));
    stats.mockRejectedValue({ response: { data: { message: 'Kênh chưa cấp quyền xem số liệu. (mã TikTok: stats_scope_missing)' } } });
    await render(<TikTokStatsModal account={{ ...ACCOUNT, id: 'tt2' }} onClose={jest.fn()} />, 'en');
    expect(container.textContent).toContain('has not granted stats permission');
  });
});

describe('TikTokChannelStats (thẻ kênh)', () => {
  it('hiện follower/likes/video rút gọn và lần đồng bộ', async () => {
    await render(<TikTokChannelStats account={ACCOUNT} onSynced={jest.fn()} onOpenVideos={jest.fn()} />);
    const box = container.querySelector('[data-testid="tiktok-channel-stats"]')!.textContent || '';
    expect(box).toContain('1.5K');
    expect(box).toContain('12.3K');
    expect(box).toContain('42');
    expect(box).toContain('Đồng bộ lúc');
  });

  it('kênh thiếu quyền số liệu → nhãn cần đăng nhập lại, không có nút', async () => {
    await render(<TikTokChannelStats account={{ ...ACCOUNT, extra_data: { scope: 'user.info.basic,video.publish' } }} onSynced={jest.fn()} onOpenVideos={jest.fn()} />);
    expect(container.textContent).toContain('Cần đăng nhập TikTok lại');
    expect(container.querySelector('button')).toBeNull();
  });

  it('bấm Đồng bộ → gọi API, báo số video, làm mới danh sách kênh', async () => {
    syncStats.mockResolvedValue(DATA);
    const onSynced = jest.fn();
    await render(<TikTokChannelStats account={ACCOUNT} onSynced={onSynced} onOpenVideos={jest.fn()} />);
    const btn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Đồng bộ'))!;
    await act(async () => { btn.click(); });
    expect(syncStats).toHaveBeenCalledWith('tt1');
    expect(toastSuccess).toHaveBeenCalledWith('Đã đồng bộ 2 video');
    expect(onSynced).toHaveBeenCalled();
  });

  it('Đồng bộ lỗi (EN) → toast lỗi tiếng Anh theo mã TikTok', async () => {
    syncStats.mockRejectedValue({ response: { data: { message: 'Phiên hết hạn (mã TikTok: access_token_invalid)' } } });
    await render(<TikTokChannelStats account={ACCOUNT} onSynced={jest.fn()} onOpenVideos={jest.fn()} />, 'en');
    const btn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Sync now'))!;
    await act(async () => { btn.click(); });
    expect(toastError.mock.calls[0][0]).toContain('Your TikTok session has expired');
  });

  it('bấm Xem video → mở cửa sổ cho đúng kênh', async () => {
    const onOpen = jest.fn();
    await render(<TikTokChannelStats account={ACCOUNT} onSynced={jest.fn()} onOpenVideos={onOpen} />);
    const btn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Xem video'))!;
    await act(async () => { btn.click(); });
    expect(onOpen).toHaveBeenCalledWith(ACCOUNT);
  });
});
