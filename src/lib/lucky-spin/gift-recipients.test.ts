import {
  activeRecipientIdOf,
  ALL_TEAMS_SCOPE,
  INITIAL_SELECTION,
  listRecipients,
  recipientsOf,
  selectMode,
  selectRecipient,
  selectScope,
} from './gift-recipients';
import { Member, Team } from '@/types/lucky-spin';

/**
 * Lỗi thật đã gặp: đang chọn người nhận quà thì lọc sang team khác rồi lọc quay lại,
 * ô chọn tự nhảy về người đã chọn từ trước — bấm quay là trao quà nhầm người.
 *
 * Nguyên nhân: lựa chọn mới chỉ được tính lúc render mà không ghi vào state, nên id cũ vẫn nằm
 * im trong state chờ danh sách chứa nó trở lại. Các test dưới đây gọi đúng những hàm mà
 * GiftSpinTab dùng cho mỗi thao tác, theo đúng thứ tự người dùng bấm.
 */

const teams: Team[] = [
  { id: 'tS', name: 'Team Sales', status: 'active' },
  { id: 'tM', name: 'Team Marketing', status: 'active' },
];

const members: Member[] = [
  { id: 'mA', name: 'Nguyễn Văn A', teamId: 'tS', status: 'active', giftReceived: false },
  { id: 'mB', name: 'Trần Thị B', teamId: 'tS', status: 'active', giftReceived: false },
  { id: 'mC', name: 'Lê Văn C', teamId: 'tM', status: 'active', giftReceived: false },
];

const dangChon = (sel: typeof INITIAL_SELECTION) => activeRecipientIdOf(sel, teams, members);

describe('Chọn người nhận quà — chuỗi thao tác thật', () => {
  it('lọc sang team khác rồi lọc quay lại KHÔNG làm lựa chọn nhảy về người cũ', () => {
    // Mở tab: mặc định người đầu tiên
    let sel = INITIAL_SELECTION;
    expect(dangChon(sel)).toBe('mA');

    // Người dùng chủ động chọn Nguyễn Văn A
    sel = selectRecipient(sel, 'mA');

    // Lọc sang Team Marketing — A không còn, rơi về Lê Văn C
    sel = selectScope(sel, 'tM', teams, members);
    expect(dangChon(sel)).toBe('mC');

    // Lọc quay về "Tất cả team" — phải GIỮ Lê Văn C
    sel = selectScope(sel, ALL_TEAMS_SCOPE, teams, members);
    expect(dangChon(sel)).toBe('mC');

    // Và id cũ không được nằm lại trong state chờ sống lại
    expect(sel.recipientId).toBe('mC');
  });

  it('giữ nguyên người đang chọn nếu họ vẫn thuộc phạm vi mới', () => {
    let sel = selectRecipient(INITIAL_SELECTION, 'mA');
    sel = selectScope(sel, 'tS', teams, members);
    expect(dangChon(sel)).toBe('mA');
  });

  it('lấy người đầu tiên khi người đang chọn không thuộc phạm vi mới', () => {
    let sel = selectRecipient(INITIAL_SELECTION, 'mC');
    sel = selectScope(sel, 'tS', teams, members);
    expect(dangChon(sel)).toBe('mA');
  });

  it('đổi sang chế độ Team thì chọn team đầu tiên, không giữ id thành viên', () => {
    let sel = selectRecipient(INITIAL_SELECTION, 'mC');
    sel = selectMode(sel, 'team', teams, members);
    expect(sel.recipientId).toBe('tS');
    expect(dangChon(sel)).toBe('tS');
  });

  it('đi Cá nhân → Team → Cá nhân không mang theo lựa chọn cũ của lượt trước', () => {
    let sel = selectRecipient(INITIAL_SELECTION, 'mC');
    sel = selectMode(sel, 'team', teams, members);
    sel = selectMode(sel, 'member', teams, members);
    expect(sel.recipientId).toBe('mA');
  });

  it('phạm vi không có ai thì trả về rỗng — nút quay bị khóa', () => {
    const sel = selectScope(INITIAL_SELECTION, 'tKhongTonTai', teams, members);
    expect(recipientsOf(sel, teams, [])).toHaveLength(0);
    expect(activeRecipientIdOf(sel, teams, [])).toBe('');
  });

  it('người nhận vừa bị xóa ở tab Thành viên thì tự chuyển sang người đầu tiên', () => {
    const sel = selectRecipient(INITIAL_SELECTION, 'mDaXoa');
    expect(dangChon(sel)).toBe('mA');
  });

  it('team đang lọc bị xóa ở tab Thành viên thì quay về "Tất cả team"', () => {
    const sel = selectScope(INITIAL_SELECTION, 'tM', teams, members);
    // Team Marketing bị xóa: chỉ còn Team Sales
    const conLai = [teams[0]];
    expect(recipientsOf(sel, conLai, members).map((r) => r.id)).toEqual(['mA', 'mB', 'mC']);
  });
});

describe('listRecipients — dựng danh sách người nhận', () => {
  it('lọc theo team khi ở chế độ Cá nhân', () => {
    expect(listRecipients('member', 'tS', teams, members).map((r) => r.id)).toEqual(['mA', 'mB']);
    expect(listRecipients('member', ALL_TEAMS_SCOPE, teams, members).map((r) => r.id)).toEqual(['mA', 'mB', 'mC']);
  });

  it('chế độ Team liệt kê team và bỏ qua phạm vi lọc', () => {
    expect(listRecipients('team', 'tS', teams, members).map((r) => r.id)).toEqual(['tS', 'tM']);
  });

  it('đánh dấu "(đã nhận quà)" để người dẫn chương trình không trao trùng', () => {
    const daNhan: Member[] = [{ ...members[0], giftReceived: true }];
    expect(listRecipients('member', ALL_TEAMS_SCOPE, teams, daNhan)[0].label).toBe('Nguyễn Văn A (đã nhận quà)');
    expect(listRecipients('member', ALL_TEAMS_SCOPE, teams, members)[0].label).toBe('Nguyễn Văn A');
  });
});
