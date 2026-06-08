'use client';

import { useState, useCallback } from 'react';
import {
  Upload, Download, CheckCircle, XCircle, Clock, AlertTriangle,
  X, Send, Calendar, Loader2, FileText, ChevronLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { socialApi, SocialPlatform, PLATFORM_META } from '@/lib/api/social';
import { useSocialAccounts } from '@/hooks/useSocialAccounts';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface CsvRow {
  platform: string;
  account_name: string;
  content: string;
  hashtags: string;
  media_url: string;
  scheduled_at: string;
  // resolved
  _accountId?: string;
  _status?: 'pending' | 'valid' | 'error' | 'done' | 'failed';
  _error?: string;
  _lineNo?: number;
}

const CSV_HEADERS = ['platform', 'account_name', 'content', 'hashtags', 'media_url', 'scheduled_at'];

const SAMPLE_CSV = `platform,account_name,content,hashtags,media_url,scheduled_at
FACEBOOK,VCB 2,"Hôm nay ra mắt bộ sưu tập vàng 24K mới! 💛 Thiết kế tinh tế, sang trọng.","#VienChiBao #VangBac #TrangSuc",,2026-05-10T09:00
FACEBOOK,PNJ,"Quà tặng ý nghĩa cho ngày đặc biệt - Nhẫn vàng 18K cao cấp","#NhanVang #QuaTang #PNJ",,2026-05-10T10:00
INSTAGRAM,VCB 2,"Khám phá vẻ đẹp của bộ trang sức đá quý tự nhiên ✨","#DaQuy #TrangSuc #Luxury",,2026-05-11T08:00`;

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).map((line, i) => {
    // Handle quoted fields
    const cols: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { cols.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur.trim());

    const row: any = { _lineNo: i + 2, _status: 'pending' };
    headers.forEach((h, idx) => { row[h] = (cols[idx] || '').trim(); });
    return row as CsvRow;
  });
}

function validateRow(row: CsvRow, accounts: any[]): CsvRow {
  if (!row.platform) return { ...row, _status: 'error', _error: 'Thiếu platform' };
  if (!row.content && !row.media_url) return { ...row, _status: 'error', _error: 'Thiếu content hoặc media_url' };

  const platform = row.platform.toUpperCase() as SocialPlatform;
  if (!PLATFORM_META[platform]) return { ...row, _status: 'error', _error: `Platform không hợp lệ: ${row.platform}` };

  const account = accounts.find(a =>
    a.platform === platform &&
    (a.name.toLowerCase().includes(row.account_name?.toLowerCase()) ||
     row.account_name?.toLowerCase().includes(a.name.toLowerCase()))
  );
  if (!account) return { ...row, _status: 'error', _error: `Không tìm thấy account "${row.account_name}" cho ${platform}` };

  if (row.scheduled_at) {
    const d = new Date(row.scheduled_at);
    if (isNaN(d.getTime())) return { ...row, _status: 'error', _error: 'scheduled_at không hợp lệ (dùng ISO: YYYY-MM-DDTHH:mm)' };
    if (d <= new Date()) return { ...row, _status: 'error', _error: 'scheduled_at phải là thời điểm trong tương lai' };
  }

  return { ...row, _accountId: account.id, _status: 'valid' };
}

export default function BulkSchedulePage() {
  const { data: accounts = [] } = useSocialAccounts();
  const [rows, setRows]             = useState<CsvRow[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [dragOver, setDragOver]     = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return toast.error('Chỉ chấp nhận file .csv');
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCsv(text);
      if (!parsed.length) return toast.error('File CSV trống hoặc không đúng định dạng');
      const validated = parsed.map(r => validateRow(r, accounts));
      setRows(validated);
      const errors = validated.filter(r => r._status === 'error').length;
      if (errors) toast.error(`${errors} hàng có lỗi — kiểm tra lại`);
      else toast.success(`Đọc được ${validated.length} hàng hợp lệ`);
    };
    reader.readAsText(file, 'UTF-8');
  }, [accounts]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const validRows = rows.filter(r => r._status === 'valid' || r._status === 'done' || r._status === 'failed');
  const pendingRows = rows.filter(r => r._status === 'valid');

  const handlePublish = async () => {
    if (!pendingRows.length) return toast.error('Không có hàng hợp lệ để đăng');
    setPublishing(true);
    let doneCount = 0;
    let failedCount = 0;

    for (let i = 0; i < pendingRows.length; i++) {
      const row = pendingRows[i];
      const hashtagStr = row.hashtags ? `\n\n${row.hashtags}` : '';
      const fullMessage = row.content + hashtagStr;

      try {
        if (row.scheduled_at) {
          await socialApi.schedule.create({
            accountId: row._accountId!,
            message: fullMessage,
            mediaUrls: row.media_url ? [row.media_url] : undefined,
            scheduledAt: new Date(row.scheduled_at).toISOString(),
          });
        } else {
          await socialApi.queue.enqueue([{
            accountId: row._accountId!,
            platform: row.platform.toUpperCase() as SocialPlatform,
            message: fullMessage,
            mediaUrls: row.media_url ? [row.media_url] : undefined,
          }]);
        }

        doneCount++;
        setRows(prev => prev.map(r => r._lineNo === row._lineNo
          ? { ...r, _status: 'done' } : r));
      } catch (err: any) {
        failedCount++;
        setRows(prev => prev.map(r => r._lineNo === row._lineNo
          ? { ...r, _status: 'failed', _error: err?.response?.data?.message || err.message } : r));
      }
    }

    setPublishing(false);
    toast.success(`Hoàn tất: ${doneCount} thành công, ${failedCount} thất bại`);
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'mau_bulk_schedule.csv'; a.click();
  };

  const statusIcon = (status?: string) => {
    switch (status) {
      case 'valid':  return <Clock className="w-4 h-4 text-blue-500" />;
      case 'done':   return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'error':  return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:       return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/social/compose" className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-slate-900">📋 Đăng bài hàng loạt từ CSV</h1>
              <p className="text-sm text-slate-500 mt-0.5">Upload file CSV để lên lịch đăng nhiều bài cùng lúc</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadSample} className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4" /> Tải mẫu CSV
            </button>
            {pendingRows.length > 0 && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-60 shadow-sm"
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {publishing ? 'Đang xử lý...' : `Đăng ${pendingRows.length} bài`}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-6 space-y-5">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-blue-800 mb-2">📌 Hướng dẫn</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-blue-700">
            {[
              ['platform', 'FACEBOOK, INSTAGRAM, TIKTOK, YOUTUBE, THREADS, ZALO'],
              ['account_name', 'Tên account đã kết nối (tìm gần đúng)'],
              ['content', 'Nội dung bài đăng (đặt trong dấu " nếu có dấu phẩy)'],
              ['hashtags', '#Tag1 #Tag2 (tùy chọn)'],
              ['media_url', 'Link ảnh/video public (tùy chọn)'],
              ['scheduled_at', 'YYYY-MM-DDTHH:mm — bỏ trống = đăng ngay vào hàng chờ'],
            ].map(([col, desc]) => (
              <div key={col} className="flex gap-1.5">
                <code className="bg-blue-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-900 flex-shrink-0">{col}</code>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Drop zone */}
        {rows.length === 0 && (
          <motion.div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            animate={{ borderColor: dragOver ? '#3b82f6' : '#cbd5e1' }}
            className="border-2 border-dashed border-slate-300 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer bg-white hover:bg-slate-50 transition-colors"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file'; input.accept = '.csv,text/csv';
              input.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleFile(f); };
              input.click();
            }}
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${dragOver ? 'bg-blue-100' : 'bg-slate-100'}`}>
              <Upload className={`w-8 h-8 transition-colors ${dragOver ? 'text-blue-500' : 'text-slate-400'}`} />
            </div>
            <p className="text-base font-bold text-slate-700 mb-1">
              {dragOver ? 'Thả file vào đây' : 'Kéo thả hoặc click để chọn file CSV'}
            </p>
            <p className="text-sm text-slate-400">Chỉ chấp nhận .csv, mã hoá UTF-8</p>
          </motion.div>
        )}

        {/* Table */}
        {rows.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-400" />
                <span className="font-bold text-slate-800">{rows.length} hàng đã đọc</span>
                <div className="flex gap-2 text-xs font-bold">
                  <span className="text-emerald-600">{rows.filter(r => r._status === 'done').length} xong</span>
                  <span className="text-blue-600">{rows.filter(r => r._status === 'valid').length} sẵn sàng</span>
                  <span className="text-amber-600">{rows.filter(r => r._status === 'error').length} lỗi</span>
                </div>
              </div>
              <button
                onClick={() => setRows([])}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Xoá tất cả
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['#', 'Trạng thái', 'Platform', 'Tài khoản', 'Nội dung', 'Lịch đăng'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((row) => {
                    const meta = PLATFORM_META[(row.platform?.toUpperCase() as SocialPlatform)] || PLATFORM_META.FACEBOOK;
                    return (
                      <tr key={row._lineNo} className={`hover:bg-slate-50/50 transition-colors ${
                        row._status === 'error'  ? 'bg-amber-50/30' :
                        row._status === 'done'   ? 'bg-emerald-50/20' :
                        row._status === 'failed' ? 'bg-red-50/20' : ''
                      }`}>
                        <td className="px-4 py-3 text-slate-400 font-mono">{row._lineNo}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {statusIcon(row._status)}
                            {row._error && (
                              <span className="text-[10px] text-amber-600 font-semibold max-w-[120px] truncate" title={row._error}>
                                {row._error}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${meta.color} text-white text-[10px] font-bold`}>
                            {meta.emoji} {meta.label}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-700 max-w-[120px] truncate">{row.account_name || '—'}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-[240px]">
                          <p className="truncate">{row.content || <span className="italic text-slate-300">Không có nội dung</span>}</p>
                          {row.hashtags && <p className="text-[10px] text-blue-500 truncate mt-0.5">{row.hashtags}</p>}
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {row.scheduled_at ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(row.scheduled_at).toLocaleString('vi', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          ) : (
                            <span className="text-blue-500 font-semibold">Đăng ngay</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
