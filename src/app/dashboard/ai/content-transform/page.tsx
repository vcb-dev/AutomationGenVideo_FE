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
  Circle,
  MinusCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api-client';
import type {
  PaastCriterion,
  PaastLayerCriteria,
} from '@/lib/api/paast-analyzer';
import { NumberedPagination } from '@/components/ui/NumberedPagination';
import { MemberDropdown } from '@/components/ui/MemberDropdown';

// Giới hạn dung lượng file upload để transcribe — phải khớp đúng limits.fileSize
// của FileInterceptor ở BE (ai-integration.controller.ts). Lệch nhau sẽ dẫn tới
// FE cho qua nhưng BE vẫn từ chối (hoặc ngược lại).
const MAX_UPLOAD_SIZE_BYTES = 200 * 1024 * 1024; // 200MB

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
  // /transform, /upgrade, /rescore).
  scoreResult: ScoreResult | null;
  scoreStatus: ScoreStatus;
  scoreError: string | null;
  /**
   * true = điểm này là kết quả DÙNG LẠI của lần chấm trước cho đúng nội dung đó, không phải một
   * lượt chấm mới vừa chạy (BE tái dùng điểm cũ khi output_text và phiên bản logic chấm không
   * đổi). Chỉ có ở response /rescore; các endpoint lịch sử không trả field này.
   */
  fromCache?: boolean;
}

/**
 * Trạng thái chấm điểm — khớp 1-1 với type cùng tên bên BE (ai-integration.service.ts, phần
 * "chuyển đổi content" — gộp từ content-transform.service.ts cũ):
 *  - `null`    : bản ghi chưa từng có kịch bản kết quả (transform hỏng ngay từ bước viết).
 *  - `pending` : ĐÃ có kịch bản nhưng CHƯA chấm điểm — trạng thái bình thường ngay sau khi bấm
 *                "Chuyển đổi nội dung", vì chấm điểm giờ là 1 bước riêng người dùng chủ động
 *                bấm. Hiển thị "Chưa chấm điểm", KHÔNG hiển thị như lỗi.
 *  - `success` : đã có điểm PAAST.
 *  - `failed`  : lần chấm vừa rồi thất bại, hoặc bản ghi dùng hệ điểm cũ đã ngừng dùng.
 */
type ScoreStatus = 'success' | 'failed' | 'pending' | null;

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  roles: UserRole[];
  team?: string;
}

// ── Chấm điểm kịch bản theo khung PAAST ──────────────────────────────────────────────────
// Type + hàm THUẦN sống ở paast-highlight.util.ts (không phải page.tsx): Next.js App Router
// chỉ cho phép page.tsx export các tên cố định (default, metadata...), export thêm tên tuỳ ý
// làm lỗi kiểu route ngay ở `next build`/tsc.
import {
  getLayerStatus,
  buildHighlightSegments,
  computeDefaultOpenLayers,
  PAAST_LAYER_KEYS,
  LAYER_MAX_SCORE,
  type ScoreResult,
  type PaastLayerKey,
  type LayerStatus,
} from './paast-highlight.util';

const LAYER_META: Record<
  PaastLayerKey,
  { label: string; sub: string; initial: string; markBg: string; markText: string; swatch: string; quoteBorder: string }
> = {
  prefer: { label: 'Prefer (Thích)', sub: 'CRAVES', initial: 'P', markBg: 'bg-amber-100', markText: 'text-amber-900', swatch: 'bg-amber-100', quoteBorder: 'border-amber-300' },
  action: { label: 'Action (Hành động)', sub: 'S-FACES', initial: 'A', markBg: 'bg-lime-100', markText: 'text-lime-900', swatch: 'bg-lime-100', quoteBorder: 'border-lime-300' },
  acknowledge: { label: 'Acknowledge (Biết)', sub: 'BRANDS', initial: 'A', markBg: 'bg-orange-100', markText: 'text-orange-900', swatch: 'bg-orange-100', quoteBorder: 'border-orange-300' },
  stick: { label: 'Stick (Nhớ)', sub: 'STICKS', initial: 'S', markBg: 'bg-sky-100', markText: 'text-sky-900', swatch: 'bg-sky-100', quoteBorder: 'border-sky-300' },
  trust: { label: 'Trust (Tin)', sub: 'TRUSTS', initial: 'T', markBg: 'bg-teal-100', markText: 'text-teal-900', swatch: 'bg-teal-100', quoteBorder: 'border-teal-300' },
};

/** 4 lớp chấm theo từng tiêu chí; Prefer chấm toàn bài nên hiển thị riêng. */
const CRITERIA_LAYER_KEYS: PaastLayerKey[] = ['action', 'acknowledge', 'stick', 'trust'];

function getScoreTheme(score: number) {
  if (score >= 90) return { border: 'border-emerald-300', bg: 'bg-emerald-50', text: 'text-emerald-700' };
  if (score >= 80) return { border: 'border-blue-300', bg: 'bg-blue-50', text: 'text-blue-700' };
  if (score >= 70) return { border: 'border-amber-300', bg: 'bg-amber-50', text: 'text-amber-700' };
  return { border: 'border-red-300', bg: 'bg-red-50', text: 'text-red-700' };
}

const LAYER_STATUS_STYLES: Record<
  LayerStatus,
  { Icon: typeof CheckCircle2; iconClass: string; barClass: string; label: string }
> = {
  good: { Icon: CheckCircle2, iconClass: 'text-emerald-600', barClass: 'bg-emerald-500', label: 'Tốt' },
  warning: { Icon: AlertTriangle, iconClass: 'text-amber-600', barClass: 'bg-amber-500', label: 'Cần cải thiện' },
  error: { Icon: XCircle, iconClass: 'text-red-600', barClass: 'bg-red-500', label: 'Yếu' },
};

// ── Accordion 5 lớp PAAST + khối CTA Compliance — dùng chung cho cả màn hình chuyển đổi
// (Kết quả chuyển đổi) và modal "Chi tiết kịch bản" ở tab Lịch sử, đọc cùng 1 shape ScoreResult.

function PaastLayerAccordionItem({
  layerKey,
  score,
  summary,
  isOpen,
  onToggle,
  children,
}: {
  layerKey: PaastLayerKey;
  score: number;
  /** Dòng tóm tắt ngắn hiển thị ngay trên header (vd "4/6 tiêu chí đạt"). */
  summary: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const meta = LAYER_META[layerKey];
  const status = getLayerStatus(score);
  const style = LAYER_STATUS_STYLES[status];
  const ratioPct = Math.min(100, Math.round((score / LAYER_MAX_SCORE) * 100));
  const headerId = `paast-layer-header-${layerKey}`;
  const panelId = `paast-layer-panel-${layerKey}`;

  return (
    <div className={`rounded-xl border overflow-hidden ${isOpen ? 'border-[#c7c4d7]' : 'border-[#eae7ea]'}`}>
      <button
        type="button"
        id={headerId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={`Lớp ${meta.label} ${meta.sub}, ${score} trên ${LAYER_MAX_SCORE} điểm, ${style.label}. ${summary}`}
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2.5 py-2 bg-white hover:bg-[#f6f3f5] transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4441cc] focus-visible:ring-offset-1"
      >
        <style.Icon className={`w-4 h-4 flex-shrink-0 ${style.iconClass}`} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-[#1b1b1d] truncate">
              {meta.label} <span className="font-medium text-[#464554]">· {meta.sub}</span>
            </span>
            <span className="text-[10.5px] font-semibold text-[#464554] flex-shrink-0">
              {score}/{LAYER_MAX_SCORE}
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-[#eae7ea] overflow-hidden">
            <div className={`h-full rounded-full ${style.barClass}`} style={{ width: `${ratioPct}%` }} />
          </div>
          <p className="mt-1 text-[9.5px] text-[#464554]">{summary}</p>
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
          className="px-2.5 pb-2.5 pt-1.5 space-y-1 bg-[#fcfbfd] border-t border-[#eae7ea]"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * 1 tiêu chí của 4 lớp Action/Acknowledge/Stick/Trust.
 *
 * `na` được hiển thị KHÁC HẲN `miss`: xám trung tính + nhãn "Cần production", không tô đỏ và
 * không gắn nhãn "Gợi ý" — vì đây không phải lỗi của người viết mà là phần chỉ đánh giá được
 * khi có khâu sản xuất (hình hiệu, đạo cụ, nhạc, nghi thức quay), không sửa bằng chữ được.
 */
function PaastCriterionRow({ criterion }: { criterion: PaastCriterion }) {
  const Icon = criterion.status === 'pass' ? CheckCircle2 : criterion.status === 'na' ? MinusCircle : Circle;
  const iconClass =
    criterion.status === 'pass' ? 'text-emerald-500' : criterion.status === 'na' ? 'text-[#9c9aa8]' : 'text-orange-500';
  const boxClass =
    criterion.status === 'pass'
      ? 'border-[#eae7ea] bg-white'
      : criterion.status === 'na'
        ? 'border-[#eae7ea] bg-[#f6f3f5]'
        : 'border-orange-100 bg-orange-50/40';

  return (
    <div className={`p-2 rounded-lg border ${boxClass}`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${iconClass}`} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-semibold ${criterion.status === 'na' ? 'text-[#464554]' : 'text-[#1b1b1d]'}`}>
            {criterion.name_en} <span className="font-normal text-[#464554]">· {criterion.name_vi}</span>
          </p>
          {criterion.evidence && (
            <p className="mt-1 text-[10.5px] leading-relaxed text-[#464554]">
              {criterion.status === 'miss' && <span className="font-semibold text-orange-600">Gợi ý — </span>}
              {criterion.status === 'na' && <span className="font-semibold text-[#6b6979]">Cần production — </span>}
              {criterion.evidence}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Tóm tắt header của 1 lớp tiêu chí: tách riêng số `na` để không bị hiểu nhầm là tiêu chí trượt. */
function summarizeCriteriaLayer(layer: PaastLayerCriteria | undefined): string {
  const criteria = layer?.criteria || [];
  const pass = criteria.filter((c) => c.status === 'pass').length;
  const na = criteria.filter((c) => c.status === 'na').length;
  const base = `${pass}/${criteria.length} tiêu chí đạt`;
  return na > 0 ? `${base} · ${na} cần production` : base;
}

function PaastLayersAccordion({ scoreResult }: { scoreResult: ScoreResult }) {
  const [openLayers, setOpenLayers] = useState<Set<PaastLayerKey>>(() => computeDefaultOpenLayers(scoreResult));

  // scoreResult đổi tham chiếu mỗi khi có kết quả MỚI thật sự (chấm lần đầu/chấm lại/nâng cấp)
  // — tính lại lớp mặc định mở cho bản mới, không đụng vào lựa chọn mở/đóng thủ công của user
  // trong lúc vẫn đang xem cùng 1 kết quả.
  useEffect(() => {
    setOpenLayers(computeDefaultOpenLayers(scoreResult));
  }, [scoreResult]);

  const toggle = (key: PaastLayerKey) => {
    setOpenLayers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const prefer = scoreResult.layers?.prefer;
  const preferInsights = prefer?.insights || [];

  return (
    <div className="space-y-1.5">
      {/* Prefer — chấm TOÀN BÀI theo insight nổi bật, không phải pass/miss từng tiêu chí */}
      <PaastLayerAccordionItem
        layerKey="prefer"
        score={prefer?.score ?? 0}
        summary={`${prefer?.primary_count ?? 0} insight chính · ${prefer?.secondary_count ?? 0} insight phụ`}
        isOpen={openLayers.has('prefer')}
        onToggle={() => toggle('prefer')}
      >
        <div className="flex flex-wrap gap-1">
          {preferInsights.map((insight) => (
            <span
              key={insight.code}
              title={insight.description || undefined}
              className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full border ${
                insight.status === 'primary'
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : insight.status === 'secondary'
                    ? 'bg-white border-amber-400 text-amber-700'
                    : 'bg-white border-[#eae7ea] text-[#9c9aa8]'
              }`}
            >
              {insight.name_en} · {insight.name_vi}
            </span>
          ))}
        </div>
        {preferInsights
          .filter((i) => i.status !== 'off')
          .map((insight) => (
            <div key={insight.code} className="mt-1.5 p-2 rounded-lg border border-[#eae7ea] bg-white">
              <p className="text-[11px] font-semibold text-[#1b1b1d]">
                {insight.name_en} <span className="font-normal text-[#464554]">· {insight.name_vi}</span>
                <span className="ml-1.5 text-[9.5px] font-bold uppercase text-amber-600">
                  {insight.status === 'primary' ? 'Chính' : 'Phụ'}
                </span>
              </p>
              {insight.description && (
                <p className="mt-0.5 text-[10.5px] text-[#464554] leading-relaxed">{insight.description}</p>
              )}
              {insight.evidence_sentences?.map((s, idx) => (
                <div
                  key={idx}
                  className={`mt-1 pl-2 border-l-2 ${LAYER_META.prefer.quoteBorder} italic text-[10.5px] text-[#464554]`}
                >
                  &ldquo;{s}&rdquo;
                </div>
              ))}
            </div>
          ))}
      </PaastLayerAccordionItem>

      {/* Action / Acknowledge / Stick / Trust — 6 tiêu chí mỗi lớp */}
      {CRITERIA_LAYER_KEYS.map((key) => {
        const layer = scoreResult.layers?.[key] as PaastLayerCriteria | undefined;
        return (
          <PaastLayerAccordionItem
            key={key}
            layerKey={key}
            score={layer?.score ?? 0}
            summary={summarizeCriteriaLayer(layer)}
            isOpen={openLayers.has(key)}
            onToggle={() => toggle(key)}
          >
            {(layer?.criteria || []).map((c) => (
              <PaastCriterionRow key={c.code} criterion={c} />
            ))}
          </PaastLayerAccordionItem>
        );
      })}
    </div>
  );
}

function ScoreOverallCard({ scoreResult, fromCache = false }: { scoreResult: ScoreResult; fromCache?: boolean }) {
  const theme = getScoreTheme(scoreResult.total_score);
  return (
    <div className={`p-2.5 2xl:p-3 rounded-2xl border ${theme.border} ${theme.bg}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-end gap-1.5">
            <span className={`text-3xl 2xl:text-4xl font-black leading-none ${theme.text}`}>
              {scoreResult.total_score}
            </span>
            <span className="text-xs text-[#464554] mb-0.5">/100</span>
          </div>
          <p className="text-[10px] text-[#464554] mt-1 uppercase tracking-wide font-semibold">Tổng điểm PAAST</p>
          {/* Nội dung không đổi thì BE dùng lại điểm đã chấm thay vì chấm mới — nói rõ để người
              dùng không tưởng vừa có một lượt chấm mới chạy (và không thắc mắc sao quá nhanh). */}
          {fromCache && (
            <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#464554] bg-white/70 border border-[#c7c4d7] rounded-md px-1.5 py-0.5">
              <History className="w-3 h-3 flex-shrink-0" />
              <span>Kết quả từ lần chấm gần nhất — nội dung không đổi nên không chấm lại</span>
            </p>
          )}
        </div>
        {/* 5 lớp x 20 điểm — hiển thị đúng con số từng lớp, không quy đổi/làm tròn thêm */}
        <div className="flex gap-1.5">
          {PAAST_LAYER_KEYS.map((key) => (
            <div key={key} className="text-center">
              <div
                className="w-8 h-8 rounded-lg bg-white/80 border border-[#c7c4d7] flex items-center justify-center text-[11px] font-bold text-[#1b1b1d]"
                title={`${LAYER_META[key].label} · ${LAYER_META[key].sub}: ${scoreResult.layers?.[key]?.score ?? 0}/${LAYER_MAX_SCORE}`}
              >
                {scoreResult.layers?.[key]?.score ?? 0}
              </div>
              <p className="text-[9px] text-[#464554] mt-0.5 font-bold">{LAYER_META[key].initial}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * CTA Compliance — CHỈ cảnh báo, KHÔNG trừ vào điểm 100.
 *
 * Cố tình dùng tông cam (không phải đỏ như khối Hard Gate của hệ chấm điểm cũ): đây không phải
 * lỗi chặn đăng, mà là gợi ý chuyển CTA thương mại ép hành vi sang lời mời chia sẻ/lưu giữ
 * giá trị theo chuẩn New Media.
 */
function CtaComplianceBlock({ ctaWarning }: { ctaWarning: ScoreResult['cta_warning'] }) {
  const matches = ctaWarning?.matches || [];
  if (!ctaWarning?.detected || matches.length === 0) return null;

  return (
    <div className="p-2.5 2xl:p-3 rounded-2xl border border-orange-300 bg-orange-50">
      <div className="flex items-center gap-1.5 mb-1">
        <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" aria-hidden="true" />
        <h4 className="text-xs font-bold text-orange-700 uppercase tracking-wide">CTA Compliance</h4>
        <span className="text-[9.5px] font-semibold text-orange-600/80 bg-white/70 border border-orange-200 rounded-full px-1.5 py-0.5">
          Cảnh báo · không trừ điểm
        </span>
      </div>
      <p className="text-[10.5px] text-orange-800/90 mb-1.5">
        Phát hiện CTA thương mại ép hành vi — nên chuyển sang mời chia sẻ quan điểm, mời lưu lại hoặc gửi cho người cần.
      </p>
      <div className="flex flex-wrap gap-1">
        {matches.map((m, idx) => (
          <span
            key={idx}
            className="text-[10.5px] font-medium text-orange-800 bg-white/80 border border-orange-200 rounded-md px-1.5 py-0.5"
          >
            &ldquo;{m}&rdquo;
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Ô "Điểm PAAST" của 1 dòng lịch sử. Phân biệt rõ 3 tình huống thay vì chỉ hiện/không hiện điểm:
 * đã chấm (badge điểm), chưa chấm (nhãn "Chưa chấm điểm" + nút chấm ngay tại chỗ), và chấm hỏng
 * (nhãn cảnh báo + nút chấm lại). Bản ghi không có output_text thì chẳng có gì để chấm.
 */
function HistoryScoreCell({
  item,
  isScoring,
  onScore,
}: {
  item: TransformHistoryItem;
  isScoring: boolean;
  onScore: () => void;
}) {
  if (!item.output_text) {
    return <span className="text-xs text-[#464554]/60">—</span>;
  }

  if (item.scoreStatus === 'success' && item.scoreResult) {
    const theme = getScoreTheme(item.scoreResult.total_score);
    return (
      <span
        className={`inline-flex items-baseline gap-0.5 px-2 py-0.5 rounded-full border font-bold text-xs ${theme.border} ${theme.bg} ${theme.text}`}
      >
        {item.scoreResult.total_score}
        <span className="text-[9px] font-semibold opacity-70">/100</span>
      </span>
    );
  }

  const isFailed = item.scoreStatus === 'failed';

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
          isFailed ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-[#c7c4d7] bg-[#f6f3f5] text-[#464554]'
        }`}
        title={item.scoreError || undefined}
      >
        {isFailed ? <AlertTriangle className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
        {isFailed ? 'Chấm lỗi' : 'Chưa chấm điểm'}
      </span>
      <button
        onClick={onScore}
        disabled={isScoring}
        className="px-2 py-0.5 rounded-lg border border-[#4441cc] text-[#4441cc] text-[10px] font-bold hover:bg-[#5e5ce6]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
      >
        {isScoring ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            Đang chấm...
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3" />
            {isFailed ? 'Chấm lại' : 'Chấm điểm'}
          </>
        )}
      </button>
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
  // Chỉ có ý nghĩa ở tab Video/Giọng nói: ô "Nhập kịch bản thô" khoá (readOnly) cho tới khi
  // handleTranscribe() trả transcript thành công, tránh người dùng gõ tay đè lên trước khi
  // có bản nhận diện thật. Tab Văn bản không đọc state này — luôn gõ tay tự do.
  const [isTranscriptEditable, setIsTranscriptEditable] = useState<boolean>(false);
  // Bản transcript GỐC do AI trả về ở lượt transcribe thành công gần nhất của file hiện tại —
  // dùng để phát hiện người dùng đã sửa tay hay chưa trước khi cho bấm "Chuyển lại" (tránh ghi
  // đè mất phần sửa tay mà không hỏi). Chỉ cần đọc ở thời điểm bấm nút, không cần re-render khi
  // đổi nên dùng ref, không dùng state. Rỗng = chưa từng transcribe thành công cho file hiện tại.
  const originalTranscriptRef = useRef<string>('');
  // Hộp thoại xác nhận trước khi transcribe lại đè lên nội dung đã sửa tay.
  const [showRetranscribeConfirm, setShowRetranscribeConfirm] = useState<boolean>(false);
  // Kịch bản thô (inputText) tại thời điểm bấm "Chuyển đổi nội dung" THÀNH CÔNG gần nhất —
  // dùng để phát hiện người dùng bấm lại mà chưa hề sửa gì kịch bản thô, tránh chạy lại tốn
  // token/phí AI và ghi đè kết quả cũ (văn bản + điểm PAAST) một cách âm thầm. Đây là state
  // RIÊNG cho luồng "Chuyển đổi nội dung", không liên quan tới originalTranscriptRef (so sánh
  // transcript AI trả về của luồng transcribe). Chỉ cần đọc ở thời điểm bấm nút nên dùng ref,
  // không dùng state. Rỗng = chưa từng chuyển đổi thành công lần nào.
  const lastTransformedInputRef = useRef<string>('');
  // Hộp thoại xác nhận trước khi chuyển đổi lại khi kịch bản thô chưa đổi gì so với lần trước.
  const [showRetransformConfirm, setShowRetransformConfirm] = useState<boolean>(false);

  // Chấm điểm kịch bản — KHÔNG còn đi kèm response /transform (đã tách thành bước riêng qua
  // /rescore), chỉ có sau khi người dùng bấm "Chấm điểm content", hoặc kèm response /upgrade.
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [scoreStatus, setScoreStatus] = useState<ScoreStatus>(null);
  const [scoreErrorMsg, setScoreErrorMsg] = useState<string | null>(null);
  // Điểm đang hiển thị có phải là kết quả dùng lại của lần chấm trước không (xem fromCache ở BE).
  const [scoreFromCache, setScoreFromCache] = useState(false);
  // ID bản ghi đang được chấm điểm (null = không có lượt nào chạy). Dùng id thay vì boolean để
  // ở tab Lịch sử chỉ nút của ĐÚNG dòng đang chấm bị khoá, các dòng khác vẫn bấm được.
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  // Bản sao ref của currentHistoryId, luôn phản ánh giá trị MỚI NHẤT (state trong closure của
  // một handler async là giá trị đông cứng tại lúc bấm nút). handleScore dùng nó để biết bản ghi
  // đang hiển thị có còn là bản ghi mình vừa chấm hay không — xem lý do tại đó.
  const currentHistoryIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentHistoryIdRef.current = currentHistoryId;
  }, [currentHistoryId]);
  const [isUpgrading, setIsUpgrading] = useState<boolean>(false);
  const [previousOverallScore, setPreviousOverallScore] = useState<number | null>(null);
  // Chống bấm trùng — khoá đồng bộ (không phụ thuộc chu kỳ render của React như state),
  // đảm bảo double-click nhanh trong cùng 1 tick vẫn không lọt qua được request thứ 2.
  const isTransformingRef = useRef(false);
  const isUpgradingRef = useRef(false);
  // Khối cuộn của cột "Kết quả chuyển đổi" — cuộn về đầu sau khi chấm điểm xong để người dùng
  // thấy ngay khối điểm PAAST vừa xuất hiện phía trên nội dung, không phải tự cuộn lên tìm.
  const resultScrollRef = useRef<HTMLDivElement | null>(null);
  // Huỷ request transcribe đang chạy — dùng khi người dùng bấm "Huỷ" hoặc chọn file mới trong
  // lúc file cũ vẫn đang transcribe, tránh 2 request chạy song song ghi đè kết quả lên nhau.
  const transcribeAbortControllerRef = useRef<AbortController | null>(null);
  // Đếm tăng dần mỗi lượt transcribe (giống cơ chế personalHistoryRequestId ở trên) — cho phép
  // catch/finally của 1 lượt transcribe tự nhận ra mình đã lỗi thời (bị huỷ bởi lượt sau) và bỏ
  // qua, không ghi đè state (isTranscribing, toast lỗi...) của lượt hiện tại.
  const transcribeRequestId = useRef(0);
  // Huỷ request /upgrade đang chạy — ref RIÊNG, không dùng chung với transcribeAbortControllerRef
  // vì 2 lượt hoàn toàn độc lập (có thể đang transcribe file mới trong lúc vẫn chờ nâng cấp bản cũ).
  const upgradeAbortControllerRef = useRef<AbortController | null>(null);
  // Cùng cơ chế "requestId" với transcribeRequestId — cho catch/finally của 1 lượt upgrade tự
  // nhận ra mình đã lỗi thời khi bị huỷ.
  const upgradeRequestId = useRef(0);
  // Huỷ lượt /transform đang chạy — ref RIÊNG như 2 lượt trên. Lượt viết kịch bản chờ tới 420s,
  // thừa thời gian để người dùng đổi tab Video/Giọng nói/Văn bản hoặc chọn file khác giữa chừng;
  // thiếu 2 ref này thì response cũ vẫn âm thầm ghi đè outputText/currentHistoryId của màn hình
  // đã đổi sang nội dung khác.
  const transformAbortControllerRef = useRef<AbortController | null>(null);
  const transformRequestId = useRef(0);

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
      const res = await apiClient.get<Character[]>('/ai/content-transform/characters');
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
      const res = await apiClient.get('/ai/content-transform/history', {
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
      const res = await apiClient.get(`/ai/content-transform/history/member/${memberId}`, {
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

  // Chuyển tab Văn bản/Video/Giọng nói: luôn xoá sạch ô kịch bản thô + file đã chọn + khoá lại
  // ô nhập (nếu đang mở khoá từ 1 lượt transcribe trước) — tránh nội dung của tab này lẫn
  // sang tab khác gây hiểu nhầm (vd transcript của file cũ vẫn còn khi vừa đổi sang Văn bản).
  const handleInputModeChange = (mode: 'text' | 'video' | 'audio') => {
    // Đổi tab trong lúc còn 1 lượt transcribe chạy dở (hiếm nhưng có thể) — huỷ luôn, tránh nó
    // âm thầm trả về sau và ghi đè state của tab vừa mở.
    cancelActiveTranscribe();
    setIsTranscribing(false);
    // Lượt /transform cũng vậy, và còn dễ xảy ra hơn nhiều vì nó chờ tới 420s: kịch bản thô
    // của tab cũ đã bị xoá ngay bên dưới, nên kết quả viết dựa trên nó không còn nghĩa gì —
    // để nó trả về sẽ hiện một kịch bản không khớp với ô nhập đang trống trước mặt người dùng.
    cancelActiveTransform();
    setIsGenerating(false);
    isTransformingRef.current = false;
    setInputMode(mode);
    setSelectedFile(null);
    setInputText('');
    setIsTranscriptEditable(false);
    originalTranscriptRef.current = '';
    // Kịch bản thô của tab vừa rời khỏi không còn ý nghĩa để so sánh cho tab mới.
    lastTransformedInputRef.current = '';
  };

  /**
   * Huỷ lượt transcribe đang chạy (nếu có): abort request qua AbortController + tăng
   * transcribeRequestId để lượt cũ tự nhận ra mình đã lỗi thời trong catch/finally bên dưới.
   * Gọi được nhiều lần an toàn (không có gì để huỷ thì no-op).
   */
  const cancelActiveTranscribe = () => {
    transcribeAbortControllerRef.current?.abort();
    transcribeAbortControllerRef.current = null;
    transcribeRequestId.current += 1;
  };

  /**
   * Huỷ lượt /transform đang chạy (nếu có) — cùng cơ chế với cancelActiveTranscribe/
   * cancelActiveUpgrade. Gọi được nhiều lần an toàn (không có gì để huỷ thì no-op).
   */
  const cancelActiveTransform = () => {
    transformAbortControllerRef.current?.abort();
    transformAbortControllerRef.current = null;
    transformRequestId.current += 1;
  };

  const handleTranscribe = async () => {
    if (!selectedFile) return;
    // Phòng hờ còn sót 1 lượt cũ (không nên xảy ra vì nút bị disable khi isTranscribing=true,
    // nhưng huỷ trước cho chắc thay vì để 2 request chạy song song).
    cancelActiveTranscribe();
    const controller = new AbortController();
    transcribeAbortControllerRef.current = controller;
    const requestId = transcribeRequestId.current;

    setIsTranscribing(true);
    const loadingToast = toast.loading('Đang nghe và chuyển đổi nội dung...');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await apiClient.post('/ai/content-transform/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // BE chờ AI service tối đa 420s (CONTENT_TRANSFORM_TRANSCRIBE_TIMEOUT_MS). Timeout của
        // axios trên trình duyệt là ĐỒNG HỒ TREO TƯỜNG phủ CẢ thời gian đẩy file lên BE, nên
        // phải cộng thêm phần upload: file được phép tới 200MB, đường lên 20Mbps đã mất ~80s
        // chỉ để đẩy xong. 510s = 420s của BE + 90s biên upload.
        //
        // Mốc 70s cũ nhỏ hơn cả thời gian Gemini thực sự cần (đo thật: 110-240s cho video
        // 5-9 phút), nên video dài không có cách nào chạy xong trong đó.
        timeout: 510000,
        signal: controller.signal,
      });

      // Lượt này đã bị huỷ/thay bằng lượt mới hơn (đổi file / bấm Huỷ) trong lúc chờ response
      // — bỏ qua, không ghi đè transcript của lượt hiện tại đang hiển thị trên UI.
      if (requestId !== transcribeRequestId.current) return;

      if (res.data && res.data.transcript) {
        setInputText(res.data.transcript);
        // Lưu lại bản gốc AI vừa trả về — làm mốc so sánh cho lượt "Chuyển lại" sau này, phát
        // hiện người dùng đã sửa tay hay chưa trước khi cho ghi đè.
        originalTranscriptRef.current = res.data.transcript;
        // Có transcript thật từ AI rồi mới mở khoá cho gõ tay — trước đó ô luôn readOnly.
        setIsTranscriptEditable(true);
        toast.success('Chuyển đổi âm thanh thành văn bản thành công!', { id: loadingToast });
      } else {
        throw new Error(res.data?.message || 'Không thể transcribe file. Vui lòng kiểm tra lại.');
      }
    } catch (err: any) {
      const isCanceled = err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError';
      if (isCanceled) {
        // Người dùng chủ động huỷ (nút "Huỷ" hoặc chọn file khác) — không phải lỗi, chỉ tắt
        // toast loading, không hiện thông báo lỗi.
        toast.dismiss(loadingToast);
      } else if (requestId === transcribeRequestId.current) {
        // Chỉ hiện lỗi nếu đây vẫn là lượt đang được theo dõi trên UI — kể cả khi timeout 70s
        // thật sự xảy ra (err.code 'ECONNABORTED'), rơi vào đúng nhánh này nên vẫn báo lỗi rõ
        // ràng và không để nút biến mất im lặng.
        const errMsg = err.response?.data?.message || err.message || 'Lỗi khi transcribe file. Hãy đảm bảo file dưới 10 phút và thử lại.';
        toast.error(errMsg, { id: loadingToast });
      }
    } finally {
      // Lượt đã bị lượt sau ghi đè thì không đụng vào isTranscribing/abort controller nữa —
      // chúng đã được lượt sau (hoặc nút "Huỷ") tự quản lý.
      if (requestId === transcribeRequestId.current) {
        setIsTranscribing(false);
        transcribeAbortControllerRef.current = null;
      }
    }
  };

  /**
   * Handler thật của nút "Chuyển thành văn bản" / "Chuyển lại" — đứng trước handleTranscribe()
   * để chặn lại nếu người dùng đã sửa tay so với bản gốc AI trả về lần transcribe thành công
   * gần nhất, tránh bấm nhầm làm mất phần đã sửa mà không được hỏi lại.
   *
   * originalTranscriptRef rỗng (chưa từng transcribe thành công cho file hiện tại, tức đây là
   * lần bấm đầu) hoặc nội dung hiện tại vẫn khớp y hệt bản gốc (chưa sửa gì) → chạy thẳng,
   * không cần hỏi. Chỉ khi đã sửa tay mới hiện hộp thoại xác nhận.
   */
  const handleTranscribeClick = () => {
    if (!originalTranscriptRef.current || inputText === originalTranscriptRef.current) {
      handleTranscribe();
      return;
    }
    setShowRetranscribeConfirm(true);
  };

  /**
   * Handler thật của nút "Chuyển đổi nội dung" — đứng trước handleTransform() để chặn lại nếu
   * kịch bản thô (inputText) chưa hề đổi gì so với lần chuyển đổi THÀNH CÔNG gần nhất, tránh
   * bấm nhầm chạy lại toàn bộ (viết + tốn thêm chi phí AI) và ghi đè kết quả cũ (văn bản + điểm
   * PAAST) mà không được hỏi. Đây là so sánh KỊCH BẢN THÔ ĐẦU VÀO, khác với cơ chế so sánh
   * transcript đầu ra của handleTranscribeClick().
   *
   * lastTransformedInputRef rỗng (chưa từng chuyển đổi thành công) hoặc nội dung hiện tại đã
   * khác bản lần trước (đây đúng là ý định tạo nội dung mới) → chạy thẳng, không cần hỏi. Chỉ
   * khi kịch bản thô giữ nguyên y hệt mới hiện hộp thoại xác nhận.
   */
  const handleTransformClick = () => {
    if (!lastTransformedInputRef.current || inputText !== lastTransformedInputRef.current) {
      handleTransform();
      return;
    }
    setShowRetransformConfirm(true);
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

    // Cô lập lượt này: mọi lần ghi state ở dưới đều phải kiểm requestId trước, để một lượt đã
    // bị huỷ (đổi tab nhập / chọn file khác) không ghi đè màn hình hiện tại khi nó trả về muộn.
    const controller = new AbortController();
    transformAbortControllerRef.current = controller;
    const requestId = transformRequestId.current;

    isTransformingRef.current = true;
    setIsGenerating(true);
    setOutputText('');
    setScoreResult(null);
    setScoreStatus(null);
    setScoreErrorMsg(null);
    setScoreFromCache(false);
    setCurrentHistoryId(null);
    setPreviousOverallScore(null);
    const loadingToast = toast.loading('Đang chuyển đổi kịch bản...');

    try {
      // Request này giờ CHỈ viết kịch bản, không chấm điểm — BE retry bước viết tối đa
      // 3x120s = 360s. Đặt dư lên 420s là đủ (trước đây phải để 900s vì còn gánh thêm cả
      // bước chấm điểm chạy nối tiếp trong cùng 1 request).
      const res = await apiClient.post(
        '/ai/content-transform/transform',
        {
          character_id: selectedCharacterId,
          input_text: inputText,
          input_type: inputMode === 'video' ? 'VIDEO' : inputMode === 'audio' ? 'AUDIO' : 'TEXT',
        },
        { timeout: 420000, signal: controller.signal },
      );

      // Lượt này đã bị huỷ/thay bằng lượt mới hơn trong lúc chờ response — bỏ qua, không ghi
      // đè kịch bản đang hiển thị (cùng cơ chế với handleTranscribe/handleUpgrade).
      if (requestId !== transformRequestId.current) return;

      if (res.data && res.data.status === 'SUCCESS') {
        setOutputText(res.data.output_text);
        // Chưa chấm điểm ở bước này — giữ scoreResult null và trạng thái 'pending' để hiện
        // nút "Chấm điểm content" thay vì khối điểm PAAST.
        setScoreResult(null);
        setScoreStatus(res.data.scoreStatus || 'pending');
        setScoreErrorMsg(null);
        setScoreFromCache(false);
        setCurrentHistoryId(res.data.id || null);
        // Lưu lại kịch bản thô vừa dùng — làm mốc so sánh cho lượt "Chuyển đổi nội dung" sau
        // này, phát hiện người dùng bấm lại mà chưa sửa gì kịch bản thô.
        lastTransformedInputRef.current = inputText;
        toast.success('Chuyển đổi kịch bản thành công! Bấm "Chấm điểm content" để chấm điểm PAAST.', {
          id: loadingToast,
        });
      } else {
        throw new Error(res.data?.error_message || 'Lỗi xử lý kịch bản');
      }
    } catch (err: any) {
      const isCanceled = err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError';
      if (isCanceled) {
        // Người dùng chủ động đổi tab nhập giữa chừng — không phải lỗi, chỉ tắt toast loading.
        toast.dismiss(loadingToast);
      } else if (requestId === transformRequestId.current) {
        const errMsg = err.response?.data?.message || err.message || 'Lỗi khi gọi AI';
        toast.error(errMsg, { id: loadingToast });
      }
    } finally {
      // Lượt đã bị lượt sau ghi đè thì không đụng vào state nữa — lượt sau tự quản lý.
      if (requestId === transformRequestId.current) {
        setIsGenerating(false);
        isTransformingRef.current = false;
        transformAbortControllerRef.current = null;
      }
    }
  };

  /**
   * Huỷ lượt /upgrade đang chạy (nếu có) — cùng cơ chế với cancelActiveTranscribe, nhưng dùng
   * ref riêng (upgradeAbortControllerRef/upgradeRequestId), không đụng tới lượt transcribe.
   * Gọi được nhiều lần an toàn (không có gì để huỷ thì no-op).
   */
  const cancelActiveUpgrade = () => {
    upgradeAbortControllerRef.current?.abort();
    upgradeAbortControllerRef.current = null;
    upgradeRequestId.current += 1;
  };

  const handleUpgrade = async () => {
    if (isUpgradingRef.current) return;
    if (!currentHistoryId) return;

    cancelActiveUpgrade();
    const controller = new AbortController();
    upgradeAbortControllerRef.current = controller;
    const requestId = upgradeRequestId.current;

    isUpgradingRef.current = true;
    setIsUpgrading(true);
    const loadingToast = toast.loading('Đang nâng cấp nội dung theo gợi ý...');

    try {
      // Từ khi gộp viết lại + chấm điểm bản mới thành 1 request HTTP duy nhất tới AI service
      // (Django tự chia ngân sách thời gian nội bộ 40% viết / 60% chấm — trước đây đây là 2
      // request BE tự gọi tuần tự, mỗi request lại tự retry riêng, tối đa 6 round-trip), BE chỉ
      // còn chờ tối đa CONTENT_TRANSFORM_UPGRADE_TIMEOUT_MS = 420s (7 phút) cho request gộp đó.
      // Đặt dư lên 480s (8 phút) để không bị client huỷ ngang khi BE vẫn xử lý bình thường.
      const res = await apiClient.post(
        '/ai/content-transform/upgrade',
        { history_id: currentHistoryId },
        { timeout: 480000, signal: controller.signal },
      );

      // Lượt này đã bị huỷ/thay bằng lượt mới hơn trong lúc chờ response — bỏ qua, không ghi đè
      // kết quả của lượt hiện tại đang hiển thị trên UI.
      if (requestId !== upgradeRequestId.current) return;

      const upgraded = res.data?.upgraded;
      if (!upgraded) {
        throw new Error('Phản hồi không hợp lệ từ máy chủ');
      }

      const prevScore = res.data?.previous?.scoreResult?.total_score ?? scoreResult?.total_score ?? null;
      setPreviousOverallScore(prevScore);
      setOutputText(upgraded.output_text || '');
      setScoreResult(upgraded.scoreResult || null);
      setScoreStatus(upgraded.scoreStatus || null);
      setScoreErrorMsg(upgraded.scoreError || null);
      // /upgrade thường chấm mới trên kịch bản vừa nâng cấp; fromCache chỉ true trong trường hợp
      // hiếm bản viết lại trùng y hệt một bản đã chấm trước đó (xem comment ở BE upgradeContent).
      setScoreFromCache(upgraded.fromCache === true);
      setCurrentHistoryId(upgraded.id || null);
      toast.success('Đã nâng cấp nội dung thành công!', { id: loadingToast });
    } catch (err: any) {
      const isCanceled = err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError';
      if (isCanceled) {
        // Người dùng chủ động bấm "Huỷ" — không phải lỗi, chỉ tắt toast loading.
        toast.dismiss(loadingToast);
      } else if (requestId === upgradeRequestId.current) {
        const errMsg = err.response?.data?.message || err.message || 'Lỗi khi nâng cấp nội dung';
        toast.error(errMsg, { id: loadingToast });
      }
    } finally {
      // Lượt đã bị lượt sau (hoặc nút "Huỷ") ghi đè thì không đụng state nữa — đã được tự quản lý.
      if (requestId === upgradeRequestId.current) {
        setIsUpgrading(false);
        isUpgradingRef.current = false;
        upgradeAbortControllerRef.current = null;
      }
    }
  };

  /**
   * Bước 2 của luồng đã tách đôi — gọi /rescore để chấm điểm PAAST cho 1 bản ghi ĐÃ có
   * output_text. Dùng chung cho cả lần chấm ĐẦU TIÊN (nút "Chấm điểm content") lẫn chấm LẠI khi
   * lần trước thất bại; BE luôn cập nhật vào đúng bản ghi đó nên không sinh bản ghi trùng lặp.
   *
   * Không truyền historyId: chấm bản ghi đang xem ở màn hình "Chuyển đổi" (currentHistoryId).
   * Có truyền historyId: dùng cho tab Lịch sử (bảng + modal "Chi tiết kịch bản") — chỉ cập nhật
   * đúng bản ghi đó (selectedItem + trong danh sách), không đụng state của màn hình "Chuyển đổi"
   * vì đây là 1 bản ghi khác, có thể của người dùng khác đang xem.
   */
  const handleScore = async (historyId?: string) => {
    const targetId = historyId || currentHistoryId;
    if (!targetId || scoringId) return;

    setScoringId(targetId);
    const loadingToast = toast.loading('Đang chấm điểm nội dung...');

    try {
      // BE retry chấm điểm tới 3 lần x 120s = 360s tối đa. Đặt dư lên 480s để không bị client
      // huỷ ngang khi BE vẫn đang thử lại bình thường (giữ 120s mỗi lần retry vì thực đo giảm
      // xuống 60s làm TĂNG tỷ lệ thất bại, phản tác dụng).
      const res = await apiClient.post(
        '/ai/content-transform/rescore',
        { history_id: targetId },
        { timeout: 480000 },
      );

      const updatedFields = {
        scoreResult: (res.data?.scoreResult || null) as ScoreResult | null,
        scoreStatus: (res.data?.scoreStatus || null) as ScoreStatus,
        scoreError: (res.data?.scoreError || null) as string | null,
        fromCache: res.data?.fromCache === true,
      };

      if (historyId) {
        setSelectedItem((prev) => (prev && prev.id === targetId ? { ...prev, ...updatedFields } : prev));
        setHistoryItems((prev) => prev.map((it) => (it.id === targetId ? { ...it, ...updatedFields } : it)));
        setMemberHistoryItems((prev) => prev.map((it) => (it.id === targetId ? { ...it, ...updatedFields } : it)));
      } else if (currentHistoryIdRef.current === targetId) {
        // Chỉ ghi khi màn hình "Chuyển đổi" VẪN đang hiển thị đúng bản ghi vừa chấm. Lượt chấm
        // chờ tới 480s, thừa thời gian để người dùng bấm "Chuyển đổi nội dung" tạo bản ghi mới
        // trong lúc chờ (nút đó không bị khoá bởi scoringId); thiếu phép kiểm này thì điểm của
        // bản ghi CŨ sẽ hiện lên như thể là điểm của kịch bản MỚI đang trước mặt.
        setScoreResult(updatedFields.scoreResult);
        setScoreStatus(updatedFields.scoreStatus);
        setScoreErrorMsg(updatedFields.scoreError);
        setScoreFromCache(updatedFields.fromCache);
      }

      if (res.data?.scoreStatus === 'success') {
        // Khối điểm PAAST vừa xuất hiện nằm phía trên nội dung — cuộn về đầu để người dùng thấy
        // ngay kết quả thay vì vẫn đang ở chỗ nút "Chấm điểm content" (giờ đã biến mất).
        if (!historyId) {
          resultScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }
        toast.success('Đã chấm điểm thành công!', { id: loadingToast });
      } else {
        toast.error(res.data?.scoreError || 'Chấm điểm thất bại, vui lòng thử lại sau.', { id: loadingToast });
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Lỗi khi chấm điểm';
      toast.error(errMsg, { id: loadingToast });
    } finally {
      setScoringId(null);
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
                          onClick={() => handleInputModeChange('text')}
                          className={`flex items-center space-x-1 px-2.5 py-0.5 2xl:px-3.5 2xl:py-1 rounded-md 2xl:rounded-lg font-semibold text-[10px] 2xl:text-xs transition-all ${inputMode === 'text'
                            ? 'bg-white text-[#4441cc] shadow-sm'
                            : 'text-[#464554] hover:text-[#4441cc]'
                            }`}
                        >
                          <FileText className="w-3 h-3 2xl:w-3.5 2xl:h-3.5" />
                          <span>Văn bản</span>
                        </button>
                        <button
                          onClick={() => handleInputModeChange('video')}
                          className={`flex items-center space-x-1 px-2.5 py-0.5 2xl:px-3.5 2xl:py-1 rounded-md 2xl:rounded-lg font-semibold text-[10px] 2xl:text-xs transition-all ${inputMode === 'video'
                            ? 'bg-white text-[#4441cc] shadow-sm'
                            : 'text-[#464554] hover:text-[#4441cc]'
                            }`}
                        >
                          <Video className="w-3 h-3 2xl:w-3.5 2xl:h-3.5" />
                          <span>Video</span>
                        </button>
                        <button
                          onClick={() => handleInputModeChange('audio')}
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
                            const file = e.target.files?.[0];
                            // Bấm Cancel trên hộp thoại chọn file (không chọn gì) — onChange có
                            // thể vẫn bắn với files rỗng ở một số trình duyệt. Không được xoá/reset
                            // bất kỳ state nào trong trường hợp này, giữ nguyên file cũ + trạng
                            // thái hiện tại.
                            if (!file) return;
                            // Chặn sớm file vượt giới hạn ngay tại FE — khớp đúng limits.fileSize
                            // 200MB của Multer ở BE (ai-integration.controller.ts). Không chặn ở
                            // đây thì người dùng phải chờ upload xong cả file rồi mới bị BE từ chối.
                            if (file.size > MAX_UPLOAD_SIZE_BYTES) {
                              toast.error(
                                `File "${file.name}" nặng ${(file.size / (1024 * 1024)).toFixed(1)}MB, vượt giới hạn 200MB. Vui lòng chọn file nhỏ hơn.`
                              );
                              return;
                            }
                            // Đang có request transcribe của file cũ chạy dở — huỷ trước khi nhận
                            // file mới, tránh 2 request chạy song song ghi đè kết quả lên nhau.
                            cancelActiveTranscribe();
                            setSelectedFile(file);
                            // Transcript cũ (nếu có) không còn khớp với file vừa chọn lại — xoá
                            // và khoá ô nhập cho tới khi bấm "Chuyển thành văn bản" lần nữa.
                            setInputText('');
                            setIsTranscriptEditable(false);
                            // File mới hoàn toàn khác — bản gốc transcript của file cũ không còn
                            // ý nghĩa để so sánh, reset để không mang nhầm sang file này.
                            originalTranscriptRef.current = '';
                            // Tương tự — kịch bản thô của file cũ không còn ý nghĩa để so sánh
                            // cho lượt "Chuyển đổi nội dung" tiếp theo (file này chưa transcribe).
                            lastTransformedInputRef.current = '';
                            // Cô lập trạng thái loading theo đúng lần chọn file này — không để
                            // dính trạng thái "đang nghe" còn sót lại từ lượt transcribe trước.
                            setIsTranscribing(false);
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
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <button
                              onClick={handleTranscribeClick}
                              disabled={isTranscribing}
                              className="px-3 py-0.5 bg-[#4441cc] hover:bg-[#4441cc]/90 text-white rounded-lg font-semibold text-[10px] flex items-center space-x-1 transition-all disabled:opacity-50"
                            >
                              {isTranscribing ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Đang nghe...</span>
                                </>
                              ) : (
                                <>
                                  <Wand2 className="w-3 h-3" />
                                  {/* Đã có bản gốc AI trả về cho file này (transcribe thành công
                                      ít nhất 1 lần) → đổi label để rõ đây là hành động chuyển lại,
                                      không phải lần đầu. */}
                                  <span>{originalTranscriptRef.current ? 'Chuyển lại' : 'Chuyển thành văn bản'}</span>
                                </>
                              )}
                            </button>
                            {/* Chỉ hiện lúc đang chạy — thoát khỏi "Đang nghe..." mà không cần F5
                                lại trang, giữ nguyên file đã chọn để bấm chuyển đổi lại nếu muốn. */}
                            {isTranscribing && (
                              <button
                                type="button"
                                onClick={() => {
                                  cancelActiveTranscribe();
                                  setIsTranscribing(false);
                                }}
                                className="px-2.5 py-0.5 border border-[#c7c4d7] hover:border-[#4441cc] text-[#464554] hover:text-[#4441cc] rounded-lg font-semibold text-[10px] transition-all"
                              >
                                Huỷ
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Textarea Container (Expands dynamically to fill remaining height) */}
                    <div className="flex-1 flex flex-col min-h-0 relative">
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        readOnly={inputMode !== 'text' && !isTranscriptEditable}
                        placeholder={
                          inputMode === 'text'
                            ? "Dán hoặc gõ kịch bản thô của bạn vào đây. Ví dụ: nội dung giới thiệu sản phẩm, ý tưởng video, ghi chú nhanh..."
                            : "Văn bản nhận diện từ file video/âm thanh sẽ hiển thị tại đây. Bạn có thể tự do chỉnh sửa trước khi tiến hành chuyển đổi."
                        }
                        className={`w-full flex-1 min-h-[90px] p-2.5 2xl:p-3.5 rounded-xl border border-[#c7c4d7] focus:border-[#4441cc] focus:ring-2 focus:ring-[#4441cc]/10 transition-all text-xs 2xl:text-sm text-[#1b1b1d] placeholder-[#464554]/60 outline-none custom-scrollbar resize-none ${inputMode !== 'text' && !isTranscriptEditable ? 'bg-[#f6f3f5] cursor-not-allowed' : 'bg-white'
                          }`}
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
                                onClick={() => handleScore()}
                                disabled={scoringId !== null}
                                className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 text-[11px] font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                {scoringId ? (
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

                          {/* 1. CTA Compliance — tách biệt khỏi điểm số (chỉ cảnh báo), luôn nằm trên cùng */}
                          {scoreResult && <CtaComplianceBlock ctaWarning={scoreResult.cta_warning} />}

                          {/* 2. Card điểm tổng */}
                          {scoreResult && <ScoreOverallCard scoreResult={scoreResult} fromCache={scoreFromCache} />}
                        </div>

                        {/* Khối cuộn riêng: accordion 5 lớp PAAST + nội dung highlight + nút chấm điểm/nâng cấp */}
                        <div ref={resultScrollRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5 space-y-2">
                          {/* 3-4. Accordion 5 lớp PAAST — mặc định mở lớp yếu nhất */}
                          {scoreResult && <PaastLayersAccordion scoreResult={scoreResult} />}

                          {/* 5. Nội dung đã chuyển đổi — highlight câu dẫn chứng Prefer + cụm CTA lệch chuẩn */}
                          <div>
                            <p className="text-[10px] font-bold text-[#464554] uppercase tracking-wider mb-1.5">
                              Nội dung đã chuyển đổi{scoreResult ? ' · Highlight dẫn chứng' : ''}
                            </p>
                            <div className="bg-[#f6f3f5] p-2.5 2xl:p-3.5 rounded-xl border border-[#c7c4d7] shadow-inner text-[11px] 2xl:text-xs text-[#1b1b1d] leading-relaxed whitespace-pre-wrap select-text">
                              {scoreResult
                                ? buildHighlightSegments(outputText, scoreResult).map((seg, idx) => {
                                  if (!seg.mark) return <span key={idx}>{seg.text}</span>;
                                  if (seg.mark.kind === 'cta') {
                                    return (
                                      <mark key={idx} className="bg-orange-200 text-orange-900 rounded px-0.5">
                                        {seg.text}
                                      </mark>
                                    );
                                  }
                                  return (
                                    <mark
                                      key={idx}
                                      className={`${LAYER_META.prefer.markBg} ${LAYER_META.prefer.markText} rounded px-0.5`}
                                    >
                                      {seg.text}
                                    </mark>
                                  );
                                })
                                : outputText}
                            </div>

                            {/* Chú thích màu — chỉ liệt kê đúng 2 loại highlight thật sự được tô */}
                            {scoreResult && (
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t border-[#eae7ea]">
                                <span className="flex items-center gap-1 text-[9.5px] text-[#464554]">
                                  <span className={`w-2.5 h-2.5 rounded-sm ${LAYER_META.prefer.swatch}`} />
                                  Câu dẫn chứng insight Prefer (CRAVES)
                                </span>
                                {(scoreResult.cta_warning?.matches?.length ?? 0) > 0 && (
                                  <span className="flex items-center gap-1 text-[9.5px] text-orange-700 font-semibold">
                                    <span className="w-2.5 h-2.5 rounded-sm bg-orange-200" />
                                    CTA lệch chuẩn (cảnh báo, không trừ điểm)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 6. Bước 2 — nút "Chấm điểm content", chỉ hiện khi đã có kịch bản mà CHƯA có
                              điểm. Bấm vào gọi 1 request riêng (/rescore) chấm bằng paast-analyzer trên
                              đúng output_text vừa tạo, rồi cập nhật lại chính bản ghi đó. */}
                          {!scoreResult && currentHistoryId && (
                            <div className="pt-1 space-y-1.5">
                              <button
                                onClick={() => handleScore()}
                                disabled={scoringId !== null}
                                className="w-full bg-white border-2 border-[#4441cc] text-[#4441cc] py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#5e5ce6]/5 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {scoringId ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Đang chấm điểm PAAST...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Chấm điểm content</span>
                                  </>
                                )}
                              </button>
                              <p className="text-[9.5px] text-[#464554] text-center">
                                Chấm theo khung PAAST (5 lớp). Có điểm rồi mới nâng cấp được content theo gợi ý.
                              </p>
                            </div>
                          )}

                          {/* 7. So sánh điểm cũ/mới + nút nâng cấp — chỉ hiện SAU KHI đã chấm điểm, vì
                              cần biết tiêu chí nào đang miss mới nâng cấp có mục tiêu được. */}
                          {scoreResult && currentHistoryId && (
                            <div className="pt-1 space-y-2">
                              {previousOverallScore !== null && (
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-sm text-[#464554]/50 line-through">{previousOverallScore}</span>
                                  <TrendingUp
                                    className={`w-4 h-4 ${scoreResult.total_score >= previousOverallScore ? 'text-emerald-500' : 'text-red-500'}`}
                                  />
                                  <span className="text-lg font-black text-[#4441cc]">{scoreResult.total_score}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={handleUpgrade}
                                  disabled={isUpgrading}
                                  className="flex-1 bg-[#4441cc] text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#4441cc]/20 hover:bg-[#4441cc]/95 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                                {/* Chỉ hiện lúc đang chạy — thoát khỏi "Đang nâng cấp..." mà không
                                    cần chờ hết 480s nếu người dùng đổi ý. */}
                                {isUpgrading && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      cancelActiveUpgrade();
                                      setIsUpgrading(false);
                                      isUpgradingRef.current = false;
                                    }}
                                    className="px-3 py-2.5 border border-[#c7c4d7] hover:border-[#4441cc] text-[#464554] hover:text-[#4441cc] rounded-xl font-semibold text-xs transition-all"
                                  >
                                    Huỷ
                                  </button>
                                )}
                              </div>
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
                  onClick={handleTransformClick}
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
                          <th className="py-2.5 px-4">Điểm PAAST</th>
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
                            <td className="py-2.5 px-4">
                              <HistoryScoreCell
                                item={item}
                                isScoring={scoringId === item.id}
                                onScore={() => handleScore(item.id)}
                              />
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

      {/* Xác nhận "Chuyển lại" khi nội dung đã bị sửa tay so với bản gốc AI — tránh ghi đè mất
          phần đã sửa mà không hỏi. Chỉ hiện khi handleTranscribeClick() phát hiện có khác biệt. */}
      {showRetranscribeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setShowRetranscribeConfirm(false)}
          />
          <div className="relative bg-white border border-[#c7c4d7] text-[#1b1b1d] w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl p-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1b1b1d]">Chuyển lại từ file gốc?</h3>
                <p className="mt-1 text-xs text-[#464554] leading-relaxed">
                  Bạn đã chỉnh sửa nội dung so với bản AI nhận diện ban đầu. Chuyển lại sẽ ghi đè
                  phần đã sửa và không thể khôi phục. Bạn có chắc muốn tiếp tục?
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRetranscribeConfirm(false)}
                className="px-3 py-1.5 rounded-lg border border-[#c7c4d7] text-[#464554] hover:text-[#1b1b1d] hover:border-[#4441cc] text-xs font-semibold transition-colors"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRetranscribeConfirm(false);
                  handleTranscribe();
                }}
                className="px-3 py-1.5 rounded-lg bg-[#4441cc] hover:bg-[#4441cc]/90 text-white text-xs font-semibold transition-colors"
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

      {showRetransformConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setShowRetransformConfirm(false)}
          />
          <div className="relative bg-white border border-[#c7c4d7] text-[#1b1b1d] w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl p-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1b1b1d]">Chuyển đổi lại nội dung?</h3>
                <p className="mt-1 text-xs text-[#464554] leading-relaxed">
                  Nội dung kịch bản thô chưa thay đổi so với lần chuyển đổi trước. Chuyển đổi lại
                  sẽ tạo bản mới, ghi đè kết quả hiện tại và tốn thêm chi phí AI. Bạn có chắc muốn
                  tiếp tục?
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRetransformConfirm(false)}
                className="px-3 py-1.5 rounded-lg border border-[#c7c4d7] text-[#464554] hover:text-[#1b1b1d] hover:border-[#4441cc] text-xs font-semibold transition-colors"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRetransformConfirm(false);
                  handleTransform();
                }}
                className="px-3 py-1.5 rounded-lg bg-[#4441cc] hover:bg-[#4441cc]/90 text-white text-xs font-semibold transition-colors"
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {/* Chưa chấm điểm — trạng thái bình thường của bản ghi vừa chuyển đổi xong.
                      Cho chấm ngay tại đây, không bắt quay lại màn hình "Chuyển đổi". */}
                  {selectedItem.scoreStatus === 'pending' && (
                    <div className="p-3 rounded-2xl border border-[#c7c4d7] bg-[#f6f3f5] flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[11px] text-[#464554] font-medium flex items-center gap-1.5 flex-1 min-w-0">
                        <Circle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Bản ghi này chưa được chấm điểm PAAST.</span>
                      </p>
                      <button
                        onClick={() => handleScore(selectedItem.id)}
                        disabled={scoringId !== null}
                        className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-white border border-[#4441cc] text-[#4441cc] text-[11px] font-bold hover:bg-[#5e5ce6]/5 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {scoringId === selectedItem.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Đang chấm điểm...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            Chấm điểm content
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {selectedItem.scoreStatus === 'failed' && (
                    <div className="p-3 rounded-2xl border border-amber-300 bg-amber-50 flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[11px] text-amber-800 flex items-center gap-1.5 flex-1 min-w-0">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>⚠️ {selectedItem.scoreError || 'Không thể chấm điểm nội dung này (có thể do timeout).'}</span>
                      </p>
                      <button
                        onClick={() => handleScore(selectedItem.id)}
                        disabled={scoringId !== null}
                        className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 text-[11px] font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {scoringId === selectedItem.id ? (
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
                      <CtaComplianceBlock ctaWarning={selectedItem.scoreResult.cta_warning} />
                      <ScoreOverallCard scoreResult={selectedItem.scoreResult} fromCache={selectedItem.fromCache} />
                      <PaastLayersAccordion scoreResult={selectedItem.scoreResult} />
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
