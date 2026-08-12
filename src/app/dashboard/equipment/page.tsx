'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Asset, fetchAssets } from '@/lib/equipment/api';

const STATUS_LABEL: Record<string, string> = {
  PENDING_INSPECTION: 'Chờ kiểm tra',
  AVAILABLE: 'Sẵn sàng',
  ON_LOAN: 'Đang mượn',
  POST_RETURN_CHECK: 'Kiểm tra sau trả',
  UNDER_MAINTENANCE: 'Bảo trì',
  BROKEN: 'Hỏng',
  LOST: 'Mất',
  DISPOSED: 'Đã thanh lý',
};

export default function EquipmentPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssets()
      .then(setAssets)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Kho thiết bị Media</h1>
        <Link
          href="/dashboard/equipment/new-request"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Tạo phiếu mượn
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500">Đang tải…</p>
      ) : assets.length === 0 ? (
        <p className="text-gray-500">Kho chưa có thiết bị nào.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b text-left text-gray-500">
            <tr>
              <th className="py-2">Mã</th>
              <th>Model</th>
              <th>Danh mục</th>
              <th>Serial</th>
              <th>Trạng thái</th>
              <th>Vị trí</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="border-b">
                <td className="py-2 font-mono">{a.asset_code}</td>
                <td>{a.model.name}</td>
                <td>{a.model.category.name}</td>
                <td className="font-mono text-gray-500">{a.serial_number}</td>
                <td>{STATUS_LABEL[a.status] ?? a.status}</td>
                <td>{a.location?.name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
