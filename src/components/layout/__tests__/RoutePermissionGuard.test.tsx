import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Mock next/navigation
const mockReplace = jest.fn();
let mockCurrentPathname = '/dashboard';
let mockCurrentSearchParams: URLSearchParams | null = null;

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
  }),
  usePathname: () => mockCurrentPathname,
  useSearchParams: () => mockCurrentSearchParams,
}));

import RoutePermissionGuard from '../RoutePermissionGuard';
import { User, UserRole } from '@/types/auth';
import { getDefaultPermissionsForRole } from '@/config/permission-tree';

let container: HTMLDivElement;
let root: Root;

function renderGuard(user: User | null) {
  act(() => {
    root.render(<RoutePermissionGuard user={user} />);
  });
}

function makeUser(roles: UserRole[], permissions?: string[]): User {
  return {
    id: 'u-guard-test',
    email: 'test@vcbi.vn',
    full_name: 'Test Guard User',
    roles,
    permissions: permissions ?? getDefaultPermissionsForRole(roles[0]),
    is_active: true,
    total_login_count: 1,
    total_action_count: 1,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
}

describe('RoutePermissionGuard — Chốt chặn truy cập URL trên giao diện', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockCurrentPathname = '/dashboard';
    mockCurrentSearchParams = null;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('1. Khi chưa đăng nhập (user = null), không thực hiện redirect', () => {
    mockCurrentPathname = '/dashboard/admin';
    renderGuard(null);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('2. Khi đang ở trang /dashboard/khong-co-quyen, tuyệt đối không redirect để tránh vòng lặp', () => {
    mockCurrentPathname = '/dashboard/khong-co-quyen';
    const member = makeUser([UserRole.MEMBER]);
    renderGuard(member);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('3. Member vào trang Admin /dashboard/admin -> BỊ CHẶN và redirect sang /dashboard/khong-co-quyen', () => {
    mockCurrentPathname = '/dashboard/admin';
    const member = makeUser([UserRole.MEMBER]);
    renderGuard(member);
    expect(mockReplace).toHaveBeenCalledWith('/dashboard/khong-co-quyen');
  });

  it('4. Member vào Kênh của tôi /dashboard/channel-team/my -> ĐƯỢC PHÉP (Không bị redirect)', () => {
    mockCurrentPathname = '/dashboard/channel-team/my';
    const member = makeUser([UserRole.MEMBER]);
    renderGuard(member);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('5. Member vào Quản lý kênh đội nhóm /dashboard/channel-team -> BỊ CHẶN', () => {
    mockCurrentPathname = '/dashboard/channel-team';
    const member = makeUser([UserRole.MEMBER]);
    renderGuard(member);
    expect(mockReplace).toHaveBeenCalledWith('/dashboard/khong-co-quyen');
  });

  it('6. Member vào Tiến độ cá nhân ?tab=personal -> ĐƯỢC PHÉP', () => {
    mockCurrentPathname = '/dashboard/manager/user-activity';
    mockCurrentSearchParams = new URLSearchParams('tab=personal');
    const member = makeUser([UserRole.MEMBER]);
    renderGuard(member);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('7. Member vào Phê duyệt thiết bị /dashboard/equipment/approvals -> BỊ CHẶN vì không có quyền equipment:approval:manage', () => {
    mockCurrentPathname = '/dashboard/equipment/approvals';
    const member = makeUser([UserRole.MEMBER]);
    renderGuard(member);
    expect(mockReplace).toHaveBeenCalledWith('/dashboard/khong-co-quyen');
  });

  it('8. Leader vào Leader Dashboard /dashboard/leader -> ĐƯỢC PHÉP', () => {
    mockCurrentPathname = '/dashboard/leader';
    const leader = makeUser([UserRole.LEADER]);
    renderGuard(leader);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('9. Leader vào Quản lý nhân sự /dashboard/hr-management -> BỊ CHẶN', () => {
    mockCurrentPathname = '/dashboard/hr-management';
    const leader = makeUser([UserRole.LEADER]);
    renderGuard(leader);
    expect(mockReplace).toHaveBeenCalledWith('/dashboard/khong-co-quyen');
  });

  it('10. Admin vào bất kỳ đâu (/dashboard/admin, /dashboard/hr-management...) -> LUÔN ĐƯỢC PHÉP', () => {
    const admin = makeUser([UserRole.ADMIN]);
    mockCurrentPathname = '/dashboard/admin';
    renderGuard(admin);
    expect(mockReplace).not.toHaveBeenCalled();

    mockCurrentPathname = '/dashboard/hr-management';
    renderGuard(admin);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
