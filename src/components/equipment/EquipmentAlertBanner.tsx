'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { fetchUpcomingReturnsAlerts, UpcomingReturnsAlerts, BorrowRequest } from '@/lib/equipment/request-api';
import { useAuthStore } from '@/store/auth-store';
import { canManageCatalog } from '@/lib/equipment/catalog-permissions';

interface EquipmentAlertBannerProps {
  onSelectRequest?: (req: BorrowRequest) => void;
  className?: string;
}

export function EquipmentAlertBanner({ onSelectRequest, className }: EquipmentAlertBannerProps) {
  const user = useAuthStore((s) => s.user);
  const isManager = canManageCatalog(user?.roles, user?.team);
  const pathname = usePathname();
  const isHistoryPage = pathname?.includes('/borrow-history');

  const [alerts, setAlerts] = useState<UpcomingReturnsAlerts | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const loadAlerts = () => {
    fetchUpcomingReturnsAlerts()
      .then((data) => setAlerts(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAlerts();
    // Tự động kiểm tra lại sau mỗi 2 phút
    const interval = setInterval(loadAlerts, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !alerts) return null;

  const totalOverdue = alerts.overdue?.length || 0;
  const totalExpiring = alerts.expiringSoon?.length || 0;

  if (totalOverdue === 0 && totalExpiring === 0) return null;

  const alertTitle = isManager
    ? totalOverdue > 0
      ? `Cảnh báo: Có ${totalOverdue} phiếu mượn thiết bị quá hạn!`
      : `Nhắc nhở: Có ${totalExpiring} phiếu mượn sắp đến hạn trả trong 2 giờ!`
    : totalOverdue > 0
      ? `Bạn có ${totalOverdue} phiếu mượn thiết bị quá hạn trả!`
      : `Nhắc nhở: Bạn có ${totalExpiring} phiếu mượn sắp đến hạn trả trong 2 giờ!`;

  const alertSubtitle = isManager
    ? 'Vui lòng kiểm tra hoàn trả hoặc đôn đốc thu hồi để tránh gián đoạn các đoàn quay kế tiếp.'
    : 'Vui lòng kiểm tra hoàn trả thiết bị đúng hạn hoặc gửi yêu cầu xin gia hạn mượn.';

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 shadow-sm ${
        totalOverdue > 0
          ? 'border-red-300 bg-red-50/95 text-red-950 dark:border-red-500/30 dark:bg-red-950/20 dark:text-red-200'
          : 'border-amber-300 bg-amber-50/95 text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-200'
      } p-4 ${className || ''}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-pulse">
            {totalOverdue > 0 ? '🚨' : '⏰'}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm sm:text-base">
                {alertTitle}
              </h4>
              {totalOverdue > 0 && totalExpiring > 0 && (
                <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-500/20 dark:text-amber-300">
                  +{totalExpiring} phiếu sắp đến hạn
                </span>
              )}
            </div>
            <p className="text-xs opacity-90 mt-0.5">
              {alertSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            {expanded ? 'Thu gọn ▲' : 'Xem chi tiết ▼'}
          </button>
          {!isHistoryPage && (
            <Link
              href="/dashboard/equipment/borrow-history"
              className="rounded-xl bg-white/80 px-3 py-1.5 text-xs font-bold shadow-xs hover:bg-white dark:bg-white/10 dark:hover:bg-white/20 transition-all text-current"
            >
              Xem nhật ký mượn →
            </Link>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3.5 pt-3 border-t border-black/10 dark:border-white/10 space-y-2 text-xs">
          {/* DANH SÁCH QUÁ HẠN */}
          {totalOverdue > 0 && (
            <div className="space-y-1.5">
              <div className="font-bold text-[11px] uppercase tracking-wider text-red-700 dark:text-red-400">
                🚨 Đã quá hạn trả:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {alerts.overdue.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col justify-between rounded-xl bg-white/90 p-2.5 shadow-2xs border border-red-200 dark:bg-slate-900/80 dark:border-red-500/30"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-red-600 dark:text-red-400">
                          {req.request_code}
                        </span>
                        <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                          Trễ ~{req.overdue_hours}h
                        </span>
                      </div>
                      <div className="mt-1 font-medium text-slate-800 dark:text-slate-200 truncate">
                        {req.owner_name || 'Người mượn'} · {req.project}
                      </div>
                    </div>
                    {onSelectRequest && (
                      <button
                        type="button"
                        onClick={() => onSelectRequest(req)}
                        className="mt-2 text-left text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {isManager ? 'Xử lý phiếu này →' : 'Xem chi tiết & xin gia hạn →'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DANH SÁCH SẮP HẾT HẠN */}
          {totalExpiring > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="font-bold text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                ⏰ Sắp hết hạn trong 2 giờ:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {alerts.expiringSoon.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col justify-between rounded-xl bg-white/90 p-2.5 shadow-2xs border border-amber-200 dark:bg-slate-900/80 dark:border-amber-500/30"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                          {req.request_code}
                        </span>
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          Còn ~{req.remaining_hours}h
                        </span>
                      </div>
                      <div className="mt-1 font-medium text-slate-800 dark:text-slate-200 truncate">
                        {req.owner_name || 'Người mượn'} · {req.project}
                      </div>
                    </div>
                    {onSelectRequest && (
                      <button
                        type="button"
                        onClick={() => onSelectRequest(req)}
                        className="mt-2 text-left text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {isManager ? 'Xử lý phiếu này →' : 'Xem chi tiết & xin gia hạn →'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
