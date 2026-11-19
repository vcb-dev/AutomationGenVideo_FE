import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import TikTokPostSettings from '../TikTokPostSettings';
import { EMPTY_TIKTOK_SETTINGS, type TikTokComposerSettings } from '@/lib/social/tiktok-post';

const creatorInfo = jest.fn();
jest.mock('@/lib/api/social', () => ({
  socialApi: { tiktok: { creatorInfo: (id: string) => creatorInfo(id) } },
}));

// FilterSelect thật là dropdown tuỳ biến — thay bằng bản tối giản để đọc được các lựa chọn.
jest.mock('@/app/dashboard/internalChannels/components/FilterFields', () => ({
  FilterSelect: ({ value, options, placeholder }: any) => (
    <div data-testid="privacy" data-value={value} data-placeholder={placeholder}>
      {options.map((o: any) => <span key={o.value} data-opt={o.value}>{o.label}</span>)}
    </div>
  ),
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const ACCOUNT = { id: 'tt1', platform: 'TIKTOK', name: 'VCB', is_active: true, created_at: '', extra_data: { openId: 'o' } } as any;

const INFO = {
  accountId: 'tt1',
  nickname: 'Viễn Chí Bảo',
  username: 'vcb_shop',
  avatarUrl: null,
  privacyLevelOptions: ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'],
  commentDisabled: false,
  duetDisabled: true,
  stitchDisabled: false,
  maxVideoPostDurationSec: 180,
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  creatorInfo.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render(value: TikTokComposerSettings, onChange = jest.fn(), onInfoChange = jest.fn()) {
  await act(async () => {
    root.render(<TikTokPostSettings accounts={[ACCOUNT]} value={value} onChange={onChange} onInfoChange={onInfoChange} />);
  });
  // chờ Promise creatorInfo giải xong
  await act(async () => { await Promise.resolve(); });
  return { onChange, onInfoChange };
}

const opts = () => Array.from(container.querySelectorAll('[data-opt]')).map((e) => e.getAttribute('data-opt'));
const checkbox = (text: string) =>
  Array.from(container.querySelectorAll('label')).find((l) => l.textContent?.includes(text))!.querySelector('input') as HTMLInputElement;

describe('TikTokPostSettings', () => {
  it('hiện tên kênh, quyền riêng tư KHÔNG chọn sẵn, lựa chọn lấy từ TikTok', async () => {
    creatorInfo.mockResolvedValue(INFO);
    const { onInfoChange } = await render(EMPTY_TIKTOK_SETTINGS);

    expect(creatorInfo).toHaveBeenCalledWith('tt1');
    expect(container.textContent).toContain('Viễn Chí Bảo');
    expect(container.textContent).toContain('@vcb_shop');
    const sel = container.querySelector('[data-testid="privacy"]')!;
    expect(sel.getAttribute('data-value')).toBe('');
    expect(sel.getAttribute('data-placeholder')).toMatch(/Chọn/);
    expect(opts()).toEqual(['PUBLIC_TO_EVERYONE', 'SELF_ONLY']);
    expect(onInfoChange).toHaveBeenLastCalledWith(expect.objectContaining({ privacyLevelOptions: ['PUBLIC_TO_EVERYONE', 'SELF_ONLY'] }));
  });

  it('tương tác mặc định tắt; tính năng kênh đã tắt thì khoá ô', async () => {
    creatorInfo.mockResolvedValue(INFO);
    await render(EMPTY_TIKTOK_SETTINGS);
    expect(checkbox('Bình luận').checked).toBe(false);
    expect(checkbox('Bình luận').disabled).toBe(false);
    expect(checkbox('Duet').disabled).toBe(true); // duetDisabled
    expect(container.textContent).toContain('tối đa 180 giây');
  });

  it('bật nội dung có tài trợ → bỏ "Chỉ mình tôi", hiện nhãn và chính sách nội dung có thương hiệu', async () => {
    creatorInfo.mockResolvedValue(INFO);
    await render({ ...EMPTY_TIKTOK_SETTINGS, commercial: true, brandContent: true });
    expect(opts()).toEqual(['PUBLIC_TO_EVERYONE']);
    expect(container.textContent).toContain('Hợp tác có trả phí');
    expect(container.textContent).toContain('Chính sách nội dung có thương hiệu');
  });

  it('luôn có dòng đồng ý với xác nhận sử dụng âm nhạc của TikTok', async () => {
    creatorInfo.mockResolvedValue(INFO);
    await render(EMPTY_TIKTOK_SETTINGS);
    const link = Array.from(container.querySelectorAll('a')).find((a) => a.textContent?.includes('Xác nhận sử dụng âm nhạc'));
    expect(link?.getAttribute('href')).toContain('tiktok.com/legal');
  });

  it('bấm ô Bình luận → báo giá trị mới lên trang cha', async () => {
    creatorInfo.mockResolvedValue(INFO);
    const { onChange } = await render(EMPTY_TIKTOK_SETTINGS);
    await act(async () => { checkbox('Bình luận').click(); });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ allowComment: true }));
  });

  it('lỗi lấy thông tin kênh → hiện thông báo', async () => {
    creatorInfo.mockRejectedValue({ response: { data: { message: 'Kênh TikTok này được thêm thủ công' } } });
    await render(EMPTY_TIKTOK_SETTINGS);
    expect(container.textContent).toContain('Kênh TikTok này được thêm thủ công');
  });
});
