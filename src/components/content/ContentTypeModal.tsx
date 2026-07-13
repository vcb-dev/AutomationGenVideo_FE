'use client';

import React, { useState } from 'react';
import { X, Sparkles, TrendingUp, BookOpen, Award, ShoppingCart, Layers } from 'lucide-react';

export interface ContentType {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    examples: string[];
}

const CONTENT_TYPES: ContentType[] = [
    {
        id: 'A1',
        name: 'Traffic (Viral)',
        description: 'Mẹo, tin tức, soi sản phẩm - Thu hút lượt view',
        icon: <TrendingUp className="w-6 h-6" />,
        color: 'from-red-500 to-pink-500',
        examples: [
            'Mẹo đánh sáng vàng bạc',
            'Soi trang sức sao Việt',
            'Tin tức ngành kim hoàn'
        ]
    },
    {
        id: 'A2',
        name: 'Knowledge (Giáo dục)',
        description: 'Kiến thức chuyên môn - Xây dựng uy tín',
        icon: <BookOpen className="w-6 h-6" />,
        color: 'from-teal-500 to-cyan-500',
        examples: [
            'Phân biệt vàng/bạc/đá quý',
            'Ý nghĩa phật bản mệnh',
            'Lịch sử thương hiệu'
        ]
    },
    {
        id: 'A3',
        name: 'Credibility (Uy tín)',
        description: 'Xây dựng niềm tin - Flex thành tựu',
        icon: <Award className="w-6 h-6" />,
        color: 'from-blue-500 to-indigo-500',
        examples: [
            'Flex giải thưởng, từ thiện',
            'Giao hàng cho người nổi tiếng',
            'Kể chuyện bảo hành khách'
        ]
    },
    {
        id: 'A4',
        name: 'Conversion (Bán hàng)',
        description: 'Chuyển đổi trực tiếp - Giới thiệu sản phẩm',
        icon: <ShoppingCart className="w-6 h-6" />,
        color: 'from-green-500 to-emerald-500',
        examples: [
            'Top list sản phẩm hot',
            'Ngân sách X mua được gì?',
            'Combo quà tặng'
        ]
    },
    {
        id: 'A5',
        name: 'Combined (Tổng hợp)',
        description: 'Kết hợp A1-A4 - Content đa chiều',
        icon: <Layers className="w-6 h-6" />,
        color: 'from-yellow-500 to-orange-500',
        examples: [
            'Storytelling hoàn chỉnh',
            'Từ hook đến CTA',
            'Nội dung đa chiều'
        ]
    }
];

interface ContentTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (contentType: string) => void;
    isLoading?: boolean;
}

export default function ContentTypeModal({
    isOpen,
    onClose,
    onSelect,
    isLoading = false
}: ContentTypeModalProps) {
    const [selectedType, setSelectedType] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSelect = (typeId: string) => {
        setSelectedType(typeId);
    };

    const handleConfirm = () => {
        if (selectedType) {
            onSelect(selectedType);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-800">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                        disabled={isLoading}
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Generate Content</h2>
                            <p className="text-white/80 text-sm mt-1">
                                Chọn loại content bạn muốn tạo từ video viral này
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content Types Grid */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {CONTENT_TYPES.map((type) => (
                            <button
                                key={type.id}
                                onClick={() => handleSelect(type.id)}
                                disabled={isLoading}
                                className={`
                  text-left p-5 rounded-xl border-2 transition-all duration-200
                  ${selectedType === type.id
                                        ? 'border-purple-500 bg-purple-500/10 scale-[1.02]'
                                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                                    }
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                            >
                                {/* Header */}
                                <div className="flex items-start gap-3 mb-3">
                                    <div className={`p-2 rounded-lg bg-gradient-to-br ${type.color}`}>
                                        {type.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-white text-lg">{type.name}</h3>
                                        <p className="text-gray-400 text-sm mt-1">{type.description}</p>
                                    </div>
                                    {selectedType === type.id && (
                                        <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                {/* Examples */}
                                <div className="space-y-1.5">
                                    {type.examples.map((example, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                                            <span className="text-purple-400 mt-0.5">•</span>
                                            <span>{example}</span>
                                        </div>
                                    ))}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-800/50 border-t border-gray-700 flex justify-between items-center">
                    <p className="text-sm text-gray-400">
                        {selectedType ? (
                            <>
                                Đã chọn: <span className="text-purple-400 font-semibold">
                                    {CONTENT_TYPES.find(t => t.id === selectedType)?.name}
                                </span>
                            </>
                        ) : (
                            'Vui lòng chọn loại content'
                        )}
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-6 py-2.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!selectedType || isLoading}
                            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Đang tạo...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    Generate Content
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
