/**
 * Thư viện xlsx / jsPDF chỉ cần khi người dùng bấm nhập hoặc xuất file, nên được nạp
 * theo yêu cầu từ /public/vendor/lucky-spin thay vì đóng gói vào bundle của trang.
 */

const BASE = '/vendor/lucky-spin';
const loading = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const cached = loading.get(src);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-lucky-spin="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.luckySpin = src;
    script.onload = () => resolve();
    script.onerror = () => {
      loading.delete(src);
      script.remove();
      reject(new Error(`Không tải được thư viện: ${src}`));
    };
    document.body.appendChild(script);
  });

  loading.set(src, promise);
  return promise;
}

export async function loadXlsx(): Promise<any> {
  await loadScript(`${BASE}/xlsx.full.min.js`);
  const XLSX = (window as any).XLSX;
  if (!XLSX) throw new Error('Không khởi tạo được thư viện Excel.');
  return XLSX;
}

/** Trả về jsPDF kèm font Roboto để tiêu đề và dữ liệu tiếng Việt không bị mất dấu. */
export async function loadPdf(): Promise<{ jsPDF: any; robotoBase64: string }> {
  await loadScript(`${BASE}/jspdf.umd.min.js`);
  await loadScript(`${BASE}/jspdf.plugin.autotable.min.js`);
  await loadScript(`${BASE}/roboto-font.js`);
  const jsPDF = (window as any).jspdf?.jsPDF;
  const robotoBase64 = (window as any).ROBOTO_FONT_BASE64;
  if (!jsPDF || !robotoBase64) throw new Error('Không khởi tạo được thư viện PDF.');
  return { jsPDF, robotoBase64 };
}
