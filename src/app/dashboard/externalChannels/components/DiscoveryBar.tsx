'use client';

import { useState, useRef, useEffect } from 'react';
import { SparkleIcon } from 'lucide-react';
import { MagnifyingGlassPlus, Sparkle, CircleNotch } from '@phosphor-icons/react';
import { useAuthStore } from '@/store/auth-store';
import { scraperService, KeywordSuggestion } from '@/services/scraperService';
import { useMutation } from '@tanstack/react-query';

interface DiscoveryBarProps {
  onDiscoveryTriggered: () => void;
}

export default function DiscoveryBar({ onDiscoveryTriggered }: DiscoveryBarProps) {
  const { token } = useAuthStore();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<KeywordSuggestion[]>([]);
  const [topKeywords, setTopKeywords] = useState<KeywordSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Load top 5 keywords khi mount
  useEffect(() => {
    if (!token) return;
    scraperService.suggestKeywords(token, '').then(results => {
      setTopKeywords(results.slice(0, 5));
    });
  }, [token]);

  // Autocomplete
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim() || !token) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await scraperService.suggestKeywords(token, query);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, token]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Discovery mutation
  const discoveryMutation = useMutation({
    mutationFn: async (keyword: string) => {
      if (!token) throw new Error('No token');
      await scraperService.hitKeyword(token, keyword);
      return scraperService.triggerDiscovery(token, keyword);
    },
    onSuccess: () => {
      onDiscoveryTriggered();
    },
  });

  const handleDiscover = () => {
    const keyword = query.trim();
    if (!keyword) return;
    setShowSuggestions(false);
    discoveryMutation.mutate(keyword);
  };

  const handleSelectSuggestion = (kw: KeywordSuggestion) => {
    setQuery(kw.keyword);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-lg">
        <Sparkle size={18} weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim() && suggestions.length > 0) {
              setShowSuggestions(true);
            } else if (!query.trim() && topKeywords.length > 0) {
              setSuggestions(topKeywords);
              setShowSuggestions(true);
            }
          }}
          onKeyDown={e => { if (e.key === 'Enter') handleDiscover(); }}
          placeholder="Nhập từ khóa để khám phá Fanpage mới..."
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-border rounded-md bg-card text-foreground placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none"
        />

        {/* Autocomplete dropdown */}
        {showSuggestions && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-border rounded-lg shadow-xl z-[60] overflow-hidden"
          >
            {suggestions.map(s => (
              <button
                key={s.id}
                onClick={() => handleSelectSuggestion(s)}
                className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition-colors"
              >
                <span>{s.keyword}</span>
                <span className="text-xs text-slate-400">{s.hits} lượt</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleDiscover}
        disabled={discoveryMutation.isPending || !query.trim()}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        {discoveryMutation.isPending ? (
          <CircleNotch size={16} weight="bold" className="animate-spin" />
        ) : (
          <MagnifyingGlassPlus size={16} weight="bold" />
        )}
        {discoveryMutation.isPending ? 'Đang khám phá...' : 'Khám phá ngay'}
      </button>
    </div>
  );
}
