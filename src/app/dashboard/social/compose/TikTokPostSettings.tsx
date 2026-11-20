'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { socialApi, type SocialAccount, type TikTokCreatorInfo } from '@/lib/api/social';
import { FilterSelect } from '@/app/dashboard/internalChannels/components/FilterFields';
import { useSocialLang } from '@/contexts/SocialLanguageContext';
import {
  TIKTOK_BRANDED_POLICY_URL,
  TIKTOK_MUSIC_POLICY_URL,
  TikTokComposerSettings,
  commercialLabelKind,
  localizePublishError,
  mergeCreatorInfos,
} from '@/lib/social/tiktok-post';

/**
 * Khung "Cài đặt TikTok" trên màn soạn bài — các mục TikTok BẮT BUỘC có trên giao diện
 * đăng bài của app dùng Direct Post (điều kiện để app qua kiểm duyệt):
 * tên/avatar kênh, quyền riêng tư không chọn sẵn, bình luận/Duet/Stitch, công bố nội dung
 * thương mại, dòng đồng ý với chính sách của TikTok.
 */
export default function TikTokPostSettings({
  accounts,
  value,
  onChange,
  onInfoChange,
}: {
  /** Các kênh TikTok đang được chọn */
  accounts: SocialAccount[];
  value: TikTokComposerSettings;
  onChange: (v: TikTokComposerSettings) => void;
  /** Báo cho trang cha danh sách quyền riêng tư hợp lệ để kiểm tra trước khi đăng */
  onInfoChange?: (merged: ReturnType<typeof mergeCreatorInfos> | null) => void;
}) {
  const { lang, t } = useSocialLang();
  const tt = t.tiktok;
  const [infos, setInfos] = useState<TikTokCreatorInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // null = không lỗi, '' = lỗi không kèm lời
  const ids = accounts.map((a) => a.id).sort().join(',');

  useEffect(() => {
    if (!ids) { setInfos([]); onInfoChange?.(null); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all(ids.split(',').map((id) => socialApi.tiktok.creatorInfo(id)))
      .then((list) => { if (!cancelled) setInfos(list); })
      .catch((err: any) => {
        if (cancelled) return;
        setInfos([]);
        // null = dùng câu mặc định theo ngôn ngữ đang chọn; lỗi backend (tiếng Việt + mã TikTok) dịch lúc hiển thị
        setError(err?.response?.data?.message || err?.message || '');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const merged = useMemo(() => (infos.length ? mergeCreatorInfos(infos) : null), [infos]);
  useEffect(() => { onInfoChange?.(merged); }, [merged, onInfoChange]);

  // Nội dung có tài trợ không được để "Chỉ mình tôi" → bỏ lựa chọn đó khỏi danh sách
  const privacyOptions = (merged?.privacyLevelOptions || [])
    .filter((p) => !(value.commercial && value.brandContent && p === 'SELF_ONLY'))
    .map((p) => ({ value: p, label: (tt.privacy as Record<string, string>)[p] || p }));

  // Lựa chọn hiện tại bị loại khỏi danh sách (đổi kênh / bật nội dung có tài trợ) → bắt chọn lại
  useEffect(() => {
    if (value.privacyLevel && merged && !privacyOptions.some((o) => o.value === value.privacyLevel)) {
      onChange({ ...value, privacyLevel: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merged, value.commercial, value.brandContent]);

  const set = (patch: Partial<TikTokComposerSettings>) => onChange({ ...value, ...patch });
  const labelKind = commercialLabelKind(value);
  const label = labelKind === 'branded' ? tt.labelBranded : labelKind === 'organic' ? tt.labelOrganic : null;

  const interaction = [
    { key: 'allowComment' as const, text: tt.comment, disabled: merged?.commentDisabled },
    { key: 'allowDuet' as const, text: tt.duet, disabled: merged?.duetDisabled },
    { key: 'allowStitch' as const, text: tt.stitch, disabled: merged?.stitchDisabled },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 text-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="font-black text-slate-800 text-[13px]">{tt.settingsTitle}</p>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
      </div>

      {/* Kênh sẽ đăng (TikTok bắt hiển thị tên/avatar người đăng) */}
      <div className="flex flex-wrap gap-2">
        {(infos.length ? infos : accounts.map((a) => ({ accountId: a.id, nickname: a.name, avatarUrl: a.avatar_url }) as any)).map((i: any) => (
          <span key={i.accountId} className="flex items-center gap-2 rounded-full bg-slate-100 pl-1 pr-3 py-1 font-semibold text-slate-700">
            {i.avatarUrl
              ? <img src={i.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover" />
              : <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center">🎵</span>}
            {i.nickname}{i.username ? <span className="text-slate-400 font-medium">@{i.username}</span> : null}
          </span>
        ))}
      </div>

      {error !== null && (
        <div className="flex gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5 text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error ? localizePublishError(error, lang, tt) : tt.loadError}</span>
        </div>
      )}

      {/* Quyền riêng tư — không chọn sẵn */}
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{tt.whoCanView}</label>
        <FilterSelect
          value={value.privacyLevel}
          onChange={(v) => set({ privacyLevel: v })}
          options={privacyOptions}
          placeholder={loading ? tt.loading : tt.privacyPlaceholder}
          className="w-full"
        />
        {value.commercial && value.brandContent && (
          <p className="text-[11px] text-slate-500 px-1">{tt.brandedNotSelfOnly}</p>
        )}
      </div>

      {/* Tương tác — mặc định tắt, người dùng tự bật */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{tt.allowViewers}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 px-1">
          {interaction.map((it) => (
            <label
              key={it.key}
              className={`flex items-center gap-2 font-semibold ${it.disabled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 cursor-pointer'}`}
              title={it.disabled ? tt.disabledByCreator : undefined}
            >
              <input
                type="checkbox"
                className="w-4 h-4 accent-slate-900"
                checked={!it.disabled && value[it.key]}
                disabled={!!it.disabled}
                onChange={(e) => set({ [it.key]: e.target.checked } as Partial<TikTokComposerSettings>)}
              />
              {it.text}
            </label>
          ))}
        </div>
      </div>

      {/* Công bố nội dung thương mại */}
      <div className="space-y-2 rounded-lg bg-slate-50 p-3">
        <label className="flex items-start justify-between gap-3 cursor-pointer">
          <span>
            <span className="block font-bold text-slate-800">{tt.commercialTitle}</span>
            <span className="block text-[11px] text-slate-500">{tt.commercialHint}</span>
          </span>
          <input
            type="checkbox"
            className="mt-0.5 w-4 h-4 accent-slate-900"
            checked={value.commercial}
            onChange={(e) => set({ commercial: e.target.checked })}
          />
        </label>
        {value.commercial && (
          <div className="space-y-2 pl-1">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-0.5 w-4 h-4 accent-slate-900" checked={value.brandOrganic} onChange={(e) => set({ brandOrganic: e.target.checked })} />
              <span><b className="text-slate-800">{tt.yourBrand}</b><span className="block text-[11px] text-slate-500">{tt.yourBrandHint}</span></span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-0.5 w-4 h-4 accent-slate-900" checked={value.brandContent} onChange={(e) => set({ brandContent: e.target.checked })} />
              <span><b className="text-slate-800">{tt.brandedContent}</b><span className="block text-[11px] text-slate-500">{tt.brandedContentHint}</span></span>
            </label>
            {label && <p className="text-[11px] font-semibold text-amber-600">{label}</p>}
          </div>
        )}
      </div>

      {merged?.maxVideoPostDurationSec ? (
        <p className="text-[11px] text-slate-500 px-1">{tt.maxDuration(merged.maxVideoPostDurationSec)}</p>
      ) : null}

      {/* Dòng đồng ý — TikTok bắt hiển thị trước nút đăng */}
      <p className="text-[11px] text-slate-500 leading-relaxed px-1">
        {tt.consentPrefix}{' '}
        {value.commercial && value.brandContent ? (
          <>
            <a href={TIKTOK_BRANDED_POLICY_URL} target="_blank" rel="noreferrer" className="underline font-semibold">{tt.brandedPolicy}</a>{' '}{tt.and}{' '}
          </>
        ) : null}
        <a href={TIKTOK_MUSIC_POLICY_URL} target="_blank" rel="noreferrer" className="underline font-semibold">{tt.musicPolicy}</a>
        {tt.consentSuffix.startsWith('.') ? '' : ' '}{tt.consentSuffix}
        {' '}{tt.processingNote}
      </p>
    </div>
  );
}
