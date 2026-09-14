'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { BorrowRequest } from '@/lib/equipment/request-api';
import { escapeHtml as esc } from '@/lib/equipment/escape-html';

export interface PrintUnitItem {
  modelName: string;
  categoryName?: string;
  assetCode?: string;
  serialNumber?: string;
  accessories?: string[];
  quantity?: number;
  note?: string;
}

interface BorrowPrintModalProps {
  open: boolean;
  onClose: () => void;
  request: BorrowRequest | null;
  assignedUnits?: PrintUnitItem[];
}

export type PaperSize = 'A4' | 'A5' | 'K80' | 'AUTO';

const formatTimeRange = (fromIso?: string | null, toIso?: string | null) => {
  if (!fromIso) return '—';
  const from = new Date(fromIso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const fromTime = `${pad(from.getHours())}:${pad(from.getMinutes())}`;
  const fromDate = `${pad(from.getDate())}/${pad(from.getMonth() + 1)}/${from.getFullYear()}`;

  if (!toIso) return `${fromTime} ${fromDate}`;
  const to = new Date(toIso);
  const toTime = `${pad(to.getHours())}:${pad(to.getMinutes())}`;
  const toDate = `${pad(to.getDate())}/${pad(to.getMonth() + 1)}/${to.getFullYear()}`;

  if (fromDate === toDate) {
    return `${fromTime} – ${toTime} (${fromDate})`;
  }
  return `${fromTime} ${fromDate} → ${toTime} ${toDate}`;
};

export function BorrowPrintModal({
  open,
  onClose,
  request,
  assignedUnits,
}: BorrowPrintModalProps) {
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');

  if (!open || !request) return null;

  // Chuẩn bị danh sách máy để hiển thị trên phiếu in
  const displayItems: PrintUnitItem[] =
    assignedUnits && assignedUnits.length > 0
      ? assignedUnits
      : request.lines.flatMap((l) => {
          if (l.reservations && l.reservations.length > 0) {
            return l.reservations.map((res) => ({
              modelName: l.model.name,
              categoryName: l.model.category?.name,
              assetCode: res.asset?.asset_code || 'Chưa gán',
              serialNumber: res.asset?.serial_number || '—',
              accessories: [],
              quantity: 1,
            }));
          }
          return [
            {
              modelName: l.model.name,
              categoryName: l.model.category?.name,
              assetCode: 'Theo yêu cầu',
              serialNumber: '—',
              quantity: l.quantity,
            },
          ];
        });

  const printDateStr = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  /**
   * In ĐỘC LẬP duy nhất phiếu bàn giao qua iframe ẩn:
   * Giúp trình duyệt CHỈ IN ĐÚNG 1 TRANG BIÊN BẢN, không in các trang web nền hay thanh menu.
   */
  const handlePrint = () => {
    const printContent = document.getElementById('printable-borrow-slip');
    if (!printContent) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      // Gỡ iframe đã gắn trước khi rơi về in cả trang, nếu không mỗi lần bấm In hụt lại bỏ lại
      // một node chết trong DOM.
      document.body.removeChild(iframe);
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title> </title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: ${paperSize === 'A5' ? 'A5' : paperSize === 'K80' ? '80mm auto' : 'A4 portrait'};
              margin: 10mm 12mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            body {
              color: #000;
              background: #fff;
              padding: 0;
              font-size: ${paperSize === 'A5' ? '11px' : paperSize === 'K80' ? '10px' : '13px'};
              line-height: 1.4;
            }
            .header-block {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 14px;
            }
            .company-name {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #333;
            }
            .main-title {
              font-size: 17px;
              font-weight: 900;
              text-transform: uppercase;
              margin: 3px 0;
            }
            .meta-sub {
              font-size: 12px;
              color: #444;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              column-gap: 20px;
              row-gap: 6px;
              margin-bottom: 14px;
            }
            .info-item span {
              color: #555;
            }
            .info-item strong {
              color: #000;
            }
            .full-width {
              grid-column: span 2;
            }
            .table-title {
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              margin-bottom: 6px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
            }
            th, td {
              border: 1px solid #000;
              padding: 5px 8px;
              text-align: left;
            }
            th {
              background-color: #f1f3f5 !important;
              font-weight: 700;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .text-center {
              text-align: center;
            }
            .note-term {
              font-size: 11px;
              font-style: italic;
              color: #444;
              margin-bottom: 20px;
            }
            .signatures {
              display: grid;
              grid-template-columns: 1fr 1fr;
              text-align: center;
              gap: 20px;
              page-break-inside: avoid;
            }
            .sig-title {
              font-weight: 700;
              font-size: 12px;
              text-transform: uppercase;
            }
            .sig-sub {
              font-size: 10px;
              font-style: italic;
              color: #555;
              margin-top: 2px;
            }
            .sig-space {
              height: 60px;
            }
            .sig-name {
              font-weight: 600;
              font-size: 12px;
              border-top: 1px dashed #777;
              display: inline-block;
              min-width: 140px;
              padding-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="header-block">
            <div class="company-name">VCBI MEDIA & PRODUCTION</div>
            <h1 class="main-title">BIÊN BẢN BÀN GIAO & MƯỢN THIẾT BỊ</h1>
            <div class="meta-sub">
              Mã phiếu: <strong>${esc(request.request_code)}</strong> · Ngày lập: ${esc(printDateStr)}
            </div>
          </div>

          <div class="info-grid">
            <div class="info-item"><span>Người mượn: </span><strong>${esc(request.owner_name) || '—'}</strong></div>
            <div class="info-item"><span>Bộ phận / Team: </span><strong>${esc(request.department?.name) || '—'}</strong></div>
            <div class="info-item"><span>Dự án: </span><strong>${esc(request.project)}</strong></div>
            <div class="info-item"><span>Địa điểm: </span><strong>${esc(request.place) || '—'}</strong></div>
            <div class="info-item full-width">
              <span>Thời gian mượn: </span><strong>${esc(formatTimeRange(request.from_time, request.to_time))}</strong>
            </div>
            <div class="info-item full-width">
              <span>Mục đích: </span><span>${request.purpose === 'PERSONAL' ? 'Việc cá nhân' : 'Việc sản xuất công ty'}</span>
            </div>
          </div>

          <div class="table-title">Danh sách thiết bị & Phụ kiện bàn giao</div>
          <table>
            <thead>
              <tr>
                <th style="width: 36px; text-align: center;">STT</th>
                <th>Tên thiết bị & Model</th>
                <th style="text-align: center; width: 85px;">Mã máy</th>
                <th style="text-align: center; width: 95px;">Số Serial</th>
                <th style="text-align: center; width: 45px;">SL</th>
                <th>Phụ kiện kèm theo</th>
              </tr>
            </thead>
            <tbody>
              ${displayItems
                .map(
                  (item, idx) => `
                <tr>
                  <td style="text-align: center; font-family: monospace;">${idx + 1}</td>
                  <td><strong>${esc(item.modelName)}</strong> ${item.categoryName ? `<span style="font-size: 11px; color: #555;">(${esc(item.categoryName)})</span>` : ''}</td>
                  <td style="text-align: center; font-family: monospace; font-weight: bold;">${esc(item.assetCode) || '—'}</td>
                  <td style="text-align: center; font-family: monospace;">${esc(item.serialNumber) || '—'}</td>
                  <td style="text-align: center;">${Number(item.quantity) || 1}</td>
                  <td>${item.accessories && item.accessories.length > 0 ? item.accessories.map(esc).join(', ') : 'Đầy đủ phụ kiện theo máy'}</td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>

          <div class="note-term">
            * Người mượn có trách nhiệm kiểm tra kỹ tình trạng máy, phụ kiện khi nhận và bảo quản trong suốt quá trình sử dụng. Hoàn trả đúng thời hạn đã đăng ký.
          </div>

          <div class="signatures">
            <div>
              <div class="sig-title">NGƯỜI BÀN GIAO / QUẢN LÝ MEDIA</div>
              <div class="sig-sub">(Ký và ghi rõ họ tên)</div>
              <div class="sig-space"></div>
              <div class="sig-name">&nbsp;</div>
            </div>
            <div>
              <div class="sig-title">NGƯỜI MƯỢN THIẾT BỊ</div>
              <div class="sig-sub">(Ký và ghi rõ họ tên)</div>
              <div class="sig-space"></div>
              <div class="sig-name">${esc(request.owner_name) || '&nbsp;'}</div>
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-sm">
      {/* KHUNG DIALOG */}
      <div className="relative flex h-[90vh] max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1]">
        
        {/* 1. THANH TIÊU ĐỀ TRÊN CÙNG (CỐ ĐỊNH) */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/95 px-4 py-3 sm:px-6 dark:border-white/[0.08] dark:bg-slate-800/95">
          <div className="flex items-center gap-2">
            <span className="text-xl">🖨️</span>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                In phiếu mượn & bàn giao thiết bị
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mã phiếu: <strong className="font-mono text-blue-600 dark:text-blue-400">{request.request_code}</strong> · In chuẩn đúng 1 trang
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* LỰA CHỌN KHỔ GIẤY XEM TRƯỚC */}
            <div className="flex items-center rounded-xl bg-slate-200/70 p-1 text-xs font-semibold dark:bg-white/[0.06]">
              {(['A4', 'A5', 'K80', 'AUTO'] as PaperSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPaperSize(size)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 transition-all',
                    paperSize === size
                      ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white',
                  )}
                >
                  {size === 'AUTO' ? 'Tự động' : size}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
            >
              <span>🖨️</span>
              In ngay
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-white/[0.12] dark:text-slate-300 dark:hover:bg-white/[0.05]"
            >
              ✕ Đóng
            </button>
          </div>
        </div>

        {/* 2. VÙNG CUỘN XEM TRƯỚC PHIẾU IN */}
        <div className="flex-1 overflow-y-auto bg-slate-100/70 p-4 sm:p-6 dark:bg-slate-950/60">
          <div
            id="printable-borrow-slip"
            className={cn(
              'mx-auto bg-white text-black transition-all',
              paperSize === 'A4' && 'max-w-[740px] p-8 sm:p-10 border border-slate-200 shadow-md rounded-xl',
              paperSize === 'A5' && 'max-w-[540px] p-6 border border-slate-200 shadow-md rounded-xl text-xs',
              paperSize === 'K80' && 'max-w-[340px] p-4 border border-slate-200 shadow-md rounded-xl text-[11px]',
              paperSize === 'AUTO' && 'w-full max-w-3xl p-6 border border-slate-200 shadow-sm rounded-xl',
            )}
            style={{ fontFamily: "'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}
          >
            {/* TIÊU ĐỀ PHIẾU */}
            <div className="border-b-2 border-black pb-4 text-center">
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-600">
                VCBI MEDIA & PRODUCTION
              </div>
              <h1 className="mt-1 text-base sm:text-xl font-black uppercase tracking-tight text-black">
                BIÊN BẢN BÀN GIAO & MƯỢN THIẾT BỊ
              </h1>
              <div className="mt-1 flex items-center justify-center gap-3 text-xs font-medium text-slate-600">
                <span>
                  Mã phiếu: <strong className="font-mono text-black">{request.request_code}</strong>
                </span>
                <span>•</span>
                <span>Ngày lập: {printDateStr}</span>
              </div>
            </div>

            {/* THÔNG TIN NGƯỜI MƯỢN & DỰ ÁN */}
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-sm">
              <div>
                <span className="text-slate-500">Người mượn: </span>
                <strong className="text-black">{request.owner_name || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500">Bộ phận / Team: </span>
                <strong className="text-black">{request.department?.name || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500">Dự án: </span>
                <strong className="text-black">{request.project}</strong>
              </div>
              <div>
                <span className="text-slate-500">Địa điểm: </span>
                <strong className="text-black">{request.place || '—'}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Thời gian mượn: </span>
                <strong className="font-mono text-black">
                  {formatTimeRange(request.from_time, request.to_time)}
                </strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Mục đích sử dụng: </span>
                <span className="font-medium text-black">
                  {request.purpose === 'PERSONAL' ? 'Việc cá nhân' : 'Việc sản xuất công ty'}
                </span>
              </div>
            </div>

            {/* BẢNG DANH SÁCH THIẾT BỊ */}
            <div className="mt-5">
              <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-black">
                Danh sách thiết bị & Phụ kiện bàn giao
              </div>
              <table className="w-full border-collapse border border-black text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 text-black font-bold">
                    <th className="border border-black px-2.5 py-1.5 text-center w-10">STT</th>
                    <th className="border border-black px-2.5 py-1.5">Tên thiết bị & Model</th>
                    <th className="border border-black px-2.5 py-1.5 text-center">Mã máy</th>
                    <th className="border border-black px-2.5 py-1.5 text-center">Số Serial</th>
                    <th className="border border-black px-2.5 py-1.5 text-center w-12">SL</th>
                    <th className="border border-black px-2.5 py-1.5">Phụ kiện kèm theo</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-black">
                      <td className="border border-black px-2.5 py-1.5 text-center font-mono">
                        {idx + 1}
                      </td>
                      <td className="border border-black px-2.5 py-1.5 font-semibold text-black">
                        {item.modelName}
                        {item.categoryName && (
                          <span className="ml-1.5 text-[11px] font-normal text-slate-500">
                            ({item.categoryName})
                          </span>
                        )}
                      </td>
                      <td className="border border-black px-2.5 py-1.5 text-center font-mono font-bold">
                        {item.assetCode || '—'}
                      </td>
                      <td className="border border-black px-2.5 py-1.5 text-center font-mono">
                        {item.serialNumber || '—'}
                      </td>
                      <td className="border border-black px-2.5 py-1.5 text-center font-semibold">
                        {item.quantity || 1}
                      </td>
                      <td className="border border-black px-2.5 py-1.5 text-xs">
                        {item.accessories && item.accessories.length > 0
                          ? item.accessories.join(', ')
                          : 'Đầy đủ phụ kiện theo máy'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CAM KẾT & QUY ĐỊNH */}
            <div className="mt-4 text-[11px] sm:text-xs text-slate-600 italic">
              * Người mượn có trách nhiệm kiểm tra kỹ tình trạng máy, phụ kiện khi nhận và bảo quản trong suốt quá trình sử dụng. Hoàn trả đúng thời hạn đã đăng ký.
            </div>

            {/* PHẦN CHỮ KÝ XÁC NHẬN */}
            <div className="mt-8 grid grid-cols-2 gap-4 text-center text-xs sm:text-sm">
              <div>
                <div className="font-bold uppercase text-black">NGƯỜI BÀN GIAO / QUẢN LÝ MEDIA</div>
                <div className="text-[11px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
                <div className="h-16 sm:h-20"></div>
                <div className="border-t border-dashed border-slate-400 pt-1 inline-block min-w-[140px] text-transparent select-none">
                  &nbsp;
                </div>
              </div>

              <div>
                <div className="font-bold uppercase text-black">NGƯỜI MƯỢN THIẾT BỊ</div>
                <div className="text-[11px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
                <div className="h-16 sm:h-20"></div>
                <div className="font-semibold text-black border-t border-dashed border-slate-400 pt-1 inline-block min-w-[140px]">
                  {request.owner_name || 'Người mượn'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. THANH ĐIỀU KHIỂN DƯỚI CÙNG (CỐ ĐỊNH) */}
        <div className="shrink-0 flex items-center justify-between border-t border-slate-200/80 bg-slate-50/95 px-4 py-3 sm:px-6 dark:border-white/[0.06] dark:bg-slate-800/95">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            💡 Mẹo: Bỏ tick chọn ô <b>"Đầu trang và chân trang"</b> ở cột cài đặt in để ẩn dòng link localhost & ngày giờ ở 4 góc.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/[0.12] dark:text-slate-200 dark:hover:bg-white/[0.05]"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
            >
              🖨️ In phiếu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
