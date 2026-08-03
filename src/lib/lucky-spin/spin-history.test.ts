import {
  awardGiftToMember,
  awardGiftToTeam,
  recordMemberWin,
  recordTeamWin,
  resetGiftStock,
  resetSpinStatuses,
} from './spin-history';
import { SpinState } from '@/types/lucky-spin';

/**
 * Ghi lịch sử là chỗ không được sai: sự kiện chỉ diễn ra một lần, quay xong mà lịch sử lệch
 * với trạng thái người trúng thì không có cách nào dựng lại.
 */

function baseState(): SpinState {
  return {
    teams: [
      { id: 'tS', name: 'Team Sales', status: 'active', giftReceived: false },
      { id: 'tM', name: 'Team Marketing', status: 'active', giftReceived: false },
    ],
    members: [
      { id: 'mA', name: 'Nguyễn Văn A', teamId: 'tS', status: 'active', giftReceived: false },
      { id: 'mB', name: 'Trần Thị B', teamId: 'tM', status: 'active', giftReceived: false },
    ],
    history: [],
    teamHistory: [],
    gifts: [
      { id: 'g1', name: 'Voucher 500k', total: 2, remaining: 2 },
      { id: 'g2', name: 'Áo thun', total: 1, remaining: 1 },
    ],
    giftHistory: [],
  };
}

const winnerA = { id: 'mA', name: 'Nguyễn Văn A' };
const winnerTeamS = { id: 'tS', name: 'Team Sales' };

describe('recordMemberWin — quay trúng thành viên', () => {
  it('"Xác nhận, xóa khỏi vòng quay": ghi lịch sử và loại người trúng khỏi lượt sau', () => {
    const patch = recordMemberWin(baseState(), winnerA, true);

    expect(patch.history).toHaveLength(1);
    expect(patch.history![0]).toMatchObject({ memberId: 'mA', name: 'Nguyễn Văn A', team: 'Team Sales' });
    expect(patch.members!.find((m) => m.id === 'mA')!.status).toBe('done');
    expect(patch.members!.find((m) => m.id === 'mB')!.status).toBe('active');
  });

  it('"Tiếp tục quay": vẫn ghi lịch sử nhưng người trúng ở lại vòng quay', () => {
    const patch = recordMemberWin(baseState(), winnerA, false);

    expect(patch.history).toHaveLength(1);
    expect(patch.members!.find((m) => m.id === 'mA')!.status).toBe('active');
  });

  it('dòng mới nằm trên cùng để người dẫn chương trình thấy ngay lượt vừa quay', () => {
    const prev = baseState();
    prev.history = [{ id: 'cu', memberId: 'mB', name: 'Trần Thị B', team: 'Team Marketing', time: '2026-01-01' }];

    const patch = recordMemberWin(prev, winnerA, true);

    expect(patch.history!.map((h) => h.name)).toEqual(['Nguyễn Văn A', 'Trần Thị B']);
  });

  it('ghi thời gian dạng ISO để sắp xếp và xuất file đều đọc được', () => {
    const patch = recordMemberWin(baseState(), winnerA, true);
    expect(new Date(patch.history![0].time).toISOString()).toBe(patch.history![0].time);
  });

  it('người không thuộc team nào thì lịch sử ghi "—" chứ không để trống', () => {
    const prev = baseState();
    prev.members[0].teamId = 'khong-ton-tai';

    expect(recordMemberWin(prev, winnerA, true).history![0].team).toBe('—');
  });

  it('quay hai lượt liên tiếp không ghi đè lịch sử của nhau', () => {
    let state = baseState();
    state = { ...state, ...recordMemberWin(state, winnerA, true) };
    state = { ...state, ...recordMemberWin(state, { id: 'mB', name: 'Trần Thị B' }, true) };

    expect(state.history).toHaveLength(2);
    expect(state.members.every((m) => m.status === 'done')).toBe(true);
    expect(new Set(state.history.map((h) => h.id)).size).toBe(2);
  });
});

describe('recordTeamWin — quay trúng team', () => {
  it('ghi vào lịch sử team, không lẫn sang lịch sử thành viên', () => {
    const patch = recordTeamWin(baseState(), winnerTeamS, true);

    expect(patch.teamHistory).toHaveLength(1);
    expect(patch.teamHistory![0]).toMatchObject({ teamId: 'tS', name: 'Team Sales' });
    expect(patch.history).toBeUndefined();
    expect(patch.teams!.find((t) => t.id === 'tS')!.status).toBe('done');
  });

  it('"Tiếp tục quay" giữ team lại trong vòng quay', () => {
    const patch = recordTeamWin(baseState(), winnerTeamS, false);
    expect(patch.teams!.find((t) => t.id === 'tS')!.status).toBe('active');
  });
});

describe('awardGiftToMember — trao quà cho cá nhân', () => {
  const voucher = { id: 'g1', name: 'Voucher 500k', total: 2, remaining: 2 };

  it('trừ tồn kho đúng 1, đánh dấu đã nhận, ghi lịch sử quà', () => {
    const patch = awardGiftToMember(baseState(), 'mA', voucher);

    expect(patch.gifts!.find((g) => g.id === 'g1')!.remaining).toBe(1);
    expect(patch.gifts!.find((g) => g.id === 'g2')!.remaining).toBe(1);
    expect(patch.members!.find((m) => m.id === 'mA')!.giftReceived).toBe(true);
    expect(patch.giftHistory![0]).toMatchObject({
      memberId: 'mA',
      name: 'Nguyễn Văn A',
      team: 'Team Sales',
      gift: 'Voucher 500k',
    });
  });

  it('trao hết số lượng thì quà về 0 và không tụt xuống âm', () => {
    let state = baseState();
    state = { ...state, ...awardGiftToMember(state, 'mA', voucher) };
    state = { ...state, ...awardGiftToMember(state, 'mB', voucher) };
    state = { ...state, ...awardGiftToMember(state, 'mA', voucher) };

    expect(state.gifts.find((g) => g.id === 'g1')!.remaining).toBe(0);
    expect(state.giftHistory).toHaveLength(3);
  });

  it('người nhận vừa bị xóa thì không ghi gì cả, tránh lịch sử ma', () => {
    expect(awardGiftToMember(baseState(), 'khong-ton-tai', voucher)).toEqual({});
  });
});

describe('awardGiftToTeam — trao quà cho cả team', () => {
  const voucher = { id: 'g1', name: 'Voucher 500k', total: 2, remaining: 2 };

  it('ghi rõ "(cả team)" và KHÔNG gắn memberId, để không tính nhầm cho cá nhân', () => {
    const patch = awardGiftToTeam(baseState(), 'tS', voucher);

    expect(patch.giftHistory![0]).toMatchObject({
      teamId: 'tS',
      name: 'Team Sales (cả team)',
      team: 'Team Sales',
      gift: 'Voucher 500k',
    });
    expect(patch.giftHistory![0].memberId).toBeUndefined();
    expect(patch.teams!.find((t) => t.id === 'tS')!.giftReceived).toBe(true);
  });
});

describe('Đặt lại trạng thái', () => {
  it('đưa mọi thành viên về chưa quay nhưng GIỮ NGUYÊN lịch sử', () => {
    let state = baseState();
    state = { ...state, ...recordMemberWin(state, winnerA, true) };
    state = { ...state, ...resetSpinStatuses(state, 'members') };

    expect(state.members.every((m) => m.status === 'active')).toBe(true);
    expect(state.history).toHaveLength(1);
  });

  it('đặt lại thành viên không đụng tới trạng thái team và ngược lại', () => {
    const prev = baseState();
    prev.teams[0].status = 'done';

    expect(resetSpinStatuses(prev, 'members').teams).toBeUndefined();
    expect(resetSpinStatuses(prev, 'team').members).toBeUndefined();
    expect(resetSpinStatuses(prev, 'team').teams!.every((t) => t.status === 'active')).toBe(true);
  });

  it('khôi phục quà: tồn kho về tổng ban đầu, xóa dấu đã nhận của cả người và team', () => {
    let state = baseState();
    state = { ...state, ...awardGiftToMember(state, 'mA', state.gifts[0]) };
    state = { ...state, ...awardGiftToTeam(state, 'tS', state.gifts[1]) };
    state = { ...state, ...resetGiftStock(state) };

    expect(state.gifts.map((g) => g.remaining)).toEqual([2, 1]);
    expect(state.members.every((m) => !m.giftReceived)).toBe(true);
    expect(state.teams.every((t) => !t.giftReceived)).toBe(true);
    // Lịch sử trao quà là bằng chứng đã trao, không được xóa theo
    expect(state.giftHistory).toHaveLength(2);
  });
});

describe('Không sửa trực tiếp state cũ', () => {
  it('state truyền vào giữ nguyên sau khi ghi lịch sử', () => {
    const prev = baseState();
    const chupLai = JSON.stringify(prev);

    recordMemberWin(prev, winnerA, true);
    awardGiftToMember(prev, 'mA', prev.gifts[0]);
    resetGiftStock(prev);

    expect(JSON.stringify(prev)).toBe(chupLai);
  });
});
