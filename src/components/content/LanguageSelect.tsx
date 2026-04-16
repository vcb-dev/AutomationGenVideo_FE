'use client';

import Select, { StylesConfig, SingleValue } from 'react-select';

export interface LanguageOption {
    value: string;
    label: string;
    flag: string;
    nativeName: string;
}

export const LANGUAGES: LanguageOption[] = [
    // Đông Nam Á
    { value: 'vi', flag: '🇻🇳', label: 'Tiếng Việt', nativeName: 'Tiếng Việt' },
    { value: 'th', flag: '🇹🇭', label: 'Thai', nativeName: 'ภาษาไทย' },
    { value: 'id', flag: '🇮🇩', label: 'Indonesian', nativeName: 'Bahasa Indonesia' },
    { value: 'ms', flag: '🇲🇾', label: 'Malay', nativeName: 'Bahasa Melayu' },
    { value: 'tl', flag: '🇵🇭', label: 'Filipino', nativeName: 'Filipino' },
    { value: 'my', flag: '🇲🇲', label: 'Burmese', nativeName: 'မြန်မာဘာသာ' },
    { value: 'km', flag: '🇰🇭', label: 'Khmer', nativeName: 'ភាសាខ្មែរ' },
    { value: 'lo', flag: '🇱🇦', label: 'Lao', nativeName: 'ພາສາລາວ' },
    // Đông Á
    { value: 'zh', flag: '🇨🇳', label: 'Chinese (Simplified)', nativeName: '中文 (简体)' },
    { value: 'zh-TW', flag: '🇹🇼', label: 'Chinese (Traditional)', nativeName: '中文 (繁體)' },
    { value: 'ja', flag: '🇯🇵', label: 'Japanese', nativeName: '日本語' },
    { value: 'ko', flag: '🇰🇷', label: 'Korean', nativeName: '한국어' },
    // Tây Á / Nam Á
    { value: 'hi', flag: '🇮🇳', label: 'Hindi', nativeName: 'हिन्दी' },
    { value: 'ar', flag: '🇸🇦', label: 'Arabic', nativeName: 'العربية' },
    { value: 'fa', flag: '🇮🇷', label: 'Persian', nativeName: 'فارسی' },
    { value: 'tr', flag: '🇹🇷', label: 'Turkish', nativeName: 'Türkçe' },
    { value: 'ur', flag: '🇵🇰', label: 'Urdu', nativeName: 'اردو' },
    // Châu Âu
    { value: 'en', flag: '🇬🇧', label: 'English', nativeName: 'English' },
    { value: 'fr', flag: '🇫🇷', label: 'French', nativeName: 'Français' },
    { value: 'de', flag: '🇩🇪', label: 'German', nativeName: 'Deutsch' },
    { value: 'es', flag: '🇪🇸', label: 'Spanish', nativeName: 'Español' },
    { value: 'it', flag: '🇮🇹', label: 'Italian', nativeName: 'Italiano' },
    { value: 'pt', flag: '🇧🇷', label: 'Portuguese', nativeName: 'Português' },
    { value: 'ru', flag: '🇷🇺', label: 'Russian', nativeName: 'Русский' },
    { value: 'nl', flag: '🇳🇱', label: 'Dutch', nativeName: 'Nederlands' },
    { value: 'pl', flag: '🇵🇱', label: 'Polish', nativeName: 'Polski' },
    { value: 'uk', flag: '🇺🇦', label: 'Ukrainian', nativeName: 'Українська' },
    { value: 'sv', flag: '🇸🇪', label: 'Swedish', nativeName: 'Svenska' },
    { value: 'da', flag: '🇩🇰', label: 'Danish', nativeName: 'Dansk' },
    { value: 'fi', flag: '🇫🇮', label: 'Finnish', nativeName: 'Suomi' },
    { value: 'el', flag: '🇬🇷', label: 'Greek', nativeName: 'Ελληνικά' },
    { value: 'cs', flag: '🇨🇿', label: 'Czech', nativeName: 'Čeština' },
    { value: 'ro', flag: '🇷🇴', label: 'Romanian', nativeName: 'Română' },
    { value: 'hu', flag: '🇭🇺', label: 'Hungarian', nativeName: 'Magyar' },
    // Châu Phi
    { value: 'sw', flag: '🇰🇪', label: 'Swahili', nativeName: 'Kiswahili' },
    { value: 'am', flag: '🇪🇹', label: 'Amharic', nativeName: 'አማርኛ' },
    { value: 'ha', flag: '🇳🇬', label: 'Hausa', nativeName: 'Hausa' },
];

// Map value → option để lookup nhanh
export const LANGUAGE_MAP = Object.fromEntries(LANGUAGES.map(l => [l.value, l]));

// Custom dark-mode styles cho react-select
const darkStyles: StylesConfig<LanguageOption, false> = {
    control: (base, state) => ({
        ...base,
        backgroundColor: '#1a1a1a',
        borderColor: state.isFocused ? 'rgba(245,158,11,0.5)' : '#374151',
        borderRadius: '0.75rem',
        boxShadow: state.isFocused ? '0 0 0 1px rgba(245,158,11,0.3)' : 'none',
        minHeight: '38px',
        cursor: 'pointer',
        '&:hover': { borderColor: '#4B5563' },
    }),
    menu: (base) => ({
        ...base,
        backgroundColor: '#1a1a1a',
        border: '1px solid #374151',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        zIndex: 9999,
        boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
    }),
    menuPortal: (base) => ({
        ...base,
        zIndex: 99999,
    }),
    menuList: (base) => ({
        ...base,
        padding: '4px',
        maxHeight: '240px',
    }),
    option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
            ? 'rgba(245,158,11,0.2)'
            : state.isFocused
                ? 'rgba(255,255,255,0.06)'
                : 'transparent',
        color: state.isSelected ? '#FCD34D' : '#E5E7EB',
        borderRadius: '0.5rem',
        cursor: 'pointer',
        padding: '6px 10px',
        fontSize: '13px',
        '&:active': { backgroundColor: 'rgba(245,158,11,0.15)' },
    }),
    singleValue: (base) => ({
        ...base,
        color: '#F3F4F6',
        fontSize: '13px',
    }),
    input: (base) => ({
        ...base,
        color: '#F3F4F6',
        fontSize: '13px',
    }),
    placeholder: (base) => ({
        ...base,
        color: '#6B7280',
        fontSize: '13px',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: (base) => ({
        ...base,
        color: '#6B7280',
        padding: '0 8px',
        '&:hover': { color: '#9CA3AF' },
    }),
    clearIndicator: (base) => ({
        ...base,
        color: '#6B7280',
        '&:hover': { color: '#9CA3AF' },
    }),
};

// Format option: hiển thị flag + tên + tên gốc
const formatOptionLabel = (opt: LanguageOption) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '16px', lineHeight: 1 }}>{opt.flag}</span>
        <span style={{ fontWeight: 500 }}>{opt.label}</span>
        {opt.nativeName !== opt.label && (
            <span style={{ color: '#6B7280', fontSize: '11px' }}>— {opt.nativeName}</span>
        )}
    </div>
);

interface LanguageSelectProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export default function LanguageSelect({ value, onChange, className }: LanguageSelectProps) {
    const selected = LANGUAGE_MAP[value] || LANGUAGES[0];

    return (
        <div className={className} style={{ minWidth: 220 }}>
            <Select<LanguageOption, false>
                options={LANGUAGES}
                value={selected}
                onChange={(opt: SingleValue<LanguageOption>) => {
                    if (opt) onChange(opt.value);
                }}
                styles={darkStyles}
                formatOptionLabel={formatOptionLabel}
                isSearchable
                placeholder="Tìm ngôn ngữ..."
                noOptionsMessage={() => 'Không tìm thấy ngôn ngữ'}
                menuPlacement="auto"
                menuPosition="fixed"
                menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                // Accessibility
                inputId="language-select"
                aria-label="Chọn ngôn ngữ output"
            />
        </div>
    );
}
