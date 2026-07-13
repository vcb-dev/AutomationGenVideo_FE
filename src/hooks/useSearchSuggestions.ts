/**
 * useSearchSuggestions — Real-time as-you-type suggestions with Market-Aware Rotation
 *
 * Tier 1 (0ms):   Local word bank — shows INSTANTLY on each keystroke.
 * Tier 2 (~200ms): Market-aware suggestions from YouTube or Gemini research.
 *
 * Why no caching?
 * To satisfy the requirement "Every search shows different suggestions",
 * we let the backend handle rotation. Each fetch to the same query
 * returns a different batch of trending/viral results.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { generateLocalSuggestions } from '@/lib/localSuggestionGenerator';

export interface SearchSuggestion {
    text: string;
    type: 'youtube' | 'google' | 'gemini' | 'ai' | 'history' | 'local';
    source?: string;
    isLocal?: boolean;
}

export interface UseSuggestionsOptions {
    platform?: string;
    debounceMs?: number;
    minQueryLength?: number;
    maxResults?: number;
}

export function useSearchSuggestions(options: UseSuggestionsOptions = {}) {
    const {
        debounceMs = 200,    // Slightly longer debounce for better server rotation
        minQueryLength = 1,
        maxResults = 8,
    } = options;

    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [source, setSource] = useState<string>('none');
    const [isLocalOnly, setIsLocalOnly] = useState(false);

    const abortRef = useRef<AbortController | null>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const lastQuery = useRef<string>('');

    const fetchSuggestions = useCallback(
        (query: string) => {
            const q = query.trim();

            if (!q || q.length < minQueryLength) {
                setSuggestions([]);
                setSource('none');
                setLoading(false);
                setIsLocalOnly(false);
                lastQuery.current = '';
                return;
            }

            lastQuery.current = q;

            // ── TIER 1: Local instant (0ms) ───────────────────────────────────
            const localItems = generateLocalSuggestions(q, maxResults);
            setSuggestions(localItems.map(text => ({
                text, type: 'local' as const, source: 'local', isLocal: true,
            })));
            setSource('local');
            setIsLocalOnly(true);

            // ── TIER 2: Live API Suggestions ──────────────────────────────────
            if (debounceRef.current) clearTimeout(debounceRef.current);

            debounceRef.current = setTimeout(async () => {
                // Abort previous request
                if (abortRef.current) abortRef.current.abort();
                abortRef.current = new AbortController();
                setLoading(true);

                try {
                    const url = `/api/proxy-tiktok-suggest?q=${encodeURIComponent(q)}&platform=${options.platform || 'tiktok'}&count=${maxResults}`;

                    const res = await fetch(url, { signal: abortRef.current.signal });
                    if (lastQuery.current !== q) return; // stale
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);

                    const data = await res.json();
                    const raw: string[] = data.suggestions || [];
                    const apiSource: string = data.source || 'youtube';

                    if (raw.length > 0 && lastQuery.current === q) {
                        const formatted: SearchSuggestion[] = raw.map(text => ({
                            text,
                            type: (apiSource === 'youtube' ? 'youtube'
                                : apiSource === 'google' ? 'google'
                                    : apiSource === 'gemini' ? 'gemini'
                                        : 'ai') as SearchSuggestion['type'],
                            source: apiSource,
                            isLocal: false,
                        }));

                        // NO Front-end caching here! 
                        // Reason: User wants the results to mutate every time they re-search.
                        // The backend handles the rotation logic.

                        setSuggestions(formatted);
                        setSource(apiSource);
                        setIsLocalOnly(false);
                    }

                } catch (err: any) {
                    if (err.name === 'AbortError') return;
                    console.error(`[Suggest Hook] Error: ${err?.message}`);
                } finally {
                    if (lastQuery.current === q) setLoading(false);
                }
            }, debounceMs);
        },
        [minQueryLength, maxResults, debounceMs, options.platform],
    );

    const clearSuggestions = useCallback(() => {
        setSuggestions([]);
        setSource('none');
        setLoading(false);
        setIsLocalOnly(false);
        lastQuery.current = '';
        if (abortRef.current) abortRef.current.abort();
        if (debounceRef.current) clearTimeout(debounceRef.current);
    }, []);

    const trackSearch = useCallback(async (query: string) => {
        try {
            await fetch('/api/proxy-tiktok-suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (abortRef.current) abortRef.current.abort();
        };
    }, []);

    return {
        suggestions,
        loading,
        source,
        isLocalOnly,
        fetchSuggestions,
        clearSuggestions,
        trackSearch,
        error: null,
    };
}
