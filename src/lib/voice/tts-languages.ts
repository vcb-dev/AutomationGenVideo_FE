/** Ngôn ngữ đọc/dịch dùng chung cho các nơi gọi TTS Minimax (trang Tiện ích Clone Voice,
 *  modal "Tạo voice" trong task...) — một chỗ duy nhất để không lệch danh sách giữa các nơi. */
export const TTS_LANGUAGES: string[] = [
  'Tiếng Việt', 'English', '日本語', '한국어', '中文 (简体)',
  'Español', 'Français', 'Deutsch', 'Português', 'ภาษาไทย',
  'Bahasa Melayu',
]

/** Map nhãn UI sang giá trị `language_boost` mà API TTS của Minimax cần. */
export const TTS_LANGUAGE_TO_MINIMAX: Record<string, string> = {
  'Tiếng Việt': 'Vietnamese',
  'English': 'English',
  '日本語': 'Japanese',
  '한국어': 'Korean',
  '中文 (简体)': 'Chinese',
  'Español': 'Spanish',
  'Français': 'French',
  'Deutsch': 'German',
  'Português': 'Portuguese',
  'ภาษาไทย': 'Thai',
  'Bahasa Melayu': 'Malay',
}

/** Ký hiệu nước trong tên giọng (vd "HuyK TH", "HuyK Malay") → nhãn ngôn ngữ đọc tương ứng. */
const VOICE_NAME_TOKEN_TO_LANGUAGE: Record<string, string> = {
  vn: 'Tiếng Việt',
  usa: 'English',
  us: 'English',
  en: 'English',
  jp: '日本語',
  kr: '한국어',
  cn: '中文 (简体)',
  tbn: 'Español',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  th: 'ภาษาไทย',
  thai: 'ภาษาไทย',
  my: 'Bahasa Melayu',
  malay: 'Bahasa Melayu',
  malaysia: 'Bahasa Melayu',
}

/** Đoán ngôn ngữ đọc từ tên giọng theo từng từ trong tên; không nhận ra thì trả null. */
export function inferTtsLanguageFromVoiceName(name: string | null | undefined): string | null {
  const tokens = (name ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  for (const token of tokens) {
    const language = VOICE_NAME_TOKEN_TO_LANGUAGE[token]
    if (language) return language
  }
  return null
}
