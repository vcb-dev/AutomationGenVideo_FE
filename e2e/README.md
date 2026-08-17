# Test bám sát luồng bằng trình duyệt

`npm test` chạy test đơn vị trên hàm thuần — nhanh, chạy được ở CI, nhưng **không** thấy được
những gì chỉ hỏng trong trình duyệt. Hai lỗi thật của module thiết bị đã lọt qua cả test đơn vị
lẫn `curl`:

- Màn chi tiết máy dùng `use(params)` (cú pháp Next 15) nên **chết lúc hydrate**, trong khi vỏ
  HTML vẫn trả 200 — mọi phép kiểm bằng mã trạng thái đều báo đạt còn màn hình thì trắng.
- `NEXT_PUBLIC_API_URL` thiếu giá trị mặc định làm mọi trang dashboard ăn một lỗi 404 vô hình.

Kịch bản ở đây mở trình duyệt thật, bấm từng nút, và nghe sự kiện `pageerror` — đó là thứ duy
nhất bắt được hai lỗi trên.

## Cần gì trước khi chạy

Ba thứ phải đang chạy: **backend**, **frontend**, và **cơ sở dữ liệu** có sẵn ít nhất một model
thiết bị. Kịch bản sẽ **tạo thật** một thiết bị mới kèm hai ảnh, nên đừng chạy trên môi trường
sản xuất.

Lần đầu, tải trình duyệt cho Playwright:

```bash
npx playwright install chromium
```

Máy nào đã có sẵn Chromium của Playwright thì trỏ thẳng vào để khỏi tải:

```bash
export PLAYWRIGHT_CHROMIUM_PATH="$HOME/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-x64/chrome-headless-shell"
```

## Chạy

```bash
E2E_EMAIL=nguoi.co.quyen.kho@vcb.vn E2E_PASSWORD='…' npm run test:e2e
```

Hoặc đưa thẳng token nếu đã có:

```bash
E2E_TOKEN='eyJ…' npm run test:e2e
```

Tài khoản phải có vai trò **LEADER**, **MANAGER** hoặc **ADMIN** — thao tác kho bị `RolesGuard`
chặn với member.

## Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `E2E_FE_URL` | `http://localhost:3001` | Nơi frontend đang chạy |
| `E2E_API_URL` | `http://localhost:3000/api` | Nơi backend đang chạy |
| `E2E_EMAIL` / `E2E_PASSWORD` | — | Đăng nhập qua endpoint thật |
| `E2E_TOKEN` | — | Dùng thay cho email và mật khẩu |
| `PLAYWRIGHT_CHROMIUM_PATH` | — | Trỏ tới Chromium sẵn có |

## Kịch bản kiểm những gì

Bảng điều khiển · Danh sách kho (dữ liệu, tìm kiếm) · Hộp thoại thêm thiết bị (dropdown model,
dropdown tình trạng, chọn nhiều ảnh, xem trước, nút lưu bật đúng lúc, lưu thành công) · Chi tiết
máy (ảnh hiện và **tải được thật**, nhật ký vòng đời) · Duyệt phiếu (danh sách, nút Duyệt, Từ
chối, ô lý do) · Gán serial · Bàn giao · Trả và kiểm tra.

Kết thúc, nó in ra mọi lỗi console và mọi request hỏng bắt được trong lúc chạy.

## Vì sao chưa đưa vào CI

Cần cả ba dịch vụ cùng chạy và một tài khoản thật. Muốn đưa vào CI thì phải dựng backend, cơ sở
dữ liệu và một tài khoản hạt giống trong workflow — làm được nhưng là việc riêng, chưa làm.

## Một lưu ý về dọn dẹp

Thiết bị do kịch bản tạo mang serial `E2E-<mốc thời gian>` và **không tự xoá**: API cố tình không
cho xoá cứng thiết bị đã có nhật ký (QĐ-07 — ngừng dùng thì đánh dấu, không xoá). Chạy nhiều lần
thì kho sẽ đầy dần máy `E2E-…`, dọn tay khi cần.
