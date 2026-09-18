/**
 * Kịch bản người dùng thật: mở trang khám phá kênh ngoài khi auth-store CHƯA rehydrate
 * (user = null), sau đó store nạp xong tài khoản Admin/Leader.
 *
 * SyncAllChannelsButton gọi `useState` trước rồi `return null` khi thiếu quyền, nhưng
 * `useMutation` lại nằm SAU câu return đó — nên số lượng hook thay đổi giữa hai lần render.
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { UserRole, type User } from '@/types/auth';

let mockAuthState: { token: string | null; user: User | null } = { token: null, user: null };

jest.mock('@/store/auth-store', () => ({
  useAuthStore: () => mockAuthState,
}));
jest.mock('@/services/scraperService', () => ({
  scraperService: { syncAllExternalChannels: jest.fn() },
}));
jest.mock('react-hot-toast', () => {
  const toast: any = jest.fn();
  toast.success = jest.fn();
  toast.error = jest.fn();
  return { __esModule: true, default: toast };
});
jest.mock('@phosphor-icons/react', () => ({
  Lightning: () => null,
  CircleNotch: () => null,
}));
jest.mock('../ManualSyncModal', () => ({
  __esModule: true,
  default: () => null,
}));

import SyncAllChannelsButton from '../SyncAllChannelsButton';

const adminUser = {
  id: 'u1',
  email: 'admin@vienchibao.com',
  full_name: 'Quản trị viên',
  roles: [UserRole.ADMIN],
  is_active: true,
  total_login_count: 1,
  total_action_count: 1,
  created_at: '',
  updated_at: '',
} as User;

describe('SyncAllChannelsButton — thứ tự hook khi auth-store rehydrate', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockAuthState = { token: null, user: null };
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function renderButton() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    act(() => {
      root.render(
        <QueryClientProvider client={client}>
          <SyncAllChannelsButton platform="all" />
        </QueryClientProvider>,
      );
    });
  }

  it('không được đổi số lượng hook khi user từ null chuyển thành Admin', () => {
    // Lần render 1: store chưa rehydrate -> user null -> component return null sớm
    renderButton();
    expect(container.querySelector('button')).toBeNull();

    // Lần render 2: store rehydrate xong, user là Admin -> lẽ ra phải hiện nút cào tay
    mockAuthState = { token: 'tk', user: adminUser };
    renderButton();

    expect(container.querySelector('button')).not.toBeNull();
  });
});
