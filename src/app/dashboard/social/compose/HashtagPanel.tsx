'use client';

import { useState } from 'react';
import { Hash, X, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSocialLang } from '@/contexts/SocialLanguageContext';

interface Props {
  hashtags: string[];
  suggestedHashtags: string[];
  hashtagInput: string;
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  onInputChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onAddSuggested: (tag: string) => void;
  onRemoveSuggested: (tag: string, e: React.MouseEvent) => void;
}

export default function HashtagPanel({
  hashtags, suggestedHashtags, hashtagInput,
  onAdd, onRemove, onInputChange, onKeyDown,
  onAddSuggested, onRemoveSuggested,
}: Props) {
  const { t } = useSocialLang();
  const [showSuggestInput, setShowSuggestInput] = useState(false);
  const [suggestInputVal, setSuggestInputVal] = useState('');

  const handleSubmitSuggested = () => {
    const tag = suggestInputVal.trim().replace(/^#+/, '');
    if (tag) onAddSuggested(tag);
    setSuggestInputVal('');
    setShowSuggestInput(false);
  };

  return (
    <motion.div layout className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${hashtags.length === 0 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
            <Hash className="w-4 h-4" />
          </div>
          <span className="text-slate-800 font-extrabold text-[13px]">{t.hashtagPanel.title}</span>
        </div>
        {showSuggestInput ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="text"
              value={suggestInputVal}
              onChange={e => setSuggestInputVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSubmitSuggested();
                if (e.key === 'Escape') { setSuggestInputVal(''); setShowSuggestInput(false); }
              }}
              placeholder={t.hashtagPanel.tagNamePlaceholder}
              className="border border-blue-300 rounded-lg px-2 py-0.5 text-[12px] text-slate-700 outline-none focus:border-blue-500 w-32"
            />
            <button onClick={handleSubmitSuggested} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
            <button onClick={() => { setSuggestInputVal(''); setShowSuggestInput(false); }} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <button onClick={() => setShowSuggestInput(true)} className="text-blue-600 text-xs font-bold hover:underline">{t.hashtagPanel.addSuggestion}</button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 p-3 bg-slate-50/50 rounded-xl border border-slate-100 min-h-[48px]">
        {hashtags.map(tag => (
          <span key={tag} className="flex items-center gap-1.5 bg-white border border-blue-100 text-blue-600 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm">
            #{tag}
            <X onClick={() => onRemove(tag)} className="w-3 h-3 hover:text-red-500 cursor-pointer" />
          </span>
        ))}
        <input
          type="text"
          placeholder={hashtags.length === 0 ? t.hashtagPanel.inputPlaceholderEmpty : t.hashtagPanel.inputPlaceholderMore}
          value={hashtagInput}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-[13px] text-slate-700 min-w-[100px]"
        />
      </div>

      <div className="space-y-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t.hashtagPanel.quickSuggestions}</span>
        <div className="flex flex-wrap gap-2">
          {suggestedHashtags.map(tag => (
            <div key={tag} className="relative group">
              <button
                onClick={() => onAdd(tag)}
                disabled={hashtags.includes(tag)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                  hashtags.includes(tag)
                    ? 'bg-slate-100 border-slate-100 text-slate-300'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 shadow-sm'
                }`}
              >
                #{tag}
              </button>
              {!hashtags.includes(tag) && (
                <X
                  onClick={(e) => onRemoveSuggested(tag, e)}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-sm"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
