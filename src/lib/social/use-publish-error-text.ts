'use client';

import { useCallback } from 'react';
import { useSocialLang } from '@/contexts/SocialLanguageContext';
import { localizePublishError } from './tiktok-post';

/**
 * Hiển thị lỗi đăng bài theo ngôn ngữ đang chọn. Backend trả lỗi tiếng Việt; lỗi TikTok có kèm
 * "(mã TikTok: …)" nên khi đang ở EN thì đổi sang câu tiếng Anh theo mã. Lỗi khác giữ nguyên.
 */
export function usePublishErrorText() {
  const { lang, t } = useSocialLang();
  return useCallback(
    (message: string | null | undefined) => localizePublishError(message, lang, t.tiktok),
    [lang, t],
  );
}
