'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import NewRequestPage from '@/app/dashboard/equipment/new-request/page';
import { apiErrorMessage } from '@/lib/equipment/api-error';
import { BorrowFormContext, BorrowFormMode } from '@/lib/equipment/borrow-form-context';
import {
  QrTicketSession,
  createTicketApi,
  exchangeQrCode,
  loadTicketSession,
  saveTicketSession,
} from '@/lib/equipment/qr-ticket';

/** Trang mở từ mã QR trên máy tính: nằm ngoài /dashboard nên không đòi đăng nhập, chỉ dùng vé tạo phiếu. */
export default function EquipmentQrPage() {
  return (
    <Suspense fallback={<QrMessage text="Đang mở phiếu mượn…" />}>
      <EquipmentQrContent />
    </Suspense>
  );
}

function EquipmentQrContent() {
  const searchParams = useSearchParams();
  const started = useRef(false);
  const [session, setSession] = useState<QrTicketSession | null>(null);
  const [error, setError] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    // Mã chỉ đổi được một lần; chặn effect chạy hai lần ở chế độ dev.
    if (started.current) return;
    started.current = true;
    const code = searchParams?.get('code');
    const stored = loadTicketSession();
    if (!code) {
      if (stored) setSession(stored);
      else setError('Link này thiếu mã. Mở "Quét QR tạo phiếu" trên máy tính rồi quét lại.');
      return;
    }
    // Bỏ mã khỏi thanh địa chỉ để tải lại trang dùng vé đã lưu thay vì mã đã dùng.
    window.history.replaceState(null, '', '/equipment-qr');
    exchangeQrCode(code)
      .then((fresh) => {
        saveTicketSession(fresh);
        setSession(fresh);
      })
      .catch((e: unknown) => {
        if (stored) setSession(stored);
        else setError(apiErrorMessage(e, 'Không mở được phiếu từ mã QR này. Quét lại mã trên máy tính.'));
      });
  }, [searchParams]);

  const mode = useMemo<BorrowFormMode | null>(
    () => (session ? { api: createTicketApi(session.ticket), requester: session.user, onCreated: setCreatedCode } : null),
    [session],
  );

  if (error) return <QrMessage text={error} />;
  if (!mode) return <QrMessage text="Đang mở phiếu mượn…" />;
  if (createdCode) {
    return (
      <QrMessage text={`Đã gửi phiếu ${createdCode}. Phiếu đang chờ duyệt, bạn có thể đóng trang này.`}>
        <button
          type="button"
          onClick={() => {
            setCreatedCode('');
            setFormKey((k) => k + 1);
          }}
          className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-slate-900"
        >
          Tạo phiếu khác
        </button>
      </QrMessage>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <BorrowFormContext.Provider value={mode}>
        <NewRequestPage key={formKey} />
      </BorrowFormContext.Provider>
    </main>
  );
}

function QrMessage({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-700 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300">
        <div className="text-3xl">📱</div>
        <p className="mt-3">{text}</p>
        {children}
      </div>
    </main>
  );
}
