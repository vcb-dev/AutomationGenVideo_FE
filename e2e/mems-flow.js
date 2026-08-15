/**
 * Bám sát luồng MEMS bằng trình duyệt thật.
 *
 * Vì sao cần: hai lỗi nặng của module này KHÔNG lộ ra ở test đơn vị lẫn ở curl —
 *   1. Màn chi tiết máy dùng `use(params)` (cú pháp Next 15) nên chết lúc hydrate,
 *      trong khi vỏ HTML vẫn trả 200 nên mọi phép kiểm bằng mã trạng thái đều báo đạt.
 *   2. `NEXT_PUBLIC_API_URL` thiếu giá trị mặc định làm mọi trang dashboard ăn một 404 vô hình.
 * Cả hai chỉ hiện ra khi mở bằng trình duyệt và nghe sự kiện `pageerror`.
 *
 * Cách chạy: xem e2e/README.md
 */
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const FE = process.env.E2E_FE_URL || 'http://localhost:3001';
const API = process.env.E2E_API_URL || 'http://localhost:3000/api';
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const TOKEN_ENV = process.env.E2E_TOKEN;
/** Trỏ tới Chromium sẵn có để khỏi tải bản riêng. Bỏ trống thì dùng bản Playwright tự quản. */
const EXE = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

const results = [];
const problems = [];
const log = (screen, step, ok, note = '') => {
  results.push({ screen, step, ok, note });
  console.log(`  ${ok ? '✓' : '✗'} ${screen.padEnd(22)} ${step.padEnd(34)} ${note}`);
};

async function getToken() {
  if (TOKEN_ENV) return TOKEN_ENV;
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      'Cần E2E_TOKEN, hoặc E2E_EMAIL và E2E_PASSWORD của một tài khoản có quyền kho. Xem e2e/README.md',
    );
  }
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Đăng nhập thất bại: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token || data.accessToken || data.token;
}

(async () => {
  const token = await getToken();
  const me = await (await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => ({ json: async () => ({}) }))).json();
  console.log(`  đóng vai ${me?.email || EMAIL || 'tài khoản từ E2E_TOKEN'}\n`);

  const browser = await chromium.launch({ executablePath: EXE });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(
    ([t, u]) => {
      localStorage.setItem('auth_token', t);
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({ state: { token: t, user: u, isAuthenticated: true }, version: 0 }),
      );
    },
    [token, me],
  );

  const page = await ctx.newPage();
  let screen = 'khởi động';

  // Lỗi React lúc hydrate KHÔNG làm đổi mã HTTP — vỏ trang vẫn 200 trong khi màn trắng.
  page.on('pageerror', (e) =>
    problems.push({ screen, kind: 'lỗi React', detail: e.message.slice(0, 140) }),
  );
  page.on('response', (r) => {
    const u = r.url();
    // Bỏ qua module khác, chỉ soi phần thiết bị
    if (/task-auto|social|notifications/.test(u)) return;
    if (r.status() >= 400) {
      problems.push({ screen, kind: `HTTP ${r.status()}`, detail: u.replace(/^https?:\/\/[^/]+/, '').slice(0, 110) });
    }
  });

  const go = async (route, name, waitFor) => {
    screen = name;
    let res;
    // Lần đầu vào một route, dev server phải biên dịch nên có thể mất hàng chục giây;
    // điều hướng đôi khi bị huỷ giữa chừng nên thử lại một lần.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await page.goto(FE + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
        break;
      } catch (e) {
        if (attempt === 1) throw e;
        await page.waitForTimeout(3000);
      }
    }
    await page.waitForLoadState('load').catch(() => {});
    await page.waitForSelector(waitFor || 'h1', { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(1200);

    const body = (await page.textContent('body')) || '';
    const broken = /Application error|Unhandled Runtime Error|Không đọc được|Forbidden/i.exec(body);
    const visible = (await page.locator('h1').count()) > 0;
    const crashed = problems.some((p) => p.screen === name && p.kind === 'lỗi React');
    log(
      name,
      'mở trang',
      res.status() < 400 && !broken && visible && !crashed,
      crashed ? 'TRANG CHẾT lúc hydrate' : broken ? `thấy "${broken[0]}"` : visible ? `HTTP ${res.status()}` : 'không có nội dung',
    );
  };

  // ── Bảng điều khiển ───────────────────────────────────────────────────
  await go('/dashboard/equipment/overview', 'Bảng điều khiển');
  log(
    'Bảng điều khiển',
    'thẻ chỉ số bấm được',
    (await page.locator('a[href*="/dashboard/equipment"]').count()) >= 5,
  );

  // ── Danh sách kho ─────────────────────────────────────────────────────
  await go('/dashboard/equipment', 'Danh sách kho', 'table');
  const rows = await page.locator('tbody tr').count();
  log('Danh sách kho', 'bảng có dữ liệu', rows > 0, `${rows} dòng`);

  const firstCode = (await page.locator('tbody tr td:first-child a').first().textContent()) || '';
  await page.fill('input[placeholder*="Tìm mã"]', firstCode.trim());
  await page.waitForTimeout(500);
  log('Danh sách kho', 'ô tìm kiếm lọc được', (await page.locator('tbody tr').count()) === 1);
  await page.fill('input[placeholder*="Tìm mã"]', '');
  await page.waitForTimeout(400);

  // ── Hộp thoại thêm thiết bị ───────────────────────────────────────────
  await page.click('button:has-text("Thêm thiết bị")');
  await page.waitForTimeout(900);
  log('Thêm thiết bị', 'hộp thoại mở', (await page.locator('text=Thêm thiết bị vào kho').count()) > 0);

  // Neo theo NHÃN: bảng kho phía sau cũng có select và chúng đứng TRƯỚC hộp thoại trong DOM.
  const modelSelect = page.locator('label').filter({ hasText: 'Model' }).locator('select').first();
  log('Thêm thiết bị', 'dropdown model có dữ liệu', (await modelSelect.locator('option').count()) > 2);
  log(
    'Thêm thiết bị',
    'dropdown tình trạng đủ 5 mức',
    (await page.locator('label:has-text("Tình trạng lúc nhập") select option').count()) === 5,
  );

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC',
    'base64',
  );
  const shots = [path.join(os.tmpdir(), 'e2e-1.png'), path.join(os.tmpdir(), 'e2e-2.png')];
  shots.forEach((f) => fs.writeFileSync(f, png));

  const serial = 'E2E-' + Date.now();
  await modelSelect.selectOption({ index: 1 });
  await page.fill('input[placeholder="3821992-F"]', serial);
  await page.locator('label:has-text("Tình trạng lúc nhập") select').selectOption('USED');
  await page.setInputFiles('input[type="file"]', shots);
  await page.waitForTimeout(600);
  log('Thêm thiết bị', 'xem trước ảnh đã chọn', (await page.locator('img[alt$=".png"]').count()) === 2);

  const submit = page.locator('button:has-text("Nhập kho")').last();
  log('Thêm thiết bị', 'nút lưu bật khi đủ dữ liệu', await submit.isEnabled());
  await submit.click({ timeout: 15000 });
  await page.waitForTimeout(6000);
  log('Thêm thiết bị', 'lưu xong và đóng hộp thoại', (await page.locator('text=Thêm thiết bị vào kho').count()) === 0);

  const listed = await (
    await fetch(`${API}/mems/assets`, { headers: { Authorization: `Bearer ${token}` } })
  ).json();
  const created = listed.find((a) => a.serial_number === serial);
  log('Thêm thiết bị', 'máy vào kho', !!created, created ? `${created.asset_code} · ${created.condition}` : 'không thấy');

  // ── Chi tiết máy ──────────────────────────────────────────────────────
  if (created) {
    await go(`/dashboard/equipment/assets/${created.asset_code}`, 'Chi tiết máy', 'text=Ảnh thiết bị');
    await page.waitForSelector('figure img', { timeout: 20000 }).catch(() => {});
    log('Chi tiết máy', 'khối ảnh hiện đủ', (await page.locator('figure img').count()) === 2);
    // naturalWidth chứng minh ảnh tải được thật, không phải khung vỡ
    log(
      'Chi tiết máy',
      'ảnh tải được thật',
      await page.evaluate(() => {
        const im = document.querySelector('figure img');
        return im ? im.naturalWidth > 0 : false;
      }),
    );
    log('Chi tiết máy', 'nhật ký có mốc nhập kho', (await page.locator('text=Nhập kho').count()) > 0);
  }

  // ── Bốn màn nghiệp vụ ─────────────────────────────────────────────────
  await go('/dashboard/equipment/approvals', 'Duyệt phiếu', 'text=Duyệt phiếu mượn');
  const pendingBtn = page.locator('button:has-text("cấp")').first();
  if (await pendingBtn.count()) {
    await pendingBtn.click();
    await page.waitForTimeout(2500);
    log(
      'Duyệt phiếu',
      'nút Duyệt / Từ chối / ô lý do',
      (await page.locator('button').filter({ hasText: /^Duyệt$/ }).count()) > 0 &&
        (await page.locator('button:has-text("Từ chối")').count()) > 0 &&
        (await page.locator('textarea[placeholder*="lý do"]').count()) > 0,
    );
  }

  await go('/dashboard/equipment/prepare', 'Gán serial', 'text=Chuẩn bị và gán serial');
  await go('/dashboard/equipment/handover', 'Bàn giao', 'text=Bàn giao thiết bị');
  await go('/dashboard/equipment/returns', 'Trả và kiểm tra', 'text=Trả và kiểm tra');

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n  KẾT QUẢ: ${results.length - failed.length}/${results.length} bước đạt`);
  failed.forEach((f) => console.log(`    ✗ ${f.screen} — ${f.step} ${f.note}`));

  const unique = [...new Map(problems.map((p) => [p.kind + p.detail, p])).values()];
  if (unique.length) {
    console.log(`\n  LỖI TRONG TRÌNH DUYỆT (${unique.length}):`);
    unique.forEach((p) => console.log(`    [${p.screen}] ${p.kind}: ${p.detail}`));
  } else {
    console.log('\n  Không có lỗi console hay request hỏng nào.');
  }

  if (created) {
    console.log(
      `\n  Còn lại trong kho: ${created.asset_code} (serial ${serial}). API không cho xoá cứng` +
        ' thiết bị đã có nhật ký — xoá tay nếu không muốn giữ.',
    );
  }
  process.exit(failed.length || unique.length ? 1 : 0);
})().catch((e) => {
  console.error('  LỖI CHẠY: ' + e.message);
  process.exit(1);
});
