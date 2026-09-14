'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Wand2, WifiOff, RefreshCw, FileDown } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { IdPhotoPosition } from './constants';
import { EmployeeInfoFields, EmployeeInfoValues, isEmployeeInfoValid } from './EmployeeInfoFields';
import { BulkEmployeeCard, BulkPersonRow, BulkCardModel } from './BulkEmployeeCard';
import { BulkResultGrid } from './BulkResultGrid';
import { IdCardPreview, CropControls } from './ExportStep';
import { CROP_DEFAULT, CropTransform } from './crop-math';
import {
  uploadBatchImages,
  createBatch,
  pollIdPhotoBatch,
  retryBatchPerson,
  remergeBatchPerson,
  downloadBatchPdf,
  saveActiveBatch,
  loadActiveBatch,
  clearActiveBatch,
  BatchAbort,
  BatchError,
  BatchGone,
  ID_PHOTO_BATCH_MAX_PEOPLE,
  type BatchStatusResponse,
  type BatchCardInput,
  type BatchCreatePerson,
} from '../bulk/id-photo-batch';

let _keySeq = 0;
const newKey = () => `c${Date.now().toString(36)}-${_keySeq++}`;

const INITIAL_POSITION: IdPhotoPosition = 'NEW_STAFF_1_3M';

function emptyCard(): BulkCardModel {
  return {
    key: newKey(),
    file: null,
    previewUrl: null,
    values: {
      employeeName: '',
      employeeTeam: '',
      employeeId: '',
      position: INITIAL_POSITION,
    },
  };
}

type Phase = 'editing' | 'submitting' | 'running' | 'done';

// ── API adapters ────────────────────────────────────────────────────────────
const uploadOne = async (file: File): Promise<string> => {
  const fd = new FormData();
  fd.append('file', file);
  const res = await apiClient.post('/id-photo/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.uploadId;
};

const postCreateBatch = async (people: BatchCreatePerson[]) => {
  const res = await apiClient.post('/id-photo/batch', { people });
  return res.data as { batchJobId: string };
};

const getBatchStatus = async (batchJobId: string): Promise<BatchStatusResponse> => {
  const res = await apiClient.get(`/id-photo/batch/${batchJobId}`);
  return res.data;
};

export function BulkTab() {
  const [phase, setPhase] = useState<Phase>('editing');
  const [cards, setCards] = useState<BulkCardModel[]>(() => [emptyCard()]);

  const [batchStatus, setBatchStatus] = useState<BatchStatusResponse | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [remergingIds, setRemergingIds] = useState<Set<string>>(new Set());

  const [uploadHint, setUploadHint] = useState<string | null>(null);
  const [transientOffline, setTransientOffline] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const [editPersonId, setEditPersonId] = useState<string | null>(null);
  // Vừa mount + có batchJobId trong localStorage → hiện skeleton NGAY, trước khi poll đầu tiên
  // trả về (nếu không: rời tab rồi quay lại là màn trống ~1-4s cho tới khi API xong).
  const [resuming, setResuming] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Khoá đồng bộ chống double-submit (state disable chỉ có tác dụng ở render sau).
  const submittingRef = useRef(false);
  // requestId cho vòng poll — mọi callback của lượt cũ tự nhận ra mình lỗi thời.
  const pollReqRef = useRef(0);
  const thumbFetchingRef = useRef<Set<string>>(new Set());
  // Bản sao `thumbs` đọc trong callback poll (vốn được memo hoá, closure `thumbs` dễ cũ) —
  // tránh fetch lại thumbnail đã có. Cùng lý do đọc-qua-ref của bug progress store bên BE.
  const thumbsRef = useRef<Record<string, string>>({});
  // object URL của preview ảnh card — revoke khi gỡ card / unmount để không rò rỉ.
  const objectUrlsRef = useRef<Set<string>>(new Set());

  const objectUrlsSnapshot = objectUrlsRef.current;
  useEffect(() => {
    return () => {
      pollReqRef.current += 1; // stale vòng poll đang chạy
      objectUrlsSnapshot.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [objectUrlsSnapshot]);

  useEffect(() => {
    thumbsRef.current = thumbs;
  }, [thumbs]);

  // ── Tải thumbnail thật cho người đã SUCCESS (batch status không kèm ảnh) ──
  const syncThumbs = useCallback((people: BatchStatusResponse['people']) => {
    for (const p of people) {
      if (p.status !== 'SUCCESS') continue;
      if (thumbsRef.current[p.id] || thumbFetchingRef.current.has(p.id)) continue;
      thumbFetchingRef.current.add(p.id);
      apiClient
        .get(`/id-photo/${p.id}`)
        .then((res) => {
          const data: string | null = res.data?.processed_image_data ?? null;
          if (data) setThumbs((prev) => ({ ...prev, [p.id]: data }));
        })
        .catch(() => {
          /* thumbnail hỏng không phải lỗi chặn luồng — ô vẫn hiện spinner nhẹ */
        })
        .finally(() => thumbFetchingRef.current.delete(p.id));
    }
  }, []);

  const startPolling = useCallback((batchJobId: string) => {
    const myReq = ++pollReqRef.current;
    setPollError(null);
    setPhase('running');

    pollIdPhotoBatch(getBatchStatus, batchJobId, {
      isStale: () => myReq !== pollReqRef.current,
      onUpdate: (r) => {
        if (myReq !== pollReqRef.current) return;
        setTransientOffline(false);
        setResuming(false); // đã có dữ liệu thật → bỏ skeleton
        setBatchStatus(r);
        syncThumbs(r.people);
      },
      onTransientError: () => {
        if (myReq === pollReqRef.current) setTransientOffline(true);
      },
    })
      .then((final) => {
        if (myReq !== pollReqRef.current) return;
        clearActiveBatch();
        setResuming(false);
        setPhase('done');
        const failed = final.counts.failed;
        if (final.status === 'FAILED') {
          toast.error('Batch bị gián đoạn ở máy chủ. Bấm "Thử lại" trên từng ảnh còn lỗi.');
        } else if (failed > 0) {
          toast(`Xong — ${final.counts.success}/${final.totalCount} ảnh thành công, ${failed} ảnh lỗi.`);
        } else {
          toast.success(`Đã tạo xong ${final.totalCount} ảnh thẻ.`);
        }
      })
      .catch((err) => {
        if (err instanceof BatchAbort || myReq !== pollReqRef.current) return;
        clearActiveBatch();
        setResuming(false);
        // Batch cũ trong localStorage đã hết hạn / không còn → về màn nhập, không dựng lỗi to.
        if (err instanceof BatchGone) {
          setBatchStatus(null);
          setPhase('editing');
          toast('Batch trước đó đã hết hạn theo dõi. Bạn có thể tạo đợt mới.');
          return;
        }
        setPhase('done');
        setPollError(err instanceof BatchError ? err.message : 'Lỗi theo dõi tiến độ batch. Tải lại trang.');
      });
  }, [syncThumbs]);

  // ── Resume: mở lại tab / F5 giữa chừng → tiếp tục poll đúng batch ──────────
  useEffect(() => {
    const active = loadActiveBatch();
    if (active) {
      setResuming(true); // skeleton hiện ngay ở lần render tiếp theo, không chờ API
      startPolling(active.batchJobId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Chỉnh sửa danh sách card (giai đoạn nhập liệu) ────────────────────────
  const patchCard = (key: string, patch: Partial<BulkCardModel>) =>
    setCards((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const setCardFile = (key: string, file: File) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.key !== key) return c;
        if (c.previewUrl) {
          URL.revokeObjectURL(c.previewUrl);
          objectUrlsRef.current.delete(c.previewUrl);
        }
        const url = URL.createObjectURL(file);
        objectUrlsRef.current.add(url);
        return { ...c, file, previewUrl: url };
      }),
    );
  };

  const addCardAfter = (key: string) =>
    setCards((prev) => {
      if (prev.length >= ID_PHOTO_BATCH_MAX_PEOPLE) {
        toast.error(`Tối đa ${ID_PHOTO_BATCH_MAX_PEOPLE} người/lần.`);
        return prev;
      }
      const i = prev.findIndex((c) => c.key === key);
      const next = [...prev];
      next.splice(i + 1, 0, emptyCard());
      return next;
    });

  const removeCard = (key: string) =>
    setCards((prev) => {
      const c = prev.find((x) => x.key === key);
      if (c?.previewUrl) {
        URL.revokeObjectURL(c.previewUrl);
        objectUrlsRef.current.delete(c.previewUrl);
      }
      const next = prev.filter((x) => x.key !== key);
      return next.length ? next : [emptyCard()];
    });

  const readyCount = cards.filter(
    (c) => c.file && c.values.employeeName.trim() && c.values.employeeTeam.trim() && c.values.employeeId.trim(),
  ).length;
  const canSubmit =
    phase === 'editing' && cards.length > 0 && cards.length <= ID_PHOTO_BATCH_MAX_PEOPLE && readyCount === cards.length;

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleCreateBatch = async () => {
    if (submittingRef.current || !canSubmit) return;
    submittingRef.current = true;
    setPhase('submitting');
    setUploadHint('Đang tải ảnh lên...');
    try {
      const inputs: BatchCardInput[] = cards.map((c) => ({
        key: c.key,
        file: c.file,
        employeeName: c.values.employeeName,
        employeeTeam: c.values.employeeTeam,
        employeeId: c.values.employeeId,
        position: c.values.position,
      }));

      const people = await uploadBatchImages(uploadOne, inputs, (p) =>
        setUploadHint(`Đang tải ảnh ${p.done}/${p.total} — ${p.name}`),
      );
      setUploadHint('Đang khởi tạo batch...');
      const batchJobId = await createBatch(postCreateBatch, people);

      saveActiveBatch({ batchJobId, startedAt: Date.now() });
      // Hiện lưới N ô PENDING ngay, chờ poll đầu tiên thay bằng dữ liệu thật.
      setBatchStatus({
        id: batchJobId,
        status: 'PENDING',
        totalCount: people.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        counts: { pending: people.length, processing: 0, success: 0, failed: 0 },
        people: people.map((p, i) => ({
          id: `seed-${i}`,
          employee_name: p.employeeName,
          employee_team: p.employeeTeam,
          employee_id: p.employeeId,
          position: p.position,
          status: 'PENDING' as const,
          error_message: null,
          pdf_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
      });
      startPolling(batchJobId);
    } catch (err: any) {
      setPhase('editing');
      toast.error(err instanceof BatchError ? err.message : 'Tạo batch thất bại, vui lòng thử lại.');
    } finally {
      submittingRef.current = false;
      setUploadHint(null);
    }
  };

  // ── Thử lại (FAILED) / Ghép áo lại (SUCCESS) 1 người ─────────────────────
  // Cả hai: BE đưa người đó về PENDING → worker chạy lại đủ ghép áo → ghép khung → PDF. Poll
  // tự cập nhật lại đúng ô đó, không đụng người khác.
  const requeuePerson = async (
    historyId: string,
    mode: 'retry' | 'remerge',
    busySet: Set<string>,
    setBusy: Dispatch<SetStateAction<Set<string>>>,
  ) => {
    if (!batchStatus || busySet.has(historyId)) return;
    setBusy((prev) => new Set(prev).add(historyId));
    try {
      const call = mode === 'retry' ? retryBatchPerson : remergeBatchPerson;
      await call((path) => apiClient.post(path), batchStatus.id, historyId);
      // Optimistic: ô về PENDING ngay, xoá thumbnail cũ (ảnh sắp bị thay).
      setThumbs((prev) => {
        const next = { ...prev };
        delete next[historyId];
        return next;
      });
      setBatchStatus((prev) =>
        prev
          ? {
              ...prev,
              status: 'PROCESSING',
              people: prev.people.map((p) =>
                p.id === historyId ? { ...p, status: 'PENDING', error_message: null, pdf_url: null } : p,
              ),
            }
          : prev,
      );
      startPolling(batchStatus.id); // batch có thể đã dừng ở COMPLETED → chạy lại vòng poll
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          (mode === 'retry' ? 'Không gửi được yêu cầu thử lại.' : 'Không gửi được yêu cầu ghép áo lại.'),
      );
    } finally {
      setBusy((prev) => {
        const next = new Set(prev);
        next.delete(historyId);
        return next;
      });
    }
  };

  const handleRetry = (historyId: string) => requeuePerson(historyId, 'retry', retryingIds, setRetryingIds);
  const handleRemerge = (historyId: string) => requeuePerson(historyId, 'remerge', remergingIds, setRemergingIds);

  // ── Sửa thông tin 1 người (PATCH /id-photo/:id — chỉ chữ, không đổi ảnh) ──
  const editingPerson = batchStatus?.people.find((p) => p.id === editPersonId) ?? null;

  const handleSaveEdit = async (values: EmployeeInfoValues, crop: CropTransform) => {
    if (!editingPerson) return;
    try {
      await apiClient.patch(`/id-photo/${editingPerson.id}`, {
        employeeName: values.employeeName.trim(),
        employeeTeam: values.employeeTeam.trim(),
        employeeId: values.employeeId.trim(),
        position: values.position,
        cropOffsetX: crop.offsetX,
        cropOffsetY: crop.offsetY,
        cropScale: crop.scale,
      });
      setBatchStatus((prev) =>
        prev
          ? {
              ...prev,
              people: prev.people.map((p) =>
                p.id === editingPerson.id
                  ? {
                      ...p,
                      employee_name: values.employeeName.trim(),
                      employee_team: values.employeeTeam.trim(),
                      employee_id: values.employeeId.trim(),
                      position: values.position,
                      crop_offset_x: crop.offsetX,
                      crop_offset_y: crop.offsetY,
                      crop_scale: crop.scale,
                    }
                  : p,
              ),
            }
          : prev,
      );
      setEditPersonId(null);
      toast.success('Đã cập nhật thông tin thẻ.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Cập nhật thất bại, vui lòng thử lại.');
    }
  };

  // ── Xuất PDF hàng loạt: 1 file gộp N trang, chỉ người SUCCESS ─────────────
  const handleExportBatchPdf = async () => {
    if (!batchStatus || exportingPdf) return;
    setExportingPdf(true);
    const loading = toast.loading('Đang dựng file PDF gộp (đợt lớn có thể mất ~1 phút)...');
    let url: string | null = null;
    try {
      const { blob, exported, skipped } = await downloadBatchPdf(batchStatus.id, {
        success: batchStatus.counts.success,
        failed: batchStatus.counts.failed,
      });

      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `anh-the-hang-loat-${batchStatus.id.slice(0, 8)}.pdf`;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();

      toast.success(
        skipped > 0
          ? `Đã xuất PDF ${exported} người thành công (bỏ qua ${skipped} người lỗi).`
          : `Đã xuất PDF cho ${exported} người.`,
        { id: loading, duration: 6000 },
      );
    } catch (err: any) {
      toast.error(err instanceof BatchError ? err.message : 'Xuất PDF hàng loạt thất bại, vui lòng thử lại.', {
        id: loading,
      });
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url as string), 60_000);
      setExportingPdf(false);
    }
  };

  const startOver = () => {
    pollReqRef.current += 1;
    clearActiveBatch();
    setBatchStatus(null);
    setThumbs({});
    setPollError(null);
    setTransientOffline(false);
    setCards([emptyCard()]);
    setPhase('editing');
  };

  const showForm = phase === 'editing' || phase === 'submitting';
  const submitting = phase === 'submitting';
  const people = batchStatus?.people ?? [];

  // Resume mà poll đầu tiên chưa về → skeleton NGAY, không để màn trống.
  if (resuming && !batchStatus) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,540px)_1fr] gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-[#e2e0ea] bg-[#fcfaff] px-3 py-2.5 text-xs font-medium text-[#464554]">
            <Loader2 className="w-4 h-4 animate-spin text-[#4441cc]" />
            Đang tải lại tiến độ batch đang chạy...
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-[#e2e0ea] bg-white px-3.5 py-2.5">
              <div className="w-9 h-9 rounded-full bg-[#eceef2] animate-pulse flex-none" />
              <div className="h-3 w-32 rounded bg-[#eceef2] animate-pulse" />
              <div className="ml-auto h-4 w-16 rounded-full bg-[#eceef2] animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-dashed border-[#e2e0ea] bg-white aspect-[420/669] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,540px)_1fr] gap-6">
      {/* ══ CỘT TRÁI ══ */}
      <div className="space-y-3">
        {showForm ? (
          <>
            <div className="space-y-4">
              {cards.map((c, i) => (
                <BulkEmployeeCard
                  key={c.key}
                  index={i}
                  model={c}
                  disabled={submitting}
                  onChangeFile={(f) => setCardFile(c.key, f)}
                  onChangeValues={(patch) => patchCard(c.key, { values: { ...c.values, ...patch } })}
                  onAddAfter={() => addCardAfter(c.key)}
                  onRemove={() => removeCard(c.key)}
                />
              ))}
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleCreateBatch}
                disabled={!canSubmit || submitting}
                className="w-full rounded-xl bg-[#4441cc] py-3 text-sm font-bold text-white hover:bg-[#4441cc]/90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {uploadHint ?? 'Đang xử lý...'}
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Tạo hàng loạt ({cards.length} ảnh)
                  </>
                )}
              </button>
              <p className="mt-1.5 text-center text-[11px] text-[#9c9aa8]">
                Bấm <span className="font-semibold">&quot;Thêm nhân viên&quot;</span> ở cuối mỗi card để thêm người · tối đa{' '}
                {ID_PHOTO_BATCH_MAX_PEOPLE} người/lần
                {cards.length > ID_PHOTO_BATCH_MAX_PEOPLE && (
                  <span className="text-[#dc2626]"> — đang có {cards.length}, hãy bớt bớt</span>
                )}
                {readyCount < cards.length && (
                  <span> · còn {cards.length - readyCount} người chưa đủ ảnh/thông tin</span>
                )}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-[#e2e0ea] bg-[#fcfaff] px-3 py-2.5 text-xs text-[#464554]">
              {phase === 'running'
                ? `Đang xử lý ${people.length} người — bạn có thể rời trang, tiến độ vẫn chạy ở máy chủ.`
                : `Đã xử lý xong ${people.length} người.`}
            </div>

            {people.map((p) => (
              <BulkPersonRow
                key={p.id}
                name={p.employee_name}
                position={p.position}
                status={p.status}
                thumbUrl={thumbs[p.id]}
                crop={{ offsetX: p.crop_offset_x ?? 0, offsetY: p.crop_offset_y ?? 0, scale: p.crop_scale ?? 1 }}
                onEdit={
                  (p.status === 'SUCCESS' || p.status === 'FAILED') && !p.id.startsWith('seed-')
                    ? () => setEditPersonId(p.id)
                    : undefined
                }
              />
            ))}

            {phase === 'done' && batchStatus && (
              <div className="pt-1 space-y-2">
                {batchStatus.counts.failed > 0 && batchStatus.counts.success > 0 && (
                  <p className="text-[11px] text-[#9c9aa8]">
                    PDF gộp sẽ có {batchStatus.counts.success} trang, bỏ qua {batchStatus.counts.failed} người lỗi.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {batchStatus.counts.success > 0 && (
                    <button
                      type="button"
                      onClick={handleExportBatchPdf}
                      disabled={exportingPdf}
                      className="rounded-xl bg-[#4441cc] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#4441cc]/90 disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                      {exportingPdf ? 'Đang dựng PDF...' : `Xuất PDF hàng loạt (${batchStatus.counts.success} ảnh)`}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={startOver}
                    className="rounded-xl border border-[#d5d3e0] px-4 py-2.5 text-sm font-semibold text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc]"
                  >
                    Tạo đợt mới
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ CỘT PHẢI ══ */}
      <div className="space-y-3">
        {transientOffline && (
          <div className="flex items-center gap-2 rounded-xl border border-[#f5c518]/50 bg-[#f5c518]/10 px-3 py-2 text-xs font-medium text-[#8a6d00]">
            <WifiOff className="w-4 h-4" />
            Mạng chập chờn — đang thử kết nối lại, batch vẫn chạy ở máy chủ.
          </div>
        )}
        {pollError && (
          <div className="flex items-start gap-2 rounded-xl border border-[#dc2626]/40 bg-[#dc2626]/5 px-3 py-2 text-xs font-medium text-[#dc2626]">
            <RefreshCw className="w-4 h-4 flex-none mt-0.5" />
            <span>{pollError}</span>
          </div>
        )}

        {batchStatus ? (
          <BulkResultGrid
            people={people}
            thumbs={thumbs}
            retryingIds={retryingIds}
            remergingIds={remergingIds}
            onRetry={handleRetry}
            onRemerge={handleRemerge}
          />
        ) : (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#e2e0ea] bg-white p-10 text-center">
            <p className="text-sm font-semibold text-[#1b1b1d]">Lưới kết quả</p>
            <p className="mt-1 text-xs text-[#9c9aa8]">
              {submitting
                ? 'Đang tải ảnh lên máy chủ...'
                : 'Sau khi bấm "Tạo hàng loạt", ảnh của từng người sẽ hiện ở đây theo tiến độ.'}
            </p>
          </div>
        )}
      </div>

      {editingPerson && (
        <EditPersonModal
          person={editingPerson}
          thumbUrl={thumbs[editingPerson.id]}
          onClose={() => setEditPersonId(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}

// ── Modal sửa thông tin 1 người ────────────────────────────────────────────
// Kèm "Điều chỉnh vị trí ảnh trong khung tròn" (yêu cầu 4 — cùng modal có sẵn, không tách
// riêng): thumbUrl (ảnh đã ghép áo, cache sẵn từ syncThumbs) nên bên gọi chỉ SUCCESS mới có ảnh
// để chỉnh — FAILED vẫn sửa được chữ như cũ, chỉ không có phần cropper.
function EditPersonModal({
  person,
  thumbUrl,
  onClose,
  onSave,
}: {
  person: BatchStatusResponse['people'][number];
  thumbUrl?: string;
  onClose: () => void;
  onSave: (v: EmployeeInfoValues, crop: CropTransform) => Promise<void>;
}) {
  const [v, setV] = useState<EmployeeInfoValues>({
    employeeName: person.employee_name,
    employeeTeam: person.employee_team,
    employeeId: person.employee_id,
    position: person.position,
  });
  // Nạp từ giá trị đã biết (chỉ có nếu người này vừa được sửa 1 lần trong phiên hiện tại — xem
  // ghi chú kiểu BatchPersonStatus#crop_offset_x); chưa từng sửa thì mặc định = vị trí gốc,
  // đúng hệt những gì PDF đang thật sự dùng (BE cũng NULL).
  const [crop, setCrop] = useState<CropTransform>({
    offsetX: person.crop_offset_x ?? CROP_DEFAULT.offsetX,
    offsetY: person.crop_offset_y ?? CROP_DEFAULT.offsetY,
    scale: person.crop_scale ?? CROP_DEFAULT.scale,
  });
  const [saving, setSaving] = useState(false);
  const valid = isEmployeeInfoValid(v);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-[#1b1b1d]">Sửa thông tin thẻ</h3>
        <p className="mt-0.5 mb-4 text-xs text-[#9c9aa8]">
          Sửa chữ in trên thẻ hoặc kéo/zoom lại ảnh trong khung tròn. Muốn đổi hẳn ảnh thì dùng nút &quot;Ghép áo lại&quot; ở lưới.
        </p>

        {thumbUrl && (
          <div className="mb-4 space-y-2.5">
            <div className="max-w-[220px] mx-auto">
              <IdCardPreview
                employeeName={v.employeeName}
                employeeTeam={v.employeeTeam}
                employeeId={v.employeeId}
                position={v.position}
                photoUrl={thumbUrl}
                crop={crop}
                onCropChange={setCrop}
              />
            </div>
            <CropControls crop={crop} onChange={setCrop} disabled={saving} />
          </div>
        )}

        {/* Component NGUYÊN BẢN của luồng đơn lẻ (label "Họ và tên"/"Team / Phòng ban"/"Mã nhân
            viên (ID)" + radio "Vị trí công tác") — trước đây modal này tự dựng input/select
            trơn không có label, người dùng không biết ô nào là ô nào. Ép 1 CỘT giống
            BulkEmployeeCard: modal hẹp, 2 cột mặc định của EmployeeInfoFields sẽ chật. */}
        <div className="[&>div]:!grid-cols-1 [&>div]:!gap-5">
          <EmployeeInfoFields
            values={v}
            disabled={saving}
            radioGroupName={`bulk-edit-position-${person.id}`}
            onChange={(patch) => setV((prev) => ({ ...prev, ...patch }))}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#d5d3e0] px-4 py-2 text-sm font-semibold text-[#464554]"
          >
            Huỷ
          </button>
          <button
            type="button"
            disabled={!valid || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(v, crop);
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-lg bg-[#4441cc] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Cập nhật
          </button>
        </div>
      </div>
    </div>
  );
}
