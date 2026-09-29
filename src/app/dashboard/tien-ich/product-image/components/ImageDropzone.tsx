'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { UploadCloud, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { PRODUCT_IMAGE_ACCEPT, validateProductImageFile } from '@/lib/product-image/upload-validation';

/** Nền kẻ ô để thấy rõ phần trong suốt của ảnh đã tách nền. */
export const CHECKERBOARD_STYLE = {
  background: 'repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 20px 20px',
};

/**
 * Ô kéo-thả/chọn 1 ảnh, hiện luôn ảnh đã chọn. Kiểm định dạng + dung lượng ngay khi chọn
 * (khớp bộ lọc của BE) để người dùng không phải chờ tải lên mới biết file hỏng.
 */
export function ImageDropzone({
  title,
  hint,
  file,
  onFile,
  previewSrc,
  checkerboard = false,
  overlay,
  heightClass = 'h-[220px]',
  disabled = false,
}: {
  title: string;
  hint: string;
  file: File | null;
  onFile: (file: File) => void;
  /** Ảnh hiển thị thay cho ảnh gốc của `file` (vd ảnh SP đã tách nền). */
  previewSrc?: string | null;
  checkerboard?: boolean;
  /** Lớp phủ trạng thái (đang xử lý, lỗi) đè lên ảnh xem trước. */
  overlay?: ReactNode;
  heightClass?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFiles = (files: FileList | null) => {
    const picked = files?.[0];
    if (!picked || disabled) return;
    const error = validateProductImageFile(picked);
    if (error) {
      toast.error(error);
      return;
    }
    onFile(picked);
  };

  const shownSrc = previewSrc ?? objectUrl;

  return (
    <div>
      <h3 className="text-sm font-bold text-[#1b1b1d] mb-0.5">{title}</h3>
      <p className="text-xs text-[#9c9aa8] mb-2">{hint}</p>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className={`relative border-2 border-dashed rounded-2xl ${heightClass} overflow-hidden transition-colors ${
          shownSrc ? 'border-[#e2e0ea]' : 'border-[#d5d3e0] hover:border-[#4441cc] bg-[#fcfaff]'
        }`}
        style={shownSrc && checkerboard ? CHECKERBOARD_STYLE : undefined}
      >
        <input
          ref={inputRef}
          type="file"
          accept={PRODUCT_IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            // Cho phép chọn lại đúng file vừa chọn (onChange không bắn nếu value không đổi).
            e.target.value = '';
          }}
        />
        {shownSrc ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shownSrc} alt={title} className="w-full h-full object-contain" />
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 border border-[#e2e0ea] text-xs font-semibold text-[#4441cc] hover:bg-white disabled:opacity-40"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Đổi ảnh
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="w-full h-full flex flex-col items-center justify-center text-center px-4 disabled:opacity-40"
          >
            <span className="w-11 h-11 rounded-full bg-[#4441cc]/10 flex items-center justify-center mb-2">
              <UploadCloud className="w-5 h-5 text-[#4441cc]" />
            </span>
            <span className="text-sm text-[#1b1b1d]">
              Kéo thả ảnh vào đây hoặc <span className="text-[#4441cc] font-semibold underline underline-offset-2">chọn file</span>
            </span>
            <span className="text-xs text-[#9c9aa8] mt-1">JPG, PNG, WebP · tối đa 10MB</span>
          </button>
        )}
        {overlay && <div className="absolute inset-0 flex items-center justify-center bg-white/75">{overlay}</div>}
      </div>
    </div>
  );
}
