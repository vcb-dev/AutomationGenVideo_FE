'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { FileText } from 'lucide-react';

export const DETAIL_ITEMS = [
    { question: "Số video edit sử dụng >50% source tự quay?", placeholder: "Ví dụ: 3 video..." },
    { question: "1. Ngày hôm qua công việc bạn có cái gì khiến bạn tự hào và thích thú nhất?", placeholder: "Mô tả ngắn gọn..." },
    { question: "2. Hôm qua có đổi mới sáng tạo gì được áp dụng vào công việc của bạn không?", placeholder: "Mô tả ngắn gọn..." },
    { question: "3. Bạn có gặp khó khăn nào cần hỗ trợ không?", placeholder: "Mô tả ngắn gọn..." },
    { question: "4. Bạn có đóng góp ý tưởng hay đề xuất gì không?", placeholder: "Mô tả ngắn gọn..." },
    { question: "5. Bạn có sản phẩm (A4 - A5) nào win mới không? (>5k view - >10 cmt hỏi giá?)", placeholder: "Ghi rõ tên sản phẩm và link (nếu có)..." },
];

interface DetailSectionProps {
    values: string[];
    onChange: (index: number, value: string) => void;
    readOnly?: boolean;
}

const DetailSection = ({ values, onChange, readOnly }: DetailSectionProps) => {
    return (
        <Card className="h-full border-none shadow-none">
            <CardHeader className="pb-4">
                <CardTitle className="text-[#334155] flex items-center gap-2 text-lg uppercase font-bold">
                    <FileText className="w-5 h-5 text-gray-500" />
                    II. CHI TIẾT
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                {DETAIL_ITEMS.map((item, index) => {
                    const isNo = values[index] === "Không ạ";
                    const isNumeric = index === 0;

                    return (
                        <div key={index} className={`space-y-3 ${readOnly ? 'opacity-80 pointer-events-none' : ''}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <label className="text-sm font-black text-slate-900 uppercase tracking-tight sm:w-2/3 leading-relaxed">
                                    {item.question}
                                </label>

                                {!isNumeric && (
                                    <div className={`flex bg-gray-100 p-1 rounded-xl shrink-0 w-fit ${readOnly ? 'opacity-50' : ''}`}>
                                        <button
                                            type="button"
                                            onClick={() => !readOnly && onChange(index, "Không ạ")}
                                            disabled={readOnly}
                                            className={`px-6 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${isNo ? "bg-white shadow-sm text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
                                        >
                                            Không ạ
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { if (!readOnly && (isNo || !values[index])) onChange(index, "") }}
                                            disabled={readOnly}
                                            className={`px-6 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${!isNo && values[index] !== undefined ? "bg-white shadow-sm text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
                                        >
                                            Có
                                        </button>
                                    </div>
                                )}
                            </div>

                            {(isNumeric || !isNo) && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    {isNumeric ? (
                                        <input
                                            type="number"
                                            value={values[index] ?? ''}
                                            onChange={(e) => !readOnly && onChange(index, e.target.value)}
                                            placeholder={item.placeholder}
                                            disabled={readOnly}
                                            readOnly={readOnly}
                                            className={`w-full px-4 py-3 border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 bg-gray-50/30 text-sm font-bold text-gray-900 rounded-2xl outline-none transition-all ${readOnly ? 'cursor-not-allowed bg-gray-100' : ''}`}
                                        />
                                    ) : (
                                        <Textarea
                                            value={values[index] ?? ''}
                                            onChange={(e) => !readOnly && onChange(index, e.target.value)}
                                            placeholder={item.placeholder}
                                            disabled={readOnly}
                                            readOnly={readOnly}
                                            className={`min-h-[45px] py-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20 bg-gray-50/30 text-base font-medium text-slate-900 resize-none rounded-2xl ${readOnly ? 'cursor-not-allowed bg-gray-100' : ''}`}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
};

export default DetailSection;
