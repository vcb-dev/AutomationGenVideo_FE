'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Accessory, Asset, createAsset, uploadAssetPhoto } from '@/lib/equipment/api';
import {
  BorrowRequest,
  HandoverSheetUnit,
  assignSerials,
  createHandover,
  fetchAssignableAssets,
  fetchHandoverSheet,
  fetchRequest,
  fetchRequests,
} from '@/lib/equipment/request-api';
import { handoverReadiness } from '@/lib/equipment/handover-readiness';
import { ConditionDot } from '@/components/equipment/ConditionDot';
import { StepBar } from '@/components/equipment/StepBar';
import { WorkflowSuccessModal } from '@/components/equipment/WorkflowSuccessModal';
import { BorrowPrintModal } from '@/components/equipment/BorrowPrintModal';
import { RequireCatalogManager } from '@/components/equipment/RequireCatalogManager';
import { apiErrorMessage } from '@/lib/equipment/api-error';
import { conditionLabel } from '@/lib/equipment/status-label';
import { compressImage } from '@/lib/equipment/image-compressor';
import type { PhotoItem } from '@/lib/equipment/photo-item';

const cardClass =
  'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]';
const keyClass = 'text-[11px] uppercase tracking-wide text-slate-400';
const valueClass = 'mt-0.5 text-sm text-slate-900 dark:text-white';
const inputClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white';

interface UnitForm {
  lineId?: string;
  modelId?: string;
  assetId: string;
  code: string;
  serialNumber: string;
  modelName: string;
  condition: string;
  locationName?: string;
  accessories: Accessory[];
  present: boolean[];
  photos: PhotoItem[];
  note: string;
  availableOptions?: Asset[];
}

function HandoverPageInner() {
  const searchParams = useSearchParams();
  const [candidates, setCandidates] = useState<BorrowRequest[]>([]);
  const [request, setRequest] = useState<BorrowRequest | null>(null);
  const [units, setUnits] = useState<UnitForm[]>([]);
  const [commonPhotos, setCommonPhotos] = useState<PhotoItem[]>([]);
  const commonFileInputRef = useRef<HTMLInputElement>(null);
  const [receivedBy, setReceivedBy] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [quickSerials, setQuickSerials] = useState<Record<number, string>>({});
  const [addingAssetIndex, setAddingAssetIndex] = useState<number | null>(null);
  const [quickAddError, setQuickAddError] = useState<Record<number, string>>({});

  const loadRequest = useCallback(async (id: string) => {
    setError('');
    try {
      const detail = await fetchRequest(id);
      setRequest(detail);
      setDone('');
      setConfirmed(false);
      setReceivedBy(detail.owner_name || '');

      if (detail.photos && detail.photos.length > 0) {
        const inherited: PhotoItem[] = detail.photos.map((src, idx) => ({
          previewUrl: src,
          name: `Ảnh từ người mượn #${idx + 1}`,
          isInherited: true,
        }));
        setCommonPhotos(inherited);

        // Nạp ngầm file blob nếu lấy được qua HTTP để sẵn sàng upload
        Promise.all(
          detail.photos.map(async (src, idx) => {
            try {
              const res = await fetch(src);
              if (res.ok) {
                const blob = await res.blob();
                return {
                  previewUrl: src,
                  name: `Ảnh từ người mượn #${idx + 1}`,
                  isInherited: true,
                  file: new File([blob], `borrower_photo_${idx + 1}.jpg`, {
                    type: blob.type || 'image/jpeg',
                  }),
                };
              }
            } catch {}
            return {
              previewUrl: src,
              name: `Ảnh từ người mượn #${idx + 1}`,
              isInherited: true,
            };
          }),
        ).then((loaded) => {
          setCommonPhotos((current) => {
            if (current.some((p) => p.isInherited)) {
              return loaded;
            }
            return current;
          });
        });
      } else {
        setCommonPhotos([]);
      }

      if (detail.status === 'PREPARING') {
        const sheet = await fetchHandoverSheet(id);
        setUnits(
          sheet.units.map((u: HandoverSheetUnit) => ({
            assetId: u.asset.id,
            code: u.asset.asset_code,
            serialNumber: u.asset.serial_number,
            modelName: u.model.name,
            condition: u.asset.condition,
            locationName: u.asset.location?.name,
            accessories: u.accessories || [],
            present: (u.accessories || []).map(() => true),
            photos: [],
            note: '',
            availableOptions: [],
          })),
        );
      } else {
        // Phiếu mới duyệt xong (APPROVED) — tải danh sách máy khả dụng để gán và bàn giao luôn
        const newUnits: UnitForm[] = [];
        // Máy đã chọn cho dòng trước KHÔNG được chọn lại cho dòng sau.
        //
        // Hai chỗ cùng sinh ra trùng lặp: phiếu có hai dòng cùng một model thì cả hai dòng đều
        // hỏi và nhận về đúng danh sách máy rảnh như nhau; còn trong một dòng thì `|| assignable[0]`
        // lặp lại chiếc đầu tiên mỗi khi hết máy. Cả hai đều khiến bước gán serial bị BE từ chối
        // bằng "Một máy được gán cho nhiều dòng trong cùng phiếu", và người dùng không hiểu vì sao
        // vì màn hình vừa tự điền sẵn cho họ.
        const pickedAssetIds = new Set<string>();
        for (const line of detail.lines) {
          const assignable = await fetchAssignableAssets(line.id).catch(() => []);
          const stillFree = assignable.filter((a) => !pickedAssetIds.has(a.id));
          const chosen = stillFree.slice(0, line.quantity);
          const accessories: Accessory[] =
            line.model?.accessories && line.model.accessories.length > 0
              ? line.model.accessories
              : ((chosen[0] as any)?.model?.accessories || []);

          for (let q = 0; q < line.quantity; q++) {
            // Hết máy thì để trống — nút Bàn giao tự khoá lại vì `readiness` đòi mọi máy có mã.
            // Điền bừa một chiếc đã chọn rồi chỉ đẩy lỗi sang tận bước gán serial.
            const pickedAsset = chosen[q];
            if (pickedAsset) pickedAssetIds.add(pickedAsset.id);
            const unitAccs: Accessory[] =
              accessories.length > 0
                ? accessories
                : ((pickedAsset as any)?.model?.accessories || []);
            newUnits.push({
              lineId: line.id,
              modelId: line.model_id || line.model?.id,
              assetId: pickedAsset ? pickedAsset.id : '',
              code: pickedAsset ? pickedAsset.asset_code : `Chưa có máy`,
              serialNumber: pickedAsset ? pickedAsset.serial_number : '',
              modelName: line.model.name,
              condition: pickedAsset ? pickedAsset.condition : 'GOOD',
              locationName: pickedAsset?.location?.name,
              accessories: unitAccs,
              present: unitAccs.map(() => true),
              photos: [],
              note: '',
              availableOptions: assignable,
            });
          }
        }
        setUnits(newUnits);
      }
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Không đọc được thông tin phiếu mượn.'));
    }
  }, []);

  const refreshCandidates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [approvedList, preparingList] = await Promise.all([
        fetchRequests('APPROVED').catch(() => []),
        fetchRequests('PREPARING').catch(() => []),
      ]);
      const combined = [...approvedList, ...preparingList];
      setCandidates(combined);

      const wanted = searchParams?.get('request');
      const target = (wanted && combined.find((r) => r.id === wanted)) || combined[0];
      if (target) {
        await loadRequest(target.id);
      } else {
        setRequest(null);
        setUnits([]);
      }
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Không đọc được danh sách phiếu chờ bàn giao.'));
    } finally {
      setLoading(false);
    }
  }, [loadRequest, searchParams]);

  useEffect(() => {
    refreshCandidates();
  }, [refreshCandidates]);

  const patch = (index: number, next: Partial<UnitForm>) =>
    setUnits((prev) => prev.map((u, i) => (i === index ? { ...u, ...next } : u)));

  const toggleAccessory = (index: number, position: number) =>
    setUnits((prev) =>
      prev.map((u, i) =>
        i === index
          ? { ...u, present: u.present.map((v, j) => (j === position ? !v : v)) }
          : u,
      ),
    );

  const toggleAllAccessories = (index: number, value: boolean) =>
    setUnits((prev) =>
      prev.map((u, i) =>
        i === index ? { ...u, present: u.accessories.map(() => value) } : u,
      ),
    );

  // Chọn ảnh riêng từ máy tính / camera
  const onPickUnitPhotos = async (index: number, files: FileList | null) => {
    if (!files?.length) return;
    const picked = Array.from(files);
    const newItems: PhotoItem[] = [];
    for (const f of picked) {
      const compressed = await compressImage(f).catch(() => f);
      newItems.push({
        file: compressed,
        previewUrl: URL.createObjectURL(compressed),
        name: f.name,
      });
    }
    setUnits((prev) =>
      prev.map((u, i) =>
        i === index
          ? {
              ...u,
              photos: [...(u.photos || []), ...newItems],
            }
          : u,
      ),
    );
  };

  const removeUnitPhoto = (unitIndex: number, photoIndex: number) => {
    setUnits((prev) =>
      prev.map((u, i) => {
        if (i !== unitIndex) return u;
        const target = u.photos?.[photoIndex];
        if (target?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(target.previewUrl);
        const nextPhotos = (u.photos || []).filter((_, idx) => idx !== photoIndex);
        return {
          ...u,
          photos: nextPhotos,
        };
      }),
    );
  };

  // Chọn ảnh chung toàn bộ dàn máy (chụp 1 lần cho tất cả máy)
  const onPickCommonPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const picked = Array.from(files);
    const newItems: PhotoItem[] = [];
    for (const f of picked) {
      const compressed = await compressImage(f).catch(() => f);
      newItems.push({
        file: compressed,
        previewUrl: URL.createObjectURL(compressed),
        name: f.name,
      });
    }
    setCommonPhotos((prev) => [...prev, ...newItems]);
    if (commonFileInputRef.current) commonFileInputRef.current.value = '';
  };

  const removeCommonPhoto = (index: number) => {
    setCommonPhotos((prev) => {
      const target = prev[index];
      if (target?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleQuickAddAsset = async (index: number) => {
    const targetUnit = units[index];
    const serial = quickSerials[index]?.trim();
    if (!targetUnit || !serial) return;
    if (!targetUnit.modelId) {
      setQuickAddError((prev) => ({ ...prev, [index]: 'Không tìm thấy thông tin dòng máy.' }));
      return;
    }
    setAddingAssetIndex(index);
    setQuickAddError((prev) => ({ ...prev, [index]: '' }));
    try {
      const created = await createAsset({
        modelId: targetUnit.modelId,
        serialNumber: serial,
        condition: 'GOOD',
      });
      const accs =
        targetUnit.accessories.length > 0
          ? targetUnit.accessories
          : ((created as any).model?.accessories || []);

      patch(index, {
        assetId: created.id,
        code: created.asset_code,
        serialNumber: created.serial_number,
        condition: created.condition,
        locationName: created.location?.name,
        accessories: accs,
        present:
          targetUnit.present.length === accs.length
            ? targetUnit.present
            : accs.map(() => true),
        availableOptions: [...(targetUnit.availableOptions || []), created],
      });
      setQuickSerials((prev) => ({ ...prev, [index]: '' }));
    } catch (err: unknown) {
      setQuickAddError((prev) => ({
        ...prev,
        [index]: apiErrorMessage(err, 'Không thể nhập nhanh thiết bị mới vào kho.'),
      }));
    } finally {
      setAddingAssetIndex(null);
    }
  };

  const readiness = handoverReadiness(
    units.map((u) => ({
      code: u.code,
      photoCount:
        u.photos && u.photos.length > 0 ? u.photos.length : commonPhotos.length,
      accessories: u.present,
    })),
    confirmed && receivedBy.trim() !== '' && units.every((u) => Boolean(u.assetId)),
  );

  const submit = async () => {
    if (!request) return;
    setSaving(true);
    setError('');
    try {
      // 1. Nếu phiếu đang ở bước APPROVED (chưa gán máy), thực hiện gán serial máy trước
      if (request.status === 'APPROVED') {
        const assignmentsPayload = request.lines.map((line) => ({
          lineId: line.id,
          assetIds: units.filter((u) => u.lineId === line.id).map((u) => u.assetId),
        }));
        await assignSerials(request.id, assignmentsPayload);
      }

      // 2. Tải ảnh lên TRƯỚC và giữ lại ID máy chủ trả về.
      //
      // Ảnh chụp chung cả dàn máy vẫn tải riêng cho từng máy: mỗi máy cần chứng cứ của chính nó.
      const photoIdsByUnit: string[][] = [];
      for (const u of units) {
        const photosToUpload = u.photos && u.photos.length > 0 ? u.photos : commonPhotos;
        const uploadedIds: string[] = [];
        let uploadErrorMsg = '';
        for (const item of photosToUpload) {
          if (!item.file) continue;
          try {
            const saved = await uploadAssetPhoto(
              u.code,
              item.file,
              `Ảnh bàn giao phiếu ${request.request_code}`,
              'HANDOVER',
            );
            uploadedIds.push(saved.id);
          } catch (uploadErr) {
            console.warn('Lỗi tải file ảnh riêng, BE sẽ kế thừa tự động:', uploadErr);
            uploadErrorMsg = apiErrorMessage(uploadErr, 'Lỗi tải ảnh lên máy chủ.');
          }
        }
        // Nếu không có file tải lên trực tiếp nhưng có ảnh kế thừa từ người mượn -> BE tự động gán ảnh
        const hasInherited =
          photosToUpload.some((p) => p.isInherited) ||
          Boolean(request.photos && request.photos.length > 0);

        if (uploadedIds.length === 0 && !hasInherited) {
          setError(
            uploadErrorMsg
              ? `Máy ${u.code}: ${uploadErrorMsg}`
              : `Máy ${u.code} chưa có ảnh tình trạng nào được lưu. Chụp hoặc chọn ảnh rồi thử lại.`,
          );
          setSaving(false);
          return;
        }
        photoIdsByUnit.push(uploadedIds);
      }

      // 3. Thực hiện bàn giao và chuyển sang ON_LOAN
      await createHandover(request.id, {
        receivedBy: receivedBy.trim(),
        units: units.map((u, index) => ({
          assetId: u.assetId,
          condition: u.condition,
          photoKeys: photoIdsByUnit[index],
          accessories: u.accessories.map((a, j) => ({
            accessoryId: a.id,
            isPresent: u.present[j],
          })),
          note: u.note || undefined,
        })),
      });

      setDone(`Đã hoàn tất bàn giao ${units.length} máy, biên bản đã lưu và thiết bị đã chuyển sang trạng thái Đang mượn.`);
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Không lập được biên bản bàn giao.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl pb-16">
      <header className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Bước 2: Chuẩn bị & Bàn giao thiết bị
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Gán số serial máy, đối chiếu checklist phụ kiện và bàn giao thiết bị ra kho.
        </p>
      </header>

      <StepBar current="handover" />

      {loading ? (
        <p className="p-8 text-center text-slate-500">Đang tải danh sách phiếu chờ bàn giao…</p>
      ) : candidates.length === 0 ? (
        <div className={cn(cardClass, 'p-8 text-center')}>
          <span className="text-3xl">📦</span>
          <h3 className="mt-2 font-bold text-slate-800 dark:text-white">
            Hiện không có phiếu nào chờ bàn giao
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Khi có phiếu mượn được duyệt ở Bước 1, phiếu sẽ xuất hiện tại đây để bạn gán serial và bàn giao ngay.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link
              href="/dashboard/equipment/approvals"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              ← Xem phiếu chờ duyệt (Bước 1)
            </Link>
            <Link
              href="/dashboard/equipment/returns"
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/[0.12] dark:text-slate-300 transition-colors"
            >
              Sang Bước 3: Nhận trả →
            </Link>
          </div>
        </div>
      ) : (
        <>
          {candidates.length > 1 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
                Phiếu chờ bàn giao ({candidates.length}):
              </span>
              {candidates.map((r) => (
                <button
                  key={r.id}
                  onClick={() => loadRequest(r.id)}
                  className={cn(
                    'rounded-xl border px-3 py-1.5 text-xs font-bold transition-all',
                    r.id === request?.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-xs dark:bg-blue-500/10 dark:text-blue-300'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/[0.12] dark:bg-transparent dark:text-slate-300',
                  )}
                >
                  {r.request_code} · {r.owner_name || 'Người mượn'}
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <section className={cardClass}>
              <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5 dark:border-white/[0.06]">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Chi tiết thiết bị & Biên bản bàn giao
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Phiếu: <strong className="font-semibold text-slate-800 dark:text-slate-200">{request?.request_code}</strong> · Người mượn: <strong className="font-semibold text-blue-600 dark:text-blue-400">{request?.owner_name || '—'}</strong> · {units.length} thiết bị · Dự án: {request?.project || '—'}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  {request?.status === 'APPROVED' ? 'Đã duyệt (Gán & Giao ngay)' : 'Đang chuẩn bị'}
                </span>
              </div>

              <div className="flex flex-col gap-4 p-4 sm:p-5">
                {(request?.note || (request?.photos && request.photos.length > 0)) && (
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 font-bold uppercase tracking-wider text-[11px] text-amber-800 dark:text-amber-300">
                      <span>📝 Ghi chú & Ảnh đính kèm từ người mượn:</span>
                      {request.photos && request.photos.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                          ⚡ Đã tự động kế thừa làm bằng chứng bàn giao
                        </span>
                      )}
                    </div>
                    {request.note && (
                      <p className="mt-1 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{request.note}</p>
                    )}
                    {request.photos && request.photos.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {request.photos.map((src, idx) => (
                          <a
                            key={idx}
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block h-16 w-16 overflow-hidden rounded-lg border border-amber-200 bg-white hover:ring-2 hover:ring-amber-500"
                          >
                            <img src={src} alt="Ảnh yêu cầu mượn" className="h-full w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* KHUNG CHỤP ẢNH CHUNG TOÀN BỘ DÀN MÁY (1 LƯỢT) */}
                <div className="rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/60 p-4 sm:p-5 dark:border-blue-500/30 dark:bg-blue-500/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xl">📸</span>
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                          Chụp / Tải ảnh chung cho toàn bộ {units.length} thiết bị
                        </h3>
                        {commonPhotos.some((p) => p.isInherited) && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                            ⚡ Đã có ảnh từ người mượn
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Chụp 1–2 ảnh toàn cảnh cả dàn máy lúc giao từ máy tính hoặc điện thoại. Hệ thống sẽ tự động gán làm bằng chứng bàn giao cho tất cả thiết bị.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        ref={commonFileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => onPickCommonPhotos(e.target.files)}
                      />
                      <button
                        type="button"
                        onClick={() => commonFileInputRef.current?.click()}
                        className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
                      >
                        <span>📷</span>
                        {commonPhotos.length > 0 ? '+ Chọn thêm ảnh từ máy' : 'Chọn ảnh từ máy / Chụp ảnh'}
                      </button>
                    </div>
                  </div>

                  {commonPhotos.length > 0 && (
                    <div className="mt-4 border-t border-blue-200/60 pt-3.5 dark:border-blue-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                          Đã chọn {commonPhotos.length} ảnh toàn cảnh:
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        {commonPhotos.map((photo, idx) => (
                          <div
                            key={photo.previewUrl || idx}
                            className="group relative h-20 w-20 overflow-hidden rounded-xl border-2 border-blue-400 bg-slate-100 shadow-md dark:border-blue-500"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.previewUrl}
                              alt={photo.name || `Ảnh ${idx + 1}`}
                              className="h-full w-full object-cover"
                            />
                            {photo.isInherited && (
                              <span className="absolute top-1 left-1 rounded bg-emerald-600/90 px-1 py-0.5 text-[8px] font-bold text-white shadow">
                                ⚡ Người mượn
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeCommonPhoto(idx)}
                              className="absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow hover:bg-red-700 cursor-pointer"
                              title="Xoá ảnh này"
                            >
                              ✕
                            </button>
                            <span className="absolute bottom-0 inset-x-0 bg-slate-900/70 py-0.5 text-center text-[9px] font-medium text-white truncate px-1">
                              #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                      {commonPhotos.some((p) => p.isInherited) ? (
                        <p className="mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          ⚡ Đã tự động kế thừa {commonPhotos.filter((p) => p.isInherited).length} ảnh từ người mượn làm bằng chứng bàn giao cho tất cả {units.length} thiết bị! Bạn có thể chọn thêm ảnh từ máy nếu cần.
                        </p>
                      ) : (
                        <p className="mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          ✓ Đã tự động áp dụng {commonPhotos.length} ảnh này làm bằng chứng bàn giao cho tất cả {units.length} thiết bị bên dưới!
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* DANH SÁCH THIẾT BỊ BÀN GIAO */}
                {units.map((unit, i) => (
                  <div
                    key={unit.assetId || i}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.01]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 p-3.5 sm:p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-6 w-6 place-items-center rounded-md bg-blue-600 text-xs font-bold text-white shadow-xs">
                          {i + 1}
                        </span>
                        <div>
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {unit.modelName}
                          </span>
                          {unit.locationName && (
                            <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                              (Vị trí: {unit.locationName})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <ConditionDot condition={unit.condition} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 p-4">
                      {/* CHỌN MÁY / SỐ SERIAL CỤ THỂ */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Số Serial / Máy cụ thể bàn giao <em className="not-italic text-red-600">*</em>
                        </label>
                        {unit.availableOptions && unit.availableOptions.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            <select
                              className={cn(inputClass, 'w-full font-mono text-xs sm:text-sm font-semibold')}
                              value={unit.assetId}
                              onChange={(e) => {
                                const nextAsset = unit.availableOptions?.find((a) => a.id === e.target.value);
                                if (nextAsset) {
                                  const accs =
                                    unit.accessories.length > 0
                                      ? unit.accessories
                                      : ((nextAsset as any).model?.accessories || []);
                                  patch(i, {
                                    assetId: nextAsset.id,
                                    code: nextAsset.asset_code,
                                    serialNumber: nextAsset.serial_number,
                                    condition: nextAsset.condition,
                                    locationName: nextAsset.location?.name,
                                    accessories: accs,
                                    present:
                                      unit.present.length === accs.length
                                        ? unit.present
                                        : accs.map(() => true),
                                  });
                                }
                              }}
                            >
                              {unit.availableOptions.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.asset_code} (Serial: {a.serial_number}) · {a.location?.name || 'Kho'} · {conditionLabel(a.condition).label}
                                </option>
                              ))}
                            </select>

                            <details className="text-[11px] text-slate-500 dark:text-slate-400">
                              <summary className="cursor-pointer font-medium hover:text-blue-600">
                                ➕ Cầm máy mới trên tay chưa có trong danh sách trên? Nhập nhanh số Serial mới
                              </summary>
                              <div className="mt-2 flex flex-wrap items-center gap-2 pl-2">
                                <input
                                  type="text"
                                  placeholder="Nhập số Serial máy mới..."
                                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 outline-none focus:border-blue-500 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white"
                                  value={quickSerials[i] || ''}
                                  onChange={(e) => setQuickSerials((prev) => ({ ...prev, [i]: e.target.value }))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleQuickAddAsset(i);
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  disabled={!quickSerials[i]?.trim() || addingAssetIndex === i}
                                  onClick={() => handleQuickAddAsset(i)}
                                  className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer"
                                >
                                  {addingAssetIndex === i ? 'Đang thêm…' : '+ Nhập kho & Chọn máy này luôn'}
                                </button>
                                {quickAddError[i] && (
                                  <span className="w-full text-xs text-red-600 dark:text-red-400">
                                    {quickAddError[i]}
                                  </span>
                                )}
                              </div>
                            </details>
                          </div>
                        ) : unit.assetId ? (
                          <div className="font-mono text-sm font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-white/[0.05] px-3 py-2 rounded-lg inline-block">
                            Mã máy: {unit.code} {unit.serialNumber ? `(Serial: ${unit.serialNumber})` : ''}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs dark:border-amber-500/30 dark:bg-amber-500/10">
                            <div className="flex items-start gap-2.5">
                              <span className="text-base shrink-0">⚠️</span>
                              <div className="flex-1">
                                <div className="font-bold text-amber-900 dark:text-amber-200">
                                  Kho hiện chưa có máy nào rảnh cho dòng &quot;{unit.modelName}&quot;
                                </div>
                                <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-300/80">
                                  Tất cả các máy của dòng này đã bị mượn hết hoặc chưa nhập số Serial vào hệ thống.
                                </p>

                                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                  <input
                                    type="text"
                                    placeholder="Nhập số Serial máy thực tế trên tay (VD: SN-12345)..."
                                    className="rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 dark:border-amber-500/40 dark:bg-slate-900 dark:text-white min-w-[240px]"
                                    value={quickSerials[i] || ''}
                                    onChange={(e) => setQuickSerials((prev) => ({ ...prev, [i]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleQuickAddAsset(i);
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    disabled={!quickSerials[i]?.trim() || addingAssetIndex === i}
                                    onClick={() => handleQuickAddAsset(i)}
                                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-amber-700 disabled:opacity-50 transition-all cursor-pointer"
                                  >
                                    {addingAssetIndex === i ? 'Đang thêm…' : '+ Nhập kho & Chọn máy này luôn'}
                                  </button>
                                </div>
                                {quickAddError[i] && (
                                  <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                                    {quickAddError[i]}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* TÌNH TRẠNG KHI GIAO */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Tình trạng lúc giao <em className="not-italic text-red-600">*</em>
                        </label>
                        <select
                          className={cn(inputClass, 'w-48 text-xs font-semibold')}
                          value={unit.condition}
                          onChange={(e) => patch(i, { condition: e.target.value })}
                        >
                          <option value="GOOD">Tốt (Mới / Hoạt động chuẩn)</option>
                          <option value="USED">Tốt (Đã qua sử dụng)</option>
                          <option value="NEEDS_CHECK">Bảo trì (Cần lưu ý)</option>
                        </select>
                      </div>

                      {/* CHECKLIST PHỤ KIỆN TIÊU CHUẨN ĐI KÈM */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            🎁 Phụ kiện đi kèm theo máy:
                          </span>
                          {unit.accessories.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleAllAccessories(i, !unit.present.every(Boolean))}
                              className="text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {unit.present.every(Boolean) ? 'Bỏ chọn tất cả' : '✓ Chọn tất cả'}
                            </button>
                          )}
                        </div>

                        {unit.accessories.length === 0 ? (
                          <span className="text-xs text-slate-400">Không có phụ kiện tiêu chuẩn khai báo.</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {unit.accessories.map((a, j) => (
                              <label
                                key={a.id || j}
                                className={cn(
                                  'flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all',
                                  unit.present[j]
                                    ? 'border-emerald-300 bg-emerald-50 font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 shadow-xs'
                                    : 'border-slate-300 bg-white text-slate-500 dark:border-white/[0.12] dark:bg-transparent dark:text-slate-400',
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="h-3.5 w-3.5 accent-emerald-600 rounded"
                                  checked={unit.present[j]}
                                  onChange={() => toggleAccessory(i, j)}
                                />
                                <span>{a.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* ẢNH RIÊNG & GHI CHÚ */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Ảnh tình trạng riêng:
                            </span>
                            <label className="text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400 cursor-pointer">
                              + Tải ảnh riêng từ máy
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => onPickUnitPhotos(i, e.target.files)}
                              />
                            </label>
                          </div>

                          {unit.photos && unit.photos.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {unit.photos.map((photo, pIdx) => (
                                <div
                                  key={photo.previewUrl || pIdx}
                                  className="group relative h-14 w-14 overflow-hidden rounded-lg border border-slate-300 shadow-xs"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={photo.previewUrl}
                                    alt={photo.name}
                                    className="h-full w-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeUnitPhoto(i, pIdx)}
                                    className="absolute top-0.5 right-0.5 grid h-4 w-4 place-items-center rounded-full bg-red-600 text-[9px] font-bold text-white shadow hover:bg-red-700 cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 mt-1">
                              {commonPhotos.length > 0
                                ? `Đang dùng ${commonPhotos.length} ảnh chung toàn cảnh ở trên`
                                : 'Chưa có ảnh bàn giao'}
                            </p>
                          )}
                        </div>

                        <div>
                          <input
                            className={cn(inputClass, 'w-full text-xs')}
                            value={unit.note}
                            onChange={(e) => patch(i, { note: e.target.value })}
                            placeholder="Ghi chú thêm (nếu có)..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* CỘT XÁC NHẬN BÀN GIAO */}
            <aside className="lg:sticky lg:top-4 lg:self-start">
              <div className={cn(cardClass, 'p-5')}>
                <h2 className="mb-4 text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Xác nhận bàn giao
                </h2>

                <label className="block">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Người nhận thực tế <em className="not-italic text-red-600">*</em>
                  </span>
                  <input
                    className={cn(inputClass, 'mt-1.5 w-full text-sm font-semibold')}
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder="Họ tên người ra kho lấy đồ"
                  />
                  <span className="mt-1 block text-[11px] text-slate-400">
                    Mặc định là người tạo phiếu ({request?.owner_name || 'Người mượn'}).
                  </span>
                </label>

                <dl className="mt-4 flex flex-col gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
                  <div className="flex justify-between items-center">
                    <dt className={keyClass}>Số máy bàn giao</dt>
                    <dd className={valueClass}>{units.length} máy</dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className={keyClass}>Tổng số ảnh bằng chứng</dt>
                    <dd className={valueClass}>
                      {readiness.totalPhotoCount} ảnh
                      {commonPhotos.some((p) => p.isInherited) && (
                        <span className="ml-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          (Tự động)
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className={keyClass}>Phụ kiện chưa tick</dt>
                    <dd
                      className={cn(
                        'text-xs font-bold',
                        readiness.uncheckedAccessoryCount > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400',
                      )}
                    >
                      {readiness.uncheckedAccessoryCount > 0 ? `${readiness.uncheckedAccessoryCount} món` : 'Đầy đủ 100%'}
                    </dd>
                  </div>
                </dl>

                {units.some((u) => !u.assetId) && (
                  <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                    ⚠️ Chưa bàn giao được: Còn {units.filter((u) => !u.assetId).length} thiết bị chưa có số Serial máy (do kho hết máy rảnh). Bạn có thể nhập nhanh số Serial máy mới ở bên trái.
                  </p>
                )}

                {readiness.unitsMissingPhoto.length > 0 && (
                  <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                    ⚠️ Chưa bàn giao được: Hãy chụp 1 ảnh chung ở trên hoặc thêm ảnh riêng cho các máy.
                  </p>
                )}

                <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-300 p-3 text-xs text-slate-700 dark:border-white/[0.12] dark:text-slate-300">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-emerald-600 rounded"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  <span>Tôi xác nhận đã kiểm tra và bàn giao đủ máy, phụ kiện cho người mượn.</span>
                </label>

                <div className="mt-4 flex flex-col gap-2">
                  <button
                    disabled={!readiness.canHandover || saving}
                    onClick={submit}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-white/[0.08] transition-all"
                  >
                    <span>🚀</span>
                    {saving ? 'Đang lưu bàn giao…' : 'Xác nhận bàn giao ngay'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrinting(true)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-slate-200 transition-all"
                  >
                    <span>🖨️</span> In phiếu bàn giao (A4)
                  </button>
                </div>

                {error && (
                  <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                    {error}
                  </p>
                )}
              </div>
            </aside>
          </div>

          <WorkflowSuccessModal
            open={Boolean(done)}
            onClose={() => {
              setDone('');
              refreshCandidates();
            }}
            title="Bàn giao thiết bị thành công!"
            message={done || 'Biên bản bàn giao đã được lưu và thiết bị đã chuyển sang trạng thái Đang mượn.'}
            nextHref="/dashboard/equipment/returns"
            nextLabel="Sang Bước 3: Nhận trả →"
            stayLabel="Tiếp tục bàn giao phiếu khác"
            onPrint={() => {
              setPrinting(true);
            }}
            printLabel="🖨️ In phiếu bàn giao ngay (A4 / Ký nhận)"
          />

          <BorrowPrintModal
            open={printing}
            onClose={() => setPrinting(false)}
            request={request}
            assignedUnits={units.map((u) => ({
              modelName: u.modelName,
              assetCode: u.code,
              serialNumber: u.serialNumber || u.code,
              accessories: u.accessories.filter((_, idx) => u.present[idx]).map((a) => a.name),
              quantity: 1,
              note: u.note,
            }))}
          />
        </>
      )}
    </div>
  );
}

export default function HandoverPage() {
  return (
    <RequireCatalogManager>
      <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải…</div>}>
        <HandoverPageInner />
      </Suspense>
    </RequireCatalogManager>
  );
}
