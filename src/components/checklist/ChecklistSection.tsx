'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ClipboardCheck } from 'lucide-react';

export const CHECKLIST_ITEMS = [
    "Bạn đã đăng video lên FB chưa?",
    "Bạn đã đăng video lên Tiktok chưa?",
    "Bạn đã đăng video lên IG chưa?",
    "Bạn đã đăng video lên Youtube chưa?",
    "Bạn đã đăng video lên Zalovideo chưa?",
    "Bạn đã đăng video lên Twitter chưa?",
    "Bạn đã đăng video lên Threads chưa?",
    "Bạn đã đăng video lên Lemon8 chưa?",
    "Bạn đã check lại caption và hagtag video chưa?",
    "Bạn đã báo cáo đầy đủ thông tin công việc trên lark chưa?",
];

interface ChecklistSectionProps {
    values: boolean[];
    onChange: (index: number, checked: boolean) => void;
    readOnly?: boolean;
}

const ChecklistSection = ({ values, onChange, readOnly }: ChecklistSectionProps) => {
    return (
        <Card className="h-full border-none shadow-none">
            <CardHeader className="pb-4">
                <CardTitle className="text-blue-700 flex items-center gap-2 text-xl uppercase font-black tracking-tight">
                    <ClipboardCheck className="w-5 h-5" />
                    I. TIẾN ĐỘ CHECKLIST
                </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 pt-4">
                {CHECKLIST_ITEMS.map((item, index) => (
                    <div key={index} className={`flex items-start gap-3 group ${readOnly ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}>
                        <Checkbox
                            id={`check-${index}`}
                            checked={values[index] ?? false}
                            onChange={(e) => !readOnly && onChange(index, e.target.checked)}
                            disabled={readOnly}
                            className={`mt-1 border-gray-300 w-6 h-6 rounded-md transition-colors accent-blue-600 ${readOnly ? 'cursor-not-allowed' : 'group-hover:border-blue-500 cursor-pointer'}`}
                        />
                        <label
                            htmlFor={`check-${index}`}
                            className={`text-slate-900 font-bold text-sm leading-tight transition-colors ${readOnly ? 'cursor-not-allowed' : 'group-hover:text-blue-600 cursor-pointer'}`}
                        >
                            {item}
                        </label>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};

export default ChecklistSection;
