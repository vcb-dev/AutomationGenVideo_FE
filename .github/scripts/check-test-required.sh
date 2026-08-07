#!/usr/bin/env bash
#
# Chặn PR sửa code nghiệp vụ mà không kèm file unit test nào.
#
# Vì sao cần: FE trước đây không có CI nào cả — suite Jest đỏ vẫn merge được. Thực tế đã có
# 1 suite đỏ nhiều ngày (test của module storage.ts đã bị xoá khi vòng quay chuyển lên server)
# mà không ai biết, vì không có gì chạy `npm test` ngoài máy cá nhân.
#
# Quy tắc: PR nào chạm file nguồn trong src/ thì phải thêm/sửa ít nhất 1 file test.
# PR chỉ sửa tài liệu, config, ảnh → bỏ qua, không bắt buộc.
#
# Lối thoát có kiểm soát: gắn nhãn `no-unit-test` lên PR (refactor thuần, đổi thuần giao diện).
# Nhãn hiện rõ trên PR nên reviewer thấy ngay ai đang bỏ qua luật.

set -euo pipefail

BASE_REF="${BASE_REF:?thiếu BASE_REF}"
PR_LABELS="${PR_LABELS:-}"

if grep -qw "no-unit-test" <<<"$PR_LABELS"; then
  echo "PR gắn nhãn 'no-unit-test' → bỏ qua kiểm tra. Reviewer chịu trách nhiệm xác nhận."
  exit 0
fi

git fetch --no-tags origin "$BASE_REF"

# Ba chấm: chỉ lấy thay đổi CỦA NHÁNH NÀY tính từ commit gốc chung, không tính commit
# mà nhánh đích đi trước. Hai chấm sẽ kể cả file người khác sửa trên main → báo sai.
CHANGED=$(git diff --name-only --diff-filter=ACMR "origin/$BASE_REF...HEAD")

if [ -z "$CHANGED" ]; then
  echo "PR không đổi file nào — bỏ qua."
  exit 0
fi

echo "=== File PR này thay đổi ==="
echo "$CHANGED"
echo

is_test_file() {
  case "$1" in
    *__tests__/*|*.spec.ts|*.spec.tsx|*.test.ts|*.test.tsx|tests/*) return 0 ;;
    *) return 1 ;;
  esac
}

# Chỉ .ts/.tsx trong src/ mới tính là "code nghiệp vụ". File .css, .json, .md, ảnh trong public/
# không nằm trong diện bắt buộc test.
is_source_file() {
  case "$1" in
    src/*.ts|src/*.tsx) return 0 ;;
    *) return 1 ;;
  esac
}

source_changed=0
test_changed=0
declare -a source_list=()

while IFS= read -r f; do
  [ -z "$f" ] && continue
  if is_test_file "$f"; then
    test_changed=1
  elif is_source_file "$f"; then
    source_changed=1
    source_list+=("$f")
  fi
done <<<"$CHANGED"

if [ "$source_changed" -eq 0 ]; then
  echo "PR không chạm code nguồn trong src/ → không bắt buộc unit test. OK."
  exit 0
fi

if [ "$test_changed" -eq 1 ]; then
  echo "OK — PR có kèm file unit test."
  exit 0
fi

cat <<'MSG'
================================================================
  PR BỊ CHẶN — sửa code nghiệp vụ nhưng KHÔNG có file unit test
================================================================

Luật của team: code xong một chức năng thì PR phải kèm ĐÚNG MỘT file
unit test riêng cho chức năng đó. Không gộp nhiều chức năng vào một file.

Đặt file ở đâu:

    src/lib/<mang>/__tests__/<ten-chuc-nang>.test.ts

Ví dụ:

    src/lib/lucky-spin/__tests__/import-rows.test.ts

Component khó test trực tiếp thì tách phần logic thuần ra file riêng trong
src/lib/ rồi test file đó — đừng cố render cả cây component.

Chạy tại máy trước khi push:

    npm test

Nếu PR này thật sự không cần test (đổi thuần giao diện, refactor không đổi
hành vi), gắn nhãn `no-unit-test` lên PR và ghi rõ lý do trong phần mô tả.

Các file nguồn đã đổi mà chưa có test đi kèm:
MSG

printf '    %s\n' "${source_list[@]}"
exit 1
