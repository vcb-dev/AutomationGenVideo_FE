import { QrTicketSession, createTicketClient, loadTicketSession, saveTicketSession } from '../qr-ticket';

jest.mock('../../api-client', () => ({
  apiClient: { defaults: { baseURL: 'https://api.test/api' }, post: jest.fn() },
}));

const NOW = Date.UTC(2026, 10, 3, 9, 0, 0);
const SESSION: QrTicketSession = {
  ticket: 't1',
  expiresAt: new Date(NOW + 30 * 60_000).toISOString(),
  user: { fullName: 'Nguyễn A', email: 'a@vcb.vn', team: 'Media' },
};

describe('Vé tạo phiếu lưu trong tab', () => {
  beforeEach(() => sessionStorage.clear());

  it('lưu rồi đọc lại được khi còn hạn', () => {
    saveTicketSession(SESSION);
    expect(loadTicketSession(NOW)).toEqual(SESSION);
  });

  it('hết hạn thì bỏ khỏi bộ nhớ và trả null', () => {
    saveTicketSession(SESSION);
    expect(loadTicketSession(NOW + 30 * 60_000)).toBeNull();
    expect(sessionStorage.getItem('mems-qr-ticket')).toBeNull();
  });

  it('dữ liệu hỏng thì trả null', () => {
    sessionStorage.setItem('mems-qr-ticket', '{hỏng');
    expect(loadTicketSession(NOW)).toBeNull();
  });
});

describe('createTicketClient', () => {
  it('gắn vé vào Bearer, không gửi cookie, dùng chung base URL với apiClient', () => {
    const client = createTicketClient('t1');
    expect(client.defaults.headers.Authorization).toBe('Bearer t1');
    expect(client.defaults.withCredentials).toBe(false);
    expect(client.defaults.baseURL).toBe('https://api.test/api');
  });

  it('chưa có vé thì không có header Authorization', () => {
    expect(createTicketClient().defaults.headers.Authorization).toBeUndefined();
  });
});
