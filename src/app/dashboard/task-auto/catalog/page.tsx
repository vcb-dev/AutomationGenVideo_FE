import { redirect } from 'next/navigation'

export default function CatalogPage() {
  // "Danh mục" đã tách thành 2 trang Kho sản phẩm / Kho source — giữ route cũ cho link đã lưu.
  redirect('/dashboard/task-auto/catalog/products')
}
