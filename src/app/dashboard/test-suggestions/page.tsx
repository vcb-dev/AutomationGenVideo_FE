'use client';

import { useState } from 'react';
import SearchAutocomplete from '@/components/SearchAutocomplete';

export default function SearchSuggestionsDemo() {
    const [query, setQuery] = useState('');
    const [platform, setPlatform] = useState<'TIKTOK' | 'INSTAGRAM' | 'FACEBOOK'>('TIKTOK');

    const handleSearch = (searchQuery: string) => {
        console.log('Searching for:', searchQuery, 'on', platform);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-10">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-white bg-clip-text text-transparent mb-2">
                        🔍 Search Suggestions Demo
                    </h1>
                    <p className="text-gray-400">
                        Test AI-powered search suggestions with history tracking
                    </p>
                </div>

                {/* Platform Selector */}
                <div className="mb-6 flex gap-3">
                    {(['TIKTOK', 'INSTAGRAM', 'FACEBOOK'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPlatform(p)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${platform === p
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                {/* Search Autocomplete */}
                <SearchAutocomplete
                    platform={platform}
                    value={query}
                    onChange={setQuery}
                    onSearch={handleSearch}
                    placeholder={`Tìm kiếm ${platform}...`}
                />

                {/* Info */}
                <div className="mt-10 p-6 bg-[#141414] rounded-xl border border-gray-800">
                    <h3 className="text-lg font-bold text-white mb-3">💡 How to test:</h3>
                    <ol className="space-y-2 text-gray-400 text-sm">
                        <li>1. Type "mèo" → See AI suggestions instantly</li>
                        <li>2. Click a suggestion → Search is tracked</li>
                        <li>3. Type "mèo" again → See your search history!</li>
                        <li>4. Use arrow keys to navigate suggestions</li>
                        <li>5. Press Enter to search</li>
                    </ol>
                </div>

                {/* Current State */}
                <div className="mt-6 p-4 bg-[#1a1a1a] rounded-lg border border-gray-800">
                    <p className="text-sm text-gray-500">Current Query:</p>
                    <p className="text-white font-mono">{query || '(empty)'}</p>
                </div>
            </div>
        </div>
    );
}
