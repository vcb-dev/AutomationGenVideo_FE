'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AssetDetail, fetchAssetDetail } from '@/lib/equipment/request-api';
import { AssetPhoto } from '@/lib/equipment/api';
import { useAuthStore } from '@/store/auth-store';
import { AssetPhotoGallery } from '@/components/equipment/AssetPhotoGallery';
import { StatusPill } from '@/components/equipment/StatusPill';
import { ConditionDot } from '@/components/equipment/ConditionDot';
import { AssetBorrowHistory } from '@/components/equipment/AssetBorrowHistory';

const cardClass =
  'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]';
const keyClass = 'text-[11px] uppercase tracking-wide text-slate-400';
const valueClass = 'mt-0.5 text-sm text-slate-900 dark:text-white';

/** Màu chấm mốc thời gian theo loại sự kiện — đọc dọc timeline là thấy ngay việc gì đã xảy ra. */
const EVENT_DOT: Record<string, string> = {
  INTAKE: 'border-emerald-500',
  HANDED_OVER: 'border-blue-500',
  RETURNED: 'border-emerald-500',
  INSPECTED: 'border-emerald-500',
  CONDITION_CHANGED: 'border-amber-500',
  MAINTENANCE: 'border-violet-500',
  INCIDENT: 'border-red-500',
};

const fmt = (iso: string) => new Date(iso).toLocaleString('vi-VN');

// Next 14: params là object thường, KHÔNG phải Promise. Dùng use(params) ở đây làm cả trang
// chết lúc hydrate với "An unsupported type was passed to use()" — vỏ HTML vẫn trả 200 nên
// kiểm chứng bằng mã trạng thái không thấy gì.
export default function AssetDetailPage({ params }: { params: { assetCode: string } }) {
  const code = decodeURIComponent(params.assetCode).toUpperCase();
  const [data, setData] = useState<AssetDetail | null>(null);
  const [photos, setPhotos] = useState<AssetPhoto[]>([]);
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  // Chỉ người của kho mới sửa được ảnh; member xem thôi.
  const canEdit = roles.some((r) => ['LEADER', 'MANAGER', 'ADMIN'].includes(r));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssetDetail(code)
      .then((d) => {
        setData(d);
        setPhotos((d.asset as { photos?: AssetPhoto[] }).photos ?? []);
      })
      .catch((e: unknown) =>
        setError(
          (e as { response?: { status?: number } })?.response?.status === 404
            ? `Không có thiết bị mã ${code} trong kho.`
            : 'Không đọc được thông tin thiết bị.',
        ),
      )
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) return <p className="text-slate-500">Đang tải…</p>;

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{error}</h1>
        <Link
          href="/dashboard/equipment"
          className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline"
        >
          ← Về danh sách kho
        </Link>
      </div>
    );
  }

  const { asset, events, next_reservation: next, siblings_available: siblings } = data;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-5">
        <Link
          href="/dashboard/equipment"
          className="text-xs font-semibold text-slate-400 hover:text-slate-600"
        >
          ← Danh sách kho
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
          {asset.asset_code} — {asset.model.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Toàn bộ thông tin và lịch sử của một máy cụ thể. Mọi thứ trên màn này là chỉ đọc.
        </p>
      </header>

      <section className={cardClass}>
        <div className="border-b border-slate-100 p-5 dark:border-white/[0.06]">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Thông tin thiết bị
          </h2>
        </div>
        <div className="p-5">
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-5 dark:border-white/[0.06] dark:bg-white/[0.02]">
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-5">
              <div>
                <dt className={keyClass}>Mã thiết bị</dt>
                <dd className={cn(valueClass, 'font-mono text-base font-semibold')}>
                  {asset.asset_code}
                </dd>
              </div>
              <div>
                <dt className={keyClass}>Model</dt>
                <dd className={valueClass}>{asset.model.name}</dd>
              </div>
              <div>
                <dt className={keyClass}>Danh mục</dt>
                <dd className={valueClass}>{asset.model.category.name}</dd>
              </div>
              <div>
                <dt className={keyClass}>Số serial</dt>
                <dd className={cn(valueClass, 'font-mono')}>{asset.serial_number}</dd>
              </div>
              <div>
                <dt className={keyClass}>Tình trạng</dt>
                <dd className="mt-1">
                  <ConditionDot condition={asset.condition} />
                </dd>
              </div>
              <div>
                <dt className={keyClass}>Trạng thái</dt>
                <dd className="mt-1">
                  <StatusPill status={asset.status} />
                </dd>
              </div>
              <div>
                <dt className={keyClass}>Nguyên giá</dt>
                <dd className={valueClass}>
                  {asset.purchase_price
                    ? `${Number(asset.purchase_price).toLocaleString('vi-VN')} đ`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className={keyClass}>Vị trí</dt>
                <dd className={valueClass}>{asset.location?.name ?? '—'}</dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-white/[0.06]">
              Trường Trạng thái không xuất hiện trên màn sửa thông tin. Nó chỉ đổi khi có nghiệp
              vụ kèm chứng từ: bàn giao, tiếp nhận trả, lệnh bảo trì hoặc kết luận sự cố.
            </p>
          </div>
        </div>
      </section>

      <section className={cn(cardClass, 'mt-4 p-5')}>
        <AssetPhotoGallery
          assetCode={asset.asset_code}
          photos={photos}
          canEdit={canEdit}
          onChanged={setPhotos}
        />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className={cardClass}>
          <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-white/[0.06]">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Lịch sử vòng đời
            </h2>
            <span className="text-xs text-slate-400">chỉ đọc, không sửa được</span>
          </div>
          <div className="p-5">
            {events.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Máy này chưa có sự kiện nào. Nhật ký bắt đầu ghi từ lần bàn giao đầu tiên.
              </p>
            ) : (
              <ol className="relative ml-1 border-l border-slate-200 pl-6 dark:border-white/[0.1]">
                {events.map((event) => (
                  <li key={event.id} className="relative pb-5 last:pb-0">
                    <span
                      className={cn(
                        'absolute -left-[1.9rem] top-1 h-2.5 w-2.5 rounded-full border-2 bg-white dark:bg-slate-900',
                        EVENT_DOT[event.kind] ?? 'border-slate-400',
                      )}
                    />
                    <div className="text-xs font-semibold text-slate-400">
                      {fmt(event.occurred_at)}
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
                      {event.title}
                    </div>
                    {event.detail && (
                      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {event.detail}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <section className={cn(cardClass, 'self-start')}>
          <div className="border-b border-slate-100 p-5 dark:border-white/[0.06]">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Ảnh hưởng tới lịch sắp tới
            </h2>
          </div>
          <div className="p-5">
            {next ? (
              <>
                <dl className="flex flex-col gap-3">
                  <div>
                    <dt className={keyClass}>Phiếu đặt kế tiếp</dt>
                    <dd className={valueClass}>
                      {next.request_line.request.request_code}
                      <span className="block text-xs text-slate-400">
                        {next.request_line.request.project}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className={keyClass}>Khoảng đặt</dt>
                    <dd className={valueClass}>
                      {fmt(next.from_time)} → {fmt(next.to_time)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                  Giữ chỗ ghi ở mức model chứ không ghim máy cụ thể. Kho còn {siblings} máy{' '}
                  {asset.model.name} sẵn sàng nên phiếu này chưa bị ảnh hưởng nếu{' '}
                  {asset.asset_code} về trễ.
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Máy này chưa có phiếu đặt nào phía trước. Kho còn {siblings} máy cùng model đang
                sẵn sàng.
              </p>
            )}
          </div>
        </section>
      </div>

      <section className={cn(cardClass, 'mt-4')}>
        <AssetBorrowHistory assetId={asset.id} />
      </section>
    </div>
  );
}
