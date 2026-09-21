/**
 * Bộ kiểm thử mô phỏng đúng thao tác của Admin trên cây phân quyền trong modal nhân sự:
 * mở modal với nhân sự cũ (chưa có permissions), tick nhóm cha, tick lẻ từng nền tảng,
 * bấm preset, chọn tất cả / bỏ chọn, và tìm kiếm quyền.
 */
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import PermissionTreePicker from '../PermissionTreePicker';
import { getAllLeafPermissions } from '@/config/permission-tree';

let container: HTMLDivElement;
let root: Root;
let latest: string[] = [];

/** Bọc picker trong state thật, giống hệt cách HRModal dùng (form.permissions + setForm). */
function Harness({ initial }: { initial?: string[] }) {
  const [perms, setPerms] = useState<string[] | undefined>(initial);
  latest = perms ?? [];
  return (
    <PermissionTreePicker
      selectedPermissions={perms}
      onChange={(next) => {
        latest = next;
        setPerms(next);
      }}
    />
  );
}

function render(initial?: string[]) {
  act(() => {
    root.render(<Harness initial={initial} />);
  });
}

/** Tìm phần tử theo đúng chuỗi hiển thị (giống cách người dùng nhìn màn hình). */
function rowByLabel(label: string): HTMLElement {
  const spans = Array.from(container.querySelectorAll('span'));
  const span = spans.find((s) => s.textContent?.trim() === label);
  if (!span) throw new Error(`Không tìm thấy dòng quyền có nhãn "${label}"`);
  return span.parentElement as HTMLElement; // div có onClick toggle
}

function buttonByText(text: string): HTMLButtonElement {
  const buttons = Array.from(container.querySelectorAll('button'));
  const btn = buttons.find((b) => b.textContent?.trim() === text);
  if (!btn) throw new Error(`Không tìm thấy nút "${text}"`);
  return btn as HTMLButtonElement;
}

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function labelsOnScreen(): string[] {
  return Array.from(container.querySelectorAll('span'))
    .map((s) => s.textContent?.trim() ?? '')
    .filter(Boolean);
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  latest = [];
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('Cây phân quyền — thao tác của Admin', () => {
  it('nhân sự cũ chưa có cột permissions (undefined) vẫn mở được, không trắng trang', () => {
    expect(() => render(undefined)).not.toThrow();
    expect(container.textContent).toContain('Tinh chỉnh quyền chi tiết');
    expect(container.textContent).toContain('Đã chọn:');
  });

  it('tick nhóm cha "Khám phá kênh ngoài" thì tick luôn mọi nền tảng con', () => {
    render([]);
    click(rowByLabel('Khám phá kênh ngoài (externalChannels)'));

    expect(latest).toEqual(expect.arrayContaining([
      'social:external:facebook',
      'social:external:tiktok',
      'social:external:bilibili',
      'social:external:crawl_all',
    ]));
  });

  it('bỏ tick nhóm cha khi đang chọn đủ thì xoá sạch nhánh đó', () => {
    render([]);
    click(rowByLabel('Khám phá kênh ngoài (externalChannels)'));
    click(rowByLabel('Khám phá kênh ngoài (externalChannels)'));

    expect(latest.filter((p) => p.startsWith('social:external'))).toEqual([]);
  });

  it('chỉ tick TikTok thì không kéo theo quyền cào tay', () => {
    render([]);
    click(rowByLabel('Nền tảng TikTok'));

    expect(latest).toContain('social:external:tiktok');
    expect(latest).not.toContain('social:external:crawl_all');
  });

  it('không còn hàng nút vai trò mẫu riêng — chỉ còn MỘT chỗ chọn vai trò ở ô Vai trò', () => {
    render([]);
    const labels = labelsOnScreen();

    expect(labels).not.toContain('Toàn quyền (Admin)');
    expect(labels).not.toContain('Chuyên viên Content');
    expect(labels).not.toContain('Trưởng nhóm (Leader)');
    expect(labels).not.toContain('Tùy chỉnh (Custom)');
    expect(container.textContent).toContain('Tinh chỉnh quyền chi tiết');
  });

  it('bấm "Chọn tất cả" rồi "Bỏ chọn" trả về đúng trạng thái đầu và cuối', () => {
    render([]);
    click(buttonByText('Chọn tất cả'));
    expect(latest.sort()).toEqual(getAllLeafPermissions().sort());

    click(buttonByText('Bỏ chọn'));
    expect(latest).toEqual([]);
  });

  it('con số "Đã chọn: N quyền" phải khớp số quyền thật sự được cấp', () => {
    render([]);
    click(rowByLabel('Khám phá kênh ngoài (externalChannels)'));

    const badge = Array.from(container.querySelectorAll('span'))
      .find((s) => s.textContent?.includes('Đã chọn:'));
    const shown = Number(badge?.querySelector('strong')?.textContent);

    expect(shown).toBe(latest.length);
    // Mảng gửi lên backend chỉ được chứa mã quyền thật, không chứa id của node nhóm.
    expect(latest).not.toContain('social:external');
  });

  it('tìm kiếm "TikTok" chỉ hiện quyền liên quan TikTok', () => {
    render([]);
    const searchBox = container.querySelector('input[type="text"]') as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value',
      )!.set!;
      setter.call(searchBox, 'TikTok');
      searchBox.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const labels = labelsOnScreen();
    expect(labels).toContain('Nền tảng TikTok');
    expect(labels).not.toContain('Nền tảng Facebook');
  });
});
