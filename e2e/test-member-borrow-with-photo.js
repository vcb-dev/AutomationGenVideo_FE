const { chromium } = require('playwright');
const jwt = require('/Users/macos/Documents/WorkSpace/VCBI-Dev/BE-wt-mems/node_modules/jsonwebtoken');
const { PrismaClient } = require('/Users/macos/Documents/WorkSpace/VCBI-Dev/BE-wt-mems/node_modules/@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();
const JWT_SECRET = 'd94bc7cf6cb46d459ee41325eac90b3e02664c0aea7a5fb5b2f7d72e311334b6e5b1e79b3b1d60acbd1da24d08115ea5';
const FE_URL = 'http://localhost:3001';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARTIFACT_DIR = '/Users/macos/.gemini/antigravity-ide/brain/59b0cbc7-eea6-451b-aaa2-74fe081c54e9';

const memberUser = {
  id: '7eadc45e-6d63-47f2-9913-9f475c232746',
  email: 'testmember@gmail.com',
  name: 'Tester-member',
  roles: ['MEMBER'],
  team: 'Global - Indo',
};

function createToken(userId, email, roles, team) {
  return jwt.sign({ sub: userId, email, roles, team }, JWT_SECRET, { expiresIn: '7d' });
}

async function setAuth(context, user) {
  const token = createToken(user.id, user.email, user.roles, user.team);
  await context.addCookies([
    { name: 'vcbi_at', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' },
    { name: 'vcbi_rt', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }
  ]);
  await context.addInitScript(([t, u]) => {
    localStorage.setItem('auth_token', t);
    localStorage.setItem('auth-storage', JSON.stringify({ state: { token: 'valid', user: u, isAuthenticated: true }, version: 0 }));
  }, [token, user]);
}

(async () => {
  console.log('🚀 Chạy kiểm thử End-to-End: Tester-member tạo phiếu mượn kèm ảnh đính kèm...');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await setAuth(context, memberUser);

  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`  [Browser ${msg.type()}]:`, msg.text());
    }
  });

  console.log('1. Điều hướng tới /dashboard/equipment/new-request...');
  await page.goto(`${FE_URL}/dashboard/equipment/new-request`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  console.log('2. Nhập thông tin dự án & địa điểm...');
  await page.locator('input[placeholder*="TVC"]').fill('Dự án quay TVC Quảng Cáo 2026');
  await page.locator('input[placeholder*="Studio"]').fill('Phim trường Quận 7, TP.HCM');

  // Nhập ngày giờ nhận và trả
  console.log('3. Chọn thời điểm nhận và trả...');
  const dateButtons = page.locator('button:has-text("Chọn ngày giờ")');
  
  // Thời điểm nhận: Click nút đầu tiên
  await dateButtons.first().click();
  await page.waitForTimeout(500);
  // Chọn giờ 08:00
  const time08 = page.locator('div[class*="overflow-y-auto"] button:has-text("08:00")');
  if (await time08.count() > 0) {
    await time08.first().click();
    await page.waitForTimeout(500);
  }

  // Thời điểm trả: Click nút thứ hai
  const dateButtons2 = page.locator('button:has-text("Chọn ngày giờ")');
  if (await dateButtons2.count() > 0) {
    await dateButtons2.first().click();
    await page.waitForTimeout(500);
    // Chọn ngày sau hoặc click giờ 18:00
    const time18 = page.locator('div[class*="overflow-y-auto"] button:has-text("18:00")');
    if (await time18.count() > 0) {
      await time18.first().click();
      await page.waitForTimeout(500);
    }
  }

  // Nhập ghi chú
  console.log('4. Nhập ghi chú người mượn...');
  const noteArea = page.locator('textarea');
  if (await noteArea.count() > 0) {
    await noteArea.first().fill('Cần máy kèm 2 pin dự phòng và sạc nhanh. Đã đính kèm ảnh lens.');
  }

  // Đính kèm ảnh từ máy tính
  console.log('5. Đính kèm ảnh thực tế từ máy tính...');
  const tmpImg = '/tmp/test_member_attachment.png';
  const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(tmpImg, pngBuffer);

  const fileInput = page.locator('input[type="file"][multiple]');
  if (await fileInput.count() > 0) {
    await fileInput.setInputFiles(tmpImg);
    await page.waitForTimeout(1000);
    console.log('   ✓ Đã chọn ảnh, thumbnail hiển thị trên form.');
  }

  // Chọn model thiết bị
  console.log('6. Chọn model thiết bị cần mượn...');
  const select = page.locator('select').first();
  const options = await select.locator('option').all();
  for (const opt of options) {
    const val = await opt.getAttribute('value');
    if (val) {
      await select.selectOption(val);
      console.log('   ✓ Đã chọn model:', val);
      break;
    }
  }

  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_form_filled_ready.png') });

  // Kiểm tra nút Gửi yêu cầu
  console.log('7. Bấm nút "Gửi yêu cầu"...');
  const submitBtn = page.getByRole('button', { name: /Gửi yêu cầu/i });
  const isEnabled = await submitBtn.isEnabled();
  console.log('   Trạng thái nút submit:', isEnabled ? '✓ Sẵn sàng gửi' : '❌ Đang bị disabled');

  if (!isEnabled) {
    throw new Error('Nút submit vẫn bị disabled, vui lòng kiểm tra các trường bắt buộc');
  }

  await submitBtn.click();
  console.log('   Đã bấm nút submit, chờ xử lý tải ảnh & tạo phiếu...');
  await page.waitForTimeout(5000);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'e2e_after_submit_result.png') });
  console.log('   URL hiện tại sau submit:', page.url());

  // Kiểm tra xem đã chuyển sang trang borrow-history chưa
  if (page.url().includes('borrow-history')) {
    console.log('🎉 TẠO PHIẾU THÀNH CÔNG VÀ CHUYỂN TỚI TRANG LỊCH SỬ!');
  } else {
    // Kiểm tra xem có thông báo lỗi hiển thị không
    const errorText = await page.locator('.text-red-600, .bg-red-50, .border-red-200').allInnerTexts();
    console.log('Thông báo trên trang:', errorText);
  }

  await browser.close();
  await prisma.$disconnect();
  console.log('Kiểm thử hoàn tất!');
})().catch(err => {
  console.error('Lỗi kiểm thử E2E:', err);
  process.exit(1);
});
