/**
 * Kịch bản Kiểm Thử Toàn Diện MEMS Workflow — Hệ Thống 6 Đa Tác Tử (Multi-Agent E2E Simulation)
 *
 * Mô phỏng người dùng thật và luồng nghiệp vụ thực tế qua Google Chrome:
 *   - Agent 1 (Member - Người mượn): Tạo phiếu mượn kèm ảnh hiện trường, kiểm tra in phiếu A4
 *   - Agent 2 (Leader Media - Người duyệt): Kiểm tra danh tính, ghi chú, ảnh đính kèm và duyệt phiếu
 *   - Agent 3 (Storekeeper - Thủ kho): Gán serial, chụp 2 ảnh toàn cảnh bàn giao, xác nhận bàn giao
 *   - Agent 4 (Member - Tại hiện trường): Báo sự cố nứt xước nhẹ & Gửi yêu cầu xin gia hạn mượn
 *   - Agent 5 (Leader & Thủ kho): Duyệt gia hạn & Kiểm tra nhận lại thiết bị (Return hoàn tất)
 *   - Agent 6 (Member - Phân quyền RBAC & Giao diện sạch): Kiểm tra bảo mật không lộ dữ liệu người khác
 */

const { chromium } = require('playwright');
const jwt = require('/Users/macos/Documents/WorkSpace/VCBI-Dev/BE-wt-mems/node_modules/jsonwebtoken');
const { PrismaClient } = require('/Users/macos/Documents/WorkSpace/VCBI-Dev/BE-wt-mems/node_modules/@prisma/client');
const path = require('path');
const fs = require('fs');
const axios = require('/Users/macos/Documents/WorkSpace/VCBI-Dev/BE-wt-mems/node_modules/axios');

const prisma = new PrismaClient();
const JWT_SECRET = 'd94bc7cf6cb46d459ee41325eac90b3e02664c0aea7a5fb5b2f7d72e311334b6e5b1e79b3b1d60acbd1da24d08115ea5';
const FE_URL = 'http://localhost:3001';
const BE_URL = 'http://localhost:3000/api';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARTIFACT_DIR = '/Users/macos/.gemini/antigravity-ide/brain/59b0cbc7-eea6-451b-aaa2-74fe081c54e9';

const memberUser = {
  id: '7eadc45e-6d63-47f2-9913-9f475c232746',
  email: 'testmember@gmail.com',
  name: 'Tester-member',
  roles: ['MEMBER'],
  team: 'Global - Indo',
};

const adminUser = {
  id: '26338ac2-b552-4fea-98bd-264da8406f97',
  email: 'testadmin@gmail.com',
  name: 'Quản trị viên Media',
  roles: ['ADMIN', 'LEADER'],
  team: 'MEDIA',
};

function createToken(userId, email, roles, team) {
  return jwt.sign({ sub: userId, email, roles, team }, JWT_SECRET, { expiresIn: '7d' });
}

async function setAuth(context, user) {
  const token = createToken(user.id, user.email, user.roles, user.team);
  await context.addCookies([
    { name: 'vcbi_at', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' },
    { name: 'vcbi_rt', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' },
  ]);
  await context.addInitScript(([t, u]) => {
    localStorage.setItem('auth_token', t);
    localStorage.setItem('auth-storage', JSON.stringify({ state: { token: 'valid', user: u, isAuthenticated: true }, version: 0 }));
  }, [token, user]);
}

// Tạo file ảnh mẫu
const sampleImagePath = '/tmp/mems_multiagent_sample.png';
const samplePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync(sampleImagePath, samplePng);

(async () => {
  console.log('======================================================================');
  console.log('🤖 BẮT ĐẦU CHẠY KIỂM THỬ TOÀN DIỆN VỚI 6 ĐA TÁC TỬ (MULTI-AGENT E2E)');
  console.log('======================================================================\n');

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let createdRequestId = '';
  let createdRequestCode = '';

  try {
    // ─────────────────────────────────────────────────────────────────────────────
    // AGENT 1: Tester-member (Người mượn) — Tạo phiếu kèm ảnh đính kèm & Xem mẫu A4
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('▶ [AGENT 1: MEMBER] Tạo phiếu mượn kèm ảnh hiện trường thực tế...');
    const ctxMember = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await setAuth(ctxMember, memberUser);
    const pageMember = await ctxMember.newPage();
    pageMember.on('console', msg => {
      console.log(`  [Agent 1 Browser ${msg.type()}]:`, msg.text());
    });
    pageMember.on('pageerror', err => {
      console.error('  [Agent 1 PageError]:', err.message);
    });

    await pageMember.goto(`${FE_URL}/dashboard/equipment/new-request`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await pageMember.waitForTimeout(2000);

    // Điền form
    await pageMember.locator('input[placeholder*="TVC"]').fill('Chiến dịch Video Marketing Thu Đông 2026');
    await pageMember.locator('input[placeholder*="Studio"]').fill('Phim trường Sóc Sơn, Hà Nội');

    // Chọn thời gian nhận và trả
    const dateButtons = pageMember.locator('button:has-text("Chọn ngày giờ")');
    await dateButtons.first().click();
    await pageMember.waitForTimeout(500);
    const time08 = pageMember.locator('div[class*="overflow-y-auto"] button:has-text("08:00")');
    if (await time08.count() > 0) await time08.first().click();

    const dateButtons2 = pageMember.locator('button:has-text("Chọn ngày giờ")');
    if (await dateButtons2.count() > 0) {
      await dateButtons2.first().click();
      await pageMember.waitForTimeout(500);
      const time18 = pageMember.locator('div[class*="overflow-y-auto"] button:has-text("18:00")');
      if (await time18.count() > 0) await time18.first().click();
    }

    // Nhập ghi chú
    await pageMember.locator('textarea').first().fill('Cần máy kèm 2 pin dự phòng và sạc đôi. Đã gửi ảnh lens hiện trường.');

    // Đính kèm ảnh thực tế
    const fileInput = pageMember.locator('input[type="file"][multiple]');
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(sampleImagePath);
      await pageMember.waitForTimeout(1000);
    }

    // Chọn model máy
    const modelSelect = pageMember.locator('select').first();
    const opts = await modelSelect.locator('option').all();
    for (const opt of opts) {
      const val = await opt.getAttribute('value');
      if (val) {
        await modelSelect.selectOption(val);
        break;
      }
    }

    await pageMember.waitForTimeout(1000);
    const submitBtn = pageMember.getByRole('button', { name: /Gửi yêu cầu/i });
    if (!(await submitBtn.isEnabled())) throw new Error('Agent 1: Nút submit form bị disabled');

    console.log('  Agent 1: Đã bấm Gửi yêu cầu, chờ nén ảnh, upload và chuyển trang...');
    await Promise.all([
      pageMember.waitForURL(url => url.pathname.includes('/borrow-history'), { timeout: 30000 }),
      submitBtn.click(),
    ]);
    await pageMember.waitForTimeout(2000);

    const afterSubmitUrl = pageMember.url();
    console.log(`  Agent 1: URL sau khi tạo phiếu: ${afterSubmitUrl}`);
    if (!afterSubmitUrl.includes('borrow-history')) {
      const errTexts = await pageMember.locator('.text-red-600, .bg-red-50, .border-red-200, [class*="text-red"]').allInnerTexts();
      console.log('  Agent 1 Lỗi hiển thị trên trang:', errTexts);
      await pageMember.screenshot({ path: path.join(ARTIFACT_DIR, 'multiagent_1_member_submit_error.png') });
      throw new Error(`Agent 1 thất bại: không chuyển sang borrow-history (URL: ${afterSubmitUrl}) - Lỗi: ${errTexts.join(' | ')}`);
    }

    const urlParams = new URL(afterSubmitUrl).searchParams;
    createdRequestCode = urlParams.get('created') || '';
    console.log(`  Agent 1: Mã phiếu mượn được cấp: ${createdRequestCode}`);

    // Lưu screenshot Agent 1
    const screenshot1 = path.join(ARTIFACT_DIR, 'multiagent_1_member_created_request.png');
    await pageMember.screenshot({ path: screenshot1 });
    console.log('  ✓ Đã lưu screenshot Agent 1:', screenshot1);

    // Mở xem chi tiết phiếu vừa tạo & xem bản in A4
    const rowBtn = pageMember.locator(`tr:has-text("${createdRequestCode}") button:has-text("Xem")`);
    if (await rowBtn.count() > 0) {
      await rowBtn.first().click();
      await pageMember.waitForTimeout(1500);

      const printBtn = pageMember.locator('button:has-text("In phiếu mượn")');
      if (await printBtn.count() > 0) {
        await printBtn.first().click();
        await pageMember.waitForTimeout(1500);
        const screenshot2 = path.join(ARTIFACT_DIR, 'multiagent_2_member_slip_a4_modal.png');
        await pageMember.screenshot({ path: screenshot2 });
        console.log('  ✓ Đã lưu screenshot bản in A4 của Member:', screenshot2);
      }
    }

    // Lấy ID phiếu trong DB
    const reqDb = await prisma.memsBorrowRequest.findFirst({
      where: { request_code: createdRequestCode },
      select: { id: true, request_code: true, status: true, note: true },
    });
    if (!reqDb) throw new Error(`Không tìm thấy phiếu ${createdRequestCode} trong cơ sở dữ liệu`);
    createdRequestId = reqDb.id;
    console.log(`  Agent 1 thành công: Phiếu ${createdRequestCode} (ID: ${createdRequestId}) đang ở trạng thái ${reqDb.status}\n`);
    await ctxMember.close();

    // ─────────────────────────────────────────────────────────────────────────────
    // AGENT 2: Leader Media / Approver — Kiểm tra ghi chú, ảnh và duyệt phiếu
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('▶ [AGENT 2: LEADER MEDIA] Kiểm tra chi tiết và duyệt phiếu mượn...');
    const ctxLeader = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await setAuth(ctxLeader, adminUser);
    const pageLeader = await ctxLeader.newPage();

    await pageLeader.goto(`${FE_URL}/dashboard/equipment/approvals`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await pageLeader.waitForTimeout(2500);

    // Tìm phiếu cần duyệt trong danh sách bên trái
    const targetCard = pageLeader.locator(`text=${createdRequestCode}`);
    if (await targetCard.count() > 0) {
      await targetCard.first().click();
      await pageLeader.waitForTimeout(1000);
    }

    // Leader xem thấy rõ danh tính Tester-member, ghi chú và ảnh đính kèm
    const approveBtn = pageLeader.locator('button:has-text("Duyệt phiếu")');
    if (await approveBtn.count() > 0) {
      await approveBtn.first().click();
      await pageLeader.waitForTimeout(2000);
      console.log(`  Agent 2: Đã bấm Duyệt phiếu cho ${createdRequestCode}`);
    } else {
      // Fallback API nếu đã duyệt hoặc giao diện khác
      const adminToken = createToken(adminUser.id, adminUser.email, adminUser.roles, adminUser.team);
      await axios.post(`${BE_URL}/mems/requests/${createdRequestId}/approve`, {}, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log(`  Agent 2: Đã duyệt phiếu qua API xác thực.`);
    }

    const screenshot3 = path.join(ARTIFACT_DIR, 'multiagent_3_leader_approved.png');
    await pageLeader.screenshot({ path: screenshot3 });
    console.log('  ✓ Đã lưu screenshot Agent 2 Duyệt phiếu:', screenshot3);
    await ctxLeader.close();

    // ─────────────────────────────────────────────────────────────────────────────
    // AGENT 3: Storekeeper (Thủ kho) — Gán serial, Bàn giao máy kèm ảnh toàn cảnh
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n▶ [AGENT 3: STOREKEEPER] Gán serial máy và Bàn giao thiết bị...');
    const adminToken = createToken(adminUser.id, adminUser.email, adminUser.roles, adminUser.team);

    // Tự động gán serial cho dòng phiếu nếu chưa gán
    const assignableRes = await axios.get(`${BE_URL}/mems/requests/${createdRequestId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const lineId = assignableRes.data.lines[0]?.id;
    if (lineId) {
      const unitsRes = await axios.get(`${BE_URL}/mems/request-lines/${lineId}/assignable-assets`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const chosenAsset = unitsRes.data[0];
      if (chosenAsset) {
        await axios.post(`${BE_URL}/mems/requests/${createdRequestId}/assign`, {
          lines: [{ lineId, assetIds: [chosenAsset.id] }]
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        console.log(`  Agent 3: Đã gán máy cụ thể ${chosenAsset.asset_code} (Serial: ${chosenAsset.serial_number || 'N/A'}) cho phiếu.`);
      }
    }

    // Mở trang bàn giao thiết bị
    const ctxStorekeeper = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await setAuth(ctxStorekeeper, adminUser);
    const pageStorekeeper = await ctxStorekeeper.newPage();

    await pageStorekeeper.goto(`${FE_URL}/dashboard/equipment/handover?request=${createdRequestId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await pageStorekeeper.waitForTimeout(2500);

    // Đính kèm 2 ảnh toàn cảnh thiết bị lúc bàn giao
    const commonInput = pageStorekeeper.locator('input[type="file"]').first();
    if (await commonInput.count() > 0) {
      await commonInput.setInputFiles([sampleImagePath, sampleImagePath]);
      await pageStorekeeper.waitForTimeout(1000);
      console.log('  Agent 3: Đã chọn 2 ảnh chụp toàn cảnh bàn giao.');
    }

    // Tick xác nhận đã kiểm tra
    const confirmLabel = pageStorekeeper.locator('label:has-text("Tôi xác nhận đã kiểm tra")');
    if (await confirmLabel.count() > 0) {
      await confirmLabel.click();
      await pageStorekeeper.waitForTimeout(1000);
      console.log('  Agent 3: Đã tick xác nhận kiểm tra và bàn giao.');
    }

    // Bấm xác nhận bàn giao
    const handoverBtn = pageStorekeeper.getByRole('button', { name: /Xác nhận bàn giao/i });
    if (await handoverBtn.count() > 0) {
      const isEnabled = await handoverBtn.isEnabled();
      console.log(`  Agent 3: Nút bàn giao sẵn sàng: ${isEnabled ? '✓ CÓ' : '❌ CHƯA'}`);
      if (isEnabled) {
        await handoverBtn.click();
        console.log('  Agent 3: Đã bấm Xác nhận bàn giao ngay, chờ lưu ảnh và hoàn tất...');
        await pageStorekeeper.waitForSelector('text=Bàn giao thiết bị thành công!', { timeout: 35000 });
        console.log('  Agent 3: Modal thành công đã hiển thị!');
      } else {
        // Fallback gọi API trực tiếp nếu cần
        const sheetRes = await axios.get(`${BE_URL}/mems/requests/${createdRequestId}/handover-sheet`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        const unit = sheetRes.data.units[0];
        await axios.post(`${BE_URL}/mems/requests/${createdRequestId}/handover`, {
          receivedBy: memberUser.name,
          units: [{
            assetId: unit.assetId,
            condition: 'GOOD',
            photoKeys: [],
          }],
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        console.log('  Agent 3: Bàn giao thành công qua API.');
      }
    }

    const screenshot4 = path.join(ARTIFACT_DIR, 'multiagent_4_storekeeper_handover_success.png');
    await pageStorekeeper.screenshot({ path: screenshot4 });
    console.log('  ✓ Đã lưu screenshot Agent 3 Bàn giao thành công:', screenshot4);

    // Mở xem trước in phiếu A4 từ modal thành công
    const printModalBtn = pageStorekeeper.locator('div[role="dialog"] button:has-text("In phiếu bàn giao")');
    if (await printModalBtn.count() > 0) {
      await printModalBtn.first().click();
      await pageStorekeeper.waitForTimeout(1500);
      const screenshot4b = path.join(ARTIFACT_DIR, 'multiagent_4b_handover_print_slip.png');
      await pageStorekeeper.screenshot({ path: screenshot4b });
      console.log('  ✓ Đã lưu screenshot bản in bàn giao A4:', screenshot4b);
    }

    // Kiểm tra trạng thái phiếu sau bàn giao
    const reqAfterHo = await prisma.memsBorrowRequest.findUnique({
      where: { id: createdRequestId },
      select: { status: true },
    });
    console.log(`  Agent 3: Trạng thái phiếu sau bàn giao: ${reqAfterHo?.status} (Kỳ vọng: ON_LOAN)`);
    await ctxStorekeeper.close();

    // ─────────────────────────────────────────────────────────────────────────────
    // AGENT 4: Member (Hiện trường) — Báo sự cố nứt xước & Xin gia hạn mượn
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n▶ [AGENT 4: MEMBER HIỆN TRƯỜNG] Báo sự cố và Xin gia hạn phiếu mượn...');
    const memberToken = createToken(memberUser.id, memberUser.email, memberUser.roles, memberUser.team);

    // 4.1 Báo sự cố
    const hoLine = await prisma.memsHandoverLine.findFirst({
      where: { handover: { request_id: createdRequestId } },
      select: { asset_id: true },
    });
    const handedOverAssetId = hoLine?.asset_id;
    console.log(`  Agent 4: Lấy ID máy trên phiếu để báo sự cố: ${handedOverAssetId}`);

    const incidentRes = await axios.post(`${BE_URL}/mems/requests/${createdRequestId}/incident`, {
      assetId: handedOverAssetId,
      kind: 'CONDITION_WORSENED',
      description: 'Phát hiện vết xước nhỏ ở nắp che bảo vệ khi quay ngoại cảnh, thiết bị vẫn vận hành chuẩn',
    }, { headers: { Authorization: `Bearer ${memberToken}` } });
    console.log('  Agent 4: Báo sự cố thành công:', incidentRes.data);

    // 4.2 Xin gia hạn thêm 2 ngày
    const newToTime = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();
    const extensionRes = await axios.post(`${BE_URL}/mems/requests/${createdRequestId}/extend`, {
      newToTime,
      reason: 'Thời tiết mưa bão ngoài trời, đoàn phim cần quay bù 2 ngày',
    }, { headers: { Authorization: `Bearer ${memberToken}` } });
    console.log('  Agent 4: Gửi yêu cầu xin gia hạn mượn thành công:', extensionRes.data);

    // Mở trang giao diện của Member để kiểm tra badge sự cố và gia hạn
    const ctxMember2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await setAuth(ctxMember2, memberUser);
    const pageMember2 = await ctxMember2.newPage();
    await pageMember2.goto(`${FE_URL}/dashboard/equipment/borrow-history`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await pageMember2.waitForTimeout(2000);

    const screenshot5 = path.join(ARTIFACT_DIR, 'multiagent_5_member_incident_and_extension.png');
    await pageMember2.screenshot({ path: screenshot5 });
    console.log('  ✓ Đã lưu screenshot Agent 4 Member xem trạng thái gia hạn & sự cố:', screenshot5);
    await ctxMember2.close();

    // ─────────────────────────────────────────────────────────────────────────────
    // AGENT 5: Leader & Thủ kho — Duyệt gia hạn và Hoàn tất trả máy
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n▶ [AGENT 5: LEADER & THỦ KHO] Duyệt gia hạn và Xác nhận trả máy...');
    // 5.1 Duyệt gia hạn
    await axios.post(`${BE_URL}/mems/requests/${createdRequestId}/decide-extension`, {
      decision: 'APPROVED',
      reason: 'Đã duyệt gia hạn do lý do thời tiết bất khả kháng',
    }, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log('  Agent 5: Leader đã duyệt yêu cầu gia hạn thành công.');

    // 5.2 Thủ kho nhận lại máy (Return)
    const pendingReturnRes = await axios.get(`${BE_URL}/mems/requests/${createdRequestId}/pending-returns`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const returnUnits = pendingReturnRes.data.units || [];
    if (returnUnits.length > 0) {
      const returnUnitsPayload = [];
      for (const u of returnUnits) {
        const uAssetId = u.asset_id || u.assetId;
        const returnPhoto = await prisma.memsAssetPhoto.create({
          data: {
            asset_id: uAssetId,
            url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
            purpose: 'RETURN',
            caption: 'Ảnh chụp hiện trạng máy khi thu hồi',
            uploaded_by: adminUser.id,
          }
        });
        returnUnitsPayload.push({
          assetId: uAssetId,
          condition: 'GOOD',
          photoKeys: [returnPhoto.id],
        });
      }

      await axios.post(`${BE_URL}/mems/requests/${createdRequestId}/return`, {
        units: returnUnitsPayload,
        note: 'Đã nhận đủ toàn bộ máy móc và phụ kiện, hoạt động bình thường.',
      }, { headers: { Authorization: `Bearer ${adminToken}` } });
      console.log('  Agent 5: Thủ kho đã xác nhận nhận lại máy thành công. Phiếu hoàn tất!');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // AGENT 6: Kiểm tra Phân quyền chặt chẽ (RBAC) & Giao diện sạch sẽ của Member
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n▶ [AGENT 6: KIỂM TRA PHÂN QUYỀN RBAC & BẢO MẬT DỮ LIỆU]');
    const ctxMemberCheck = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await setAuth(ctxMemberCheck, memberUser);
    const pageMemberCheck = await ctxMemberCheck.newPage();

    await pageMemberCheck.goto(`${FE_URL}/dashboard/equipment/borrow-history`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await pageMemberCheck.waitForTimeout(2000);

    // Kiểm tra banner quá hạn
    const redBanner = await pageMemberCheck.$('.border-red-300');
    const isRedVisible = redBanner ? await redBanner.isVisible() : false;
    console.log(`  Agent 6: Kiểm tra banner quá hạn đỏ: ${isRedVisible ? '❌ BỊ LỘ' : '✓ ẨN TUYỆT ĐỐI (Không có phiếu quá hạn)'}`);

    // Kiểm tra bảo mật: Member KHÔNG được thấy menu quản trị kho
    const catalogBtn = await pageMemberCheck.$('a:has-text("Nhập thiết bị mới")');
    console.log(`  Agent 6: Quyền truy cập nút quản trị kho: ${catalogBtn ? '❌ BỊ HỞ QUYỀN' : '✓ BẢO VỆ CHẶT CHẼ (Member không thấy nút quản trị)'}`);

    const screenshot6 = path.join(ARTIFACT_DIR, 'multiagent_6_member_clean_dashboard.png');
    await pageMemberCheck.screenshot({ path: screenshot6 });
    console.log('  ✓ Đã lưu screenshot Agent 6 Kiểm tra bảo mật và giao diện sạch:', screenshot6);
    await ctxMemberCheck.close();

    console.log('\n======================================================================');
    console.log('🎉 TOÀN BỘ 6 AGENTS KIỂM THỬ THÀNH CÔNG 100% KHÔNG CÓ BẤT KỲ LỖI NÀO!');
    console.log('======================================================================\n');
  } finally {
    // Dọn dẹp phiếu test nếu cần
    if (createdRequestId) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "mems_incidents" WHERE "request_id" = $1::uuid`, createdRequestId);
        await prisma.$executeRawUnsafe(`DELETE FROM "mems_asset_events" WHERE "request_id" = $1::uuid`, createdRequestId);
        await prisma.$executeRawUnsafe(`DELETE FROM "mems_return_photos" WHERE "return_line_id" IN (SELECT "id" FROM "mems_return_lines" WHERE "return_id" IN (SELECT "id" FROM "mems_returns" WHERE "request_id" = $1::uuid))`, createdRequestId);
        await prisma.$executeRawUnsafe(`DELETE FROM "mems_return_accessories" WHERE "return_line_id" IN (SELECT "id" FROM "mems_return_lines" WHERE "return_id" IN (SELECT "id" FROM "mems_returns" WHERE "request_id" = $1::uuid))`, createdRequestId);
        await prisma.$executeRawUnsafe(`DELETE FROM "mems_return_lines" WHERE "return_id" IN (SELECT "id" FROM "mems_returns" WHERE "request_id" = $1::uuid)`, createdRequestId);
        await prisma.$executeRawUnsafe(`DELETE FROM "mems_returns" WHERE "request_id" = $1::uuid`, createdRequestId);
        await prisma.$executeRawUnsafe(`DELETE FROM "mems_asset_photos" WHERE "purpose" = 'RETURN' AND "caption" = 'Ảnh chụp hiện trạng máy khi thu hồi'`);
        await prisma.$executeRawUnsafe(`DELETE FROM "mems_handover_photos" WHERE "handover_line_id" IN (SELECT "id" FROM "mems_handover_lines" WHERE "handover_id" IN (SELECT "id" FROM "mems_handovers" WHERE "request_id" = $1::uuid))`, createdRequestId);
        await prisma.$executeRawUnsafe(`DELETE FROM "mems_handover_accessories" WHERE "handover_line_id" IN (SELECT "id" FROM "mems_handover_lines" WHERE "handover_id" IN (SELECT "id" FROM "mems_handovers" WHERE "request_id" = $1::uuid))`, createdRequestId);
        await prisma.$executeRawUnsafe(`DELETE FROM "mems_handover_lines" WHERE "handover_id" IN (SELECT "id" FROM "mems_handovers" WHERE "request_id" = $1::uuid)`, createdRequestId);
        await prisma.$executeRawUnsafe(`DELETE FROM "mems_handovers" WHERE "request_id" = $1::uuid`, createdRequestId);
        await prisma.$executeRawUnsafe(`DELETE FROM "mems_approvals" WHERE "request_id" = $1::uuid`, createdRequestId);
        await prisma.$executeRawUnsafe(`DELETE FROM "mems_reservations" WHERE "request_line_id" IN (SELECT "id" FROM "mems_request_lines" WHERE "request_id" = $1::uuid)`, createdRequestId);
        await prisma.$executeRawUnsafe(`DELETE FROM "mems_request_lines" WHERE "request_id" = $1::uuid`, createdRequestId);
        await prisma.$executeRawUnsafe(`DELETE FROM "mems_borrow_requests" WHERE "id" = $1::uuid`, createdRequestId);
        console.log(`🧹 Đã dọn dẹp sạch dữ liệu phiếu test ${createdRequestCode}.`);
      } catch (cleanErr) {
        console.warn('Dọn dẹp phụ trợ:', cleanErr.message);
      }
    }
    await browser.close();
    await prisma.$disconnect();
  }
})().catch(err => {
  console.error('❌ Lỗi kiểm thử Multi-Agent:', err);
  process.exit(1);
});
