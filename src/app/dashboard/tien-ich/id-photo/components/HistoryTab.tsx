'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Search,
  FileDown,
  Loader2,
  ImageOff,
  Trash2,
  X,
  AlertTriangle,
  History,
  Layers,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api-client';
import { NumberedPagination } from '@/components/ui/NumberedPagination';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import { IdCardPreview } from './ExportStep';
import { downloadBatchPdf, BatchError } from '../bulk/id-photo-batch';
import {
  getPositionOption,
  IdPhotoDetailItem,
  IdPhotoHistoryItem,
  IdPhotoStatus,
} from './constants';

const STATUS_LABEL: Record<IdPhotoStatus, string> = {
  PENDING: 'Đang chờ',
  PROCESSING: 'Đang xử lý',
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
};

const STATUS_CLASS: Record<IdPhotoStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  PROCESSING: 'bg-blue-50 text-blue-600',
  SUCCESS: 'bg-emerald-50 text-emerald-600',
  FAILED: 'bg-rose-50 text-rose-600',
};

const LIMIT = 10;

/**
 * Giữ blob URL sống thêm một lúc rồi mới thu hồi: revoke ngay sau khi bấm tải sẽ làm một số
 * trình duyệt (Firefox) huỷ luôn file đang ghi. Có TTL nên bấm nhiều dòng vẫn không tích luỹ
 * blob trong RAM tab như bản cũ (tạo mỗi lần bấm, không revoke bao giờ).
 */
const BLOB_TTL_MS = 60_000;

/** Tên file người dùng đọc được — mặc định của BE là the-nhan-vien-<uuid>.pdf, nhìn không ra ai. */
const buildPdfFileName = (item: IdPhotoHistoryItem) => {
  const slug = (s: string) =>
    (s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // bỏ dấu tiếng Việt sau khi tách tổ hợp
      .replace(/[đĐ]/g, 'd') // đ/Đ không có dạng tổ hợp nên phải thay tay
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
  const parts = [slug(item.employee_name) || 'nhan-vien', slug(item.employee_id)].filter(Boolean);
  return `the-nhan-vien-${parts.join('-')}.pdf`;
};

/** Các ô chỉ đọc trong modal chi tiết. Lấy chữ từ DÒNG BẢNG (có ngay).
 *  (Field "Tiền tố chức danh" đã bỏ hẳn — không ghép vào tên nữa.) */
const DETAIL_FIELDS = (row: IdPhotoHistoryItem, detail: IdPhotoDetailItem | null) => [
  {
    label: 'Họ và tên',
    value: row.employee_name,
  },
  { label: 'Team / Khối', value: row.employee_team },
  { label: 'Mã nhân viên (ID)', value: row.employee_id },
  { label: 'Cấp bậc / Vị trí', value: getPositionOption(row.position).label },
  { label: 'Người tạo', value: row.createdByUser?.full_name || row.createdByUser?.email || '—' },
  { label: 'Ngày tạo', value: new Date(row.created_at).toLocaleString('vi-VN') },
  { label: 'Cập nhật lần cuối', value: new Date(row.updated_at).toLocaleString('vi-VN') },
];

/** Tab "Lịch sử" của khu Tạo ảnh thẻ nhân viên — trước đây là route riêng
 *  (/dashboard/tien-ich/id-photo/history) điều hướng qua IdPhotoSidebar, nay là 1 trong 3 tab
 *  ngang trên cùng 1 trang, cùng kiểu chuyển tab với khu "Chuyển đổi nội dung". */
export function HistoryTab() {
  // Phân quyền xoá phải khớp ĐÚNG luật ở BE (IdPhotoService#remove): ADMIN xoá được tất cả,
  // LEADER chỉ xoá được bản ghi mình tạo. Đây chỉ là lớp UX — ẩn nút thay vì để người dùng bấm
  // rồi ăn 403; BE mới là chốt chặn thật.
  const { user } = useAuthStore();
  const isAdmin = user?.roles?.includes(UserRole.ADMIN) ?? false;
  const canDelete = (item: IdPhotoHistoryItem) => isAdmin || item.created_by === user?.id;

  const [items, setItems] = useState<IdPhotoHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // ── Lọc theo 1 đợt "Tạo hàng loạt" (client-side) ──
  // Khi bật: nạp lại danh sách với limit lớn (đủ bao trọn 1 đợt ≤20 người, các dòng con của
  // đợt luôn liền kề nhau do tạo trong vài giây) rồi lọc trong JS — KHÔNG endpoint mới.
  const [batchFilter, setBatchFilter] = useState<string | null>(null);
  const [exportingBatch, setExportingBatch] = useState(false);
  const exportingBatchRef = useRef(false);

  // ── Xem chi tiết ──
  // Giữ CẢ dòng trong danh sách (`detailRow`) lẫn payload đầy đủ (`detail`): dòng có ngay lập
  // tức nên modal mở ra là đã hiện đủ chữ, chỉ riêng khung thẻ chờ ảnh về — thay vì modal trống
  // trơn vài trăm ms. `detailRow` cũng là thứ truyền cho handleDownload (nút Tải trong modal).
  const [detailRow, setDetailRow] = useState<IdPhotoHistoryItem | null>(null);
  const [detail, setDetail] = useState<IdPhotoDetailItem | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const detailRequestId = useRef(0);

  // ── Xoá ──
  const [deleteTarget, setDeleteTarget] = useState<IdPhotoHistoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const isDeletingRef = useRef(false);

  const requestId = useRef(0);
  // Khoá bằng REF chứ không dựa vào state/disabled: setState là bất đồng bộ nên double-click
  // nhanh (hoặc bấm sang dòng khác ngay) vẫn lọt qua, mỗi lần lọt là thêm 1 lần BE dựng PDF.
  const downloadingRef = useRef<string | null>(null);
  // Các blob URL đang chờ thu hồi -> timer của nó, để dọn sạch khi rời trang.
  const pendingBlobs = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const fetchHistory = useCallback(async (p: number, q: string, forBatch: string | null) => {
    const id = ++requestId.current;
    setIsLoading(true);
    try {
      const res = await apiClient.get('/id-photo/history', {
        // forBatch: kéo 1 trang lớn (limit tối đa BE cho = 100) để lọc client-side, bỏ search.
        params: forBatch ? { page: 1, limit: 100 } : { page: p, limit: LIMIT, search: q || undefined },
      });
      if (id !== requestId.current) return;
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err: any) {
      if (id !== requestId.current) return;
      toast.error(err.response?.data?.message || 'Không tải được lịch sử ảnh thẻ');
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(page, search, batchFilter);
  }, [page, batchFilter, fetchHistory]);

  // Rời trang giữa chừng thì thu hồi ngay mọi blob còn treo, không đợi hết TTL.
  useEffect(() => {
    const pending = pendingBlobs.current;
    return () => {
      pending.forEach((timer, url) => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
      });
      pending.clear();
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    if (batchFilter) {
      setBatchFilter(null); // tìm kiếm thoát chế độ lọc theo đợt (useEffect tự nạp lại)
    } else {
      fetchHistory(1, search, null);
    }
  };

  const releaseBlobLater = (url: string) => {
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url);
      pendingBlobs.current.delete(url);
    }, BLOB_TTL_MS);
    pendingBlobs.current.set(url, timer);
  };

  /**
   * Mở modal chi tiết. Ảnh đã ghép áo KHÔNG có trong danh sách (BE cố ý không select
   * processed_image_data cho endpoint phân trang vì mỗi field base64 nặng vài MB), nên phải
   * gọi thêm GET /id-photo/:id ở đây.
   *
   * Race-guard bằng detailRequestId theo đúng pattern của fetchHistory: bấm nhanh dòng A rồi
   * dòng B, nếu response của A về sau thì phải bị bỏ qua chứ không được ghi đè lên B.
   */
  const openDetail = async (item: IdPhotoHistoryItem) => {
    const rid = ++detailRequestId.current;
    setDetailRow(item);
    setDetail(null);
    setIsLoadingDetail(true);
    try {
      const res = await apiClient.get(`/id-photo/${item.id}`);
      if (rid !== detailRequestId.current) return;
      setDetail(res.data);
    } catch (err: any) {
      if (rid !== detailRequestId.current) return;
      toast.error(err.response?.data?.message || 'Không tải được chi tiết ảnh thẻ');
    } finally {
      if (rid === detailRequestId.current) setIsLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    // Tăng id để response đang bay về không mở lại modal vừa đóng.
    detailRequestId.current += 1;
    setDetailRow(null);
    setDetail(null);
    setIsLoadingDetail(false);
  };

  /**
   * Xoá hẳn bản ghi (BE hard delete). Chặn bấm trùng bằng REF chứ không dựa vào disabled — cùng
   * lý do như handleDownload: setState bất đồng bộ nên hai cú click trong cùng một tick vẫn lọt,
   * và lần thứ hai sẽ ăn 404 vì bản ghi đã biến mất.
   */
  const handleDelete = async () => {
    const target = deleteTarget;
    if (!target || isDeletingRef.current) return;
    isDeletingRef.current = true;
    setIsDeleting(true);

    const loadingToast = toast.loading('Đang xoá...');
    try {
      await apiClient.delete(`/id-photo/${target.id}`);
      toast.success(`Đã xoá ảnh thẻ của "${target.employee_name}".`, { id: loadingToast });
      setDeleteTarget(null);
      if (detailRow?.id === target.id) closeDetail();

      // Xoá dòng CUỐI CÙNG của một trang > 1 thì trang đó thành rỗng — lùi về trang trước thay
      // vì để người dùng nhìn bảng trắng và tự bấm. setPage tự kích hoạt useEffect nạp lại,
      // nên nhánh này KHÔNG gọi fetchHistory nữa (gọi cả hai sẽ thành 2 request thừa).
      if (items.length === 1 && page > 1 && !batchFilter) {
        setPage(page - 1);
      } else {
        fetchHistory(page, search, batchFilter);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Xoá không thành công, vui lòng thử lại.', {
        id: loadingToast,
      });
    } finally {
      isDeletingRef.current = false;
      setIsDeleting(false);
    }
  };

  const handleDownload = async (item: IdPhotoHistoryItem) => {
    if (downloadingRef.current) return;
    downloadingRef.current = item.id;
    setDownloadingId(item.id);

    const loadingToast = toast.loading('Đang chuẩn bị file PDF...');
    let blobUrl: string | null = null;
    try {
      // Chưa export lần nào (pdf_url null) — export trước rồi mới tải, cùng luồng như nút
      // "Xuất file PDF" ở bước 4 trang tạo ảnh thẻ.
      if (!item.pdf_url) {
        const exported = await apiClient.post(`/id-photo/${item.id}/export-pdf`);
        // Ghi lại pdf_url vào state để lần bấm sau chỉ còn GET, không bắt BE dựng lại PDF.
        const pdfUrl = exported.data?.pdf_url || `/id-photo/${item.id}/pdf-file`;
        setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, pdf_url: pdfUrl } : it)));
      }
      const res = await apiClient.get(`/id-photo/${item.id}/pdf-file`, { responseType: 'blob' });
      blobUrl = URL.createObjectURL(res.data);

      // Bản cũ gọi window.open(blobUrl) ở đây và KHÔNG kiểm tra giá trị trả về. Lệnh này nằm
      // sau 1-2 lần await nên đã mất "user gesture" -> popup blocker chặn, trả null, và vì
      // không ai kiểm tra nên bấm "Tải" trông như không có phản hồi gì.
      //
      // Ở bảng nhiều dòng, "Tải" đúng nghĩa là lưu file về máy, nên dùng thẳng <a download>:
      // click giả lập trên thẻ <a download> KHÔNG bị popup blocker chặn, khỏi cần cả khối
      // cảnh báo + nút dự phòng như ExportStep.tsx (ở đó vẫn cần vì mở tab xem trước).
      const a = document.createElement('a');
      if ('download' in a) {
        a.href = blobUrl;
        a.download = buildPdfFileName(item);
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success('Đã tải file PDF về máy.', { id: loadingToast });
      } else {
        // Trình duyệt quá cũ không hỗ trợ thuộc tính download — quay về mở tab mới, nhưng lần
        // này CÓ kiểm tra null để báo rõ thay vì im lặng.
        const win = window.open(blobUrl, '_blank', 'noopener');
        if (win) {
          toast.success('Đã mở file PDF trong tab mới.', { id: loadingToast });
        } else {
          toast.error('Trình duyệt đã chặn mở tab. Hãy cho phép popup cho trang này rồi bấm "Tải" lại.', {
            id: loadingToast,
            duration: 6000,
          });
        }
      }
    } catch (err: any) {
      // responseType 'blob' khiến lỗi JSON của BE cũng về dưới dạng Blob, không đọc được
      // .message -> rơi về câu mặc định, vẫn hơn là không báo gì.
      toast.error(err.response?.data?.message || 'Không tải được file PDF', { id: loadingToast });
    } finally {
      if (blobUrl) releaseBlobLater(blobUrl);
      downloadingRef.current = null;
      setDownloadingId(null);
    }
  };

  /** Tải 1 file PDF GỘP cho cả đợt đang lọc — tái dùng POST /id-photo/batch/:id/export-pdf. */
  const handleDownloadBatchPdf = async () => {
    if (!batchFilter || exportingBatchRef.current) return;
    exportingBatchRef.current = true;
    setExportingBatch(true);
    const loadingToast = toast.loading('Đang dựng file PDF cả đợt (đợt lớn có thể mất ~1 phút)...');
    let blobUrl: string | null = null;
    try {
      const successCount = displayedItems.filter((i) => i.status === 'SUCCESS').length;
      const { blob, exported, skipped } = await downloadBatchPdf(batchFilter, {
        success: successCount,
        failed: displayedItems.length - successCount,
      });

      blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `anh-the-hang-loat-${batchFilter.slice(0, 8)}.pdf`;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success(
        skipped > 0
          ? `Đã tải PDF ${exported} người thành công (bỏ qua ${skipped} người lỗi).`
          : `Đã tải PDF cả đợt (${exported} người).`,
        { id: loadingToast, duration: 6000 },
      );
    } catch (err: any) {
      toast.error(err instanceof BatchError ? err.message : 'Tải PDF cả đợt thất bại, vui lòng thử lại.', {
        id: loadingToast,
      });
    } finally {
      if (blobUrl) releaseBlobLater(blobUrl);
      exportingBatchRef.current = false;
      setExportingBatch(false);
    }
  };

  // Chế độ lọc: chỉ hiện các dòng cùng batch_job_id (đã nạp sẵn 1 trang lớn ở fetchHistory).
  const displayedItems = batchFilter
    ? items.filter((it) => it.batch_job_id === batchFilter)
    : items;

  return (
    <div className="text-[#1b1b1d]">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h2 className="text-lg font-bold text-[#1b1b1d] flex items-center gap-2">
          <History className="w-5 h-5 text-[#4441cc]" />
          Lịch sử tạo ảnh thẻ
        </h2>
        <span className="text-xs text-[#9c9aa8]">Danh sách ảnh thẻ đã tạo — không giới hạn theo team</span>
      </div>

      {/* Chú thích CỐ ĐỊNH (không phải tooltip) — người dùng biết chỗ bấm mà không cần rê chuột. */}
      <p className="mb-4 text-xs text-[#9c9aa8]">
        Nhấn vào dòng để xem chi tiết ·{' '}
        <span className="font-mono text-[#7c78d4]">#…</span> ở cột &quot;Đợt tạo&quot; để xem cả đợt hàng loạt
      </p>

      <form onSubmit={handleSearchSubmit} className="mb-4 flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#9c9aa8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, mã NV, team..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#d5d3e0] focus:border-[#4441cc] outline-none text-sm"
          />
        </div>
        {/* Nút tìm cũng phải chờ API /id-photo/history như mọi nút khác trong module, nên đổi
            hẳn sang trạng thái loading thay vì đứng im — spinner giữa bảng ở dưới không đủ rõ
            khi bảng đang nằm ngoài tầm mắt. */}
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#4441cc] hover:bg-[#4441cc]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 min-w-[92px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Đang tìm...
            </>
          ) : (
            'Tìm'
          )}
        </button>
      </form>

      {batchFilter && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#4441cc]/30 bg-[#4441cc]/5 px-3 py-2">
          <Layers className="w-4 h-4 text-[#4441cc] flex-none" />
          <span className="text-xs font-semibold text-[#1b1b1d]">
            Đang xem đợt hàng loạt{' '}
            <span className="font-mono text-[#4441cc]">#{batchFilter.slice(0, 6)}</span> —{' '}
            {displayedItems.length} ảnh
            {displayedItems.some((i) => i.status === 'FAILED') && (
              <span className="text-[#dc2626]">
                {' '}
                ({displayedItems.filter((i) => i.status === 'FAILED').length} lỗi)
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={handleDownloadBatchPdf}
            disabled={exportingBatch || !displayedItems.some((i) => i.status === 'SUCCESS')}
            title={
              displayedItems.some((i) => i.status === 'SUCCESS')
                ? '1 file PDF gộp các ảnh thành công trong đợt này'
                : 'Đợt này chưa có ảnh nào thành công'
            }
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#4441cc] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4441cc]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {exportingBatch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            {exportingBatch ? 'Đang dựng...' : 'Tải PDF cả đợt'}
          </button>
          <button
            type="button"
            onClick={() => setBatchFilter(null)}
            className="inline-flex items-center gap-1 rounded-lg border border-[#d5d3e0] px-2.5 py-1.5 text-xs font-semibold text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc] transition-colors"
          >
            <X className="w-3 h-3" />
            Bỏ lọc
          </button>
        </div>
      )}

      <div className="border border-[#e2e0ea] rounded-2xl bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e0ea] text-left text-xs font-semibold text-[#9c9aa8] uppercase tracking-wide">
                <th className="px-4 py-3">Nhân viên</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Mã NV</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Đợt tạo</th>
                <th className="px-4 py-3">Người tạo</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
                {/* cột hẹp cuối chỉ để chứa mũi tên "›" hiện khi hover dòng */}
                <th className="w-6 px-2 py-3" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-[#9c9aa8]">
                    <Loader2 className="w-5 h-5 animate-spin inline-block" />
                  </td>
                </tr>
              ) : displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-[#9c9aa8]">
                    <ImageOff className="w-6 h-6 mx-auto mb-2" />
                    {batchFilter ? 'Không có dòng nào thuộc đợt này' : 'Chưa có ảnh thẻ nào được tạo'}
                  </td>
                </tr>
              ) : (
                displayedItems.map((item) => {
                  const isRowDownloading = downloadingId === item.id;
                  // Bị khoá vì DÒNG KHÁC đang tải — tách riêng để tooltip nói đúng lý do, thay vì
                  // vẫn ghi "Tải file PDF về máy" trên một nút bấm không ăn.
                  const isBlockedByOtherRow = downloadingId !== null && !isRowDownloading;
                  const isNotSuccess = item.status !== 'SUCCESS';

                  return (
                    // Bấm vào CẢ DÒNG để mở chi tiết (hành vi bảng dashboard phổ biến). Các nút
                    // trong cột Thao tác + badge "Đợt tạo" tự stopPropagation để không mở nhầm.
                    <tr
                      key={item.id}
                      onClick={() => openDetail(item)}
                      title="Bấm để xem chi tiết ảnh thẻ"
                      className="group border-b border-[#f0eef5] last:border-0 cursor-pointer hover:bg-[#efecfc] transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{item.employee_name}</td>
                      <td className="px-4 py-3 text-[#464554]">{item.employee_team}</td>
                      <td className="px-4 py-3 text-[#464554]">{item.employee_id}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLASS[item.status]}`}>
                          {STATUS_LABEL[item.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.batch_job_id ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation(); // chỉ lọc theo đợt, KHÔNG mở chi tiết dòng
                              setPage(1);
                              setBatchFilter(item.batch_job_id);
                            }}
                            title={
                              batchFilter === item.batch_job_id
                                ? 'Đang lọc theo đợt này'
                                : 'Xem tất cả ảnh trong đợt này'
                            }
                            disabled={batchFilter === item.batch_job_id}
                            // Hover RIÊNG của badge: đổ nền tím đậm + chữ trắng — khác hẳn hover
                            // nền tím NHẠT của cả dòng, nên đứng ở ranh giới vẫn phân biệt được
                            // "bấm badge để lọc" với "bấm dòng để xem chi tiết".
                            className="inline-flex items-center gap-1 rounded-full border border-[#d5d3e0] bg-white px-2 py-0.5 text-[11px] font-semibold font-mono text-[#4441cc] transition-colors hover:border-[#4441cc] hover:bg-[#4441cc] hover:text-white disabled:opacity-50 disabled:cursor-default disabled:hover:bg-white disabled:hover:text-[#4441cc]"
                          >
                            <Layers className="w-3 h-3 flex-none" />#{item.batch_job_id.slice(0, 6)}
                          </button>
                        ) : (
                          <span className="text-[#c7c4d7]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#464554]">{item.createdByUser?.full_name || item.createdByUser?.email || '—'}</td>
                      <td className="px-4 py-3 text-[#464554] whitespace-nowrap">
                        {new Date(item.created_at).toLocaleString('vi-VN')}
                      </td>
                      {/* Cột "Thao tác": chỉ còn Tải + Xoá. Xoá tách hẳn (đường kẻ + khoảng cách)
                          để giảm bấm nhầm. Cả hai stopPropagation — độc lập với click-row. */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(item);
                            }}
                            // Khoá CẢ BẢNG khi đang tải một dòng: handleDownload chỉ chạy 1 lượt tại
                            // một thời điểm. min-w giữ chỗ để không giật khi đổi "Tải" ↔ "Đang tải...".
                            disabled={downloadingId !== null || isNotSuccess}
                            title={
                              isRowDownloading
                                ? 'Đang chuẩn bị file PDF, vui lòng đợi...'
                                : isNotSuccess
                                ? 'Chỉ tải được ảnh thẻ đã tạo thành công'
                                : isBlockedByOtherRow
                                ? 'Đang tải file của dòng khác, vui lòng đợi...'
                                : 'Tải file PDF về máy'
                            }
                            className={`inline-flex items-center gap-1 text-xs font-semibold min-w-[64px] transition-colors ${
                              isRowDownloading
                                ? 'text-[#4441cc] cursor-wait'
                                : 'text-[#4441cc] hover:text-[#4441cc]/80 disabled:opacity-30 disabled:cursor-not-allowed'
                            }`}
                          >
                            {isRowDownloading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin flex-none" />
                                Đang tải...
                              </>
                            ) : (
                              <>
                                <FileDown className="w-3.5 h-3.5 flex-none" />
                                Tải
                              </>
                            )}
                          </button>

                          {/* Vùng Xoá — tách hẳn: có khoảng cách + đường kẻ dọc trước Xoá. Nút chỉ
                              hiện với người xoá được, nhưng vùng luôn giữ min-w để "Tải" các dòng
                              thẳng hàng. */}
                          <div
                            className={`ml-3 flex justify-end min-w-[58px] ${
                              canDelete(item) ? 'pl-3 border-l border-[#e2e0ea]' : ''
                            }`}
                          >
                            {canDelete(item) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget(item);
                                }}
                                disabled={downloadingId !== null}
                                title={
                                  downloadingId !== null
                                    ? 'Đang tải file, vui lòng đợi...'
                                    : 'Xoá vĩnh viễn bản ghi ảnh thẻ này'
                                }
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#9c9aa8] hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-[#9c9aa8] transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 flex-none" />
                                Xoá
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Mũi tên gợi ý "bấm được cả dòng" — LUÔN hiện (mờ 40%), đậm lên khi hover. */}
                      <td className="w-6 pr-3 text-right align-middle">
                        <ChevronRight className="inline w-4 h-4 text-[#8b86c4] opacity-40 group-hover:opacity-100 transition-opacity" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!batchFilter && totalPages > 1 && (
        <div className="mt-4 flex justify-between items-center">
          <p className="text-xs text-[#9c9aa8]">{total} bản ghi</p>
          <NumberedPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* ── Modal XEM CHI TIẾT ─────────────────────────────────────────────────────────────
          Dùng lại IdCardPreview của bước 4 (ExportStep) chứ không vẽ lại khung thẻ ở đây: một
          bản sao thứ hai sẽ trôi lệch khỏi bố cục PDF bên BE ngay lần chỉnh toạ độ đầu tiên. */}
      {detailRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDetail} />
          <div className="relative bg-white border border-[#c7c4d7] text-[#1b1b1d] w-full max-w-3xl rounded-[32px] shadow-2xl p-6 md:p-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[#eae7ea] flex-none">
              <div>
                <h3 className="text-base font-bold">Chi tiết ảnh thẻ</h3>
                <p className="text-xs text-[#9c9aa8] mt-0.5">{detailRow.employee_name}</p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="w-8 h-8 rounded-full bg-[#f6f3f5] hover:bg-[#eae7ea] text-[#464554] hover:text-[#1b1b1d] flex items-center justify-center transition-colors"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 mt-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Khung thẻ — CHỈ phần này phải chờ API, phần chữ bên phải đã có sẵn từ dòng bảng */}
                <div className="border border-[#e2e0ea] rounded-2xl bg-[#fafafb] p-5 flex items-center justify-center min-h-[300px]">
                  {isLoadingDetail ? (
                    <div className="flex flex-col items-center gap-2.5">
                      <Loader2 className="w-7 h-7 animate-spin text-[#4441cc]" />
                      <p className="text-xs text-[#464554] font-medium">Đang tải ảnh thẻ...</p>
                    </div>
                  ) : detail?.processed_image_data ? (
                    <IdCardPreview
                      employeeName={detail.employee_name}
                      employeeTeam={detail.employee_team}
                      employeeId={detail.employee_id}
                      position={detail.position}
                      photoUrl={detail.processed_image_data}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center px-4">
                      <ImageOff className="w-7 h-7 text-[#c7c4d7]" />
                      <p className="text-xs text-[#9c9aa8]">
                        Bản ghi này chưa có ảnh đã ghép áo nên không dựng được khung thẻ.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3.5">
                  {DETAIL_FIELDS(detailRow, detail).map(({ label, value }) => (
                    <div key={label}>
                      <label className="block text-xs font-semibold text-[#464554] mb-1.5">{label}</label>
                      <div className="w-full px-3.5 py-2.5 rounded-xl border border-[#e2e0ea] bg-[#fafafb] text-sm text-[#1b1b1d] break-words">
                        {value}
                      </div>
                    </div>
                  ))}

                  <div>
                    <label className="block text-xs font-semibold text-[#464554] mb-1.5">Trạng thái</label>
                    <div>
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_CLASS[detailRow.status]}`}>
                        {STATUS_LABEL[detailRow.status]}
                      </span>
                    </div>
                  </div>

                  {/* error_message đã nằm sẵn trong DB và trong payload nhưng trước đây KHÔNG được
                      hiển thị ở đâu cả — dòng "Thất bại" ngoài bảng không cho biết vì sao hỏng. */}
                  {detailRow.error_message && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-none mt-0.5" />
                        <div>
                          <p className="text-[11px] font-semibold text-rose-900">Lý do thất bại</p>
                          <p className="text-[11px] text-rose-800 leading-relaxed mt-0.5 break-words">
                            {detailRow.error_message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-5 mt-1 border-t border-[#eae7ea] flex-none">
              <button
                type="button"
                onClick={closeDetail}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#d5d3e0] text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc] transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => handleDownload(detailRow)}
                disabled={downloadingId !== null || detailRow.status !== 'SUCCESS'}
                title={detailRow.status !== 'SUCCESS' ? 'Chỉ tải được ảnh thẻ đã tạo thành công' : 'Tải file PDF về máy'}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-[#4441cc] transition-colors flex items-center justify-center gap-2 min-w-[152px] ${
                  downloadingId === detailRow.id
                    ? 'cursor-wait'
                    : 'hover:bg-[#4441cc]/90 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                {downloadingId === detailRow.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin flex-none" />
                    Đang tải...
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 flex-none" />
                    Tải file PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal XÁC NHẬN XOÁ ────────────────────────────────────────────────────────────
          Xoá là hard delete bên BE, không có thùng rác để khôi phục — nên bắt xác nhận một
          nhịp và nói thẳng điều đó, cùng tinh thần với xác nhận "Ghép áo lại" ở bước 4. */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeleteTarget(null)}
          />
          <div className="relative bg-white border border-[#c7c4d7] w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-5 h-5 flex-none" />
              <h3 className="text-sm font-bold">Xoá ảnh thẻ này?</h3>
            </div>
            <p className="text-xs text-[#464554] leading-relaxed">
              Sắp xoá bản ghi của{' '}
              <strong className="text-[#1b1b1d]">
                {deleteTarget.employee_name} — {deleteTarget.employee_team} ({deleteTarget.employee_id})
              </strong>
              . Cả ảnh gốc, ảnh đã ghép áo và file PDF đều bị xoá vĩnh viễn,{' '}
              <span className="font-semibold text-rose-700">không khôi phục lại được</span>. Muốn giữ file thì
              bấm &quot;Huỷ&quot; rồi tải PDF về trước.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-[#d5d3e0] text-[#464554] text-xs font-bold hover:bg-[#f6f3f5] disabled:opacity-50 transition-colors"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className={`px-4 py-2.5 rounded-xl text-white text-xs font-bold bg-rose-600 transition-colors flex items-center justify-center gap-1.5 min-w-[122px] ${
                  isDeleting ? 'cursor-wait' : 'hover:bg-rose-700'
                }`}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin flex-none" />
                    Đang xoá...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 flex-none" />
                    Xoá vĩnh viễn
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
