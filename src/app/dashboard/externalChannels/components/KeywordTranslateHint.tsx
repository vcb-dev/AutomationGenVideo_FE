'use client';

import { useEffect, useRef, useState } from 'react';
import { CircleNotch, Translate, Check, PencilSimple } from '@phosphor-icons/react';

import { useAuthStore } from '@/store/auth-store';
import { scraperService } from '@/services/scraperService';

/**
 * Gợi ý bản dịch tiếng Trung cho ô tìm kiếm của các nền tảng Trung Quốc
 * (Douyin / Xiaohongshu / Kuaishou / Bilibili — các nền tảng này chỉ ra kết quả
 * tốt khi query bằng tiếng Trung).
 *
 * Trang cha giữ nguyên từ khoá tiếng Việt user gõ; component này trả bản dịch ra
 * qua `onTranslated` để lúc bấm Tìm kiếm gửi kèm:
 *   { keyword: <tiếng Trung>, display_keyword: <tiếng Việt> }
 * BE lưu tiếng Việt vào cột search_keyword cho dễ đọc ở bộ lọc/gợi ý.
 */
// So sánh code point thay vì regex chứa ký tự CJK nguyên bản: nguồn giữ thuần ASCII nên
// không thể hỏng âm thầm nếu file bị lưu/deploy sai mã hoá (lúc đó sẽ dịch lại cả text
// vốn đã là tiếng Trung, tốn thêm lần gọi AI + hiện chip sai).
// Dải U+4E00–U+9FFF = CJK Unified Ideographs, khớp check bên AI (translation_views.py).
const CJK_START = 0x4e00;
const CJK_END = 0x9fff;

function hasChinese(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= CJK_START && code <= CJK_END) return true;
  }
  return false;
}

interface Props {
  keyword: string;
  /** Bản dịch hiện tại (rỗng = chưa có / không cần dịch). Trang cha dùng giá trị này khi submit. */
  onTranslated: (translated: string) => void;
}

export default function KeywordTranslateHint({ keyword, onTranslated }: Props) {
  const { token } = useAuthStore();
  const [translated, setTranslated] = useState('');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const timerRef = useRef<NodeJS.Timeout>();
  // Chặn race: chỉ nhận kết quả của lần gõ mới nhất.
  const reqIdRef = useRef(0);

  const trimmed = keyword.trim();
  // Đã là tiếng Trung thì không cần dịch — gửi thẳng, khỏi tốn 1 lần gọi AI.
  const needsTranslate = trimmed.length > 0 && !hasChinese(trimmed);

  useEffect(() => {
    clearTimeout(timerRef.current);

    if (!needsTranslate || !token) {
      setTranslated('');
      setEditing(false);
      onTranslated('');
      return;
    }

    // QUAN TRỌNG: xoá bản dịch cũ NGAY khi từ khoá đổi, trước cả lúc debounce.
    // Nếu không, user sửa từ khoá rồi bấm Tìm kiếm trong ~500ms chờ dịch sẽ cào bằng
    // bản dịch của TỪ KHOÁ CŨ nhưng lưu nhãn từ khoá MỚI → sai dữ liệu trong kho.
    // Để trống thì trang cha tự fallback tìm bằng tiếng Việt (kết quả kém hơn nhưng đúng).
    setTranslated('');
    setEditing(false);
    onTranslated('');

    setLoading(true);
    const myReq = ++reqIdRef.current;
    timerRef.current = setTimeout(async () => {
      try {
        const res = await scraperService.translateKeyword(token, trimmed);
        if (myReq !== reqIdRef.current) return; // đã có lần gõ mới hơn
        // BE fail-open: khi AI service chết nó trả lại nguyên text gốc (source='failed').
        // Coi đó là KHÔNG dịch được — nếu không chip sẽ hiện "Sẽ tìm bằng: làm đẹp",
        // trông như đã dịch trong khi thực chất vẫn là tiếng Việt.
        const raw = res.translated || '';
        const value = raw && raw !== trimmed ? raw : '';
        setTranslated(value);
        setDraft(value);
        onTranslated(value);
      } catch {
        if (myReq !== reqIdRef.current) return;
        // Dịch hỏng → để trống, trang cha tự fallback dùng nguyên tiếng Việt.
        setTranslated('');
        onTranslated('');
      } finally {
        if (myReq === reqIdRef.current) setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timerRef.current);
    // onTranslated do trang cha tạo mới mỗi render nên cố ý không đưa vào deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, needsTranslate, token]);

  if (!needsTranslate) return null;

  const applyDraft = () => {
    const value = draft.trim();
    setTranslated(value);
    onTranslated(value);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <Translate size={14} className="text-amber-500 flex-shrink-0" />
      {loading ? (
        <span className="flex items-center gap-1.5 text-slate-400">
          <CircleNotch size={12} weight="bold" className="animate-spin" />
          Đang dịch sang tiếng Trung...
        </span>
      ) : editing ? (
        <>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applyDraft(); }}
            autoFocus
            className="px-2 py-1 text-xs border border-border rounded bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <button
            onClick={applyDraft}
            className="flex items-center gap-1 px-2 py-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-medium"
          >
            <Check size={12} weight="bold" /> Xong
          </button>
        </>
      ) : translated ? (
        <>
          <span className="text-slate-500">
            Sẽ tìm bằng: <span className="font-semibold text-foreground">{translated}</span>
          </span>
          <button
            onClick={() => { setDraft(translated); setEditing(true); }}
            className="flex items-center gap-1 px-2 py-1 rounded text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Sửa lại bản dịch trước khi cào"
          >
            <PencilSimple size={12} /> Sửa
          </button>
        </>
      ) : (
        <span className="text-amber-500">
          Không dịch được — sẽ tìm bằng nguyên từ khoá tiếng Việt (kết quả có thể kém).
        </span>
      )}
    </div>
  );
}
