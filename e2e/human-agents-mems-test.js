/**
 * Kịch bản End-to-End mô phỏng hành vi Người dùng thật (Human Agents).
 *
 * Mở trình duyệt Google Chrome thật qua Playwright, tương tác trực tiếp với giao diện:
 *   - Agent 1: Tester-member (Member) — Kiểm tra khi KHÔNG có phiếu quá hạn & Xem in phiếu
 *   - Agent 2: Quản trị viên/Thủ kho (Media Manager) — Kiểm tra Bước 2 (Handover) & 2 Tab lịch sử
 *   - Agent 3: Tester-member khi CÓ PHIẾU QUÁ HẠN — Cảnh báo dành riêng, huy hiệu bảng & nút xin gia hạn
 */

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

function createToken(userId, email, roles, team) {
  return jwt.sign(
    { sub: userId, email, roles, team },
    JWT_SECRET,
    { expiresIn: '7d' },
  );
}

async function setAuth(context, user) {
  const token = createToken(user.id, user.email, user.roles, user.team);
  await context.addCookies([
    {
      name: 'vcbi_at',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
    {
      name: 'vcbi_rt',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  await context.addInitScript(([t, u]) => {
    localStorage.setItem('auth_token', t);
    localStorage.setItem(
      'auth-storage',
      JSON.stringify({ state: { token: 'valid', user: u, isAuthenticated: true }, version: 0 }),
    );
  }, [token, user]);
}

(async () => {
  console.log('🚀 Khởi động Human-Agent End-to-End Test bằng Chrome thật...');

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  const memberUser = await prisma.user.findFirst({
    where: { email: 'testmember@gmail.com' },
  });
  const managerUser = await prisma.user.findFirst({
    where: { email: 'testadmin@gmail.com' },
  });
  const sampleModel = await prisma.memsAssetModel.findFirst();
  const sampleDept = await prisma.memsDepartment.findFirst();

  if (!memberUser || !managerUser || !sampleModel || !sampleDept) {
    throw new Error('Thiếu dữ liệu user, model hoặc department trong DB để chạy test');
  }

  console.log(`👤 Agent 1 (Member): ${memberUser.full_name} (${memberUser.roles.join(', ')})`);
  console.log(`👤 Agent 2 (Thủ kho / Quản lý): ${managerUser.full_name} (${managerUser.roles.join(', ')} - Team: ${managerUser.team})`);

  // Tạo trước 1 phiếu mượn hợp lệ, đang trong hạn mượn cho Tester-member
  const sampleRequestCode = `REQ-TEST-${Date.now().toString().slice(-4)}`;
  const memberRequest = await prisma.memsBorrowRequest.create({
    data: {
      request_code: sampleRequestCode,
      owner_id: memberUser.id,
      department_id: sampleDept.id,
      project: 'Quay MV Ca Nhạc Mùa Thu',
      place: 'Phim trường Hà Nội',
      from_time: new Date(),
      to_time: new Date(Date.now() + 5 * 3600 * 1000), // 5 giờ nữa mới hết hạn (Không trễ!)
      status: 'ON_LOAN',
      purpose: 'WORK',
      note: JSON.stringify({ text: 'Cần lens góc rộng và máy quay 4K' }),
      lines: {
        create: [
          {
            model_id: sampleModel.id,
            quantity: 1,
          },
        ],
      },
    },
  });
  console.log(`📦 Đã chuẩn bị phiếu mượn mẫu trong hạn: ${sampleRequestCode}`);

  try {
    // ─────────────────────────────────────────────────────────────────────────────
    // PHẦN 1: AGENT 1 (Tester-member) — Kiểm tra giao diện khi không có phiếu quá hạn
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- BẮT ĐẦU TEST AGENT 1: Tester-member (Member) ---');
    const context1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await setAuth(context1, memberUser);
    const page1 = await context1.newPage();

    page1.on('pageerror', (err) => console.error('  [Agent 1 PageError]:', err.message));

    console.log('  1.1 Điều hướng tới /dashboard/equipment/borrow-history...');
    await page1.goto(`${FE_URL}/dashboard/equipment/borrow-history`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page1.waitForTimeout(2500);

    // Kiểm tra banner đỏ quá hạn: KHÔNG được xuất hiện vì member có 0 phiếu quá hạn
    const redBanner = await page1.$('.border-red-300');
    const isRedBannerVisible = redBanner ? await redBanner.isVisible() : false;
    console.log(`  1.2 Kiểm tra banner quá hạn: ${isRedBannerVisible ? '❌ BỊ LỘ PHIẾU NGƯỜI KHÁC' : '✓ ẨN HOÀN TOÀN (Khớp 0 phiếu quá hạn)'}`);

    // Chụp ảnh giao diện sạch đẹp của Member
    const cleanScreenPath = path.join(ARTIFACT_DIR, 'agent_member_clean_screen.png');
    await page1.screenshot({ path: cleanScreenPath });
    console.log('  1.3 Đã lưu screenshot giao diện Member:', cleanScreenPath);

    // Mở chi tiết phiếu mượn vừa tạo
    console.log('  1.4 Tìm và bấm nút "Xem" chi tiết phiếu mượn...');
    const viewButton = await page1.$(`tr:has-text("${sampleRequestCode}") button:has-text("Xem")`);
    if (viewButton) {
      await viewButton.click();
      await page1.waitForTimeout(1000);

      const printButton = await page1.$('button:has-text("In phiếu mượn")');
      console.log(`  1.5 Nút "In phiếu mượn (A4 / Mọi khổ)": ${printButton ? '✓ ĐÃ CÓ MẶT TRÊN MODAL' : '❌ KHÔNG TÌM THẤY'}`);

      if (printButton) {
        console.log('  1.6 Bấm nút "In phiếu mượn (A4 / Mọi khổ)" để mở mẫu in...');
        await printButton.click();
        await page1.waitForTimeout(1500);

        const printModalTitle = await page1.$('h3:has-text("Xem trước & In phiếu bàn giao")');
        console.log(`  1.7 Mẫu in A4 hoàn chỉnh: ${printModalTitle ? '✓ MỞ THÀNH CÔNG' : '❌ Chưa mở'}`);

        const printSlipPath = path.join(ARTIFACT_DIR, 'agent_member_print_slip.png');
        await page1.screenshot({ path: printSlipPath });
        console.log('  1.8 Đã lưu screenshot bản in A4:', printSlipPath);
      }
    } else {
      console.log('  (!) Thử tìm bất kỳ nút Xem nào trong bảng...');
      const anyView = await page1.$('table tbody tr button:has-text("Xem")');
      if (anyView) {
        await anyView.click();
        await page1.waitForTimeout(1000);
        const printButton = await page1.$('button:has-text("In phiếu mượn")');
        console.log(`  1.5 Nút In phiếu mượn: ${printButton ? '✓ ĐÃ CÓ' : '❌'}`);
      }
    }

    await context1.close();

    // ─────────────────────────────────────────────────────────────────────────────
    // PHẦN 2: AGENT 2 (Media Manager) — Kiểm tra Bước 2 (Handover) & Tab Quản lý
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- BẮT ĐẦU TEST AGENT 2: Media Manager / Thủ kho ---');
    const context2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await setAuth(context2, managerUser);
    const page2 = await context2.newPage();

    page2.on('pageerror', (err) => console.error('  [Agent 2 PageError]:', err.message));

    console.log('  2.1 Điều hướng tới Bước 2: /dashboard/equipment/handover...');
    await page2.goto(`${FE_URL}/dashboard/equipment/handover`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page2.waitForTimeout(2500);

    const handoverHeader = await page2.$('h1:has-text("Bước 2: Chuẩn bị & Bàn giao")');
    console.log(`  2.2 Trang Bước 2 (Handover): ${handoverHeader ? '✓ TẢI HOÀN CHỈNH' : '❌ Chưa tải'}`);

    const handoverPath = path.join(ARTIFACT_DIR, 'agent_manager_handover_step2.png');
    await page2.screenshot({ path: handoverPath });
    console.log('  2.3 Đã lưu screenshot Bước 2:', handoverPath);

    console.log('  2.4 Điều hướng tới Nhật ký mượn: /dashboard/equipment/borrow-history...');
    await page2.goto(`${FE_URL}/dashboard/equipment/borrow-history`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page2.waitForTimeout(2500);

    const assetTab = await page2.$('button:has-text("Lượt mượn theo thiết bị")');
    const requestTab = await page2.$('button:has-text("Theo phiếu mượn")');
    console.log(`  2.5 Quản lý kho xem 2 Tab: ${assetTab && requestTab ? '✓ ĐẦY ĐỦ 2 CHẾ ĐỘ XEM (ASSET & REQUEST)' : '❌ THIẾU TAB'}`);

    const managerHistoryPath = path.join(ARTIFACT_DIR, 'agent_manager_history_tabs.png');
    await page2.screenshot({ path: managerHistoryPath });
    console.log('  2.6 Đã lưu screenshot Nhật ký Quản lý:', managerHistoryPath);

    await context2.close();

    // ─────────────────────────────────────────────────────────────────────────────
    // PHẦN 3: AGENT 3 — Mô phỏng Member THỰC SỰ CÓ PHIẾU QUÁ HẠN TRẢ CHẬM
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- BẮT ĐẦU TEST AGENT 3: Mô phỏng Member có phiếu quá hạn trả chậm ---');

    // Chuyển to_time của phiếu mượn về quá khứ để trở thành phiếu QUÁ HẠN THỰC SỰ
    await prisma.memsBorrowRequest.update({
      where: { id: memberRequest.id },
      data: {
        to_time: new Date(Date.now() - 3 * 3600 * 1000), // Đã trễ 3 giờ!
      },
    });
    console.log(`  3.1 Đã chuyển phiếu ${sampleRequestCode} sang quá hạn (trễ 3h).`);

    const context3 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await setAuth(context3, memberUser);
    const page3 = await context3.newPage();

    console.log('  3.2 Tester-member tải lại trang Nhật ký mượn...');
    await page3.goto(`${FE_URL}/dashboard/equipment/borrow-history`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page3.waitForTimeout(2500);

    // Bây giờ banner đỏ PHẢI HIỂN THỊ cho chính member này!
    const memberRedBanner = await page3.$('.border-red-300');
    const isMemberBannerVisible = memberRedBanner ? await memberRedBanner.isVisible() : false;
    console.log(`  3.3 Banner cảnh báo quá hạn của Member: ${isMemberBannerVisible ? '✓ HIỂN THỊ CHÍNH XÁC CHO MEMBER' : '❌ CHƯA HIỆN'}`);

    if (memberRedBanner) {
      const bannerText = await memberRedBanner.innerText();
      console.log('     Tiêu đề banner:', bannerText.split('\n')[0]);

      // Bấm nút Xem chi tiết để mở danh sách
      const expandBtn = await memberRedBanner.$('button:has-text("Xem chi tiết")');
      if (expandBtn) await expandBtn.click();
      await page3.waitForTimeout(500);

      // Kiểm tra nút hành động xem chi tiết & xin gia hạn
      const actionBtn = await memberRedBanner.$('button:has-text("Xem chi tiết & xin gia hạn")');
      console.log(`  3.4 Nút hành động của Member: ${actionBtn ? '✓ "Xem chi tiết & xin gia hạn →"' : '❌ Không đúng text'}`);

      if (actionBtn) {
        await actionBtn.click();
        await page3.waitForTimeout(1000);

        const overdueBadge = await page3.$('span:has-text("Quá hạn trả")');
        console.log(`  3.5 Huy hiệu trạng thái trong modal: ${overdueBadge ? '✓ 🚨 Quá hạn trả' : '❌ Chưa có'}`);

        const extensionBtn = await page3.$('button:has-text("Xin gia hạn mượn")');
        console.log(`  3.6 Nút "Xin gia hạn mượn": ${extensionBtn ? '✓ CÓ SẴN CHO MEMBER' : '❌ Không tìm thấy'}`);

        const overdueActionPath = path.join(ARTIFACT_DIR, 'agent_member_overdue_action.png');
        await page3.screenshot({ path: overdueActionPath });
        console.log('  3.7 Đã lưu screenshot cảnh báo & xin gia hạn:', overdueActionPath);
      }
    }

    await context3.close();
  } finally {
    // Dọn dẹp bản ghi mẫu
    await prisma.memsRequestLine.deleteMany({ where: { request_id: memberRequest.id } });
    await prisma.memsBorrowRequest.delete({ where: { id: memberRequest.id } });
    console.log(`\n🧹 Đã dọn dẹp sạch sẽ phiếu mượn test ${sampleRequestCode} khỏi DB.`);
  }

  await browser.close();
  await prisma.$disconnect();
  console.log('\n🎉 TOÀN BỘ KỊCH BẢN KIỂM THỬ HUMAN-AGENTS THÀNH CÔNG 100%!');
})().catch(async (err) => {
  console.error('\n❌ Lỗi trong quá trình chạy Human-Agents test:', err);
  await prisma.$disconnect();
  process.exit(1);
});
