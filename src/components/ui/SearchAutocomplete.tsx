import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import axios from 'axios';

interface SearchAutocompleteProps {
    onSearch: (term: string) => void;
    placeholder?: string;
    className?: string;
    value: string;
    onChange: (value: string) => void;
}

const BE_API_URL = process.env.NEXT_PUBLIC_BE_API_URL || 'http://localhost:3000';

export function SearchAutocomplete({ onSearch, placeholder = "Search...", className = "", value, onChange }: SearchAutocompleteProps) {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Debounce suggest API call
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (value.trim().length >= 2) {
                try {
                    const res = await axios.get(`${BE_API_URL}/search-recommendations/suggest`, {
                        params: { q: value }
                    });
                    if (res.data && res.data.suggestions) {
                        setSuggestions(res.data.suggestions);
                        setShowSuggestions(true);
                    }
                } catch (error) {
                    console.error("Failed to fetch suggestions", error);
                }
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [value]);

    // Click outside listener
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onSearch(value);
            setShowSuggestions(false);
            if (value.trim()) {
                axios.post(`${BE_API_URL}/search-recommendations/record`, { term: value }).catch(console.error);
            }
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        onChange(suggestion);
        onSearch(suggestion);
        setShowSuggestions(false);
        axios.post(`${BE_API_URL}/search-recommendations/record`, { term: suggestion }).catch(console.error);
    };

    return (
        <div className={`relative w-full ${className}`} ref={wrapperRef}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                    placeholder={placeholder}
                    className="w-full bg-[#1e293b] border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-[#1e293b] border border-slate-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <ul>
                        {suggestions.map((s, idx) => (
                            <li
                                key={idx}
                                onClick={() => handleSuggestionClick(s)}
                                className="px-4 py-2 text-sm text-slate-200 hover:bg-slate-700/50 cursor-pointer flex items-center gap-2 transition-colors"
                            >
                                <Search className="w-3 h-3 text-slate-500" />
                                {s}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
