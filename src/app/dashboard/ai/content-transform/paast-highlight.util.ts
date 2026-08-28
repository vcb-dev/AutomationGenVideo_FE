import type { PaastAnalysisResult } from '@/lib/api/paast-analyzer';

// Tách riêng khỏi page.tsx (không phải vì tổ chức code — Next.js App Router CHỈ cho phép
// page.tsx export các tên cố định (default, metadata, generateStaticParams...), export thêm
// tên tuỳ ý làm `next build`/tsc lỗi TS2344 ngay ở kiểu route. Các hàm/kiểu THUẦN dùng chung
// cho cả trang chuyển đổi nội dung lẫn modal "Chi tiết kịch bản" phải sống ở module riêng.

// Type lấy thẳng từ @/lib/api/paast-analyzer (nguồn duy nhất, dùng chung với PaastScoreModal
// của Task Auto) — BE lưu và trả về ĐÚNG shape mà PaastAnalyzerService sinh ra, không đổi tên
// field, nên FE không cần lớp map trung gian nào.
export type ScoreResult = PaastAnalysisResult & { total_score: number };

export const PAAST_LAYER_KEYS = ['prefer', 'action', 'acknowledge', 'stick', 'trust'] as const;
export type PaastLayerKey = (typeof PAAST_LAYER_KEYS)[number];

/** Điểm tối đa mỗi lớp — fallback khi bản ghi cũ không có `layers[key].max` (ưu tiên `max` từ response). */
export const DEFAULT_LAYER_MAX: Record<PaastLayerKey, number> = {
  prefer: 25, action: 25, acknowledge: 20, stick: 15, trust: 15,
};

/**
 * Trạng thái hiển thị của 1 lớp, suy từ tỷ lệ điểm lớp đó. Đây thuần là quy ước MÀU SẮC/ICON
 * của UI (PAAST không định nghĩa ngưỡng đạt/không đạt cho từng lớp) — không phải luật tính
 * điểm, và không ảnh hưởng con số nào hiển thị cho người dùng.
 */
export type LayerStatus = 'good' | 'warning' | 'error';

export function getLayerStatus(score: number, max: number): LayerStatus {
  const ratio = max > 0 ? score / max : 0;
  if (ratio >= 0.8) return 'good';
  if (ratio >= 0.5) return 'warning';
  return 'error';
}

export type HighlightMark = { kind: 'cta' } | { kind: 'prefer' };

export function sameMark(a: HighlightMark | null, b: HighlightMark | null): boolean {
  if (a === null && b === null) return true;
  if (!a || !b) return false;
  return a.kind === b.kind;
}

/**
 * Highlight nội dung theo dữ liệu PAAST. Chỉ tô những chuỗi CHẮC CHẮN có mặt nguyên văn trong
 * bài: `evidence_sentences` của các insight Prefer (AI trích nguyên câu) và `matches` của
 * cảnh báo CTA (cụm từ bắt được). Các tiêu chí của 4 lớp còn lại chỉ có `evidence` là lời nhận
 * xét, KHÔNG phải trích dẫn nguyên văn, nên cố ý không dùng để highlight — tô theo nó sẽ trượt
 * hoặc tô nhầm đoạn. Chuỗi không tìm thấy thì bỏ qua, không tô bừa.
 */
export function buildHighlightSegments(text: string, scoreResult: ScoreResult): Array<{ text: string; mark: HighlightMark | null }> {
  const marks: (HighlightMark | null)[] = new Array(text.length).fill(null);

  const paint = (needle: string, mark: HighlightMark) => {
    const trimmed = needle.trim();
    if (!trimmed) return;
    const idx = text.indexOf(trimmed);
    if (idx === -1) return;
    for (let i = idx; i < idx + trimmed.length; i++) marks[i] = mark;
  };

  scoreResult.layers?.prefer?.insights?.forEach((insight) => {
    if (insight.status === 'off') return;
    insight.evidence_sentences?.forEach((s) => paint(s, { kind: 'prefer' }));
  });

  // CTA tô SAU để luôn thắng khi trùng vị trí — đây là phần người dùng cần thấy rõ nhất.
  scoreResult.cta_warning?.matches?.forEach((m) => paint(m, { kind: 'cta' }));

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

/**
 * Lớp mặc định mở: lớp có TỶ LỆ (score/max) thấp nhất trong các lớp chưa 'good'. Tất cả 'good' →
 * không mở lớp nào. So theo tỷ lệ vì các lớp không cùng max (25/25/20/15/15).
 */
export function computeDefaultOpenLayers(scoreResult: ScoreResult): Set<PaastLayerKey> {
  const weak = PAAST_LAYER_KEYS
    .map((key) => {
      const score = scoreResult.layers?.[key]?.score ?? 0;
      const max = scoreResult.layers?.[key]?.max ?? DEFAULT_LAYER_MAX[key];
      return { key, score, max, ratio: max > 0 ? score / max : 0 };
    })
    .filter((l) => getLayerStatus(l.score, l.max) !== 'good');

  if (weak.length === 0) return new Set();
  const lowest = weak.reduce((min, l) => (l.ratio < min.ratio ? l : min));
  return new Set([lowest.key]);
}
