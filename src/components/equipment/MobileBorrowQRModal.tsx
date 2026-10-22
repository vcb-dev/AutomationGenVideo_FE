'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useAuthStore } from '@/store/auth-store';
import { buildMobileBorrowUrl } from '@/lib/equipment/mobile-borrow-helpers';

interface MobileBorrowQRModalProps {
  open: boolean;
  onClose: () => void;
}

export function MobileBorrowQRModal({ open, onClose }: MobileBorrowQRModalProps) {
  const user = useAuthStore((s) => s.user);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [useLanIp, setUseLanIp] = useState(true);

  // LAN IP máy tính phục vụ test thiết bị thật cùng mạng Wi-Fi
  const DEFAULT_LAN_IP = '192.168.0.135';

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
  const isLocalHost = origin.includes('localhost') || origin.includes('127.0.0.1');

  const targetUrl = buildMobileBorrowUrl({
    origin,
    lanIp: isLocalHost && useLanIp ? DEFAULT_LAN_IP : undefined,
    userId: user?.id,
    userName: user?.full_name,
    userEmail: user?.email,
  });

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(targetUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('Lỗi sinh mã QR:', err));
  }, [open, targetUrl]);

  if (!open) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintDeskQR = () => {
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
      document.body.removeChild(iframe);
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Mã QR Quầy Mượn Thiết Bị Media</title>
          <meta charset="utf-8" />
          <style>
            @page { size: A4 portrait; margin: 20mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body { color: #000; background: #fff; text-align: center; padding-top: 30px; }
            .company { font-size: 13px; font-weight: 700; color: #444; letter-spacing: 1px; text-transform: uppercase; }
            .title { font-size: 24px; font-weight: 900; margin: 10px 0 6px; text-transform: uppercase; }
            .sub { font-size: 14px; color: #555; margin-bottom: 30px; }
            .qr-box { display: inline-block; padding: 16px; border: 3px solid #000; border-radius: 16px; margin-bottom: 24px; }
            .qr-img { width: 280px; height: 280px; display: block; }
            .steps { max-width: 420px; margin: 0 auto 30px; text-align: left; background: #f8fafc; padding: 20px 24px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .step-item { font-size: 13px; line-height: 1.6; margin-bottom: 8px; }
            .step-item strong { color: #000; }
            .footer { font-size: 12px; color: #666; font-style: italic; border-top: 1px solid #ddd; padding-top: 16px; max-width: 500px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="company">VCBI MEDIA & ENTERTAINMENT</div>
          <h1 class="title">ĐIỂM TẠO PHIẾU MƯỢN THIẾT BỊ</h1>
          <p class="sub">Quét mã QR bằng điện thoại để tạo phiếu và chụp ảnh thiết bị tại chỗ</p>
          
          <div class="qr-box">
            <img class="qr-img" src="${qrDataUrl}" alt="QR Quầy kho" />
          </div>

          <div class="steps">
            <div class="step-item"><strong>Bước 1:</strong> Mở Camera trên điện thoại và quét mã QR ở trên.</div>
            <div class="step-item"><strong>Bước 2:</strong> Nhập dự án, thời gian và chọn model thiết bị cần mượn.</div>
            <div class="step-item"><strong>Bước 3:</strong> Bấm <em>"📷 Chụp ảnh bằng Camera"</em> để chụp thực tế máy và gửi phiếu!</div>
          </div>

          <div class="footer">
            * Mọi thắc mắc và sự cố vui lòng liên hệ Thủ kho / Quản lý Media VCBI.
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1]">
        {/* NÚT ĐÓNG */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/[0.06] dark:hover:text-white transition-colors"
        >
          ✕
        </button>

        {/* HEADER */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl dark:bg-blue-500/10">
            📱
          </div>
          <h3 className="mt-2.5 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Tạo phiếu & Chụp ảnh trên điện thoại
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Dùng Camera điện thoại quét mã QR bên dưới để mở form và chụp ảnh thiết bị tại chỗ tiện lợi.
          </p>
        </div>

        {/* THÔNG TIN NGƯỜI MƯỢN GẮN KÈM */}
        {user?.full_name && (
          <div className="mt-3.5 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20">
            <span>👤</span>
            <span>
              Người mượn: <strong>{user.full_name}</strong>
              {user.email ? ` (${user.email})` : ''}
            </span>
          </div>
        )}

        {/* KHUNG MÃ QR */}
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4 border border-slate-200 dark:bg-white/[0.03] dark:border-white/[0.08]">
          {qrDataUrl ? (
            <div className="rounded-xl bg-white p-3 shadow-md border border-slate-200">
              <img
                src={qrDataUrl}
                alt="QR Code tạo phiếu mượn"
                className="h-56 w-56 object-contain"
              />
            </div>
          ) : (
            <div className="flex h-56 w-56 items-center justify-center text-xs text-slate-400">
              Đang tạo mã QR…
            </div>
          )}

          {/* TOGGLE MẠNG LAN CHO LOCAL DEV */}
          {isLocalHost && (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
              <button
                type="button"
                onClick={() => setUseLanIp(!useLanIp)}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                  useLanIp
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-200 text-slate-700 dark:bg-white/[0.1] dark:text-slate-300'
                }`}
              >
                {useLanIp ? `Dùng IP Wi-Fi (${DEFAULT_LAN_IP})` : 'Dùng Localhost'}
              </button>
            </div>
          )}
        </div>

        {/* HƯỚNG DẪN 3 BƯỚC */}
        <div className="mt-4 space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100 dark:bg-white/[0.02] dark:border-white/[0.06] dark:text-slate-400">
          <div>
            <strong>1.</strong> Mở ứng dụng <strong>Camera</strong> trên điện thoại quét mã QR.
          </div>
          <div>
            <strong>2.</strong> Bấm liên kết để mở màn hình tạo phiếu.
          </div>
          <div>
            <strong>3.</strong> Bấm nút <strong className="text-blue-600 dark:text-blue-400">"📷 Chụp ảnh bằng Camera"</strong> để chụp trực tiếp thiết bị và gửi phiếu!
          </div>
        </div>

        {/* THAO TÁC NÚT */}
        <div className="mt-5 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/[0.12] dark:text-slate-300 transition-colors"
          >
            <span>{copied ? '✓ Đã chép' : '📋 Chép link'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintDeskQR}
              className="flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 transition-colors"
            >
              <span>🖨️ In mã quầy kho</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
