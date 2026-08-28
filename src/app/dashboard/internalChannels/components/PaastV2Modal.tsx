'use client';

import { CheckCircle, WarningCircle, X, Copy, Check } from '@phosphor-icons/react';
import { useState } from 'react';

/**
 * Popup kết quả PAAST BẢN 2 — dựng theo đúng bố cục của paast.vercel.app.
 *
 * Vì sao không dùng lại `PaastScoreModal` của task-auto: bản đó đọc schema cũ (snake_case,
 * `total_score` thang 100) và đang chạy thật cho luồng duyệt content. Bản 2 bỏ hẳn điểm số,
 * đổi sang camelCase và thêm 16 hook — nhét cả hai vào một component thì mỗi lần sửa lại
 * phải kiểm tra chéo hai luồng. Hai file riêng, khi nào task-auto chuyển sang bản 2 thì xoá
 * bớt một cái.
 */

// Nhãn lấy nguyên văn Spec §9.3 "Bilingual labels (final)" — không tự đặt lại.
const TEN_LOP: Record<string, { ten: string; ma: string; phu: string; mau: string }> = {
  prefer: { ten: 'Prefer (Thích)', ma: 'CRAVES', phu: 'Insight tổng thể content', mau: 'text-amber-600' },
  action: { ten: 'Action (Hành động)', ma: 'S-FACES', phu: 'Trigger hành vi trong kịch bản', mau: 'text-lime-700' },
  acknowledge: { ten: 'Acknowledge (Biết)', ma: 'BRANDS', phu: 'Cài cắm nhận diện thương hiệu', mau: 'text-orange-700' },
  stick: { ten: 'Stick (Nhớ)', ma: 'STICKS', phu: 'Signature ghim sâu, tạo IP', mau: 'text-blue-700' },
  trust: { ten: 'Trust (Tin)', ma: 'TRUSTS', phu: 'Bằng chứng đáng tin', mau: 'text-violet-700' },
};

interface TieuChi {
  code: string;
  nameEn: string;
  nameVi: string;
  status: string;
  comment?: string;
  evidence?: string;
  description?: string;
  evidenceSentences?: string[];
  reasoning?: string;
  /** Mức độ triển khai 0-5 — thay pass/miss/primary/secondary/off nhị phân. */
  level?: number;
  levelLabel?: string;
}

export interface KetQuaV2 {
  verdict: { passed: boolean; title: string; subtitle: string };
  layers: {
    prefer: { leadParagraph?: string; insights: TieuChi[]; primaryCount: number; secondaryCount: number };
    action: { elementCount: number; criteria: TieuChi[]; hookSuggestions: { group: string; formula: string; example: string }[] };
    acknowledge: { elementCount: number; criteria: TieuChi[] };
    stick: { elementCount: number; textDetectableCount?: number; criteria: TieuChi[] };
    trust: { elementCount: number; criteria: TieuChi[] };
  };
  ctaWarning?: { detected: boolean; matches: string[] };
}

export default function PaastV2Modal({
  open,
  result,
  kichBan,
  onClose,
}: {
  open: boolean;
  result: KetQuaV2;
  kichBan?: string;
  onClose: () => void;
}) {
  const [daChep, setDaChep] = useState(false);
  if (!open) return null;

  const { verdict, layers } = result;
  const dat = verdict.passed;

  return (
    <div className="fixed inset-0 z-[1005] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-card rounded-2xl shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start gap-3 px-6 py-4 bg-card border-b border-border">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">Kết quả · PAAST Analysis</h2>
            <p className="text-xs text-slate-500 mt-0.5">Chấm trên kịch bản bóc từ video</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Kết luận */}
          <div
            className={`flex items-start gap-4 rounded-xl px-5 py-4 border ${
              dat
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
            }`}
          >
            {dat ? (
              <CheckCircle size={34} weight="fill" className="text-emerald-600 shrink-0" />
            ) : (
              <WarningCircle size={34} weight="fill" className="text-amber-600 shrink-0" />
            )}
            <div className="flex-1">
              <h3 className={`text-lg font-bold ${dat ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                {verdict.title}
              </h3>
              <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-0.5">{verdict.subtitle}</p>
              <div className="flex gap-1.5 mt-2.5 flex-wrap">
                {(['prefer', 'action', 'acknowledge', 'stick', 'trust'] as const).map((k) => {
                  const l: any = layers[k];
                  const n = k === 'prefer' ? l.primaryCount : l.elementCount;
                  return (
                    <span
                      key={k}
                      title={TEN_LOP[k].ten}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                        n > 0
                          ? 'bg-white/70 dark:bg-slate-900/50 border-emerald-300 text-emerald-700 dark:text-emerald-400'
                          : 'bg-white/70 dark:bg-slate-900/50 border-slate-300 text-slate-400'
                      }`}
                    >
                      {TEN_LOP[k].ten[0]} {n}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Prefer */}
          <KhoiLop khoa="prefer" soLuong={`${layers.prefer.primaryCount} chủ đạo · ${layers.prefer.secondaryCount} phụ trợ`}>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {layers.prefer.insights.map((i) => (
                <span
                  key={i.code}
                  className={`px-2.5 py-1 rounded-full text-[11.5px] border ${
                    i.status === 'primary'
                      ? 'bg-emerald-600 text-white border-emerald-600 font-semibold'
                      : i.status === 'secondary'
                        ? 'bg-card text-foreground border-slate-300 dark:border-slate-600'
                        : 'bg-card text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {i.nameEn} · {i.nameVi}
                </span>
              ))}
            </div>
            {layers.prefer.insights
              .filter((i) => i.status !== 'off')
              .map((i) => (
                <TheTieuChi key={i.code} tc={i} />
              ))}

            {/* Spec §4.2 mục 4: insight chưa chạm gom lại một dòng, KHÔNG bày ra như lỗi —
                thiếu vài insight vẫn có thể đạt chuẩn, nên câu chữ phải nói rõ điều đó. */}
            {(() => {
              const chuaCham = layers.prefer.insights.filter((i) => i.status === 'off');
              if (!chuaCham.length) return null;
              return (
                <p className="text-[11.5px] text-slate-400 mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-700">
                  {chuaCham.length} insight chưa chạm ({chuaCham.map((i) => `${i.nameEn} · ${i.nameVi}`).join(' · ')})
                  {' — '}
                  {layers.prefer.primaryCount > 0
                    ? `có thể thêm nếu muốn tăng cường độ; đã đủ chuẩn với ${layers.prefer.primaryCount} chủ đạo.`
                    : 'cần ít nhất 1 insight chủ đạo để đạt chuẩn lớp Prefer.'}
                </p>
              );
            })()}
          </KhoiLop>

          {/* 4 lớp còn lại */}
          {(['action', 'acknowledge', 'stick', 'trust'] as const).map((k) => (
            <KhoiLop
              key={k}
              khoa={k}
              soLuong={
                // Stick đếm khác: 4/6 tiêu chí chỉ đánh giá được khi dựng video nên không
                // tính vào mẫu số. Bản v4 ghi "2/2 text · 4 cần video".
                k === 'stick'
                  ? `${layers.stick.elementCount} / ${layers.stick.textDetectableCount ?? 6} text · ${
                      6 - (layers.stick.textDetectableCount ?? 6)
                    } cần video`
                  : `${(layers[k] as any).elementCount} / 6`
              }
            >
              <div className="grid sm:grid-cols-2 gap-2.5">
                {(layers[k] as any).criteria.map((c: TieuChi) => (
                  <TheTieuChi key={c.code} tc={c} />
                ))}
              </div>
            </KhoiLop>
          ))}

          {/* 16 hook — phần chính khiến bản 2 khác bản cũ */}
          <div className="border border-border rounded-xl p-5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              16 HOOK GỢI Ý THAY THẾ
              <span className="text-[11px] font-normal text-slate-400">· theo ma trận 16 nhóm hook</span>
            </h3>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
              {layers.action.hookSuggestions.map((h) => (
                <div key={h.group} className="border border-border rounded-lg p-3.5 flex flex-col gap-1.5">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                      {h.group}
                    </span>
                    <span className="text-[11px] text-slate-400">{h.formula}</span>
                  </div>
                  {h.example ? (
                    <p className="text-[12.5px] text-foreground italic leading-relaxed">“{h.example}”</p>
                  ) : (
                    <p className="text-[12.5px] text-slate-400 italic">(chưa sinh được ví dụ)</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {kichBan && (
            <div className="border border-border rounded-xl p-5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground flex-1">Kịch bản đã dùng để chấm</h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(kichBan);
                    setDaChep(true);
                    setTimeout(() => setDaChep(false), 1800);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border text-[12px] hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {daChep ? <Check size={13} /> : <Copy size={13} />}
                  {daChep ? 'Đã chép' : 'Chép'}
                </button>
              </div>
              <p className="text-[12.5px] text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed whitespace-pre-wrap">
                {kichBan}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KhoiLop({ khoa, soLuong, children }: { khoa: string; soLuong: string; children: React.ReactNode }) {
  const l = TEN_LOP[khoa];
  return (
    <div className="border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3.5 flex-wrap">
        <span className={`text-[11px] font-bold uppercase tracking-wider ${l.mau}`}>{khoa}</span>
        <h3 className="text-sm font-bold text-foreground">{l.ten}</h3>
        <span className="text-[11.5px] text-slate-400">· {l.ma} · {l.phu}</span>
        <span className="ml-auto text-[12px] font-semibold text-slate-500 tabular-nums">{soLuong}</span>
      </div>
      {children}
    </div>
  );
}

/** Mức độ triển khai 1 tiêu chí 0-5: 5 chấm (aria-hidden) + nhãn chữ. Ẩn nếu không có `level`. */
function MucDoBadge({ level, label }: { level: number; label?: string }) {
  const mauCham = level >= 4 ? 'bg-emerald-500' : level === 3 ? 'bg-blue-500' : level >= 1 ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-700';
  return (
    <span className="inline-flex items-center gap-1 shrink-0" title={`Mức độ: ${label ?? level}/5`}>
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((cham) => (
          <span
            key={cham}
            className={`w-1.5 h-1.5 rounded-full ${cham <= level ? mauCham : 'bg-slate-200 dark:bg-slate-700'}`}
          />
        ))}
      </span>
      {label && <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">{label}</span>}
    </span>
  );
}

function TheTieuChi({ tc }: { tc: TieuChi }) {
  const dat = tc.status === 'pass' || tc.status === 'primary' || tc.status === 'secondary';
  // Spec §4.2: Prefer liệt kê TẤT CẢ câu chứng minh, không chỉ câu đầu.
  const cacCau = tc.evidenceSentences?.length ? tc.evidenceSentences : tc.evidence ? [tc.evidence] : [];
  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex items-start gap-2">
        {dat ? (
          <CheckCircle size={15} weight="fill" className="text-emerald-600 mt-0.5 shrink-0" />
        ) : (
          <WarningCircle size={15} weight="fill" className="text-amber-500 mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-[12.5px] font-semibold text-foreground">
              {tc.nameVi} <span className="font-normal text-slate-400">({tc.nameEn})</span>
            </div>
            {tc.level != null && <MucDoBadge level={tc.level} label={tc.levelLabel} />}
          </div>
          {(tc.comment || tc.description) && (
            <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              <span className={`font-semibold ${dat ? 'text-emerald-700' : 'text-amber-700'}`}>
                {dat ? 'ĐIỂM MẠNH ' : tc.status === 'na' ? 'CẦN PRODUCTION ' : 'GỢI Ý '}
              </span>
              {tc.comment || tc.description}
            </p>
          )}
          {tc.reasoning && (
            <p className="text-[11px] text-slate-400 italic mt-1 leading-relaxed">{tc.reasoning}</p>
          )}
          {cacCau.length > 0 && (
            <>
              {cacCau.length > 1 && (
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 mt-2">
                  Bằng chứng · {cacCau.length} câu trong kịch bản
                </div>
              )}
              <div className="mt-1.5 space-y-1">
                {cacCau.map((c, i) => (
                  <p
                    key={i}
                    className="text-[11.5px] text-slate-500 italic border-l-2 border-slate-200 dark:border-slate-700 pl-2"
                  >
                    “{c}”
                  </p>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
