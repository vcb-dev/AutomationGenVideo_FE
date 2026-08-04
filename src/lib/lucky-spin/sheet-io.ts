import { loadPdf, loadXlsx } from '@/lib/lucky-spin/vendor-scripts';

export type SheetRow = Record<string, unknown>;

/* ------------------------------- Nhập dữ liệu ------------------------------- */

/** Đọc sheet đầu tiên của file .xlsx/.xls; ô trống trả về chuỗi rỗng thay vì bị bỏ khỏi object. */
export async function readRowsFromExcel(file: File): Promise<SheetRow[]> {
  const XLSX = await loadXlsx();
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' }) as SheetRow[];
}

/** Tìm cột theo tên tiêu đề, chấp nhận nhiều biến thể có dấu / không dấu / tiếng Anh. */
export function findColumn(rows: SheetRow[], candidates: string[]): string | undefined {
  if (rows.length === 0) return undefined;
  return Object.keys(rows[0]).find((k) => candidates.includes(String(k).trim().toLowerCase()));
}

/* ------------------------------- Xuất dữ liệu ------------------------------- */

export async function exportRowsToExcel(rows: Record<string, string>[], sheetName: string, fileName: string) {
  const XLSX = await loadXlsx();
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

export async function exportTableToPdf(options: {
  title: string;
  head: string[];
  body: string[][];
  headFillColor: [number, number, number];
  fileName: string;
}) {
  const { jsPDF, robotoBase64 } = await loadPdf();
  const doc = new jsPDF();
  doc.addFileToVFS('Roboto-Regular.ttf', robotoBase64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.setFont('Roboto');
  doc.setFontSize(14);
  doc.text(options.title, 14, 16);
  doc.autoTable({
    startY: 22,
    head: [options.head],
    body: options.body,
    styles: { font: 'Roboto', fontSize: 10 },
    headStyles: { font: 'Roboto', fontStyle: 'normal', fillColor: options.headFillColor },
  });
  doc.save(options.fileName);
}
