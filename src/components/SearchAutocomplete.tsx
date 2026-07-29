'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Clock, TrendingUp, Sparkles, Loader2, X, Zap } from 'lucide-react';
import { useSearchSuggestions, SearchSuggestion } from '@/hooks/useSearchSuggestions';

interface SearchAutocompleteProps {
    platform: string;
    value: string;
    onChange: (value: string) => void;
    onSearch: (query: string) => void;
    placeholder?: string;
    className?: string;
}

export default function SearchAutocomplete({
    platform,
    value,
    onChange,
    onSearch,
    placeholder = 'Tìm kiếm...',
    className = ''
}: SearchAutocompleteProps) {
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const {
        suggestions,
        loading,
        source,
        isLocalOnly,
        fetchSuggestions,
        trackSearch,
        clearSuggestions,
    } = useSearchSuggestions({ platform });

    // Fetch suggestions whenever value changes — no extra debounce here (hook handles it)
    useEffect(() => {
        if (value && value.length >= 1) {
            fetchSuggestions(value);
        } else {
            clearSuggestions();
        }
    }, [value, fetchSuggestions, clearSuggestions]);

    // ── Auto Translation for Douyin & Xiaohongshu ───────────────────────────
    useEffect(() => {
        const needsTranslation = ['DOUYIN', 'XIAOHONGSHU'].includes(platform.toUpperCase());
        if (!needsTranslation || !value || value.length < 2) return;

        // Skip only if the string contains NO Latin/Vietnamese alphabetical characters
        // This allows mixed strings (e.g. "首饰 mới") to still trigger translation
        if (!/[a-zA-Z\u00C0-\u1EF9]/.test(value)) return;

        const timer = setTimeout(async () => {
            try {
                const res = await fetch('/api/translate-chinese', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: value }),
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.translated && data.translated !== value) {
                        onChange(data.translated);
                    }
                }
            } catch {
                // Auto-translation is best-effort, silently ignore failures
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [value, platform, onChange]);

    // Handle click outside and blur
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(event.target as Node)
            ) {
                setIsFocused(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleBlur = () => {
        // Small delay to allow click events on suggestions to fire before hiding
        setTimeout(() => {
            if (document.activeElement !== inputRef.current) {
                setIsFocused(false);
            }
        }, 150);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
        setSelectedIndex(-1);
        setIsFocused(true);
    };

    // Douyin/Xiaohongshu: chỉ cho search khi đã dịch sang tiếng Trung
    const requiresChinese = ['DOUYIN', 'XIAOHONGSHU'].includes(platform.toUpperCase());
    const hasLatinOrVietnamese = (text: string) => /[a-zA-Z\u00C0-\u1EF9]/.test(text);
    const safeOnSearch = (query: string) => {
        if (requiresChinese && hasLatinOrVietnamese(query)) return;
        trackSearch(query);
        onSearch(query);
        setIsFocused(false);
        clearSuggestions();
    };

    const handleSuggestionClick = (suggestion: SearchSuggestion) => {
        onChange(suggestion.text);
        safeOnSearch(suggestion.text);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!suggestions.length) {
            if (e.key === 'Enter' && value) {
                e.preventDefault();
                safeOnSearch(value);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0) {
                    handleSuggestionClick(suggestions[selectedIndex]);
                } else if (value) {
                    safeOnSearch(value);
                }
                setIsFocused(false);
                break;
            case 'Escape':
                setIsFocused(false);
                break;
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value) safeOnSearch(value);
    };

    const handleClear = () => {
        onChange('');
        clearSuggestions();
        inputRef.current?.focus();
    };

    // Highlight matching text in suggestion
    const highlightMatch = (text: string, query: string) => {
        if (!query.trim()) return text;
        const lowerText = text.toLowerCase();
        const lowerQuery = query.trim().toLowerCase();
        const matchIndex = lowerText.indexOf(lowerQuery);
        if (matchIndex === -1) return text;
        return (
            <>
                {text.slice(0, matchIndex)}
                <span className="text-white font-semibold">{text.slice(matchIndex, matchIndex + query.trim().length)}</span>
                {text.slice(matchIndex + query.trim().length)}
            </>
        );
    };

    const getSourceLabel = () => {
        if (isLocalOnly && loading) return { label: 'Đang tải gợi ý...', color: 'text-gray-600' };
        if (source === 'youtube') return { label: 'Gợi ý video phổ biến', color: 'text-red-500/70' };
        if (source === 'google') return { label: 'Gợi ý từ Google', color: 'text-blue-500/70' };
        if (source === 'gemini') return { label: 'Xu hướng thực tế (Gemini)', color: 'text-purple-400' };
        if (source === 'ai') return { label: 'AI gợi ý', color: 'text-purple-400/70' };
        return null;
    };

    const getSuggestionIcon = (suggestion: SearchSuggestion) => {
        if (suggestion.isLocal) {
            return <Search className="w-4 h-4 text-gray-600" />;
        }
        switch (suggestion.type) {
            case 'youtube':
                return <TrendingUp className="w-4 h-4 text-red-400/80" />;
            case 'google':
                return <Search className="w-4 h-4 text-blue-400/80" />;
            case 'history':
                return <Clock className="w-4 h-4 text-gray-500" />;
            case 'gemini':
            case 'ai':
                return <Sparkles className="w-4 h-4 text-purple-400" />;
            default:
                return <Search className="w-4 h-4 text-gray-500" />;
        }
    };

    const showDropdown = isFocused && suggestions.length > 0;
    const sourceInfo = getSourceLabel();

    return (
        <div className={`relative ${className}`}>
            {/* Search Input */}
            <form onSubmit={handleSubmit} className="relative">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />

                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={handleInputChange}
                        onFocus={() => setIsFocused(true)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="w-full pl-12 pr-12 py-3 bg-[#1a1a1a] border border-gray-800 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />

                    {/* Loading or Clear Button */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {loading ? (
                            <Loader2 className="w-4 h-4 text-purple-400/60 animate-spin" />
                        ) : value ? (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-400 hover:text-white" />
                            </button>
                        ) : null}
                    </div>
                </div>
            </form>

            {/* Suggestions Dropdown */}
            {showDropdown && (
                <div
                    ref={dropdownRef}
                    className="absolute top-full left-0 right-0 mt-3 bg-[#111420]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] z-[999] animate-in fade-in slide-in-from-top-2 duration-200"
                >
                    {/* Source header */}
                    {sourceInfo && (
                        <div className="px-4 py-1.5 border-b border-gray-800/50 flex items-center justify-between">
                            <span className={`text-[10px] uppercase tracking-wider font-medium ${sourceInfo.color}`}>
                                {sourceInfo.label}
                            </span>
                            {/* Loading indicator: subtle pulsing dot when local only */}
                            {isLocalOnly && loading && (
                                <span className="flex gap-0.5">
                                    {[0, 1, 2].map(i => (
                                        <span
                                            key={i}
                                            className="w-1 h-1 rounded-full bg-purple-400 animate-bounce"
                                            style={{ animationDelay: `${i * 0.15}s` }}
                                        />
                                    ))}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Suggestion list */}
                    <div className="py-1">
                        {suggestions.slice(0, 8).map((suggestion, idx) => (
                            <button
                                key={`suggestion-${idx}-${suggestion.text}`}
                                type="button"
                                onClick={() => handleSuggestionClick(suggestion)}
                                className={`
                                    w-full px-4 py-2.5 flex items-center gap-3 text-left group/item
                                    transition-all duration-100
                                    ${selectedIndex === idx
                                        ? 'bg-[#ff0050]/10 text-white'
                                        : 'hover:bg-gray-800/60 text-gray-300'}
                                    ${suggestion.isLocal ? 'opacity-75' : 'opacity-100'}
                                `}
                            >
                                {/* Icon */}
                                <div className={`flex-shrink-0 transition-colors ${selectedIndex === idx ? 'text-[#ff0050]' : ''}`}>
                                    {getSuggestionIcon(suggestion)}
                                </div>

                                {/* Text */}
                                <span className="flex-1 text-sm truncate">
                                    {highlightMatch(suggestion.text, value)}
                                </span>

                                {/* Arrow on hover/select */}
                                <svg
                                    className={`w-3.5 h-3.5 text-gray-600 transition-all flex-shrink-0 ${selectedIndex === idx
                                        ? 'opacity-100 text-[#ff0050] -rotate-45'
                                        : 'opacity-0 group-hover/item:opacity-60'
                                        }`}
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-1.5 border-t border-gray-800/50 flex items-center justify-between">
                        <span className="text-[10px] text-gray-600">
                            ↑↓ để chọn · Enter để tìm
                        </span>
                        {!isLocalOnly && source === 'youtube' && (
                            <span className="text-[10px] text-gray-600 flex items-center gap-1">
                                <Zap className="w-2.5 h-2.5 text-red-400" /> Xu hướng video
                            </span>
                        )}
                        {!isLocalOnly && source === 'google' && (
                            <span className="text-[10px] text-gray-600 flex items-center gap-1">
                                <Zap className="w-2.5 h-2.5 text-blue-400" /> Google Suggest
                            </span>
                        )}
                        {!isLocalOnly && source === 'gemini' && (
                            <span className="text-[10px] text-gray-600 flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-purple-400" /> Viral Research
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
