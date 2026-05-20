'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Film, Check, Loader2, Clock, Image as ImageIcon, Server } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { socialApi } from '@/lib/api/social';
import toast from 'react-hot-toast';

interface Props {
  videoUrl: string;
  mediaLibraryId?: string; // Có → dùng server-side API (Drive video)
  open: boolean;
  onClose: () => void;
  onConfirm: (coverUrl: string) => void;
}

const THUMB_COUNT = 9;

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ─── Server-side mode (Drive video) ──────────────────────────────────────────

function ServerFramePicker({ mediaLibraryId, open, onClose, onConfirm }: {
  mediaLibraryId: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (coverUrl: string) => void;
}) {
  const [timeSeconds, setTimeSeconds] = useState(1);
  const [inputVal,    setInputVal]    = useState('1');
  const [previewUrl,  setPreviewUrl]  = useState<string | null>(null);
  const [previewing,  setPreviewing]  = useState(false);
  const [confirming,  setConfirming]  = useState(false);
  // Track whether user has explicitly requested a preview
  const [hasPreviewed, setHasPreviewed] = useState(false);

  // Reset khi modal mở
  useEffect(() => {
    if (open) {
      setTimeSeconds(1);
      setInputVal('1');
      setPreviewUrl(null);
      setHasPreviewed(false);
    }
  }, [open]);

  const handlePreview = useCallback(async () => {
    const ts = Math.max(0, Math.floor(Number(inputVal) || 0));
    setTimeSeconds(ts);
    setPreviewing(true);
    setPreviewUrl(null);
    setHasPreviewed(true);
    try {
      const res = await socialApi.library.previewFrame(mediaLibraryId, ts);
      setPreviewUrl(res.previewUrl);
    } catch (e: any) {
      toast.error(`Không thể xem trước frame: ${e.message}`);
    } finally {
      setPreviewing(false);
    }
  }, [mediaLibraryId, inputVal]);

  const handleConfirm = async () => {
    const ts = Math.max(0, Math.floor(Number(inputVal) || 0));
    setConfirming(true);
    try {
      const res = await socialApi.library.setThumbnailAt(mediaLibraryId, ts);
      onConfirm(res.thumbnail_url);
      toast.success('Đã đặt ảnh bìa!');
      onClose();
    } catch (e: any) {
      toast.error(`Lưu ảnh bìa thất bại: ${e.message}`);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="p-5 space-y-4">
      {/* Server-side notice */}
      <div className="flex items-center gap-2.5 bg-blue-900/20 border border-blue-500/30 rounded-xl px-4 py-3">
        <Server className="w-4 h-4 text-blue-400 flex-shrink-0" />
        <p className="text-xs text-blue-300">
          Video lưu trên Google Drive — frame được trích xuất qua server (FFmpeg). Nhập giây cần chọn, bấm <strong>Xem trước</strong> để kiểm tra, rồi bấm <strong>Xác nhận</strong>.
        </p>
      </div>

      {/* Time input */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Chọn giây cần lấy frame
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            step={1}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handlePreview(); }}
            className="w-28 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm font-mono text-center focus:outline-none focus:border-blue-500"
            placeholder="giây"
          />
          <span className="text-slate-400 text-xs">giây từ đầu video</span>
          <button
            onClick={handlePreview}
            disabled={previewing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors"
          >
            {previewing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tạo...</> : 'Xem trước'}
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {previewing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-xs text-slate-400">Đang tải video và trích xuất frame...</p>
            <p className="text-[10px] text-slate-500">Có thể mất 15–30 giây lần đầu</p>
          </div>
        ) : previewUrl ? (
          <>
            <img src={previewUrl} alt="Frame preview" className="w-full h-full object-contain" />
            <div className="absolute bottom-2.5 left-2.5 bg-black/75 text-white text-[11px] font-mono px-2.5 py-1 rounded-lg">
              {fmtTime(timeSeconds)}
            </div>
            <div className="absolute top-2.5 right-2.5 bg-green-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
              <Check className="w-3 h-3" /> Frame đã xem trước
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Film className="w-10 h-10" />
            <p className="text-xs">{hasPreviewed ? 'Không thể tải frame' : 'Nhập giây và bấm Xem trước'}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-white/10">
        <div className="flex items-center gap-1.5 text-slate-500">
          {previewUrl && !previewing ? (
            <>
              <div className="rounded-lg overflow-hidden border border-white/20 flex-shrink-0" style={{ width: 48, height: 27 }}>
                <img src={previewUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400">Frame tại {fmtTime(timeSeconds)}</p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="text-xs">Chưa có xem trước</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-white/10"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming || previewing}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-blue-500/20"
          >
            {confirming
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang lưu...</>
              : <><Check className="w-3.5 h-3.5" /> Xác nhận frame {fmtTime(Math.max(0, Math.floor(Number(inputVal) || 0)))}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Browser-side mode (local/direct video) ───────────────────────────────────

function BrowserFramePicker({ videoUrl, open, onClose, onConfirm }: {
  videoUrl: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (coverUrl: string) => void;
}) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const thumbsRef   = useRef<HTMLDivElement>(null);

  const [duration,       setDuration]       = useState(0);
  const [currentTime,    setCurrentTime]    = useState(0);
  const [thumbnails,     setThumbnails]     = useState<{ time: number; dataUrl: string }[]>([]);
  const [previewDataUrl, setPreviewDataUrl] = useState('');
  const [selectedTime,   setSelectedTime]   = useState<number | null>(null);
  const [loadingThumbs,  setLoadingThumbs]  = useState(false);
  const [uploading,      setUploading]      = useState(false);
  const [corsError,      setCorsError]      = useState(false);
  const [videoReady,     setVideoReady]     = useState(false);

  const captureFrame = useCallback((): string | null => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    try {
      const w = video.videoWidth  || 1280;
      const h = video.videoHeight || 720;
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, w, h);
      return canvas.toDataURL('image/jpeg', 0.88);
    } catch {
      setCorsError(true);
      return null;
    }
  }, []);

  const generateThumbnails = useCallback(async () => {
    const video = videoRef.current;
    if (!video || duration <= 0) return;
    setLoadingThumbs(true);
    setCorsError(false);
    const thumbs: { time: number; dataUrl: string }[] = [];

    for (let i = 0; i < THUMB_COUNT; i++) {
      const t = (duration / (THUMB_COUNT - 1)) * i;
      const clamped = Math.min(Math.max(t, 0), duration - 0.05);
      await new Promise<void>(resolve => {
        const onSeeked = () => {
          const dataUrl = captureFrame();
          if (dataUrl) thumbs.push({ time: clamped, dataUrl });
          resolve();
        };
        video.addEventListener('seeked', onSeeked, { once: true });
        video.currentTime = clamped;
        setTimeout(() => { video.removeEventListener('seeked', onSeeked); resolve(); }, 2000);
      });
    }
    setThumbnails(thumbs);
    setLoadingThumbs(false);
    video.currentTime = 0;
  }, [duration, captureFrame]);

  useEffect(() => {
    if (open && videoReady && duration > 0) generateThumbnails();
  }, [open, videoReady, duration, generateThumbnails]);

  useEffect(() => {
    if (open) {
      setCorsError(false);
      setPreviewDataUrl('');
      setSelectedTime(null);
    }
  }, [open]);

  const onSeeked = useCallback(() => {
    const dataUrl = captureFrame();
    if (dataUrl) setPreviewDataUrl(dataUrl);
    setCurrentTime(videoRef.current?.currentTime ?? 0);
  }, [captureFrame]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    setSelectedTime(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  };

  const handleThumbClick = (time: number) => {
    setSelectedTime(time);
    setCurrentTime(time);
    if (videoRef.current) videoRef.current.currentTime = time;
    thumbsRef.current?.querySelector(`[data-t="${time}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
  };

  const handleConfirm = async () => {
    const dataUrl = captureFrame() || previewDataUrl;
    if (!dataUrl) { toast.error('Không thể chụp frame. Thử kéo thanh video và thử lại.'); return; }
    setUploading(true);
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `thumb_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const item = await socialApi.library.upload(file, undefined, { type: 'thumb', thumbFor: videoUrl.split('/').pop() || 'video' });
      onConfirm(item.url);
      toast.success('Đã đặt ảnh bìa video!');
      onClose();
    } catch { toast.error('Lưu ảnh bìa thất bại'); }
    finally { setUploading(false); }
  };

  return (
    <div className="p-5 space-y-4">
      {/* Video Preview */}
      <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <video
          ref={videoRef}
          src={videoUrl}
          crossOrigin="anonymous"
          className="w-full h-full object-contain"
          preload="metadata"
          onLoadedMetadata={() => { setDuration(videoRef.current?.duration ?? 0); setVideoReady(true); }}
          onSeeked={onSeeked}
        />
        <div className="absolute bottom-2.5 left-2.5 bg-black/75 text-white text-[11px] font-mono px-2.5 py-1 rounded-lg backdrop-blur-sm">
          {fmtTime(currentTime)}
          {duration > 0 && <span className="text-white/50"> / {fmtTime(duration)}</span>}
        </div>
        {selectedTime !== null && (
          <div className="absolute top-2.5 right-2.5 bg-blue-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1">
            <Check className="w-3 h-3" /> Đã chọn tại {fmtTime(selectedTime)}
          </div>
        )}
      </div>

      {/* Timeline Scrubber */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <div className="flex-1 relative">
            <input
              type="range" min={0} max={duration || 100} step={0.05} value={currentTime}
              onChange={handleSliderChange}
              className="w-full h-1.5 rounded-full cursor-pointer accent-blue-500"
              style={{ accentColor: '#3b82f6' }}
            />
            {thumbnails.length > 0 && duration > 0 && (
              <div className="absolute top-3.5 left-0 right-0 flex justify-between pointer-events-none">
                {thumbnails.map(({ time }) => (
                  <div key={time} className="w-px h-1.5 bg-white/20" style={{ marginLeft: `${(time / duration) * 100}%` }} />
                ))}
              </div>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-mono w-10 text-right flex-shrink-0">{fmtTime(currentTime)}</span>
        </div>
      </div>

      {/* Thumbnail Strip */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          {loadingThumbs
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Đang tạo frame thumbnails...</>
            : thumbnails.length > 0 ? `${thumbnails.length} frame mẫu — bấm để chọn nhanh`
            : 'Kéo thanh thời gian để chọn frame'}
        </p>
        <div ref={thumbsRef} className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
          {loadingThumbs
            ? Array.from({ length: THUMB_COUNT }).map((_, i) => (
                <div key={i} className="flex-shrink-0 rounded-lg bg-slate-800 animate-pulse" style={{ width: 64, height: 36 }} />
              ))
            : thumbnails.map(({ time, dataUrl }) => {
                const isSelected = selectedTime !== null && Math.abs(selectedTime - time) < 0.3;
                return (
                  <button
                    key={time} data-t={time} onClick={() => handleThumbClick(time)}
                    className={`relative flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-150 ${
                      isSelected ? 'border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)] scale-105' : 'border-transparent hover:border-white/40 hover:scale-105'
                    }`}
                    style={{ width: 64, height: 36 }} title={fmtTime(time)}
                  >
                    <img src={dataUrl} alt="" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent pt-1.5 pb-px text-center">
                      <span className="text-[8px] text-white font-mono">{fmtTime(time)}</span>
                    </div>
                    {isSelected && (
                      <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
        </div>
      </div>

      {corsError && (
        <div className="flex items-start gap-2.5 bg-amber-900/20 border border-amber-500/30 rounded-xl px-4 py-3">
          <span className="text-amber-400 text-sm flex-shrink-0">⚠</span>
          <p className="text-xs text-amber-300">
            Video này không cho phép chụp frame trực tiếp (hạn chế CORS).
            Hãy dùng nút <strong>&quot;Chọn từ thư viện&quot;</strong> để chọn ảnh bìa.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          {previewDataUrl && !corsError ? (
            <>
              <div className="rounded-lg overflow-hidden border border-white/20 flex-shrink-0" style={{ width: 48, height: 27 }}>
                <img src={previewDataUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400">Frame hiện tại</p>
                <p className="text-xs font-bold text-white font-mono">{fmtTime(currentTime)}</p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-500">
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="text-xs">Kéo thanh để xem trước frame</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-white/10">
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={uploading || corsError || !previewDataUrl}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-blue-500/20"
          >
            {uploading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang lưu...</>
              : <><Check className="w-3.5 h-3.5" /> Dùng frame {selectedTime !== null ? fmtTime(selectedTime) : 'này'}</>
            }
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" aria-hidden />
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function VideoFramePicker({ videoUrl, mediaLibraryId, open, onClose, onConfirm }: Props) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="bg-[#0f1623] rounded-2xl w-full max-w-[680px] overflow-hidden shadow-2xl border border-white/10"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <Film className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">Chọn ảnh bìa từ video</p>
                <p className="text-[10px] text-slate-500">
                  {mediaLibraryId ? 'Trích xuất frame qua server · Google Drive' : 'Kéo thanh thời gian hoặc chọn nhanh bên dưới'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {mediaLibraryId ? (
            <ServerFramePicker
              mediaLibraryId={mediaLibraryId}
              open={open}
              onClose={onClose}
              onConfirm={onConfirm}
            />
          ) : (
            <BrowserFramePicker
              videoUrl={videoUrl}
              open={open}
              onClose={onClose}
              onConfirm={onConfirm}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
