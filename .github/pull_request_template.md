<!--
TIÊU ĐỀ PR phải nói rõ TỪNG chức năng, không viết chung chung.

  Tốt:  feat(lucky-spin): nhập danh sách thành viên từ Excel, bỏ dòng trùng mã NV
  Tốt:  fix(dashboard-5a): cột doanh thu lấy sai tháng khi lọc theo kênh
  Xấu:  update UI / fix bug / sửa dashboard

Một PR nhiều chức năng thì liệt kê từng cái ở mục "Chức năng trong PR này" bên dưới,
và mỗi chức năng phải có FILE UNIT TEST RIÊNG — không gộp nhiều chức năng vào một file.
-->

## Jira

- Ticket: <!-- VCBI-123 -->
- Link:

> Input và output của từng chức năng cập nhật trên Jira, không chép vào đây.
> Ghi ở đây link tới ticket đã cập nhật xong.

## Chức năng trong PR này

Mỗi chức năng một dòng, kèm đúng file test của riêng nó.

| # | Chức năng | File unit test |
|---|---|---|
| 1 |  | `src/lib/.../__tests__/....test.ts` |
| 2 |  |  |

> Component khó test trực tiếp thì tách phần logic thuần ra `src/lib/` rồi test file đó —
> đừng cố render cả cây component.

## Trước khi bấm "Ready for review"

- [ ] Tiêu đề PR nêu rõ từng chức năng, không viết chung chung
- [ ] Mỗi chức năng có **một file unit test riêng** trong `__tests__/` — không gộp
- [ ] Đã chạy `npm test` tại máy và **đọc kết quả**, toàn bộ xanh
- [ ] Đã chạy `npx tsc --noEmit`, không lỗi kiểu
- [ ] Input/output của từng chức năng đã cập nhật trên Jira

## Đã kiểm chứng thế nào

<!--
Dán output thật, đừng viết "đã test ok".
Ví dụ: kết quả `npm test`, hoặc ảnh chụp màn hình chức năng chạy thật.
-->

```
```
