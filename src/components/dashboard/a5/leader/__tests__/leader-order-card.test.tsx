import { TextEncoder, TextDecoder } from 'util';
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

import React from 'react';
import { LeaderOrderTotalCard } from '../LeaderOrderTotalCard';
const { renderToStaticMarkup } = require('react-dom/server');
import type { LeaderTaskDashboard } from '../leader-task-dashboard-api';
import type { AdminTeamReport } from '../../admin/admin-team-report-api';

describe('LeaderOrderTotalCard Component & Types', () => {
  it('hiển thị đúng nhãn kỳ và số đơn được định dạng phân tách hàng nghìn', () => {
    const html = renderToStaticMarkup(
      <LeaderOrderTotalCard total={1250} monthLabel="Tháng 09/2026" />
    );

    expect(html).toContain('Tổng số đơn Tháng 09/2026');
    expect(html).toContain('1.250');
    expect(html).toContain('đơn');
  });

  it('hiển thị đúng khi xem theo ngày', () => {
    const html = renderToStaticMarkup(
      <LeaderOrderTotalCard total={132} monthLabel="Ngày 17/09/2026" />
    );

    expect(html).toContain('Tổng số đơn Ngày 17/09/2026');
    expect(html).toContain('132');
    expect(html).toContain('đơn');
  });

  it('hiển thị 0 đơn an toàn khi không có đơn hàng nào', () => {
    const html = renderToStaticMarkup(
      <LeaderOrderTotalCard total={0} monthLabel="Tháng 09/2026" />
    );

    expect(html).toContain('Tổng số đơn Tháng 09/2026');
    expect(html).toContain('>0<');
    expect(html).toContain('đơn');
  });

  it('tương thích cấu trúc LeaderTaskDashboard với trường total_orders', () => {
    const dashboard: LeaderTaskDashboard = {
      scope: 'team',
      team: { id: 'team-1', name: 'Team K1', member_count: 5 },
      tasks: { total: 10, approved: 8 },
      members: [],
      kpi: null,
      video_by_line: [],
      product_by_category: [],
      content_by_classification: [],
      total_orders: 147,
    };

    expect(dashboard.total_orders).toBe(147);
  });

  it('tương thích cấu trúc AdminTeamReport với trường total_orders', () => {
    const report: AdminTeamReport = {
      scope: 'all_teams',
      team: null,
      rows: [],
      video_by_line: [],
      product_by_category: [],
      content_by_classification: [],
      total_orders: 265,
    };

    expect(report.total_orders).toBe(265);
  });
});
