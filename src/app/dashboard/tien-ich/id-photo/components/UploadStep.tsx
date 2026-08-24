'use client';

import { useRef } from 'react';
import { UploadCloud, ImageOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_SIZE_BYTES } from './constants';

export function UploadStep({
  file,
  previewUrl,
  isUploading,
  onFileSelected,
  onContinue,
}: {
  file: File | null;
  previewUrl: string | null;
  isUploading: boolean;
  onFileSelected: (file: File) => void;
  onContinue: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    const f = fileList?.[0];
    if (!f) return;

    // Chặn sớm ở FE ngay khi chọn file — khớp đúng validate của BE (FileInterceptor trong
    // id-photo.controller.ts: JPG/PNG, tối đa 10MB). Không chặn ở đây thì người dùng phải chờ
    // upload xong mới biết bị BE từ chối, đặc biệt phí thời gian với mạng chậm.
    if (!ALLOWED_IMAGE_TYPES.includes(f.type)) {
      toast.error(`Chỉ chấp nhận ảnh JPG/PNG. File "${f.name}" có định dạng ${f.type || 'không xác định'}.`);
      return;
    }
    if (f.size > MAX_UPLOAD_SIZE_BYTES) {
      toast.error(`File "${f.name}" nặng ${(f.size / (1024 * 1024)).toFixed(1)}MB, vượt giới hạn 10MB.`);
      return;
    }
    onFileSelected(f);
  };

  return (
    <div className="border border-[#e2e0ea] rounded-2xl bg-white p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tải ảnh lên */}
        <div>
          <h3 className="text-base font-bold text-[#1b1b1d] mb-1">Tải ảnh lên</h3>
          {/* Nói trước điều sắp xảy ra: bước kế tiếp gọi AI và mất chục giây, người dùng
              lần đầu cần biết để không bỏ dở giữa chừng. */}
          <p className="text-xs text-[#9c9aa8] mb-3">
            Chọn ảnh chân dung rõ mặt. Bấm &quot;Tiếp tục&quot; để AI tự ghép đồng phục.
          </p>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
            className="border-2 border-dashed border-[#d5d3e0] hover:border-[#4441cc] rounded-2xl h-[420px] flex flex-col items-center justify-center bg-[#fcfaff] transition-colors text-center px-6"
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div className="w-14 h-14 rounded-full bg-[#4441cc]/10 flex items-center justify-center mb-4">
              <UploadCloud className="w-6 h-6 text-[#4441cc]" />
            </div>
            <p className="text-sm text-[#1b1b1d]">
              Kéo thả file vào đây hoặc{' '}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-[#4441cc] font-semibold underline underline-offset-2"
              >
                duyệt file
              </button>
            </p>
            <p className="text-xs text-[#9c9aa8] mt-1">Hỗ trợ JPG, PNG. Dung lượng tối đa 10MB.</p>
            {file && (
              <p className="text-xs font-semibold text-[#4441cc] mt-3 max-w-full truncate px-4">{file.name}</p>
            )}
          </div>
        </div>

        {/* Xem trước */}
        <div>
          <h3 className="text-base font-bold text-[#1b1b1d] mb-3">Xem trước</h3>
          <div className="border border-[#e2e0ea] rounded-2xl h-[420px] flex flex-col items-center justify-center bg-[#fafafb] overflow-hidden">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Ảnh xem trước" className="w-full h-full object-contain" />
            ) : (
              <>
                <ImageOff className="w-8 h-8 text-[#c7c4d7] mb-2" />
                <p className="text-sm text-[#9c9aa8]">Chưa có ảnh nào được chọn</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          type="button"
          disabled={!file || isUploading}
          onClick={onContinue}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-[#4441cc] hover:bg-[#4441cc]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang tải lên...
            </>
          ) : (
            'Tiếp tục →'
          )}
        </button>
      </div>
    </div>
  );
}
