'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ImagePlus, Images, History, BarChart3 } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import { Stepper } from './components/Stepper';
import { UploadStep } from './components/UploadStep';
import { MergeOutfitStep, MergeStatus } from './components/MergeOutfitStep';
import { InfoStep } from './components/InfoStep';
import { ExportStep } from './components/ExportStep';
import { EmployeeInfoValues } from './components/EmployeeInfoFields';
import { IdPhotoPosition } from './components/constants';
import { HistoryTab } from './components/HistoryTab';
import { StatsTab } from './components/StatsTab';

/**
 * 1 DÒNG tab ngang duy nhất trên trang — thay cho IdPhotoSidebar cũ (3 route riêng biệt điều
 * hướng qua sidebar dọc) VÀ thay cho cặp tab lồng nhau trước đó (tab lớn "Tạo ảnh thẻ" chứa
 * tiếp 2 tab con "Tạo ảnh thẻ/Tạo hàng loạt" bên trong — nhìn như 2 hàng tab chồng lên nhau).
 * "Tạo hàng loạt" giờ lên thẳng hàng với Lịch sử/Thống kê, không còn lồng cấp 2 nữa.
 *
 * Cùng kiểu chuyển tab với khu "Chuyển đổi content" (dashboard/ai/content-transform/page.tsx
 * #activeTab): state cục bộ + đồng bộ 2 chiều với query `?tab=` để giữ được deep-link (vd link
 * "Thống kê" ở menu header cho tài khoản Manager).
 */
type ModuleTab = 'single' | 'bulk' | 'history' | 'stats';

const MODULE_TAB_VALUES: ModuleTab[] = ['single', 'bulk', 'history', 'stats'];

function moduleTabFromSearchParam(tab: string | null): ModuleTab | null {
  if (!tab) return null;
  return MODULE_TAB_VALUES.includes(tab as ModuleTab) ? (tab as ModuleTab) : null;
}

const INITIAL_POSITION: IdPhotoPosition = 'NEW_STAFF_1_3M';

/**
 * Đổi lỗi kỹ thuật của bước ghép áo thành câu người dùng đọc được — tuyệt đối không để lọt mã
 * lỗi HTTP, stack trace hay message hạ tầng ra UI.
 *
 * Chia theo tầng thay vì liệt kê từng mã: lỗi 4xx là lỗi NGHIỆP VỤ do chính BE của mình sinh ra
 * (vd uploadId hết hạn sau 30 phút) — message đã là tiếng Việt rõ nghĩa nên hiện thẳng cho người
 * dùng biết đường xử lý. Còn 5xx là lỗi hạ tầng, message có thể là chuỗi kỹ thuật lọt từ Gemini
 * hoặc tầng mạng ("connect ECONNREFUSED…") nên luôn thay bằng câu chung.
 */
function toFriendlyMergeError(err: any): string {
  const status: number | undefined = err?.response?.status;

  // Hai mã đã gặp thật khi chạy end-to-end với Gemini, tách riêng vì cách xử lý của người dùng khác nhau.
  if (status === 503) return 'Dịch vụ AI đang quá tải, vui lòng thử lại sau ít phút.';
  if (status === 504) return 'AI xử lý ảnh lâu hơn bình thường và đã bị huỷ. Vui lòng bấm "Thử lại".';

  // Timeout/mất mạng ở phía trình duyệt — không có response để đọc.
  if (err?.code === 'ECONNABORTED') return 'Quá thời gian chờ phản hồi. Vui lòng thử lại.';
  if (!err?.response) return 'Không kết nối được tới máy chủ. Kiểm tra mạng rồi thử lại.';

  if (status && status >= 400 && status < 500) {
    const msg = err.response?.data?.message;
    if (typeof msg === 'string' && msg.trim()) return msg;
    return 'Ảnh không hợp lệ hoặc phiên tải ảnh đã hết hạn. Vui lòng chọn lại ảnh.';
  }

  return 'Ghép áo không thành công. Vui lòng thử lại.';
}

function IdPhotoPageContent() {
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname() || '/dashboard/tien-ich/id-photo';
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  // Khớp @Roles ở IdPhotoController bên BE (xem layout.tsx): MANAGER chỉ mở được
  // /id-photo/history/team-summary, nên chỉ được thấy đúng 1 tab "Thống kê" — 2 tab kia sẽ ăn
  // 403 nếu cố bấm vào. Đây chỉ là lớp UX ẩn tab, BE mới là chốt chặn thật.
  const statsOnly =
    !(user?.roles?.some((r) => [UserRole.LEADER, UserRole.ADMIN].includes(r)) ?? false) &&
    (user?.roles?.includes(UserRole.MANAGER) ?? false);

  const [activeTab, setActiveTab] = useState<ModuleTab>(
    () => (statsOnly ? 'stats' : moduleTabFromSearchParam(tabParam) ?? 'single'),
  );

  // Đồng bộ khi query đổi (vd bấm link "Thống kê" ở menu header trong khi trang đã mở sẵn).
  useEffect(() => {
    const next = moduleTabFromSearchParam(tabParam);
    if (next && next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  // Manager chỉ có 1 tab — ép về "Thống kê" nếu vì lý do gì đó state/URL đang trỏ tab khác.
  useEffect(() => {
    if (statsOnly && activeTab !== 'stats') setActiveTab('stats');
  }, [statsOnly, activeTab]);

  const handleTabChange = (tab: ModuleTab) => {
    if (statsOnly && tab !== 'stats') return;
    setActiveTab(tab);
    const query = tab === 'single' ? '' : `?tab=${tab}`;
    router.replace(`${pathname}${query}`, { scroll: false });
  };

  const [step, setStep] = useState<number>(1);

  // ── Bước 1: ảnh gốc ──
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);
  // object URL tự tạo ở FE (URL.createObjectURL) — phải revoke khi đổi ảnh để không rò rỉ bộ nhớ.
  const objectUrlRef = useRef<string | null>(null);

  // ── Bước 2: ghép áo ──
  const [mergeStatus, setMergeStatus] = useState<MergeStatus>('processing');
  const [mergedImageData, setMergedImageData] = useState<string | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const mergeAbortRef = useRef<AbortController | null>(null);
  // Đếm tăng dần mỗi lượt merge — cho phép catch/finally của 1 lượt tự nhận ra mình đã lỗi thời
  // (bị huỷ bởi lượt sau/nút Huỷ), cùng pattern với transcribeRequestId ở content-transform.
  const mergeRequestId = useRef(0);

  // ── Bước 3: thông tin nhân viên ──
  const [employeeName, setEmployeeName] = useState('');
  const [employeeTeam, setEmployeeTeam] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  // Tuỳ chọn — bỏ trống thì BE lưu null và thẻ in mỗi tên (xem CreateIdPhotoDto).
  const [employeeTitlePrefix, setEmployeeTitlePrefix] = useState('');
  const [position, setPosition] = useState<IdPhotoPosition>(INITIAL_POSITION);
  const [isCreating, setIsCreating] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);

  // ── Bước 4: xuất PDF ──
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  // Blob URL của PDF đã xuất — giữ lại để người dùng còn bấm "Mở lại"/"Tải xuống" bao nhiêu
  // lần cũng được mà không phải gọi lại API.
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  // window.open trả null nghĩa là trình duyệt đã CHẶN tab tự mở — phải hiện nút cho người
  // dùng tự bấm, nếu không họ chỉ thấy toast báo thành công mà chẳng có file nào hiện ra.
  const [popupBlocked, setPopupBlocked] = useState(false);
  const pdfBlobUrlRef = useRef<string | null>(null);

  // ── Bước 4: sửa lại tại chỗ (không phải làm lại từ đầu) ──
  // Bản nháp tách riêng khỏi state đã lưu ở trên: bấm "Huỷ" là bỏ sạch thay đổi, và các ô chỉ
  // đọc / tên file PDF vẫn bám theo dữ liệu THẬT đang có trong DB chừng nào chưa bấm "Cập nhật".
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editValues, setEditValues] = useState<EmployeeInfoValues>({
    employeeName: '',
    employeeTeam: '',
    employeeId: '',
    employeeTitlePrefix: '',
    position: INITIAL_POSITION,
  });
  const [isUpdatingInfo, setIsUpdatingInfo] = useState(false);
  const [isRemerging, setIsRemerging] = useState(false);
  const isUpdatingInfoRef = useRef(false);
  // Quan trọng nhất trong nhóm ref chống bấm trùng: mỗi lượt remerge là 1 lượt Gemini có tính
  // phí, double-click là mất tiền 2 lần.
  const isRemergingRef = useRef(false);

  // Chống bấm trùng — khoá ĐỒNG BỘ, không phụ thuộc chu kỳ render của React như state
  // (isUploading/isCreating/isExportingPdf chỉ disable nút ở lần render SAU, nên 2 cú click
  // rất nhanh trong cùng 1 tick vẫn lọt qua cả hai). Cùng pattern isTransformingRef ở
  // content-transform. Quan trọng nhất với luồng upload: nó kéo theo merge-outfit gọi Gemini
  // — bấm nhầm 2 lần là tốn tiền 2 lượt sinh ảnh.
  const isUploadingRef = useRef(false);
  const isCreatingRef = useRef(false);
  const isExportingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      if (pdfBlobUrlRef.current) URL.revokeObjectURL(pdfBlobUrlRef.current);
      mergeAbortRef.current?.abort();
    };
  }, []);

  const handleFileSelected = (f: File) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(f);
    objectUrlRef.current = url;
    setFile(f);
    setPreviewUrl(url);
  };

  const handleUploadAndContinue = async () => {
    if (!file || isUploadingRef.current) return;
    isUploadingRef.current = true;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/id-photo/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadId(res.data.uploadId);
      setStep(2);
      runMergeOutfit(res.data.uploadId);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Tải ảnh lên thất bại, vui lòng thử lại.';
      toast.error(msg);
    } finally {
      isUploadingRef.current = false;
      setIsUploading(false);
    }
  };

  /**
   * Gọi POST /id-photo/merge-outfit. AbortController + requestId race-guard cùng pattern với
   * cancelActiveTranscribe ở trang content-transform (dashboard/ai/content-transform/page.tsx)
   * — cho phép nút "Huỷ" ngắt request đang chạy mà không để response cũ về sau ghi đè state.
   */
  const runMergeOutfit = async (id: string) => {
    mergeAbortRef.current?.abort();
    const controller = new AbortController();
    mergeAbortRef.current = controller;
    const requestId = ++mergeRequestId.current;

    setMergeStatus('processing');
    setMergeError(null);
    try {
      const res = await apiClient.post(
        '/id-photo/merge-outfit',
        { uploadId: id },
        { signal: controller.signal },
      );
      if (requestId !== mergeRequestId.current) return; // đã bị Huỷ/lượt sau ghi đè
      setMergedImageData(res.data.processedImageData);
      setMergeStatus('success');
    } catch (err: any) {
      const isCanceled = err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError';
      if (isCanceled) return; // người dùng chủ động Huỷ — không phải lỗi, không hiện toast
      if (requestId !== mergeRequestId.current) return;

      setMergeError(toFriendlyMergeError(err));
      setMergeStatus('error');
    }
  };

  const cancelMerge = () => {
    mergeAbortRef.current?.abort();
    mergeAbortRef.current = null;
    mergeRequestId.current += 1;
    setStep(1);
  };

  const handleCreate = async () => {
    if (!uploadId || isCreatingRef.current) return;
    isCreatingRef.current = true;
    setIsCreating(true);
    try {
      const res = await apiClient.post('/id-photo/create', {
        uploadId,
        employeeName: employeeName.trim(),
        employeeTeam: employeeTeam.trim(),
        employeeId: employeeId.trim(),
        employeeTitlePrefix: employeeTitlePrefix.trim() || undefined,
        position,
      });
      setHistoryId(res.data.id);
      setStep(4);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Tạo bản ghi ảnh thẻ thất bại, vui lòng thử lại.';
      toast.error(msg);
    } finally {
      isCreatingRef.current = false;
      setIsCreating(false);
    }
  };

  /**
   * PDF đã xuất trước đó không còn khớp dữ liệu vừa đổi — vứt blob cũ đi để nút quay về "Xuất
   * file PDF" và người dùng không lỡ tay tải lại đúng file cũ tưởng là mới.
   */
  const invalidateExportedPdf = () => {
    if (pdfBlobUrlRef.current) URL.revokeObjectURL(pdfBlobUrlRef.current);
    pdfBlobUrlRef.current = null;
    setPdfBlobUrl(null);
    setPopupBlocked(false);
  };

  const handleStartEditInfo = () => {
    // Nạp bản nháp từ dữ liệu đang hiển thị mỗi lần mở, để lần mở sau không dính bản nháp
    // dở dang của lần trước đã bấm Huỷ.
    setEditValues({ employeeName, employeeTeam, employeeId, employeeTitlePrefix, position });
    setIsEditingInfo(true);
  };

  /**
   * PATCH /id-photo/:id — sửa chữ in trên thẻ, KHÔNG gọi lại AI (BE dựng lại PDF từ ảnh đã lưu
   * sẵn trong DB). Đây là đường thoát cho lỗi gõ sai tên/team/ID mà trước phải "Làm lại từ đầu",
   * vừa mất công upload lại vừa tốn oan thêm 1 lượt Gemini.
   */
  const handleUpdateInfo = async () => {
    if (!historyId || isUpdatingInfoRef.current) return;
    isUpdatingInfoRef.current = true;
    setIsUpdatingInfo(true);
    try {
      await apiClient.patch(`/id-photo/${historyId}`, {
        employeeName: editValues.employeeName.trim(),
        employeeTeam: editValues.employeeTeam.trim(),
        employeeId: editValues.employeeId.trim(),
        // Gửi chuỗi rỗng (không phải undefined) để BE hiểu là XOÁ tiền tố đang có — undefined
        // sẽ bị coi là "không đổi" và tiền tố cũ vẫn còn nguyên trên thẻ.
        employeeTitlePrefix: editValues.employeeTitlePrefix.trim(),
        position: editValues.position,
      });

      setEmployeeName(editValues.employeeName.trim());
      setEmployeeTeam(editValues.employeeTeam.trim());
      setEmployeeId(editValues.employeeId.trim());
      setEmployeeTitlePrefix(editValues.employeeTitlePrefix.trim());
      setPosition(editValues.position);
      setIsEditingInfo(false);
      invalidateExportedPdf();
      toast.success('Đã cập nhật thông tin thẻ. Bấm "Xuất file PDF" để lấy bản mới.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Cập nhật thông tin thất bại, vui lòng thử lại.');
    } finally {
      isUpdatingInfoRef.current = false;
      setIsUpdatingInfo(false);
    }
  };

  /**
   * POST /id-photo/:id/remerge-outfit — ghép áo lại từ ảnh gốc BE đã lưu trong DB, cho trường
   * hợp ảnh Gemini trả về bị lỗi bố cục (hay gặp: đỉnh đầu bị cắt).
   *
   * TỐN 1 lượt Gemini mỗi lần bấm. ExportStep đã bắt người dùng xác nhận cảnh báo chi phí
   * trước khi gọi tới đây, nên ở đây không hỏi lại nữa.
   */
  const handleRemergeOutfit = async () => {
    if (!historyId || isRemergingRef.current) return;
    isRemergingRef.current = true;
    setIsRemerging(true);

    const loadingToast = toast.loading('AI đang ghép áo lại...');
    try {
      const res = await apiClient.post(`/id-photo/${historyId}/remerge-outfit`);
      setMergedImageData(res.data.processedImageData);
      invalidateExportedPdf();
      toast.success('Đã có ảnh mới. Kiểm tra lại rồi bấm "Xuất file PDF".', { id: loadingToast });
    } catch (err: any) {
      // Dùng lại đúng bộ đổi lỗi của bước 2 — cùng một endpoint AI phía sau nên các mã lỗi
      // (503 quá tải, 504 timeout…) và cách diễn đạt cho người dùng phải giống hệt nhau.
      toast.error(toFriendlyMergeError(err), { id: loadingToast });
    } finally {
      isRemergingRef.current = false;
      setIsRemerging(false);
    }
  };

  const handleExportAndDownload = async () => {
    if (!historyId || isExportingRef.current) return;
    isExportingRef.current = true;
    setPopupBlocked(false);
    setIsExportingPdf(true);

    const loadingToast = toast.loading('Đang tạo file PDF...');
    try {
      // Bước 1: BE dựng PDF và ghi nhận pdf_url.
      await apiClient.post(`/id-photo/${historyId}/export-pdf`);

      // Bước 2: lấy bytes PDF thật về. BE render lại mỗi lần gọi (không đọc file trên đĩa),
      // nên đây mới là thứ đưa file tới tay người dùng.
      const res = await apiClient.get(`/id-photo/${historyId}/pdf-file`, { responseType: 'blob' });

      // Thu hồi blob của lần xuất trước để không rò rỉ bộ nhớ khi bấm xuất nhiều lần.
      if (pdfBlobUrlRef.current) URL.revokeObjectURL(pdfBlobUrlRef.current);
      const blobUrl = URL.createObjectURL(res.data);
      pdfBlobUrlRef.current = blobUrl;
      setPdfBlobUrl(blobUrl);

      // window.open ở đây nằm SAU hai lần await nên đã mất "user gesture", nhiều trình duyệt
      // sẽ chặn. Bắt buộc kiểm tra giá trị trả về: null = bị chặn.
      const win = window.open(blobUrl, '_blank');
      if (win) {
        toast.success('Đã tạo file PDF — đang mở trong tab mới.', { id: loadingToast });
      } else {
        setPopupBlocked(true);
        toast.error('Trình duyệt đã chặn mở tab tự động. Bấm "Mở file PDF" bên dưới.', {
          id: loadingToast,
          duration: 6000,
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Xuất PDF thất bại, vui lòng thử lại.', {
        id: loadingToast,
      });
    } finally {
      isExportingRef.current = false;
      setIsExportingPdf(false);
      setIsDownloading(false);
    }
  };

  const handleRestart = () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    mergeAbortRef.current?.abort();
    setFile(null);
    setPreviewUrl(null);
    setUploadId(null);
    setMergeStatus('processing');
    setMergedImageData(null);
    setMergeError(null);
    setEmployeeName('');
    setEmployeeTeam('');
    setEmployeeId('');
    setEmployeeTitlePrefix('');
    setPosition(INITIAL_POSITION);
    setHistoryId(null);
    if (pdfBlobUrlRef.current) URL.revokeObjectURL(pdfBlobUrlRef.current);
    pdfBlobUrlRef.current = null;
    setPdfBlobUrl(null);
    setPopupBlocked(false);
    setIsEditingInfo(false);
    setIsUpdatingInfo(false);
    setIsRemerging(false);
    setStep(1);
  };

  // Bấm số bước đã hoàn thành trên Stepper để quay lại — chỉ cho lùi, không cho vượt bước
  // đang xử lý AI (xem Stepper#WIZARD_STEPS, isDone mới clickable).
  const handleStepClick = (target: number) => {
    // Chốt chặn thứ hai bên cạnh Stepper#navLocked: tới bước 4 là bản ghi DB đã tạo và entry
    // tạm (uploadId) đã bị xoá, nên mọi đường lùi đều hỏng — nhất là về bước 3 rồi bấm "Tiếp
    // tục", vốn sẽ gọi lại /id-photo/create với uploadId không còn tồn tại. Sửa thì dùng
    // "Sửa thông tin" / "Ghép áo lại" ở bước 4, làm mới hẳn thì dùng "Làm lại từ đầu".
    if (step >= 4) return;

    if (target === 1) {
      mergeAbortRef.current?.abort();
      setStep(1);
    } else if (target === 2 && step > 2) {
      setStep(2);
    } else if (target === 3 && step > 3) {
      setStep(3);
    }
  };

  return (
    <div className="text-[#1b1b1d]">
      {/* Khung căn giữa + giới hạn bề rộng — giống hệt khu "Chuyển đổi content"
          (dashboard/ai/content-transform/page.tsx, max-w-[1680px] w-full mx-auto): màn hình
          rộng hơn 1680px sẽ tự chừa khoảng trống đều 2 bên thay vì nội dung kéo dài hết cỡ. */}
      <div className="max-w-[1680px] w-full mx-auto">
      <header className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1b1b1d] tracking-tight">Tạo ảnh thẻ nhân viên</h1>
        <p className="text-[#464554] text-sm mt-0.5">Tải lên ảnh thô để AI tự động xử lý và ghép trang phục chuẩn form.</p>
      </header>

      {/* 1 DÒNG tab menu ngang duy nhất — thay cho IdPhotoSidebar cũ (khối "Tiện ích" bên trái)
          VÀ thay cho cặp tab lồng 2 hàng trước đó. Cùng kiểu chuyển tab với khu "Chuyển đổi
          content". Manager chỉ còn đúng 1 tab "Thống kê". */}
      <div className="flex items-center gap-6 border-b border-[#e2e0ea] mb-6">
        {!statsOnly && (
          <button
            onClick={() => handleTabChange('single')}
            className={`py-2.5 px-1 text-sm font-semibold transition-colors ${
              activeTab === 'single' ? 'border-b-2 border-[#4441cc] text-[#4441cc]' : 'text-[#464554] hover:text-[#4441cc]'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <ImagePlus className="w-4 h-4" />
              Tạo ảnh thẻ
            </span>
          </button>
        )}
        {!statsOnly && (
          <button
            onClick={() => handleTabChange('bulk')}
            className={`py-2.5 px-1 text-sm font-semibold transition-colors ${
              activeTab === 'bulk' ? 'border-b-2 border-[#4441cc] text-[#4441cc]' : 'text-[#464554] hover:text-[#4441cc]'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Images className="w-4 h-4" />
              Tạo hàng loạt
            </span>
          </button>
        )}
        {!statsOnly && (
          <button
            onClick={() => handleTabChange('history')}
            className={`py-2.5 px-1 text-sm font-semibold transition-colors ${
              activeTab === 'history' ? 'border-b-2 border-[#4441cc] text-[#4441cc]' : 'text-[#464554] hover:text-[#4441cc]'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <History className="w-4 h-4" />
              Lịch sử
            </span>
          </button>
        )}
        <button
          onClick={() => handleTabChange('stats')}
          className={`py-2.5 px-1 text-sm font-semibold transition-colors ${
            activeTab === 'stats' ? 'border-b-2 border-[#4441cc] text-[#4441cc]' : 'text-[#464554] hover:text-[#4441cc]'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" />
            Thống kê
          </span>
        </button>
      </div>

      {activeTab === 'history' && <HistoryTab />}
      {activeTab === 'stats' && <StatsTab />}

      {activeTab === 'bulk' && (
        <div className="border border-[#e2e0ea] rounded-2xl bg-white p-16 flex flex-col items-center justify-center text-center gap-2">
          <span className="text-3xl">🚧</span>
          <p className="text-sm font-semibold text-[#1b1b1d]">Sắp ra mắt</p>
          <p className="text-xs text-[#9c9aa8] max-w-sm">
            Tính năng tạo ảnh thẻ hàng loạt (upload nhiều ảnh + file danh sách nhân viên) đang được phát triển.
          </p>
        </div>
      )}

      {activeTab === 'single' && (
        <>
          <div className="mb-6">
            <Stepper currentStep={step} onStepClick={handleStepClick} />
          </div>

          {step === 1 && (
            <UploadStep
              file={file}
              previewUrl={previewUrl}
              isUploading={isUploading}
              onFileSelected={handleFileSelected}
              onContinue={handleUploadAndContinue}
            />
          )}

          {step === 2 && (
            <MergeOutfitStep
              status={mergeStatus}
              mergedPreviewUrl={mergedImageData}
              errorMessage={mergeError}
              onCancel={cancelMerge}
              onRetry={() => uploadId && runMergeOutfit(uploadId)}
              onBack={() => {
                mergeAbortRef.current?.abort();
                setStep(1);
              }}
              onContinue={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <InfoStep
              employeeName={employeeName}
              employeeTeam={employeeTeam}
              employeeId={employeeId}
              employeeTitlePrefix={employeeTitlePrefix}
              position={position}
              isSubmitting={isCreating}
              onChangeEmployeeName={setEmployeeName}
              onChangeEmployeeTeam={setEmployeeTeam}
              onChangeEmployeeId={setEmployeeId}
              onChangeEmployeeTitlePrefix={setEmployeeTitlePrefix}
              onChangePosition={setPosition}
              onBack={() => setStep(2)}
              onContinue={handleCreate}
            />
          )}

          {step === 4 && (
            <ExportStep
              employeeName={employeeName}
              employeeTeam={employeeTeam}
              employeeId={employeeId}
              employeeTitlePrefix={employeeTitlePrefix}
              position={position}
              photoUrl={mergedImageData}
              isExportingPdf={isExportingPdf}
              isDownloading={isDownloading}
              pdfBlobUrl={pdfBlobUrl}
              popupBlocked={popupBlocked}
              pdfFileName={`the-nhan-vien-${(employeeName || 'nhan-vien').trim().replace(/\s+/g, '-').toLowerCase()}.pdf`}
              isEditingInfo={isEditingInfo}
              editValues={editValues}
              isUpdatingInfo={isUpdatingInfo}
              isRemerging={isRemerging}
              onStartEditInfo={handleStartEditInfo}
              onChangeEditValues={(patch) => setEditValues((prev) => ({ ...prev, ...patch }))}
              onCancelEditInfo={() => setIsEditingInfo(false)}
              onSubmitEditInfo={handleUpdateInfo}
              onRemergeOutfit={handleRemergeOutfit}
              onExportAndDownload={handleExportAndDownload}
              onRestart={handleRestart}
            />
          )}
        </>
      )}
      </div>
    </div>
  );
}

/** Suspense bao ngoài bắt buộc cho useSearchParams trong App Router — cùng pattern với
 *  dashboard/manager/user-activity/page.tsx#UserActivityPage. */
export default function IdPhotoPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-160px)]" />}>
      <IdPhotoPageContent />
    </Suspense>
  );
}
