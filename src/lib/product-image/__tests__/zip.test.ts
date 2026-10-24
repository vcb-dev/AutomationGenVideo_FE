/**
 * Chức năng: Tạo ảnh sản phẩm — tải cả lô thành một file ZIP: CRC32 đúng chuẩn, cấu trúc ZIP
 * (header từng file, thư mục trung tâm, bản ghi kết thúc) đọc lại được đúng tên UTF-8 và đúng nội
 * dung từng ảnh.
 */
import { TextDecoder, TextEncoder } from 'util';
import { crc32, createZip } from '../zip';

// jsdom của jest không có sẵn TextEncoder/TextDecoder.
Object.assign(globalThis, { TextEncoder, TextDecoder });

const encode = (text: string) => new TextEncoder().encode(text);

/** Đọc ZIP theo thư mục trung tâm — như cách unzip/Windows Explorer đọc. */
function readZip(zip: Uint8Array) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const eocd = zip.length - 22;
  expect(view.getUint32(eocd, true)).toBe(0x06054b50);
  const count = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  expect(centralOffset + centralSize).toBe(eocd);

  const files: { name: string; data: Uint8Array; crc: number; flags: number }[] = [];
  let pos = centralOffset;
  for (let i = 0; i < count; i += 1) {
    expect(view.getUint32(pos, true)).toBe(0x02014b50);
    const flags = view.getUint16(pos + 8, true);
    const crc = view.getUint32(pos + 16, true);
    const size = view.getUint32(pos + 20, true);
    const nameLength = view.getUint16(pos + 28, true);
    const localOffset = view.getUint32(pos + 42, true);
    const name = new TextDecoder().decode(zip.subarray(pos + 46, pos + 46 + nameLength));
    expect(view.getUint32(localOffset, true)).toBe(0x04034b50);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const dataStart = localOffset + 30 + localNameLength;
    files.push({ name, data: zip.subarray(dataStart, dataStart + size), crc, flags });
    pos += 46 + nameLength;
  }
  return files;
}

describe('crc32', () => {
  it('khớp giá trị kiểm chuẩn của "123456789"', () => {
    expect(crc32(encode('123456789'))).toBe(0xcbf43926);
  });

  it('dữ liệu rỗng → 0', () => {
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe('createZip', () => {
  it('đọc lại đúng tên tiếng Việt, đúng nội dung và CRC từng file', () => {
    const entries = [
      { name: 'túi-đeo-chéo.jpg', data: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]) },
      { name: 'nhan-kim-vu.png', data: encode('png-bytes') },
    ];

    const files = readZip(createZip(entries, new Date(2026, 9, 8, 10, 30, 0)));

    expect(files.map((f) => f.name)).toEqual(['túi-đeo-chéo.jpg', 'nhan-kim-vu.png']);
    files.forEach((f, i) => {
      expect(Array.from(f.data)).toEqual(Array.from(entries[i].data));
      expect(f.crc).toBe(crc32(entries[i].data));
      expect(f.flags & 0x0800).toBe(0x0800);
    });
  });

  it('lô rỗng vẫn là ZIP hợp lệ (chỉ có bản ghi kết thúc)', () => {
    const zip = createZip([]);
    expect(zip).toHaveLength(22);
    expect(readZip(zip)).toEqual([]);
  });
});
