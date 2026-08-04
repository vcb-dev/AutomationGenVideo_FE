'use client';

import { ReactNode, useRef, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { readRowsFromExcel, SheetRow } from '@/lib/lucky-spin/sheet-io';
import { PanelCard } from '@/components/lucky-spin/PanelCard';
import { useSpinReadOnly } from '@/components/lucky-spin/ReadOnlyContext';
import { fieldLabelClass, fileInputClass, hintClass } from '@/components/lucky-spin/styles';

interface Props {
  title: string;
  hint: ReactNode;
  /** Nhận các dòng đã đọc được từ file; tự lo việc dò cột và ghi vào state. */
  onRows: (rows: SheetRow[]) => void;
}

export function BulkImportPanel({ title, hint, onRows }: Props) {
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readOnly = useSpinReadOnly();

  const handleExcelFile = async (file: File) => {
    setImporting(true);
    setFileName(file.name);
    try {
      onRows(await readRowsFromExcel(file));
    } catch {
      toast.error('Không đọc được file. Kiểm tra định dạng file Excel.');
      setFileName('');
    } finally {
      setImporting(false);
      // Xóa giá trị input để chọn lại đúng file vừa rồi vẫn kích hoạt onChange.
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <PanelCard title={title}>
      <p className={`mb-5 ${hintClass}`}>{hint}</p>

      <label className={fieldLabelClass}>File Excel (.xlsx, .xls)</label>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        disabled={importing || readOnly}
        onChange={(e) => e.target.files?.[0] && handleExcelFile(e.target.files[0])}
        className={fileInputClass}
      />

      {importing && (
        <p className="mt-4 flex items-center gap-2 text-[13px] font-medium text-[#6B7280] dark:text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
          Đang đọc {fileName}...
        </p>
      )}
      {!importing && fileName && (
        <p className="mt-4 flex items-center gap-2 text-[13px] font-medium text-[#22C55E]">
          <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
          Đã nhập từ {fileName}
        </p>
      )}
    </PanelCard>
  );
}
