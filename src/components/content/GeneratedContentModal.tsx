'use client';

import React from 'react';
import { X, Copy, Check, ArrowRight, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface GeneratedContent {
    id: number;
    title: string;
    script: string;
    hook: string;
    problem: string;
    solution: string;
    cta: string;
    word_count: number;
    content_type: string;
    content_type_display: string;
}

interface GeneratedContentModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: GeneratedContent | null;
    onGoToMixVideo?: () => void;
}

export default function GeneratedContentModal({
    isOpen,
    onClose,
    content,
    onGoToMixVideo
}: GeneratedContentModalProps) {
    const [copiedSection, setCopiedSection] = useState<string | null>(null);

    if (!isOpen || !content) return null;

    const copyToClipboard = async (text: string, section: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedSection(section);
            setTimeout(() => setCopiedSection(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const sections = [
        { key: 'hook', label: 'Hook (Mở đầu)', text: content.hook, color: 'from-red-500 to-pink-500' },
        { key: 'problem', label: 'Problem (Vấn đề)', text: content.problem, color: 'from-orange-500 to-yellow-500' },
        { key: 'solution', label: 'Solution (Giải pháp)', text: content.solution, color: 'from-green-500 to-emerald-500' },
        { key: 'cta', label: 'CTA (Kêu gọi hành động)', text: content.cta, color: 'from-blue-500 to-purple-500' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-800">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold text-white">{content.title}</h2>
                                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold text-white">
                                    {content.content_type_display}
                                </span>
                            </div>
                            <p className="text-white/80 text-sm mt-1">
                                {content.word_count} từ • AI Generated Content
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)] space-y-4">
                    {/* Full Script Only */}
                    <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-white text-lg">Kịch bản đầy đủ</h3>
                            <button
                                onClick={() => copyToClipboard(content.script, 'full')}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm text-white transition-colors"
                            >
                                {copiedSection === 'full' ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Đã copy!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" />
                                        Copy
                                    </>
                                )}
                            </button>
                        </div>
                        <p className="text-gray-300 whitespace-pre-wrap leading-relaxed text-base">
                            {content.script}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-800/50 border-t border-gray-700 flex justify-between items-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
                    >
                        Đóng
                    </button>
                    {onGoToMixVideo && (
                        <button
                            onClick={onGoToMixVideo}
                            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 transition-all flex items-center gap-2"
                        >
                            Go to Mix Video
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
