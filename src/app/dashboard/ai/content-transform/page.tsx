'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import {
  Wand2,
  Copy,
  Check,
  History,
  Users,
  Loader2,
  Eye,
  Calendar,
  Clock,
  Sparkles,
  FileText,
  Video,
  Mic,
  Zap,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api-client';
import { NumberedPagination } from '@/components/ui/NumberedPagination';
import { MemberDropdown } from '@/components/ui/MemberDropdown';

interface Character {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatar_url: string | null;
  is_active: boolean;
  order_index: number;
}

interface TransformHistoryItem {
  id: string;
  user_id: string;
  character_id: string;
  input_text: string;
  output_text: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  error_message: string | null;
  model_used: string | null;
  duration_ms: number | null;
  created_at: string;
  character: {
    id: string;
    name: string;
    slug: string;
    avatar_url: string | null;
  };
  // BE trả kèm ở /history, /history/member/:id, /history/:id (đồng bộ camelCase với
  // /transform, /upgrade, /rescore) — null nếu bản ghi chưa từng có output_text để chấm.
  scoreResult: ScoreResult | null;
  scoreStatus: 'success' | 'failed' | null;
  scoreError: string | null;
}

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  roles: UserRole[];
  team?: string;
}

// ── Chấm điểm kịch bản (BE trả về, đọc động — không hardcode tên nhóm/tiêu chí) ──
interface ScoreItem {
  label: string;
  passed: boolean;
  quote: string;
  suggestion?: string;
}

// 'error': có tiêu chí con fail và fail quá nửa nhóm | 'warning': có fail nhưng chưa quá nửa
// | 'good': không fail tiêu chí nào — BE tính sẵn (content-transform.service.ts, scoring.util.ts).
type GroupStatus = 'good' | 'warning' | 'error';

interface ScoreGroup {
  name: string;
  maxScore: number;
  score: number;
  status: GroupStatus;
  items: ScoreItem[];
}

interface HardGateViolation {
  type: string;
  quote: string;
  explanation: string;
}

interface ScoreResult {
  groups: ScoreGroup[];
  overallScore: number;
  verdict: string;
  hardGateViolations: HardGateViolation[];
}

// 7 màu highlight theo INDEX nhóm (không theo tên) — tránh trùng đỏ (dành riêng cho Hard Gate).
const GROUP_HIGHLIGHT_COLORS = [
  { bg: 'bg-indigo-100', text: 'text-indigo-900', solid: 'bg-indigo-500', border: 'border-indigo-300', chipBg: 'bg-indigo-50', chipText: 'text-indigo-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-900', solid: 'bg-emerald-500', border: 'border-emerald-300', chipBg: 'bg-emerald-50', chipText: 'text-emerald-700' },
  { bg: 'bg-amber-100', text: 'text-amber-900', solid: 'bg-amber-500', border: 'border-amber-300', chipBg: 'bg-amber-50', chipText: 'text-amber-700' },
  { bg: 'bg-sky-100', text: 'text-sky-900', solid: 'bg-sky-500', border: 'border-sky-300', chipBg: 'bg-sky-50', chipText: 'text-sky-700' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-900', solid: 'bg-fuchsia-500', border: 'border-fuchsia-300', chipBg: 'bg-fuchsia-50', chipText: 'text-fuchsia-700' },
  { bg: 'bg-teal-100', text: 'text-teal-900', solid: 'bg-teal-500', border: 'border-teal-300', chipBg: 'bg-teal-50', chipText: 'text-teal-700' },
  { bg: 'bg-orange-100', text: 'text-orange-900', solid: 'bg-orange-500', border: 'border-orange-300', chipBg: 'bg-orange-50', chipText: 'text-orange-700' },
];

function getScoreTheme(score: number) {
  if (score >= 90) return { border: 'border-emerald-300', bg: 'bg-emerald-50', text: 'text-emerald-700' };
  if (score >= 80) return { border: 'border-blue-300', bg: 'bg-blue-50', text: 'text-blue-700' };
  if (score >= 70) return { border: 'border-amber-300', bg: 'bg-amber-50', text: 'text-amber-700' };
  return { border: 'border-red-300', bg: 'bg-red-50', text: 'text-red-700' };
}

type HighlightMark = { kind: 'hardgate' } | { kind: 'group'; groupIndex: number };

function sameMark(a: HighlightMark | null, b: HighlightMark | null): boolean {
  if (a === null && b === null) return true;
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === 'group' && b.kind === 'group') return a.groupIndex === b.groupIndex;
  return true;
}

/**
 * Gán màu highlight cho từng ký tự của outputText dựa trên vị trí xuất hiện đầu tiên
 * (indexOf) của mỗi quote đã được BE validate. Hard Gate luôn tô SAU (ưu tiên cao hơn,
 * ghi đè lên màu nhóm nếu trùng vị trí). Trả về danh sách đoạn liền mạch để render.
 */
function buildHighlightSegments(text: string, scoreResult: ScoreResult): Array<{ text: string; mark: HighlightMark | null }> {
  const marks: (HighlightMark | null)[] = new Array(text.length).fill(null);

  scoreResult.groups.forEach((group, gIdx) => {
    group.items.forEach((item) => {
      if (!item.quote) return;
      const idx = text.indexOf(item.quote);
      if (idx === -1) return;
      for (let i = idx; i < idx + item.quote.length; i++) marks[i] = { kind: 'group', groupIndex: gIdx };
    });
  });

  scoreResult.hardGateViolations.forEach((v) => {
    if (!v.quote) return;
    const idx = text.indexOf(v.quote);
    if (idx === -1) return;
    for (let i = idx; i < idx + v.quote.length; i++) marks[i] = { kind: 'hardgate' };
  });

  const segments: Array<{ text: string; mark: HighlightMark | null }> = [];
  let i = 0;
  while (i < text.length) {
    const cur = marks[i];
    let j = i + 1;
    while (j < text.length && sameMark(marks[j], cur)) j++;
    segments.push({ text: text.slice(i, j), mark: cur });
    i = j;
  }
  return segments;
}

// ── Accordion 7 nhóm tiêu chí + khối Hard Gate — dùng chung cho cả màn hình chuyển đổi
// (Kết quả chuyển đổi) và modal "Chi tiết kịch bản" ở tab Lịch sử, đọc cùng 1 shape ScoreResult.

const GROUP_STATUS_STYLES: Record<
  GroupStatus,
  { Icon: typeof CheckCircle2; iconClass: string; barClass: string; label: string }
> = {
  good: { Icon: CheckCircle2, iconClass: 'text-emerald-600', barClass: 'bg-emerald-500', label: 'Đạt' },
  warning: { Icon: AlertTriangle, iconClass: 'text-amber-600', barClass: 'bg-amber-500', label: 'Cần cải thiện' },
  error: { Icon: XCircle, iconClass: 'text-red-600', barClass: 'bg-red-500', label: 'Lỗi' },
};

/**
 * Nhóm mặc định mở khi vừa nhận scoreResult: ưu tiên nhóm 'error' điểm thấp nhất (theo tỷ lệ
 * score/maxScore); nếu không có nhóm nào 'error' thì lấy nhóm 'warning' điểm thấp nhất; nếu
 * mọi nhóm đều 'good' thì không mở nhóm nào. Trả về null nếu không cần mở nhóm nào.
 */
function computeDefaultOpenIndex(groups: ScoreGroup[]): number | null {
  const withRatio = groups.map((g, idx) => ({
    idx,
    ratio: g.maxScore > 0 ? g.score / g.maxScore : 1,
    status: g.status,
  }));

  const pickLowest = (candidates: typeof withRatio) =>
    candidates.length > 0
      ? candidates.reduce((min, g) => (g.ratio < min.ratio ? g : min)).idx
      : null;

  const errors = withRatio.filter((g) => g.status === 'error');
  if (errors.length > 0) return pickLowest(errors);

  const warnings = withRatio.filter((g) => g.status === 'warning');
  if (warnings.length > 0) return pickLowest(warnings);

  return null;
}

function computeDefaultOpenIndices(groups: ScoreGroup[]): Set<number> {
  const idx = computeDefaultOpenIndex(groups);
  return idx === null ? new Set() : new Set([idx]);
}

function ScoreGroupAccordionItem({
  group,
  groupIndex,
  isOpen,
  onToggle,
}: {
  group: ScoreGroup;
  groupIndex: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const style = GROUP_STATUS_STYLES[group.status];
  const highlightBorder = GROUP_HIGHLIGHT_COLORS[groupIndex % GROUP_HIGHLIGHT_COLORS.length].border;
  const ratioPct = group.maxScore > 0 ? Math.round((group.score / group.maxScore) * 100) : 0;
  const headerId = `score-group-header-${groupIndex}`;
  const panelId = `score-group-panel-${groupIndex}`;

  return (
    <div className={`rounded-xl border overflow-hidden ${isOpen ? 'border-[#c7c4d7]' : 'border-[#eae7ea]'}`}>
      <button
        type="button"
        id={headerId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={`Nhóm ${group.name}, ${group.score} trên ${group.maxScore} điểm, ${style.label}`}
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2.5 py-2 bg-white hover:bg-[#f6f3f5] transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4441cc] focus-visible:ring-offset-1"
      >
        <style.Icon className={`w-4 h-4 flex-shrink-0 ${style.iconClass}`} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-[#1b1b1d] truncate">{group.name}</span>
            <span className="text-[10.5px] font-semibold text-[#464554] flex-shrink-0">
              {group.score}/{group.maxScore}
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-[#eae7ea] overflow-hidden">
            <div className={`h-full rounded-full ${style.barClass}`} style={{ width: `${ratioPct}%` }} />
          </div>
        </div>
        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 text-[#464554] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="px-2.5 pb-2.5 pt-1 space-y-1 bg-[#fcfbfd] border-t border-[#eae7ea]"
        >
          {group.items.map((item, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-lg border ${item.passed ? 'border-[#eae7ea] bg-white' : 'border-red-100 bg-red-50/40'}`}
            >
              <div className="flex items-start gap-2">
                {item.passed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-[#1b1b1d]">{item.label}</p>
                  {item.quote && (
                    <div className={`mt-1 pl-2 border-l-2 ${highlightBorder} italic text-[10.5px] text-[#464554]`}>
                      &ldquo;{item.quote}&rdquo;
                    </div>
                  )}
                  {!item.passed && item.suggestion && (
                    <p className="mt-1 text-[10.5px] text-orange-600 font-medium">→ Gợi ý: {item.suggestion}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreGroupsAccordion({ scoreResult }: { scoreResult: ScoreResult }) {
  const [openIndices, setOpenIndices] = useState<Set<number>>(() => computeDefaultOpenIndices(scoreResult.groups));

  // scoreResult đổi tham chiếu mỗi khi có kết quả MỚI thật sự (chấm lần đầu/chấm lại/nâng cấp)
  // — tính lại nhóm mặc định mở cho bản mới, không đụng vào lựa chọn mở/đóng thủ công của user
  // trong lúc vẫn đang xem cùng 1 kết quả.
  useEffect(() => {
    setOpenIndices(computeDefaultOpenIndices(scoreResult.groups));
  }, [scoreResult]);

  const toggle = (idx: number) => {
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="space-y-1.5">
      {scoreResult.groups.map((group, idx) => (
        <ScoreGroupAccordionItem
          key={group.name}
          group={group}
          groupIndex={idx}
          isOpen={openIndices.has(idx)}
          onToggle={() => toggle(idx)}
        />
      ))}
    </div>
  );
}

function ScoreOverallCard({ scoreResult }: { scoreResult: ScoreResult }) {
  const theme = getScoreTheme(scoreResult.overallScore);
  return (
    <div className={`p-2.5 2xl:p-3 rounded-2xl border ${theme.border} ${theme.bg}`}>
      <div className="flex items-end gap-1.5">
        <span className={`text-3xl 2xl:text-4xl font-black leading-none ${theme.text}`}>{scoreResult.overallScore}</span>
        <span className="text-xs text-[#464554] mb-0.5">/100</span>
      </div>
      <p className={`text-[11px] 2xl:text-xs font-semibold mt-1 ${theme.text}`}>{scoreResult.verdict}</p>
    </div>
  );
}

/** Tách biệt hoàn toàn khỏi 7 nhóm/23 tiêu chí — không cộng vào điểm 100 (Playbook mục 22). */
function HardGateBlock({ violations }: { violations: HardGateViolation[] }) {
  if (violations.length === 0) return null;
  return (
    <div className="p-2.5 2xl:p-3 rounded-2xl border-2 border-red-300 bg-red-50">
      <div className="flex items-center gap-1.5 mb-1.5">
        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" aria-hidden="true" />
        <h4 className="text-xs font-bold text-red-700 uppercase tracking-wide">Vi phạm Hard Gate</h4>
      </div>
      <div className="space-y-1.5">
        {violations.map((v, idx) => (
          <div key={idx} className="text-[11px] text-red-800 bg-white/70 rounded-lg p-2 border border-red-200">
            <p className="font-bold flex items-start gap-1.5">
              <span aria-hidden="true">•</span>
              <span>{v.type}</span>
            </p>
            {v.quote && <p className="italic mt-1 pl-3.5">&ldquo;{v.quote}&rdquo;</p>}
            {v.explanation && <p className="text-red-700/80 mt-1 pl-3.5">{v.explanation}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ContentTransformPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'transform' | 'history' | 'team'>('transform');

  // Core content transform states
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [outputText, setOutputText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [inputMode, setInputMode] = useState<'text' | 'video' | 'audio'>('text');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);

  // Chấm điểm kịch bản (scoreResult trả kèm response /transform và /upgrade)
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [scoreStatus, setScoreStatus] = useState<'success' | 'failed' | null>(null);
  const [scoreErrorMsg, setScoreErrorMsg] = useState<string | null>(null);
  const [isRescoring, setIsRescoring] = useState<boolean>(false);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState<boolean>(false);
  const [previousOverallScore, setPreviousOverallScore] = useState<number | null>(null);
  // Chống bấm trùng — khoá đồng bộ (không phụ thuộc chu kỳ render của React như state),
  // đảm bảo double-click nhanh trong cùng 1 tick vẫn không lọt qua được request thứ 2.
  const isTransformingRef = useRef(false);
  const isUpgradingRef = useRef(false);

  // History states
  const [historyItems, setHistoryItems] = useState<TransformHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState<number>(0);
  // Đếm tăng dần để nhận biết response nào là request mới nhất — chặn race condition
  // khi bấm đổi trang nhanh khiến response cũ về sau response mới, ghi đè sai dữ liệu.
  const personalHistoryRequestId = useRef(0);
  const memberHistoryRequestId = useRef(0);

  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyLimit] = useState<number>(10);
  const [historyTotalPages, setHistoryTotalPages] = useState<number>(1);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);

  // Detail Modal states
  const [selectedItem, setSelectedItem] = useState<TransformHistoryItem | null>(null);

  // Team History states
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [memberHistoryItems, setMemberHistoryItems] = useState<TransformHistoryItem[]>([]);
  const [memberHistoryTotal, setMemberHistoryTotal] = useState<number>(0);
  const [memberHistoryPage, setMemberHistoryPage] = useState<number>(1);
  const [memberHistoryTotalPages, setMemberHistoryTotalPages] = useState<number>(1);
  const [isMemberHistoryLoading, setIsMemberHistoryLoading] = useState<boolean>(false);

  const isPrivileged = user?.roles?.some(r =>
    [UserRole.ADMIN, UserRole.MANAGER, UserRole.LEADER].includes(r as any)
  );

  // 1. Fetch active characters
  const fetchCharacters = useCallback(async () => {
    try {
      const res = await apiClient.get<Character[]>('/content-transform/characters');
      setCharacters(res.data);
      if (res.data.length > 0) {
        setSelectedCharacterId(res.data[0].id);
      }
    } catch (err: any) {
      toast.error('Không thể tải danh sách nhân vật AI');
    }
  }, []);

  // 2. Fetch personal history
  const fetchPersonalHistory = useCallback(async (page: number) => {
    const requestId = ++personalHistoryRequestId.current;
    setIsHistoryLoading(true);
    try {
      const res = await apiClient.get('/content-transform/history', {
        params: { page, limit: historyLimit },
      });
      if (requestId !== personalHistoryRequestId.current) return; // request cũ hơn đã bị request sau ghi đè, bỏ qua
      setHistoryItems(res.data.items || []);
      setHistoryTotal(res.data.total || 0);
      setHistoryTotalPages(res.data.totalPages || 1);
    } catch (err: any) {
      if (requestId !== personalHistoryRequestId.current) return;
      toast.error('Lỗi khi tải lịch sử chuyển đổi');
    } finally {
      if (requestId === personalHistoryRequestId.current) setIsHistoryLoading(false);
    }
  }, [historyLimit]);

  // 3. Fetch team members (for Admin/Manager/Leader)
  const fetchTeamMembers = useCallback(async () => {
    console.log('[fetchTeamMembers] called. isPrivileged =', isPrivileged);
    if (!isPrivileged) return;
    try {
      const res = await apiClient.get<TeamMember[]>('/users/team-members');
      console.log('[fetchTeamMembers] API success response:', res.data);
      setTeamMembers(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedMemberId(res.data[0].id);
      }
    } catch (err: any) {
      console.error('[fetchTeamMembers] API error:', err);
    }
  }, [isPrivileged]);

  // 4. Fetch selected member's history
  const fetchMemberHistory = useCallback(async (memberId: string, page: number) => {
    if (!memberId) return;
    const requestId = ++memberHistoryRequestId.current;
    setIsMemberHistoryLoading(true);
    try {
      const res = await apiClient.get(`/content-transform/history/member/${memberId}`, {
        params: { page, limit: historyLimit },
      });
      if (requestId !== memberHistoryRequestId.current) return; // request cũ hơn đã bị request sau ghi đè, bỏ qua
      setMemberHistoryItems(res.data.items || []);
      setMemberHistoryTotal(res.data.total || 0);
      setMemberHistoryTotalPages(res.data.totalPages || 1);
    } catch (err: any) {
      if (requestId !== memberHistoryRequestId.current) return;
      toast.error('Không có quyền xem lịch sử của thành viên này');
      setMemberHistoryItems([]);
      setMemberHistoryTotal(0);
      setMemberHistoryTotalPages(1);
    } finally {
      if (requestId === memberHistoryRequestId.current) setIsMemberHistoryLoading(false);
    }
  }, [historyLimit]);

  // Run initial queries
  useEffect(() => {
    console.log('[ContentTransformPage] mounted/updated. user =', user?.email, 'roles =', user?.roles, 'isPrivileged =', isPrivileged);
    fetchCharacters();
  }, [fetchCharacters]);

  useEffect(() => {
    console.log('[ContentTransformPage] checking privilege for fetching team members. isPrivileged =', isPrivileged);
    if (isPrivileged) {
      fetchTeamMembers();
    }
  }, [fetchTeamMembers, isPrivileged]);

  // Load personal history on tab change or page changes
  useEffect(() => {
    if (activeTab === 'history') {
      fetchPersonalHistory(historyPage);
    }
  }, [activeTab, historyPage, fetchPersonalHistory]);

  // Load member history on selection or page changes
  useEffect(() => {
    if (activeTab === 'team' && selectedMemberId) {
      fetchMemberHistory(selectedMemberId, memberHistoryPage);
    }
  }, [activeTab, selectedMemberId, memberHistoryPage, fetchMemberHistory]);

  const handleTranscribe = async () => {
    if (!selectedFile) return;
    setIsTranscribing(true);
    const loadingToast = toast.loading('Đang nghe và chuyển đổi nội dung...');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await apiClient.post('/content-transform/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 70000, // 70s timeout
      });

      if (res.data && res.data.transcript) {
        setInputText(res.data.transcript);
        toast.success('Chuyển đổi âm thanh thành văn bản thành công!', { id: loadingToast });
      } else {
        throw new Error(res.data?.message || 'Không thể transcribe file. Vui lòng kiểm tra lại.');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Lỗi khi transcribe file. Hãy đảm bảo file dưới 10 phút và thử lại.';
      toast.error(errMsg, { id: loadingToast });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleTransform = async () => {
    // Khoá đồng bộ — chặn double-click ngay cả khi bấm rất nhanh trong cùng 1 tick,
    // trước khi React kịp re-render nút sang trạng thái disabled.
    if (isTransformingRef.current) return;

    if (!selectedCharacterId) {
      toast.error('Vui lòng chọn một nhân vật AI');
      return;
    }
    if (!inputText.trim()) {
      toast.error('Vui lòng nhập kịch bản thô');
      return;
    }

    isTransformingRef.current = true;
    setIsGenerating(true);
    setOutputText('');
    setScoreResult(null);
    setScoreStatus(null);
    setScoreErrorMsg(null);
    setCurrentHistoryId(null);
    setPreviousOverallScore(null);
    const loadingToast = toast.loading('Đang chuyển đổi kịch bản...');

    try {
      // BE giờ retry CẢ bước viết kịch bản (3x120s=360s) LẪN bước chấm điểm (3x120s=360s) =>
      // tối đa ~720s. Đặt dư lên 900s để không bị client huỷ ngang khi BE vẫn xử lý bình thường
      // (giữ 120s mỗi lần retry vì thực đo giảm xuống 60s làm TĂNG tỷ lệ thất bại, phản tác dụng).
      const res = await apiClient.post(
        '/content-transform/transform',
        {
          character_id: selectedCharacterId,
          input_text: inputText,
          input_type: inputMode === 'video' ? 'VIDEO' : inputMode === 'audio' ? 'AUDIO' : 'TEXT',
        },
        { timeout: 900000 },
      );

      if (res.data && res.data.status === 'SUCCESS') {
        setOutputText(res.data.output_text);
        setScoreResult(res.data.scoreResult || null);
        setScoreStatus(res.data.scoreStatus || null);
        setScoreErrorMsg(res.data.scoreError || null);
        setCurrentHistoryId(res.data.id || null);
        toast.success('Chuyển đổi kịch bản thành công!', { id: loadingToast });
      } else {
        throw new Error(res.data?.error_message || 'Lỗi xử lý kịch bản');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Lỗi khi gọi AI';
      toast.error(errMsg, { id: loadingToast });
    } finally {
      setIsGenerating(false);
      isTransformingRef.current = false;
    }
  };

  const handleUpgrade = async () => {
    if (isUpgradingRef.current) return;
    if (!currentHistoryId) return;

    isUpgradingRef.current = true;
    setIsUpgrading(true);
    const loadingToast = toast.loading('Đang nâng cấp nội dung theo gợi ý...');

    try {
      // Worst case: chấm điểm baseline (nếu chưa có, hiếm khi xảy ra khi đi từ history_id có sẵn
      // score_result) 3x120s=360s + viết lại kịch bản (giờ cũng retry) 3x120s=360s + chấm điểm
      // lại bản mới 3x120s=360s => tối đa ~1080s. Đặt dư lên 1200s (20 phút) để không bị client
      // huỷ ngang khi BE vẫn xử lý bình thường.
      const res = await apiClient.post(
        '/content-transform/upgrade',
        { history_id: currentHistoryId },
        { timeout: 1200000 },
      );

      const upgraded = res.data?.upgraded;
      if (!upgraded) {
        throw new Error('Phản hồi không hợp lệ từ máy chủ');
      }

      const prevScore = res.data?.previous?.scoreResult?.overallScore ?? scoreResult?.overallScore ?? null;
      setPreviousOverallScore(prevScore);
      setOutputText(upgraded.output_text || '');
      setScoreResult(upgraded.scoreResult || null);
      setScoreStatus(upgraded.scoreStatus || null);
      setScoreErrorMsg(upgraded.scoreError || null);
      setCurrentHistoryId(upgraded.id || null);
      toast.success('Đã nâng cấp nội dung thành công!', { id: loadingToast });
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Lỗi khi nâng cấp nội dung';
      toast.error(errMsg, { id: loadingToast });
    } finally {
      setIsUpgrading(false);
      isUpgradingRef.current = false;
    }
  };

  /**
   * Không truyền historyId: chấm lại bản ghi đang xem ở màn hình "Chuyển đổi" (currentHistoryId).
   * Có truyền historyId: dùng cho nút "Chấm điểm lại" trong modal "Chi tiết kịch bản" ở tab
   * Lịch sử — chỉ cập nhật đúng bản ghi đó (selectedItem + trong danh sách), không đụng state
   * của màn hình "Chuyển đổi" vì đây là 1 bản ghi khác, có thể của người dùng khác đang xem.
   */
  const handleRescore = async (historyId?: string) => {
    const targetId = historyId || currentHistoryId;
    if (!targetId || isRescoring) return;

    setIsRescoring(true);
    const loadingToast = toast.loading('Đang chấm điểm lại...');

    try {
      // BE retry chấm điểm tới 3 lần x 120s = 360s tối đa. Đặt dư lên 480s để không bị client
      // huỷ ngang khi BE vẫn đang thử lại bình thường (giữ 120s mỗi lần retry vì thực đo giảm
      // xuống 60s làm TĂNG tỷ lệ thất bại, phản tác dụng).
      const res = await apiClient.post(
        '/content-transform/rescore',
        { history_id: targetId },
        { timeout: 480000 },
      );

      const updatedFields = {
        scoreResult: res.data?.scoreResult || null,
        scoreStatus: res.data?.scoreStatus || null,
        scoreError: res.data?.scoreError || null,
      };

      if (historyId) {
        setSelectedItem((prev) => (prev && prev.id === targetId ? { ...prev, ...updatedFields } : prev));
        setHistoryItems((prev) => prev.map((it) => (it.id === targetId ? { ...it, ...updatedFields } : it)));
        setMemberHistoryItems((prev) => prev.map((it) => (it.id === targetId ? { ...it, ...updatedFields } : it)));
      } else {
        setScoreResult(updatedFields.scoreResult);
        setScoreStatus(updatedFields.scoreStatus);
        setScoreErrorMsg(updatedFields.scoreError);
      }

      if (res.data?.scoreStatus === 'success') {
        toast.success('Đã chấm điểm lại thành công!', { id: loadingToast });
      } else {
        toast.error(res.data?.scoreError || 'Chấm điểm lại vẫn thất bại, vui lòng thử lại sau.', { id: loadingToast });
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Lỗi khi chấm điểm lại';
      toast.error(errMsg, { id: loadingToast });
    } finally {
      setIsRescoring(false);
    }
  };

  const copyToClipboard = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    toast.success('Đã sao chép kịch bản!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="text-[#1b1b1d] bg-[#fcf8fb] h-[calc(100vh-112px)] flex flex-col min-h-0 overflow-hidden">
      <div className="max-w-[1680px] w-full mx-auto flex-1 flex flex-col min-h-0">
        
        {/* Header & Tabs */}
        <div className="flex-none mb-2 2xl:mb-3">
          <header className="mb-1.5">
            <h1 className="text-xl md:text-2xl 2xl:text-3xl font-bold text-[#1b1b1d] tracking-tight">Chuyển đổi nội dung</h1>
            <p className="text-[#464554] text-xs">Biến ý tưởng thô thành kịch bản chuyên nghiệp với trợ lý AI đa nhân vật.</p>
          </header>

            {/* Horizontal Tab Navigation */}
            <div className="flex items-center space-x-6 2xl:space-x-8 border-b border-[#c7c4d7]">
              <button
                onClick={() => setActiveTab('transform')}
                className={`py-1.5 2xl:py-2 px-1 text-xs 2xl:text-sm font-semibold transition-all focus:outline-none ${activeTab === 'transform'
                  ? 'border-b-2 border-[#4441cc] text-[#4441cc]'
                  : 'text-[#464554] hover:text-[#4441cc]'
                  }`}
              >
                Chuyển đổi content
              </button>
              <button
                onClick={() => {
                  setActiveTab('history');
                  setHistoryPage(1);
                }}
                className={`py-1.5 2xl:py-2 px-1 text-xs 2xl:text-sm font-semibold transition-all focus:outline-none ${activeTab === 'history'
                  ? 'border-b-2 border-[#4441cc] text-[#4441cc]'
                  : 'text-[#464554] hover:text-[#4441cc]'
                  }`}
              >
                Lịch sử
              </button>
              <button
                onClick={() => {
                  setActiveTab('team');
                  setMemberHistoryPage(1);
                }}
                className={`py-1.5 2xl:py-2 px-1 text-xs 2xl:text-sm font-semibold transition-all focus:outline-none ${activeTab === 'team'
                  ? 'border-b-2 border-[#4441cc] text-[#4441cc]'
                  : 'text-[#464554] hover:text-[#4441cc]'
                  }`}
              >
                Thống kê
              </button>
            </div>
          </div>

          {/* Main Transformation Content */}
          {activeTab === 'transform' && (
            <div className="flex-1 flex flex-col min-h-0 space-y-2 2xl:space-y-3">
              
              {/* 2-Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-[6fr_5fr] gap-3 2xl:gap-5 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
                
                {/* Left Column: Step 1 & Step 2 */}
                <div className="flex flex-col min-h-0 space-y-2.5 2xl:space-y-4">

                  {/* Step 1: Input Section (Flex-1 to absorb all remaining vertical height for a taller textarea) */}
                  <section className="bg-white border border-[#c7c4d7] p-3 2xl:p-4 rounded-xl 2xl:rounded-2xl shadow-sm flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-2 flex-none">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 2xl:w-6 2xl:h-6 rounded-full bg-[#4441cc] text-white flex items-center justify-center font-bold text-[10px] 2xl:text-xs">1</span>
                        <h2 className="text-sm 2xl:text-base font-bold text-[#1b1b1d]">Nhập kịch bản thô</h2>
                      </div>

                      {/* Tab System */}
                      <div className="flex p-0.5 bg-[#f6f3f5] rounded-lg 2xl:rounded-xl w-fit">
                        <button
                          onClick={() => { setInputMode('text'); setSelectedFile(null); }}
                          className={`flex items-center space-x-1 px-2.5 py-0.5 2xl:px-3.5 2xl:py-1 rounded-md 2xl:rounded-lg font-semibold text-[10px] 2xl:text-xs transition-all ${inputMode === 'text'
                            ? 'bg-white text-[#4441cc] shadow-sm'
                            : 'text-[#464554] hover:text-[#4441cc]'
                            }`}
                        >
                          <FileText className="w-3 h-3 2xl:w-3.5 2xl:h-3.5" />
                          <span>Văn bản</span>
                        </button>
                        <button
                          onClick={() => { setInputMode('video'); setSelectedFile(null); }}
                          className={`flex items-center space-x-1 px-2.5 py-0.5 2xl:px-3.5 2xl:py-1 rounded-md 2xl:rounded-lg font-semibold text-[10px] 2xl:text-xs transition-all ${inputMode === 'video'
                            ? 'bg-white text-[#4441cc] shadow-sm'
                            : 'text-[#464554] hover:text-[#4441cc]'
                            }`}
                        >
                          <Video className="w-3 h-3 2xl:w-3.5 2xl:h-3.5" />
                          <span>Video</span>
                        </button>
                        <button
                          onClick={() => { setInputMode('audio'); setSelectedFile(null); }}
                          className={`flex items-center space-x-1 px-2.5 py-0.5 2xl:px-3.5 2xl:py-1 rounded-md 2xl:rounded-lg font-semibold text-[10px] 2xl:text-xs transition-all ${inputMode === 'audio'
                            ? 'bg-white text-[#4441cc] shadow-sm'
                            : 'text-[#464554] hover:text-[#4441cc]'
                            }`}
                        >
                          <Mic className="w-3 h-3 2xl:w-3.5 2xl:h-3.5" />
                          <span>Giọng nói</span>
                        </button>
                      </div>
                    </div>

                    {/* File Upload Section */}
                    {inputMode !== 'text' && (
                      <div className="mb-2 p-2.5 border-2 border-dashed border-[#c7c4d7] hover:border-[#4441cc] rounded-xl flex flex-col items-center justify-center bg-[#fcf8fb] transition-all relative flex-none">
                        <input
                          type="file"
                          id="file-upload"
                          accept={inputMode === 'video' ? 'video/*' : 'audio/*'}
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setSelectedFile(file);
                          }}
                          className="hidden"
                        />
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer flex flex-col items-center text-[#464554] w-full text-center"
                        >
                          <Upload className="w-5 h-5 text-[#4441cc] mb-0.5 animate-bounce" style={{ animationDuration: '3s' }} />
                          <span className="font-semibold text-[11px]">
                            {selectedFile ? selectedFile.name : `Nhấp để chọn file ${inputMode === 'video' ? 'video' : 'âm thanh'}`}
                          </span>
                          <span className="text-[9px] text-[#464554]/60 mt-0.5">
                            {inputMode === 'video'
                              ? 'Hỗ trợ MP4, MOV, AVI, MKV, WEBM (Tối đa 200MB)'
                              : 'Hỗ trợ MP3, WAV, M4A, AAC, OGG, FLAC (Tối đa 200MB)'}
                          </span>
                        </label>
                        {selectedFile && (
                          <button
                            onClick={handleTranscribe}
                            disabled={isTranscribing}
                            className="mt-1.5 px-3 py-0.5 bg-[#4441cc] hover:bg-[#4441cc]/90 text-white rounded-lg font-semibold text-[10px] flex items-center space-x-1 transition-all disabled:opacity-50"
                          >
                            {isTranscribing ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Đang nghe...</span>
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-3 h-3" />
                                <span>Chuyển thành văn bản</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Textarea Container (Expands dynamically to fill remaining height) */}
                    <div className="flex-1 flex flex-col min-h-0 relative">
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={
                          inputMode === 'text'
                            ? "Dán hoặc gõ kịch bản thô của bạn vào đây. Ví dụ: nội dung giới thiệu sản phẩm, ý tưởng video, ghi chú nhanh..."
                            : "Văn bản nhận diện từ file video/âm thanh sẽ hiển thị tại đây. Bạn có thể tự do chỉnh sửa trước khi tiến hành chuyển đổi."
                        }
                        className="w-full flex-1 min-h-[90px] p-2.5 2xl:p-3.5 rounded-xl bg-white border border-[#c7c4d7] focus:border-[#4441cc] focus:ring-2 focus:ring-[#4441cc]/10 transition-all text-xs 2xl:text-sm text-[#1b1b1d] placeholder-[#464554]/60 outline-none custom-scrollbar resize-none"
                      />
                      <div className="flex justify-between mt-0.5 flex-none px-1 text-[9px] 2xl:text-[10px] text-[#464554]">
                        <span>Hỗ trợ tiếng Việt có dấu</span>
                        <span>{inputText.length} ký tự</span>
                      </div>
                    </div>
                  </section>

                  {/* Step 2: Character Selection (Hugs full card content tightly with flex-none h-fit, zero blank space underneath) */}
                  <section className="bg-white border border-[#c7c4d7] p-3 2xl:p-4 rounded-xl 2xl:rounded-2xl shadow-sm flex-none h-fit">
                    <div className="flex items-center space-x-2 mb-2 flex-none">
                      <span className="w-5 h-5 2xl:w-6 2xl:h-6 rounded-full bg-[#4441cc] text-white flex items-center justify-center font-bold text-[10px] 2xl:text-xs">2</span>
                      <h2 className="text-sm 2xl:text-base font-bold text-[#1b1b1d]">Chọn nhân vật</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 2xl:gap-3.5">
                      {characters.map((char) => {
                        const isSelected = selectedCharacterId === char.id;
                        return (
                          <div
                            key={char.id}
                            onClick={() => setSelectedCharacterId(char.id)}
                            className={`group relative p-2.5 2xl:p-3.5 border-2 rounded-xl cursor-pointer transition-all ${isSelected
                              ? 'border-[#4441cc] bg-[#5e5ce6]/5'
                              : 'border-[#c7c4d7] bg-white hover:border-[#4441cc]'
                              }`}
                          >
                            <div className="flex items-center space-x-2 mb-1.5">
                              <div className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-full overflow-hidden border-2 border-[#eae7ea] group-hover:border-[#4441cc]/20 flex-shrink-0">
                                {char.avatar_url ? (
                                  <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-[#eae7ea] text-[#464554] font-bold text-[10px] 2xl:text-xs flex items-center justify-center">
                                    {getInitials(char.name)}
                                  </div>
                                )}
                              </div>
                              <div>
                                <h3 className="font-semibold text-xs 2xl:text-sm text-[#1b1b1d]">{char.name}</h3>
                                <p className="text-[9px] 2xl:text-[10px] text-[#464554]">Năng lượng • Viral</p>
                              </div>
                            </div>
                            <p className="text-[10px] 2xl:text-[11px] text-[#464554] mb-2 leading-relaxed">
                              {char.description}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              <span className="px-2 py-0.5 rounded-full bg-[#b4b9fd]/30 text-[#424883] text-[9px] 2xl:text-[10px] font-bold">Năng động</span>
                              <span className="px-2 py-0.5 rounded-full bg-[#b4b9fd]/30 text-[#424883] text-[9px] 2xl:text-[10px] font-bold">Hài hước</span>
                              <span className="px-2 py-0.5 rounded-full bg-[#b4b9fd]/30 text-[#424883] text-[9px] 2xl:text-[10px] font-bold">Trending</span>
                            </div>
                            <div className={`absolute top-2 right-2 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}>
                              <Check className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-[#4441cc]" />
                            </div>
                          </div>
                        );
                      })}

                      {/* Nhân vật chưa có trong hệ thống — hiển thị tham khảo, không bấm chọn được nên KHÔNG dùng cursor-pointer/hover (tránh trông như bấm được mà không có phản hồi gì) */}
                      <div className="group relative p-2.5 2xl:p-3.5 border-2 rounded-xl transition-all border-[#c7c4d7] bg-white opacity-60">
                        <div className="flex items-center space-x-2 mb-1.5">
                          <div className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-full overflow-hidden border-2 border-[#4441cc]/20 flex-shrink-0">
                            <img alt="Chị Nhạn" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1AaFdELtmwmgSb9uG2HcI1kMeuO63zvWNv-iQABmVHTbhky6sSwyVm5CAbwTxbeNJnaqA-EPbRrrQ_afofat9cYl2_JWKkLv_yEXQWIVPDaCFXpKYYlR7rHwZRy0w5013Wqlg7QKfXTOEFGekhB8ouDvCJELFlhRnnTV83YPSv9N0lgYckco8d9lad6gYhJaNJYg8eqW3KxyuAfcfJdU8XqaXP-brWhZDROyeLhACyCnbmMRM1Fsjxg" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-xs 2xl:text-sm text-[#1b1b1d]">Chị Nhạn</h3>
                            <p className="text-[9px] 2xl:text-[10px] text-[#464554]">Kể chuyện • Cảm xúc</p>
                          </div>
                        </div>
                        <p className="text-[10px] 2xl:text-[11px] text-[#464554] mb-2 leading-relaxed">
                          Ấm áp, gần gũi, kể chuyện có mở đầu – cao trào – kết, nhiều cảm xúc.
                        </p>
                        <div className="flex flex-wrap gap-1">
                          <span className="px-2 py-0.5 rounded-full bg-[#b4b9fd]/30 text-[#424883] text-[9px] 2xl:text-[10px] font-bold">Ấm áp</span>
                          <span className="px-2 py-0.5 rounded-full bg-[#b4b9fd]/30 text-[#424883] text-[9px] 2xl:text-[10px] font-bold">Tâm tình</span>
                          <span className="px-2 py-0.5 rounded-full bg-[#b4b9fd]/30 text-[#424883] text-[9px] 2xl:text-[10px] font-bold">Truyền cảm</span>
                        </div>
                      </div>

                      {/* Nhân vật chưa có trong hệ thống — hiển thị tham khảo, không bấm chọn được */}
                      <div className="group relative p-2.5 2xl:p-3.5 border-2 rounded-xl transition-all border-[#c7c4d7] bg-white opacity-60">
                        <div className="flex items-center space-x-2 mb-1.5">
                          <div className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-full overflow-hidden border-2 border-[#eae7ea] group-hover:border-[#4441cc]/20 flex-shrink-0">
                            <img alt="Chung Bùi" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHfh4UZaE23hQqzJ_k7SX2OpO5ZyN7FjWZFxF2dCcQtnXCMh70phb13ssXLkvxpCzp-zwc878zMCg6squudM-883Plz4J-H4C36CN0SaBykbO_NqLLjbT5ecajfh3pAA2AaW34IE3SJIYEvZw_EcCAZyF-H-Ft70B0DSb1IBE7EwaF20ObfclfI_Gr_gXtZzm4Yy7G-txyh_j8t3_yQg8XF6hY8PfG-O9UQY5ndVzaueSBrM4RyRPIbw" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-xs 2xl:text-sm text-[#1b1b1d]">Chung Bùi</h3>
                            <p className="text-[9px] 2xl:text-[10px] text-[#464554]">Chuyên sâu • Phân tích</p>
                          </div>
                        </div>
                        <p className="text-[10px] 2xl:text-[11px] text-[#464554] mb-2 leading-relaxed">
                          Mạch lạc, dẫn chứng số liệu, chia luận điểm rõ ràng, giọng chuyên gia.
                        </p>
                        <div className="flex flex-wrap gap-1">
                          <span className="px-2 py-0.5 rounded-full bg-[#5e5ce6] text-white text-[9px] 2xl:text-[10px] font-bold">Chuyên nghiệp</span>
                          <span className="px-2 py-0.5 rounded-full bg-[#5e5ce6] text-white text-[9px] 2xl:text-[10px] font-bold">Logic</span>
                          <span className="px-2 py-0.5 rounded-full bg-[#5e5ce6] text-white text-[9px] 2xl:text-[10px] font-bold">Uy tín</span>
                        </div>
                      </div>

                    </div>
                  </section>

                </div>

                {/* Right Column: Step 3 Preview */}
                <div className="flex flex-col min-h-0">
                  <section className="bg-white border border-[#c7c4d7] p-3 2xl:p-4 rounded-xl 2xl:rounded-2xl flex-1 flex flex-col min-h-0 shadow-sm">
                    <div className="flex items-center justify-between mb-2 flex-none">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-6 h-6 2xl:w-7 2xl:h-7 rounded-full bg-[#4441cc] text-white flex items-center justify-center font-bold text-[11px] 2xl:text-xs">3</span>
                        <h2 className="text-base 2xl:text-lg font-bold text-[#1b1b1d]">Kết quả chuyển đổi</h2>
                      </div>
                      {outputText && (
                        <button
                          onClick={copyToClipboard}
                          className="p-1.5 rounded-lg bg-white hover:bg-[#f6f3f5] border border-[#c7c4d7] text-[#464554] hover:text-[#1b1b1d] transition-colors flex items-center gap-1 text-[11px] 2xl:text-xs font-semibold"
                          title="Copy kịch bản"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? 'Đã copy' : 'Copy'}
                        </button>
                      )}
                    </div>

                    {outputText ? (
                      <div className="flex-1 flex flex-col min-h-0 gap-2">
                        {/* Khối cố định luôn nhìn thấy: Hard Gate + card điểm + tabs nhóm */}
                        <div className="flex-none space-y-2">
                          {/* 0. Chấm điểm thất bại (sau khi đã tự retry ở BE) — báo rõ, không im lặng bỏ qua */}
                          {scoreStatus === 'failed' && (
                            <div className="p-2.5 2xl:p-3 rounded-2xl border border-amber-300 bg-amber-50 flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-[11px] text-amber-800 flex items-center gap-1.5 flex-1 min-w-0">
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>⚠️ {scoreErrorMsg || 'Không thể chấm điểm nội dung này (có thể do timeout).'}</span>
                              </p>
                              <button
                                onClick={() => handleRescore()}
                                disabled={isRescoring}
                                className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 text-[11px] font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                {isRescoring ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Đang thử lại...
                                  </>
                                ) : (
                                  'Thử chấm điểm lại'
                                )}
                              </button>
                            </div>
                          )}

                          {/* 1. Hard Gate — tách biệt hoàn toàn khỏi phần điểm số, luôn nằm trên cùng */}
                          {scoreResult && <HardGateBlock violations={scoreResult.hardGateViolations} />}

                          {/* 2. Card điểm tổng */}
                          {scoreResult && <ScoreOverallCard scoreResult={scoreResult} />}
                        </div>

                        {/* Khối cuộn riêng: accordion 7 nhóm + nội dung highlight + nút nâng cấp */}
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5 space-y-2">
                          {/* 3-4. Accordion 7 nhóm tiêu chí — mặc định mở nhóm lỗi/cần cải thiện điểm thấp nhất */}
                          {scoreResult && <ScoreGroupsAccordion scoreResult={scoreResult} />}

                          {/* 5. Nội dung đã chuyển đổi — highlight tiêu chí đạt theo màu nhóm, Hard Gate ưu tiên đỏ */}
                          <div>
                            <p className="text-[10px] font-bold text-[#464554] uppercase tracking-wider mb-1.5">
                              Nội dung đã chuyển đổi{scoreResult ? ' · Highlight tiêu chí đạt' : ''}
                            </p>
                            <div className="bg-[#f6f3f5] p-2.5 2xl:p-3.5 rounded-xl border border-[#c7c4d7] shadow-inner text-[11px] 2xl:text-xs text-[#1b1b1d] leading-relaxed whitespace-pre-wrap select-text">
                              {scoreResult
                                ? buildHighlightSegments(outputText, scoreResult).map((seg, idx) => {
                                  if (!seg.mark) return <span key={idx}>{seg.text}</span>;
                                  if (seg.mark.kind === 'hardgate') {
                                    return (
                                      <mark key={idx} className="bg-red-200 text-red-900 rounded px-0.5">
                                        {seg.text}
                                      </mark>
                                    );
                                  }
                                  const theme = GROUP_HIGHLIGHT_COLORS[seg.mark.groupIndex % GROUP_HIGHLIGHT_COLORS.length];
                                  return (
                                    <mark key={idx} className={`${theme.bg} ${theme.text} rounded px-0.5`}>
                                      {seg.text}
                                    </mark>
                                  );
                                })
                                : outputText}
                            </div>

                            {/* Chú thích màu */}
                            {scoreResult && (
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t border-[#eae7ea]">
                                {scoreResult.groups.map((group, idx) => (
                                  <span key={group.name} className="flex items-center gap-1 text-[9.5px] text-[#464554]">
                                    <span className={`w-2.5 h-2.5 rounded-sm ${GROUP_HIGHLIGHT_COLORS[idx % GROUP_HIGHLIGHT_COLORS.length].bg}`} />
                                    {group.name}
                                  </span>
                                ))}
                                {scoreResult.hardGateViolations.length > 0 && (
                                  <span className="flex items-center gap-1 text-[9.5px] text-red-700 font-semibold">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-red-200" />
                                    Hard Gate (lỗi bắt buộc sửa)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 6. So sánh điểm cũ/mới + nút nâng cấp */}
                          {scoreResult && currentHistoryId && (
                            <div className="pt-1 space-y-2">
                              {previousOverallScore !== null && (
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-sm text-[#464554]/50 line-through">{previousOverallScore}</span>
                                  <TrendingUp
                                    className={`w-4 h-4 ${scoreResult.overallScore >= previousOverallScore ? 'text-emerald-500' : 'text-red-500'}`}
                                  />
                                  <span className="text-lg font-black text-[#4441cc]">{scoreResult.overallScore}</span>
                                </div>
                              )}
                              <button
                                onClick={handleUpgrade}
                                disabled={isUpgrading}
                                className="w-full bg-[#4441cc] text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#4441cc]/20 hover:bg-[#4441cc]/95 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isUpgrading ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Đang nâng cấp...</span>
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-3.5 h-3.5" />
                                    <span>Nâng cấp content theo gợi ý</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 bg-[#f6f3f5] rounded-xl border-2 border-dashed border-[#c7c4d7] flex flex-col items-center justify-center p-4 2xl:p-6 text-center space-y-2 2xl:space-y-4">
                        <div className="w-10 h-10 2xl:w-14 2xl:h-14 rounded-full bg-white flex items-center justify-center text-[#5e5ce6] shadow-sm">
                          <Sparkles className="w-6 h-6 2xl:w-8 2xl:h-8" />
                        </div>
                        <div className="max-w-xs">
                          <h4 className="text-sm 2xl:text-base font-bold text-[#1b1b1d] mb-0.5">Sẵn sàng biến đổi</h4>
                          <p className="text-[11px] 2xl:text-xs text-[#464554]">
                            Nhập kịch bản và chọn nhân vật, sau đó nhấn <strong className="text-[#4441cc]">Chuyển đổi</strong> để xem trước nội dung tại đây.
                          </p>
                        </div>
                      </div>
                    )}
                  </section>
                </div>

              </div>

              {/* Bottom Action Button Bar */}
              <div className="flex-none pt-1.5 2xl:pt-2 pb-0.5 flex justify-center">
                <button
                  onClick={handleTransform}
                  disabled={isGenerating || !inputText.trim() || !selectedCharacterId}
                  className="max-w-7xl w-full bg-[#4441cc] text-white py-2.5 2xl:py-3.5 px-6 2xl:px-8 rounded-xl font-bold text-xs 2xl:text-sm flex items-center justify-center space-x-2 shadow-md shadow-[#4441cc]/20 hover:bg-[#4441cc]/95 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 animate-spin" />
                      <span>Đang xử lý kịch bản AI...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                      <span>Chuyển đổi nội dung</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* History Section (Tab 2) */}
          {activeTab === 'history' && (
            <div className="flex-1 min-h-0 overflow-y-auto bg-white rounded-3xl p-5 border border-[#c7c4d7] shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-[#1b1b1d] flex items-center gap-2">
                  <History className="w-5 h-5 text-[#4441cc]" />
                  Lịch sử chuyển đổi của tôi
                </h2>
                <span className="text-xs bg-[#5e5ce6]/5 text-[#4441cc] border border-[#5e5ce6]/10 px-3 py-1.5 rounded-full font-semibold">
                  Tổng số bản ghi: {historyTotal}
                </span>
              </div>

              {isHistoryLoading ? (
                <div className="py-20 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#4441cc]" />
                  <p className="text-xs text-[#464554] mt-2">Đang tải lịch sử...</p>
                </div>
              ) : historyItems.length > 0 ? (
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#eae7ea] text-xs font-bold text-[#464554] uppercase tracking-wider">
                          <th className="py-2.5 px-4">Nhân vật</th>
                          <th className="py-2.5 px-4">Nội dung thô (Input)</th>
                          <th className="py-2.5 px-4">Kết quả (Output)</th>
                          <th className="py-2.5 px-4">Thời gian tạo</th>
                          <th className="py-2.5 px-4 text-right">Chi tiết</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eae7ea]/50 text-sm text-[#464554]">
                        {historyItems.map((item) => (
                          <tr key={item.id} className="hover:bg-[#f6f3f5] transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-[#1b1b1d]">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md bg-[#5e5ce6]/5 text-[#4441cc] border border-[#5e5ce6]/10 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                  {item.character?.name?.[0] || '?'}
                                </span>
                                {item.character?.name || 'Không rõ'}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 max-w-xs truncate">{item.input_text}</td>
                            <td className="py-2.5 px-4 max-w-xs truncate text-[#464554]">
                              {item.output_text || <span className="text-xs text-red-500 font-bold">Lỗi</span>}
                            </td>
                            <td className="py-2.5 px-4 text-xs text-[#464554]/80">
                              {new Date(item.created_at).toLocaleString('vi-VN')}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                onClick={() => setSelectedItem(item)}
                                className="p-1.5 rounded-lg hover:bg-[#eae7ea] text-[#4441cc] transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {historyTotalPages > 1 && (
                    <div className="pt-3 border-t border-[#eae7ea]">
                      <NumberedPagination page={historyPage} totalPages={historyTotalPages} onPageChange={setHistoryPage} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-20 text-[#464554] space-y-2">
                  <History className="w-10 h-10 mx-auto text-[#464554]/50" />
                  <p className="text-sm font-semibold">Chưa có lịch sử chuyển đổi</p>
                  <p className="text-xs max-w-xs mx-auto text-[#464554]/75">
                    Hãy thực hiện chuyển đổi kịch bản đầu tiên của bạn để lưu lịch sử tại đây.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Statistics / Team Section (Tab 3) */}
          {activeTab === 'team' && (
            isPrivileged ? (
              <div className="flex-1 min-h-0 overflow-y-auto bg-white border border-[#c7c4d7] rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                  <h2 className="text-lg font-bold text-[#1b1b1d] flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#4441cc]" />
                    Lịch sử của thành viên đội nhóm
                  </h2>

                  {/* Member selector */}
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#464554] font-semibold whitespace-nowrap">Chọn thành viên:</span>
                      <MemberDropdown
                        members={teamMembers}
                        value={selectedMemberId}
                        onChange={(id) => {
                          setSelectedMemberId(id);
                          setMemberHistoryPage(1);
                        }}
                      />
                    </div>
                    {selectedMemberId && (
                      <span className="text-xs bg-[#5e5ce6]/5 text-[#4441cc] border border-[#5e5ce6]/10 px-3 py-1 rounded-full font-semibold">
                        Tổng số bản ghi: {memberHistoryTotal}
                      </span>
                    )}
                  </div>
                </div>

                {isMemberHistoryLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 rounded-2xl border border-dashed border-[#c7c4d7] bg-[#fcf8fb]">
                    <Loader2 className="w-8 h-8 animate-spin text-[#4441cc]" />
                    <p className="text-xs text-[#464554] font-medium">Đang tải lịch sử thành viên...</p>
                  </div>
                ) : memberHistoryItems.length > 0 ? (
                  <div className="space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#eae7ea] text-xs font-bold text-[#464554] uppercase tracking-wider">
                            <th className="py-2.5 px-4">Nhân vật</th>
                            <th className="py-2.5 px-4">Nội dung thô (Input)</th>
                            <th className="py-2.5 px-4">Kết quả (Output)</th>
                            <th className="py-2.5 px-4">Thời gian tạo</th>
                            <th className="py-2.5 px-4 text-right">Chi tiết</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eae7ea]/50 text-sm text-[#464554]">
                          {memberHistoryItems.map((item) => (
                            <tr key={item.id} className="hover:bg-[#f6f3f5] transition-colors">
                              <td className="py-2.5 px-4 font-semibold text-[#1b1b1d]">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-md bg-[#5e5ce6]/5 text-[#4441cc] border border-[#5e5ce6]/10 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                    {item.character.name[0]}
                                  </span>
                                  {item.character.name}
                                </div>
                              </td>
                              <td className="py-2.5 px-4 max-w-xs truncate">{item.input_text}</td>
                              <td className="py-2.5 px-4 max-w-xs truncate text-[#464554]">
                                {item.output_text || <span className="text-xs text-red-500 font-bold">Lỗi</span>}
                              </td>
                              <td className="py-2.5 px-4 text-xs text-[#464554]/80">
                                {new Date(item.created_at).toLocaleString('vi-VN')}
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <button
                                  onClick={() => setSelectedItem(item)}
                                  className="p-1.5 rounded-lg hover:bg-[#eae7ea] text-[#4441cc] transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {memberHistoryTotalPages > 1 && (
                      <div className="pt-3 border-t border-[#eae7ea]">
                        <NumberedPagination page={memberHistoryPage} totalPages={memberHistoryTotalPages} onPageChange={setMemberHistoryPage} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-16 rounded-2xl border border-dashed border-[#c7c4d7] bg-[#fcf8fb] text-[#464554] space-y-2">
                    <Users className="w-10 h-10 mx-auto text-[#464554]/50" />
                    <p className="text-sm font-semibold text-[#1b1b1d]">Thành viên này chưa có lịch sử</p>
                    <p className="text-xs max-w-xs mx-auto text-[#464554]/75">
                      Lịch sử chuyển đổi kịch bản của thành viên được chọn sẽ hiển thị ở đây sau khi họ thực hiện thao tác.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-[#c7c4d7] rounded-3xl p-12 text-center space-y-4 shadow-sm">
                <Users className="w-16 h-16 text-[#464554]/50 mx-auto animate-pulse" />
                <h3 className="text-xl font-bold text-[#1b1b1d]">Thống kê Đội nhóm</h3>
                <p className="text-[#464554] text-sm max-w-md mx-auto leading-relaxed">
                  Tính năng Thống kê Đội nhóm đang được phát triển (Sắp ra mắt dành cho Thành viên). Hiện tại chỉ có tài khoản cấp Quản lý (Leader, Manager, Admin) mới có thể truy cập để xem dữ liệu của thành viên khác.
                </p>
              </div>
            )
          )}
        </div>

      {/* History Detail Modal (Popup drawer) */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setSelectedItem(null)}
          />
          <div className="relative bg-white border border-[#c7c4d7] text-[#1b1b1d] w-full max-w-3xl rounded-[32px] overflow-hidden shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
            {/* Header info */}
            <div className="flex items-center justify-between pb-4 border-b border-[#eae7ea]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#5e5ce6]/10 text-[#4441cc] flex items-center justify-center font-bold">
                  {selectedItem.character?.name?.[0] || '?'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1b1b1d]">Chi tiết kịch bản — {selectedItem.character?.name || 'Không rõ'}</h3>
                  <div className="flex items-center gap-3 text-[11px] text-[#464554] mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(selectedItem.created_at).toLocaleString('vi-VN')}
                    </span>
                    {selectedItem.duration_ms && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {selectedItem.duration_ms}ms
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full bg-[#f6f3f5] hover:bg-[#eae7ea] text-[#464554] hover:text-[#1b1b1d] flex items-center justify-center transition-colors font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* Scrollable body content */}
            <div className="mt-6 space-y-5 overflow-y-auto max-h-[560px] pr-2 custom-scrollbar">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-[#464554] uppercase tracking-wider">Kịch bản gốc (Input)</span>
                <div className="bg-[#f6f3f5] border border-[#c7c4d7] p-4 rounded-xl text-sm text-[#1b1b1d] whitespace-pre-wrap select-text shadow-inner">
                  {selectedItem.input_text}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#4441cc] uppercase tracking-wider">Kết quả kịch bản AI (Output)</span>
                  {selectedItem.output_text && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedItem.output_text || '');
                        toast.success('Đã copy kịch bản!');
                      }}
                      className="text-xs text-[#4441cc] hover:text-[#4441cc]/80 font-semibold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  )}
                </div>
                {selectedItem.output_text ? (
                  <div className="bg-[#5e5ce6]/5 border border-[#5e5ce6]/25 p-4 rounded-xl text-sm text-[#1b1b1d] whitespace-pre-wrap select-text leading-relaxed">
                    {selectedItem.output_text}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl text-sm bg-red-50 border border-red-200 text-red-650 font-medium">
                    {selectedItem.error_message || 'Quá trình chuyển đổi thất bại'}
                  </div>
                )}
              </div>

              {/* Chấm điểm — chỉ áp dụng khi bản ghi từng có kịch bản kết quả để chấm */}
              {selectedItem.output_text && (
                <div className="space-y-2">
                  {selectedItem.scoreStatus === null && (
                    <div className="p-3 rounded-xl border border-[#c7c4d7] bg-[#f6f3f5] text-xs text-[#464554] font-medium">
                      Bản ghi này chưa có dữ liệu chấm điểm.
                    </div>
                  )}

                  {selectedItem.scoreStatus === 'failed' && (
                    <div className="p-3 rounded-2xl border border-amber-300 bg-amber-50 flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[11px] text-amber-800 flex items-center gap-1.5 flex-1 min-w-0">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>⚠️ {selectedItem.scoreError || 'Không thể chấm điểm nội dung này (có thể do timeout).'}</span>
                      </p>
                      <button
                        onClick={() => handleRescore(selectedItem.id)}
                        disabled={isRescoring}
                        className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 text-[11px] font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {isRescoring ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Đang thử lại...
                          </>
                        ) : (
                          'Chấm điểm lại'
                        )}
                      </button>
                    </div>
                  )}

                  {selectedItem.scoreStatus === 'success' && selectedItem.scoreResult && (
                    <>
                      <HardGateBlock violations={selectedItem.scoreResult.hardGateViolations} />
                      <ScoreOverallCard scoreResult={selectedItem.scoreResult} />
                      <ScoreGroupsAccordion scoreResult={selectedItem.scoreResult} />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
