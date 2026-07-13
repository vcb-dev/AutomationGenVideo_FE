'use client';

import { Sparkles, MessageSquare, Send, Loader2 } from 'lucide-react';
import { useState } from 'react';
import Button from '@/components/ui/button';

export default function GenContentPage() {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState('');

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        // Placeholder logic
        setTimeout(() => {
            setResult(`Đây là nội dung được tạo từ AI cho prompt: "${prompt}"\n\n1. Ý tưởng video: Review sản phẩm chi tiết.\n2. Script: "Chào bạn, hôm nay chúng ta sẽ cùng xem qua..."\n3. Hashtags: #AI #ContentCreator #GenContent`);
            setIsGenerating(false);
        }, 2000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-7 h-7 text-blue-600" />
                    Gen Content
                </h1>
                <p className="text-slate-600">
                    Sử dụng AI để tạo kịch bản, ý tưởng và nội dung cho video của bạn.
                </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-slate-500" />
                            Bạn muốn tạo nội dung gì?
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ví dụ: Tạo kịch bản review điện thoại iPhone 15 Pro Max theo phong cách hài hước..."
                            className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none text-slate-800"
                        />
                    </div>

                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt.trim()}
                        className="w-full"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Đang tạo nội dung...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Tạo ngay
                            </>
                        )}
                    </Button>
                </div>

                {result && (
                    <div className="border-t border-slate-200 bg-slate-50 p-6">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-500" />
                            Kết quả của bạn:
                        </h3>
                        <div className="bg-white p-4 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap leading-relaxed shadow-sm">
                            {result}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Kịch bản TikTok', desc: 'Tối ưu cho video ngắn 1 phút' },
                    { label: 'Review sản phẩm', desc: 'Chi tiết, đầy đủ tính năng' },
                    { label: 'Ý tưởng video', desc: '5 ý tưởng trending mỗi tuần' }
                ].map((item, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group">
                        <h4 className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{item.label}</h4>
                        <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
