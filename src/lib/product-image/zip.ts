/**
 * Đóng nhiều ảnh thành một file ZIP để tải cả lô về một lần (tab Tạo hàng loạt).
 *
 * Chỉ "lưu" (STORE), không nén: JPEG/PNG vốn đã nén, nén thêm không nhỏ đi mà tốn CPU — nên tự viết
 * mấy chục dòng theo đặc tả ZIP thay vì thêm thư viện. Tên file UTF-8 (cờ bit 11). Không hỗ trợ
 * ZIP64 — đủ cho vài trăm ảnh, xa mốc 4GB.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Ngày giờ kiểu MS-DOS mà ZIP dùng (giờ máy, chính xác tới 2 giây). */
function dosDateTime(date: Date): { time: number; date: number } {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: (Math.max(0, date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

const UTF8_FLAG = 0x0800;

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

export function createZip(entries: readonly ZipEntry[], modifiedAt: Date = new Date()): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(modifiedAt);
  const files = entries.map((entry) => ({ name: encoder.encode(entry.name), data: entry.data, crc: crc32(entry.data) }));

  const localSize = files.reduce((sum, f) => sum + 30 + f.name.length + f.data.length, 0);
  const centralSize = files.reduce((sum, f) => sum + 46 + f.name.length, 0);
  const out = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(out.buffer);
  let pos = 0;
  const u16 = (value: number) => {
    view.setUint16(pos, value, true);
    pos += 2;
  };
  const u32 = (value: number) => {
    view.setUint32(pos, value >>> 0, true);
    pos += 4;
  };
  const bytes = (value: Uint8Array) => {
    out.set(value, pos);
    pos += value.length;
  };

  const offsets: number[] = [];
  for (const f of files) {
    offsets.push(pos);
    u32(0x04034b50); // local file header
    u16(20); // version needed
    u16(UTF8_FLAG);
    u16(0); // STORE
    u16(time);
    u16(date);
    u32(f.crc);
    u32(f.data.length); // compressed size
    u32(f.data.length); // uncompressed size
    u16(f.name.length);
    u16(0); // extra length
    bytes(f.name);
    bytes(f.data);
  }

  const centralStart = pos;
  files.forEach((f, i) => {
    u32(0x02014b50); // central directory header
    u16(20); // version made by
    u16(20); // version needed
    u16(UTF8_FLAG);
    u16(0);
    u16(time);
    u16(date);
    u32(f.crc);
    u32(f.data.length);
    u32(f.data.length);
    u16(f.name.length);
    u16(0); // extra
    u16(0); // comment
    u16(0); // disk number
    u16(0); // internal attributes
    u32(0); // external attributes
    u32(offsets[i]);
    bytes(f.name);
  });

  const centralLength = pos - centralStart;
  u32(0x06054b50); // end of central directory
  u16(0);
  u16(0);
  u16(files.length);
  u16(files.length);
  u32(centralLength);
  u32(centralStart);
  u16(0); // comment length
  return out;
}
