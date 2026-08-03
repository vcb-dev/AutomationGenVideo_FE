'use client';

import { ReactNode, useRef, useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { readRowsFromExcel, SheetRow } from '@/lib/lucky-spin/sheet-io';
import { PanelCard } from '@/components/lucky-spin/PanelCard';
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
      <p className={`mb-3.5 ${hintClass}`}>{hint}</p>

      <label className={fieldLabelClass}>File Excel (.xlsx, .xls)</label>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        disabled={importing}
        onChange={(e) => e.target.files?.[0] && handleExcelFile(e.target.files[0])}
        className={fileInputClass}
      />

      {importing && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Đang đọc {fileName}...
        </p>
      )}
      {!importing && fileName && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Đã nhập từ {fileName}
        </p>
      )}
    </PanelCard>
  );
}
