import { compressImage } from '../image-compressor';

describe('image-compressor — Nén ảnh client-side', () => {
  it('giữ nguyên file nếu kích thước nhỏ hơn 300KB', async () => {
    const smallFile = new File(['small-content'], 'avatar.png', { type: 'image/png' });
    const result = await compressImage(smallFile);
    expect(result).toBe(smallFile);
  });

  it('giữ nguyên file không phải ảnh (ví dụ: pdf, docx)', async () => {
    const docFile = new File([new ArrayBuffer(500 * 1024)], 'document.pdf', { type: 'application/pdf' });
    const result = await compressImage(docFile);
    expect(result).toBe(docFile);
  });

  it('giữ nguyên file SVG hoặc GIF', async () => {
    const svgFile = new File([new ArrayBuffer(400 * 1024)], 'icon.svg', { type: 'image/svg+xml' });
    const result = await compressImage(svgFile);
    expect(result).toBe(svgFile);
  });

  it('không crash và fallback trả về file gốc khi thiếu canvas context hoặc lỗi load ảnh', async () => {
    const largeFile = new File([new ArrayBuffer(1024 * 1024)], 'photo.jpg', { type: 'image/jpeg' });
    const result = await compressImage(largeFile);
    expect(result).toBeDefined();
    expect(result.name).toContain('photo');
  });
});
