import { EMPTY_STATE, loadState, loadWorkspacePref, saveState, saveWorkspacePref, uid, WORKSPACES } from './storage';
import { SpinState } from '@/types/lucky-spin';

/**
 * Toàn bộ dữ liệu vòng quay (thành viên, quà, và cả LỊCH SỬ QUAY) nằm trong localStorage của
 * đúng cái trình duyệt đang mở, tách theo từng vòng quay:
 *
 *   vcbi_lucky_spin_seci__history        lịch sử thành viên trúng
 *   vcbi_lucky_spin_seci__teamHistory    lịch sử team trúng
 *   vcbi_lucky_spin_seci__giftHistory    lịch sử quà đã trao
 *   vcbi_lucky_spin_tridao__history      ...và bộ tương tự cho vòng quay Tri Đạo
 *
 * Các test dưới đây chạy trên localStorage thật của jsdom.
 */

const KEY = (ws: string, k: string) => `vcbi_lucky_spin_${ws}__${k}`;

function stateWithHistory(): SpinState {
  return {
    teams: [{ id: 'tS', name: 'Team Sales', status: 'active' }],
    members: [{ id: 'mA', name: 'Nguyễn Văn A', teamId: 'tS', status: 'done', giftReceived: true }],
    history: [{ id: 'h1', memberId: 'mA', name: 'Nguyễn Văn A', team: 'Team Sales', time: '2026-08-03T02:30:00.000Z' }],
    teamHistory: [{ id: 'th1', teamId: 'tS', name: 'Team Sales', time: '2026-08-03T02:00:00.000Z' }],
    gifts: [{ id: 'g1', name: 'Voucher 500k', total: 10, remaining: 9 }],
    giftHistory: [
      {
        id: 'gh1',
        memberId: 'mA',
        name: 'Nguyễn Văn A',
        team: 'Team Sales',
        gift: 'Voucher 500k',
        time: '2026-08-03T02:31:00.000Z',
      },
    ],
  };
}

beforeEach(() => localStorage.clear());

describe('Lưu trữ — lịch sử quay nằm ở đâu', () => {
  it('ghi từng phần dữ liệu vào một key riêng có tiền tố vòng quay', () => {
    saveState('seci', stateWithHistory());

    expect(localStorage.getItem(KEY('seci', 'history'))).toBeTruthy();
    expect(localStorage.getItem(KEY('seci', 'teamHistory'))).toBeTruthy();
    expect(localStorage.getItem(KEY('seci', 'giftHistory'))).toBeTruthy();
    expect(localStorage.getItem(KEY('seci', 'members'))).toBeTruthy();
    expect(localStorage.getItem(KEY('seci', 'teams'))).toBeTruthy();
    expect(localStorage.getItem(KEY('seci', 'gifts'))).toBeTruthy();
  });

  it('lưu rồi đọc lại ra đúng dữ liệu cũ, kể cả thời gian và số tồn kho', () => {
    const goc = stateWithHistory();
    saveState('seci', goc);

    expect(loadState('seci')).toEqual(goc);
  });

  it('hai vòng quay SECI và Tri Đạo không thấy dữ liệu của nhau', () => {
    saveState('seci', stateWithHistory());
    saveState('tridao', EMPTY_STATE);

    expect(loadState('seci').history).toHaveLength(1);
    expect(loadState('tridao').history).toHaveLength(0);
    expect(loadState('tridao').members).toHaveLength(0);
  });

  it('ghi vòng quay này không đụng vào key của vòng quay kia', () => {
    saveState('seci', stateWithHistory());
    const truoc = localStorage.getItem(KEY('seci', 'history'));

    saveState('tridao', { ...EMPTY_STATE, history: [] });

    expect(localStorage.getItem(KEY('seci', 'history'))).toBe(truoc);
  });

  it('vòng quay chưa có dữ liệu trả về state rỗng chứ không lỗi', () => {
    expect(loadState('tridao')).toEqual(EMPTY_STATE);
  });

  it('mảng đọc ra là mảng mới, sửa vòng quay này không lộ sang vòng quay kia', () => {
    const a = loadState('seci');
    const b = loadState('tridao');

    a.teams.push({ id: 'x', name: 'Team X', status: 'active' });

    expect(b.teams).toHaveLength(0);
    expect(EMPTY_STATE.teams).toHaveLength(0);
  });

  it('dữ liệu hỏng trong localStorage không làm sập trang, chỉ bỏ phần hỏng', () => {
    localStorage.setItem(KEY('seci', 'history'), '{ hỏng rồi');
    localStorage.setItem(KEY('seci', 'members'), JSON.stringify([{ id: 'mA', name: 'A', teamId: 't', status: 'active' }]));

    const state = loadState('seci');

    expect(state.history).toEqual([]);
    expect(state.members).toHaveLength(1);
  });

  it('bỏ qua dữ liệu không phải mảng thay vì nhận bừa', () => {
    localStorage.setItem(KEY('seci', 'gifts'), JSON.stringify({ khong: 'phai mang' }));
    expect(loadState('seci').gifts).toEqual([]);
  });
});

describe('Đọc lại dữ liệu của app desktop cũ', () => {
  it('lấy được lịch sử lưu dưới tiền tố vqtv_ khi chưa có dữ liệu mới', () => {
    localStorage.setItem(
      'vqtv_seci__history',
      JSON.stringify([{ id: 'cu', memberId: 'm1', name: 'Người cũ', team: 'Team cũ', time: '2026-01-01T00:00:00.000Z' }]),
    );

    expect(loadState('seci').history[0].name).toBe('Người cũ');
  });

  it('dữ liệu mới luôn thắng dữ liệu cũ', () => {
    localStorage.setItem('vqtv_seci__history', JSON.stringify([{ id: 'cu', name: 'Người cũ' }]));
    saveState('seci', stateWithHistory());

    expect(loadState('seci').history[0].name).toBe('Nguyễn Văn A');
  });
});

describe('Vòng quay đang chọn', () => {
  it('nhớ vòng quay lần trước đã mở', () => {
    saveWorkspacePref('tridao');
    expect(loadWorkspacePref()).toBe('tridao');
  });

  it('giá trị lạ thì quay về vòng quay đầu tiên', () => {
    localStorage.setItem('vcbi_lucky_spin_currentWorkspace', 'khong-ton-tai');
    expect(loadWorkspacePref()).toBe(WORKSPACES[0].id);
  });

  it('chưa từng chọn thì mặc định vòng quay đầu tiên', () => {
    expect(loadWorkspacePref()).toBe(WORKSPACES[0].id);
  });
});

describe('uid', () => {
  it('không sinh trùng trong 5000 lần — id trùng sẽ làm xóa nhầm dòng lịch sử', () => {
    const ids = new Set(Array.from({ length: 5000 }, () => uid()));
    expect(ids.size).toBe(5000);
  });
});
