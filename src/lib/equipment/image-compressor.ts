/**
 * Tiện ích nén ảnh client-side trước khi tải lên máy chủ.
 * - Giảm kích thước ảnh chụp từ camera điện thoại (5MB - 15MB) xuống ~300KB.
 * - Giữ độ phân giải sắc nét với maxWidth 1600px, JPEG chất lượng 80%.
 * - Tối ưu băng thông mạng di động 4G/Wi-Fi, ngăn ngừa timeout khi tải nhiều ảnh.
 */
export async function compressImage(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {},
): Promise<File> {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.8 } = options;

  // Nếu không phải ảnh hoặc file nhỏ hơn 300KB thì giữ nguyên
  if (!file.type || !file.type.startsWith('image/') || file.size <= 300 * 1024) {
    return file;
  }

  // Giữ nguyên ảnh vector SVG hoặc GIF động
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve) => {
    // Nếu chạy trong môi trường SSR hoặc thiếu window/Image/canvas
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      return resolve(file);
    }

    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              return resolve(file);
            }
            const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
            const compressedFile = new File([blob], newName, { type: 'image/jpeg' });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality,
        );
      };

      img.src = objectUrl;
    } catch {
      resolve(file);
    }
  });
}
