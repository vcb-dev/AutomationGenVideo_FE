/** Ngôn ngữ đọc/dịch dùng chung cho các nơi gọi TTS Minimax (trang Tiện ích Clone Voice,
 *  modal "Tạo voice" trong task...) — một chỗ duy nhất để không lệch danh sách giữa các nơi. */
export const TTS_LANGUAGES: string[] = [
  'Tiếng Việt', 'English', '日本語', '한국어', '中文 (简体)',
  'Español', 'Français', 'Deutsch', 'Português', 'ภาษาไทย',
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
}
