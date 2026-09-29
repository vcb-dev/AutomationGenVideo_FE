'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, RefreshCw, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { BACKGROUND_PRESETS } from '@/lib/product-image/background-presets';
import { PRODUCT_IMAGE_ACCEPT, validateProductImageFile } from '@/lib/product-image/upload-validation';

/** Giá trị `selected` khi dùng ảnh nền người dùng tự tải lên thay cho nền có sẵn. */
export const UPLOADED_BACKGROUND = 'upload';

const tileClass = (active: boolean) =>
  `relative block h-24 w-full rounded-xl overflow-hidden border-2 transition-colors ${
    active ? 'border-[#4441cc]' : 'border-[#e2e0ea] hover:border-[#c7c4d7]'
  }`;

/**
 * Chọn ảnh nền: các nền có sẵn của phòng media + một ô tải ảnh khác. Ảnh tự tải được giữ lại khi
 * chuyển sang nền có sẵn — bấm lại ô đó là dùng lại, không phải chọn file lần nữa.
 */
export function BackgroundPicker({
  selected,
  uploadFile,
  onSelect,
  onUploadFile,
}: {
  /** id nền có sẵn, hoặc `UPLOADED_BACKGROUND`. */
  selected: string;
  uploadFile: File | null;
  onSelect: (choice: string) => void;
  onUploadFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!uploadFile) {
      setUploadUrl(null);
      return;
    }
    const url = URL.createObjectURL(uploadFile);
    setUploadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [uploadFile]);

  // Kiểm định dạng + dung lượng ngay khi chọn, cùng bộ lọc với ô ảnh sản phẩm.
  const handleFiles = (files: FileList | null) => {
    const picked = files?.[0];
    if (!picked) return;
    const error = validateProductImageFile(picked);
    if (error) {
      toast.error(error);
      return;
    }
    onUploadFile(picked);
  };

  const uploadActive = selected === UPLOADED_BACKGROUND && !!uploadUrl;

  return (
    <div>
      <h3 className="text-sm font-bold text-[#1b1b1d] mb-0.5">2. Ảnh background phòng</h3>
      <p className="text-xs text-[#9c9aa8] mb-2">Chọn nền có sẵn của phòng media hoặc tải ảnh phòng khác.</p>
      <div className="grid grid-cols-3 gap-2">
        {BACKGROUND_PRESETS.map((preset) => {
          const active = selected === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.id)}
              aria-pressed={active}
              title={preset.label}
              className={tileClass(active)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preset.thumbnailSrc} alt={preset.label} draggable={false} className="w-full h-full object-cover" />
              <TileLabel text={preset.label} />
              {active && <SelectedMark />}
            </button>
          );
        })}

        <div
          className="relative"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
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
          {uploadUrl ? (
            <>
              <button
                type="button"
                onClick={() => onSelect(UPLOADED_BACKGROUND)}
                aria-pressed={uploadActive}
                title="Ảnh nền đã tải lên"
                className={tileClass(uploadActive)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={uploadUrl} alt="Ảnh nền đã tải lên" draggable={false} className="w-full h-full object-cover" />
                <TileLabel text="Ảnh đã tải" />
                {uploadActive && <SelectedMark />}
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                title="Đổi ảnh khác"
                aria-label="Đổi ảnh nền khác"
                className="absolute top-1 left-1 w-6 h-6 rounded-full bg-white/90 border border-[#e2e0ea] text-[#4441cc] flex items-center justify-center hover:bg-white"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="h-24 w-full rounded-xl border-2 border-dashed border-[#d5d3e0] hover:border-[#4441cc] bg-[#fcfaff] flex flex-col items-center justify-center gap-1 px-1 text-center"
            >
              <UploadCloud className="w-5 h-5 text-[#4441cc]" />
              <span className="text-[11px] font-semibold leading-tight text-[#4441cc]">Tải ảnh khác</span>
            </button>
          )}
        </div>
      </div>
      <p className="text-[11px] text-[#9c9aa8] mt-1.5">Ảnh tải lên: JPG, PNG, WebP · tối đa 10MB</p>
    </div>
  );
}

function TileLabel({ text }: { text: string }) {
  return (
    <span className="absolute inset-x-0 bottom-0 bg-black/50 px-1.5 py-0.5 text-left text-[11px] font-semibold text-white truncate">
      {text}
    </span>
  );
}

function SelectedMark() {
  return (
    <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#4441cc] text-white flex items-center justify-center">
      <Check className="w-3 h-3" />
    </span>
  );
}
