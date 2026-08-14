'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import {
  ArrowLeft,
  Plus,
  Pencil,
  History,
  Loader2,
  X,
  AlertTriangle,
  Check,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api-client';
import { NumberedPagination } from '@/components/ui/NumberedPagination';

/**
 * Dòng trong bảng danh sách — CỐ Ý không có system_prompt: BE (findAllAdmin) không trả field
 * này nữa vì nó rất nặng (vd HuyK ~29K ký tự) và bảng không hiển thị. Muốn có system_prompt
 * thì gọi GET /characters/:id (CharacterDetail) đúng lúc cần — xem openEditForm.
 */
interface CharacterListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  updatedByUser: { id: string; full_name: string } | null;
}

/** Chi tiết 1 nhân vật từ GET /characters/:id — chỉ endpoint này mới trả system_prompt. */
interface CharacterDetail extends CharacterListItem {
  system_prompt: string;
}

interface PromptHistoryItem {
  id: string;
  character_id: string;
  old_content: string;
  changed_at: string;
  changed_by: string | null;
  changedByUser: { id: string; full_name: string } | null;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  avatar_url: string;
  system_prompt: string;
  is_active: boolean;
  order_index: number;
}

const EMPTY_FORM: FormState = {
  name: '',
  slug: '',
  description: '',
  avatar_url: '',
  system_prompt: '',
  is_active: true,
  order_index: 0,
};

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export default function CharactersAdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAllowed = user?.roles?.some((r) => [UserRole.ADMIN, UserRole.MANAGER].includes(r as any));

  useEffect(() => {
    if (user && !isAllowed) {
      router.replace('/dashboard/ai/content-transform');
    }
  }, [user, isAllowed, router]);

  const [characters, setCharacters] = useState<CharacterListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const PAGE_LIMIT = 10;
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form modal (create/edit dùng chung)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLoadedUpdatedAt, setEditingLoadedUpdatedAt] = useState<string | null>(null);
  const [originalSystemPrompt, setOriginalSystemPrompt] = useState<string>('');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  // Đang gọi GET /characters/:id để lấy system_prompt cho modal sửa — trong lúc này KHÔNG được
  // cho lưu, vì form còn rỗng, bấm lưu sẽ ghi đè trắng lên bản ghi thật.
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  // Confirm dialog riêng khi đổi system_prompt
  const [showPromptConfirm, setShowPromptConfirm] = useState(false);

  // Modal lịch sử system_prompt
  const [historyCharacter, setHistoryCharacter] = useState<CharacterListItem | null>(null);
  const [historyItems, setHistoryItems] = useState<PromptHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const fetchCharacters = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/characters/admin', {
        params: { page: targetPage, limit: PAGE_LIMIT },
      });
      setCharacters(res.data?.items || []);
      setTotalPages(res.data?.totalPages || 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi tải danh sách nhân vật');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAllowed) fetchCharacters(page);
  }, [isAllowed, page, fetchCharacters]);

  const openCreateForm = () => {
    setEditingId(null);
    setEditingLoadedUpdatedAt(null);
    setOriginalSystemPrompt('');
    setForm(EMPTY_FORM);
    setConflictMsg(null);
    setSlugError(null);
    setIsFormOpen(true);
  };

  /** Đổ dữ liệu chi tiết vào form + ghim mốc updated_at & system_prompt gốc để so sánh lúc lưu. */
  const fillFormFromDetail = (c: CharacterDetail) => {
    setEditingLoadedUpdatedAt(c.updated_at);
    setOriginalSystemPrompt(c.system_prompt);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      avatar_url: c.avatar_url || '',
      system_prompt: c.system_prompt,
      is_active: c.is_active,
      order_index: c.order_index,
    });
  };

  /**
   * Mở modal sửa: gọi GET /characters/:id lấy chi tiết (danh sách không còn trả system_prompt).
   * Mở modal ngay ở trạng thái loading để phản hồi tức thì, rồi mới đổ dữ liệu khi có kết quả.
   * Lấy chi tiết đúng lúc này cũng đảm bảo updated_at dùng cho khoá chống ghi đè là MỚI NHẤT,
   * không phải giá trị cũ từ lần tải danh sách trước đó.
   */
  const openEditForm = async (c: CharacterListItem) => {
    setEditingId(c.id);
    setEditingLoadedUpdatedAt(null);
    setOriginalSystemPrompt('');
    setForm(EMPTY_FORM);
    setConflictMsg(null);
    setSlugError(null);
    setIsFormOpen(true);
    setIsLoadingDetail(true);

    try {
      const res = await apiClient.get<CharacterDetail>(`/characters/${c.id}`);
      fillFormFromDetail(res.data);
    } catch (err: any) {
      // Không có dữ liệu thì đóng luôn — để form rỗng mà cho lưu sẽ ghi đè trắng bản ghi thật.
      toast.error(err.response?.data?.message || 'Lỗi khi tải chi tiết nhân vật');
      setIsFormOpen(false);
      setEditingId(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const closeForm = () => {
    if (isSaving) return;
    setIsFormOpen(false);
    setShowPromptConfirm(false);
  };

  const validateSlug = (slug: string): boolean => {
    if (!SLUG_PATTERN.test(slug)) {
      setSlugError('Slug chỉ được chứa chữ thường, số và dấu gạch ngang (vd: "huyk", "chi-nhan")');
      return false;
    }
    setSlugError(null);
    return true;
  };

  const doSubmit = async () => {
    setIsSaving(true);
    setConflictMsg(null);
    const loadingToast = toast.loading(editingId ? 'Đang lưu thay đổi...' : 'Đang tạo nhân vật...');

    try {
      if (editingId) {
        await apiClient.patch(`/characters/${editingId}`, {
          ...form,
          updated_at: editingLoadedUpdatedAt,
        });
        toast.success('Đã lưu thay đổi!', { id: loadingToast });
      } else {
        await apiClient.post('/characters', form);
        toast.success('Đã tạo nhân vật mới!', { id: loadingToast });
      }
      setIsFormOpen(false);
      setShowPromptConfirm(false);
      fetchCharacters(page);
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message || 'Đã xảy ra lỗi';
      if (status === 409) {
        // Nếu là do trùng slug thì báo tại field slug; nếu là do lệch updated_at (người khác
        // vừa sửa) thì báo banner conflict rõ ràng, không cho lưu đè, không đóng form.
        if (typeof msg === 'string' && msg.toLowerCase().includes('slug')) {
          setSlugError(msg);
        } else {
          setConflictMsg(msg);
        }
        toast.error(msg, { id: loadingToast });
      } else {
        toast.error(msg, { id: loadingToast });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || isLoadingDetail) return;
    if (!form.name.trim() || !form.slug.trim() || !form.system_prompt.trim()) {
      toast.error('Vui lòng nhập đủ tên, slug và system prompt');
      return;
    }
    if (!validateSlug(form.slug.trim())) return;

    const isChangingPrompt = editingId !== null && form.system_prompt !== originalSystemPrompt;
    if (isChangingPrompt) {
      setShowPromptConfirm(true);
      return;
    }
    doSubmit();
  };

  const reloadIntoForm = async () => {
    if (!editingId) return;
    setIsLoadingDetail(true);
    try {
      const res = await apiClient.get<CharacterDetail>(`/characters/${editingId}`);
      fillFormFromDetail(res.data);
      setConflictMsg(null);
      toast.success('Đã tải lại dữ liệu mới nhất');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi tải lại dữ liệu');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleToggleActive = async (c: CharacterListItem) => {
    if (togglingId) return;
    setTogglingId(c.id);
    try {
      await apiClient.patch(`/characters/${c.id}`, {
        is_active: !c.is_active,
        updated_at: c.updated_at,
      });
      toast.success(!c.is_active ? 'Đã bật hiển thị nhân vật' : 'Đã ẩn nhân vật');
      fetchCharacters(page);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Lỗi khi đổi trạng thái';
      toast.error(msg);
      if (err.response?.status === 409) fetchCharacters(page);
    } finally {
      setTogglingId(null);
    }
  };

  const openHistory = async (c: CharacterListItem) => {
    setHistoryCharacter(c);
    setExpandedHistoryId(null);
    setIsHistoryLoading(true);
    try {
      const res = await apiClient.get<PromptHistoryItem[]>(`/characters/${c.id}/system-prompt-history`);
      setHistoryItems(res.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi tải lịch sử');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  if (!user || !isAllowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#4441cc]" />
      </div>
    );
  }

  return (
    <div className="text-[#1b1b1d] bg-[#fcf8fb] min-h-[calc(100vh-112px)]">
      <div className="max-w-[1400px] w-full mx-auto py-4 px-1">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.push('/dashboard/ai/content-transform')}
            className="p-2 rounded-lg border border-[#c7c4d7] bg-white hover:bg-[#f6f3f5] text-[#464554] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl 2xl:text-2xl font-bold text-[#1b1b1d] tracking-tight">Quản lý nhân vật</h1>
            <p className="text-[#464554] text-xs">
              Thêm/sửa nhân vật AI (system prompt) trực tiếp qua giao diện — chỉ Admin/Manager.
            </p>
          </div>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-1.5 bg-[#4441cc] text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-md shadow-[#4441cc]/20 hover:bg-[#4441cc]/95 active:scale-[0.99] transition-all"
          >
            <Plus className="w-4 h-4" />
            Thêm nhân vật
          </button>
        </div>

        <div className="bg-white border border-[#c7c4d7] rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#4441cc]" />
              <p className="text-xs text-[#464554] font-medium">Đang tải danh sách...</p>
            </div>
          ) : characters.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-[#464554] space-y-2">
              <p className="text-sm font-semibold">Chưa có nhân vật nào</p>
              <p className="text-xs">Bấm &quot;Thêm nhân vật&quot; để tạo nhân vật đầu tiên.</p>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#eae7ea] text-[10px] font-bold text-[#464554] uppercase tracking-wider">
                    <th className="py-2.5 px-4">Tên</th>
                    <th className="py-2.5 px-4">Slug</th>
                    <th className="py-2.5 px-4">Trạng thái</th>
                    <th className="py-2.5 px-4">Ngày cập nhật</th>
                    <th className="py-2.5 px-4">Người sửa gần nhất</th>
                    <th className="py-2.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eae7ea]/50 text-sm text-[#464554]">
                  {characters.map((c) => (
                    <tr key={c.id} className="hover:bg-[#f6f3f5] transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-[#1b1b1d]">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-md bg-[#5e5ce6]/5 text-[#4441cc] border border-[#5e5ce6]/10 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                            {c.name?.[0] || '?'}
                          </span>
                          {c.name}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs">{c.slug}</td>
                      <td className="py-2.5 px-4">
                        <button
                          onClick={() => handleToggleActive(c)}
                          disabled={togglingId === c.id}
                          className={`flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 transition-colors ${
                            c.is_active ? 'text-emerald-600 hover:text-emerald-700' : 'text-[#464554]/60 hover:text-[#464554]'
                          }`}
                          title={c.is_active ? 'Bấm để ẩn nhân vật' : 'Bấm để hiển thị nhân vật'}
                        >
                          {togglingId === c.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : c.is_active ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                          {c.is_active ? 'Đang hiển thị' : 'Đang ẩn'}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-xs">{new Date(c.updated_at).toLocaleString('vi-VN')}</td>
                      <td className="py-2.5 px-4 text-xs">{c.updatedByUser?.full_name || '—'}</td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openHistory(c)}
                            className="p-1.5 rounded-lg hover:bg-[#eae7ea] text-[#464554] hover:text-[#1b1b1d] transition-colors"
                            title="Xem lịch sử system prompt"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditForm(c)}
                            className="p-1.5 rounded-lg hover:bg-[#eae7ea] text-[#4441cc] transition-colors"
                            title="Sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Filler có chủ đích cho phần trống phía dưới khi ít dữ liệu — tránh khoảng trắng
                trơ giữa nền trắng của card và nền trang, đồng thời giữ pagination luôn ở đáy. */}
            <div className="flex-1 bg-[#fcfbfd]" />

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-[#eae7ea]">
                <NumberedPagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* Form modal — tạo/sửa */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeForm} />
          <form
            onSubmit={handleSubmit}
            className="relative bg-white border border-[#c7c4d7] text-[#1b1b1d] w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl p-6 md:p-8 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#eae7ea] flex-none">
              <h3 className="text-base font-bold">{editingId ? 'Sửa nhân vật' : 'Thêm nhân vật mới'}</h3>
              <button
                type="button"
                onClick={closeForm}
                className="w-8 h-8 rounded-full bg-[#f6f3f5] hover:bg-[#eae7ea] text-[#464554] hover:text-[#1b1b1d] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mt-4 space-y-4">
              {isLoadingDetail ? (
                <div className="flex flex-col items-center justify-center gap-2.5 py-24">
                  <Loader2 className="w-7 h-7 animate-spin text-[#4441cc]" />
                  <p className="text-xs text-[#464554] font-medium">Đang tải chi tiết nhân vật...</p>
                </div>
              ) : (
              <>
              {conflictMsg && (
                <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 flex items-start justify-between gap-2">
                  <p className="text-[11px] text-amber-800 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{conflictMsg}</span>
                  </p>
                  <button
                    type="button"
                    onClick={reloadIntoForm}
                    className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 text-[11px] font-semibold hover:bg-amber-100 transition-colors"
                  >
                    Tải lại dữ liệu mới nhất
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#464554] uppercase tracking-wider">Tên nhân vật</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full p-2 rounded-lg bg-white border border-[#c7c4d7] focus:border-[#4441cc] focus:ring-2 focus:ring-[#4441cc]/10 outline-none text-sm"
                    placeholder="HuyK"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#464554] uppercase tracking-wider">Slug</label>
                  <input
                    value={form.slug}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, slug: e.target.value }));
                      setSlugError(null);
                    }}
                    onBlur={(e) => e.target.value && validateSlug(e.target.value)}
                    className={`w-full p-2 rounded-lg bg-white border font-mono outline-none text-sm ${
                      slugError ? 'border-red-400 focus:ring-2 focus:ring-red-100' : 'border-[#c7c4d7] focus:border-[#4441cc] focus:ring-2 focus:ring-[#4441cc]/10'
                    }`}
                    placeholder="huyk"
                  />
                  {slugError && <p className="text-[10px] text-red-600">{slugError}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#464554] uppercase tracking-wider">Mô tả ngắn</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full p-2 rounded-lg bg-white border border-[#c7c4d7] focus:border-[#4441cc] focus:ring-2 focus:ring-[#4441cc]/10 outline-none text-sm resize-none"
                  placeholder="Hiển thị trên UI chọn nhân vật"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#464554] uppercase tracking-wider">Avatar URL</label>
                  <input
                    value={form.avatar_url}
                    onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
                    className="w-full p-2 rounded-lg bg-white border border-[#c7c4d7] focus:border-[#4441cc] focus:ring-2 focus:ring-[#4441cc]/10 outline-none text-sm"
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#464554] uppercase tracking-wider">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    value={form.order_index}
                    onChange={(e) => setForm((f) => ({ ...f, order_index: Number(e.target.value) || 0 }))}
                    className="w-full p-2 rounded-lg bg-white border border-[#c7c4d7] focus:border-[#4441cc] focus:ring-2 focus:ring-[#4441cc]/10 outline-none text-sm"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-[#1b1b1d] cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-[#c7c4d7] text-[#4441cc] focus:ring-[#4441cc]"
                />
                Hiển thị nhân vật này (is_active)
              </label>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-[#464554] uppercase tracking-wider">System Prompt</label>
                  <span className="text-[10px] text-[#464554]">{form.system_prompt.length} ký tự</span>
                </div>
                {/*
                  LƯU Ý VỀ XUỐNG DÒNG (đã biết, KHÔNG phải bug):
                  Theo chuẩn HTML, trình duyệt LUÔN chuẩn hoá CRLF (\r\n) thành LF (\n) khi
                  JavaScript đọc `.value` của <textarea> — không có cách nào tắt. Nên mỗi lần
                  lưu qua form này, system_prompt sẽ được chuẩn hoá về LF, kể cả khi bản trong
                  DB đang dùng CRLF (vd prompt HuyK gốc có 384 cặp CRLF từ thời seed script).
                  Đã cân nhắc và CHẤP NHẬN: LF là chuẩn phổ biến, DeepSeek không phân biệt kiểu
                  xuống dòng, và bản cũ luôn được lưu vào character_system_prompt_history trước
                  khi ghi đè nên không bao giờ mất. Đừng "sửa" bằng cách tự chuyển LF->CRLF lúc
                  lưu — sẽ ép sai với file có xuống dòng hỗn hợp.
                  Ngoài chuyện xuống dòng, mọi ký tự khác được giữ NGUYÊN VĂN tuyệt đối: không
                  trim, không normalize ở FE, BE lẫn DB.
                */}
                <textarea
                  value={form.system_prompt}
                  onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
                  rows={14}
                  className="w-full p-3 rounded-xl bg-[#f6f3f5] border border-[#c7c4d7] focus:border-[#4441cc] focus:ring-2 focus:ring-[#4441cc]/10 outline-none text-xs font-mono custom-scrollbar resize-y"
                  placeholder="Prompt đầy đủ định hướng văn phong/nguyên tắc của nhân vật..."
                />
              </div>
              </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-2 border-t border-[#eae7ea] flex-none">
              <button
                type="button"
                onClick={closeForm}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl border border-[#c7c4d7] text-[#464554] text-xs font-bold hover:bg-[#f6f3f5] transition-colors disabled:opacity-50"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={isSaving || isLoadingDetail}
                className="flex items-center gap-1.5 bg-[#4441cc] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-[#4441cc]/20 hover:bg-[#4441cc]/95 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(isSaving || isLoadingDetail) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingId ? 'Lưu thay đổi' : 'Tạo nhân vật'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm dialog riêng khi đổi system_prompt */}
      {showPromptConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSaving && setShowPromptConfirm(false)} />
          <div className="relative bg-white border border-[#c7c4d7] w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold">Xác nhận thay đổi System Prompt</h3>
            </div>
            <p className="text-xs text-[#464554] leading-relaxed">
              Bạn đang thay đổi <strong>System Prompt</strong> của nhân vật này. Bản cũ sẽ được lưu lại vào lịch sử, và
              thay đổi này sẽ ảnh hưởng đến mọi lần chuyển đổi nội dung tiếp theo sử dụng nhân vật này. Bạn có chắc chắn muốn lưu?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPromptConfirm(false)}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl border border-[#c7c4d7] text-[#464554] text-xs font-bold hover:bg-[#f6f3f5] transition-colors disabled:opacity-50"
              >
                Xem lại
              </button>
              <button
                type="button"
                onClick={doSubmit}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-amber-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-amber-700 transition-all disabled:opacity-50"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Xác nhận lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal lịch sử system_prompt */}
      {historyCharacter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setHistoryCharacter(null)} />
          <div className="relative bg-white border border-[#c7c4d7] w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl p-6 md:p-8 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[#eae7ea] flex-none">
              <h3 className="text-base font-bold">Lịch sử System Prompt — {historyCharacter.name}</h3>
              <button
                onClick={() => setHistoryCharacter(null)}
                className="w-8 h-8 rounded-full bg-[#f6f3f5] hover:bg-[#eae7ea] text-[#464554] hover:text-[#1b1b1d] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar mt-4 space-y-2">
              {isHistoryLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-[#4441cc]" />
                </div>
              ) : historyItems.length === 0 ? (
                <p className="text-xs text-[#464554] text-center py-10">
                  Chưa có lần sửa system prompt nào được ghi nhận cho nhân vật này.
                </p>
              ) : (
                historyItems.map((h) => {
                  const isExpanded = expandedHistoryId === h.id;
                  return (
                    <div key={h.id} className="border border-[#eae7ea] rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedHistoryId(isExpanded ? null : h.id)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-white hover:bg-[#f6f3f5] transition-colors text-left"
                      >
                        <div>
                          <p className="text-xs font-semibold text-[#1b1b1d]">
                            {new Date(h.changed_at).toLocaleString('vi-VN')}
                          </p>
                          <p className="text-[10.5px] text-[#464554]">
                            Sửa bởi: {h.changedByUser?.full_name || 'Không rõ'}
                          </p>
                        </div>
                        <span className="text-[10px] text-[#4441cc] font-semibold flex-shrink-0">
                          {isExpanded ? 'Ẩn nội dung' : 'Xem nội dung bản cũ'}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 bg-[#fcfbfd] border-t border-[#eae7ea]">
                          <pre className="text-[11px] text-[#1b1b1d] whitespace-pre-wrap break-words font-mono bg-white border border-[#eae7ea] rounded-lg p-3 max-h-64 overflow-y-auto custom-scrollbar">
                            {h.old_content}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
