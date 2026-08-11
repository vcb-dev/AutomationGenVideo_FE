'use client';

import { useState } from 'react';
import { checkAvailability, AvailabilityResponse } from '@/lib/equipment/api';
import { availabilityLabel } from '@/lib/equipment/availability-label';

const TONE_CLASS: Record<string, string> = {
  ok: 'text-green-600',
  tight: 'text-amber-600',
  none: 'text-red-600',
};

export default function NewRequestPage() {
  const [modelId, setModelId] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState<AvailabilityResponse | null>(null);
  const [checking, setChecking] = useState(false);

  // BR-11: không hỏi "còn hay hết" chung chung. Chỉ gọi khi đã có đủ model và cả hai mốc thời gian.
  const onCheck = async () => {
    if (!modelId || !fromTime || !toTime) return;
    setChecking(true);
    try {
      setResult(
        await checkAvailability({
          modelId,
          fromTime: new Date(fromTime).toISOString(),
          toTime: new Date(toTime).toISOString(),
          quantity,
        }),
      );
    } finally {
      setChecking(false);
    }
  };

  const label = result ? availabilityLabel(result.available, quantity) : null;

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">Tạo phiếu mượn</h1>

      <div className="space-y-3">
        <label className="block">
          <span className="text-sm text-gray-600">Model thiết bị</span>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            placeholder="ID model"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm text-gray-600">Nhận lúc</span>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded border px-3 py-2"
              value={fromTime}
              onChange={(e) => setFromTime(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Trả lúc</span>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded border px-3 py-2"
              value={toTime}
              onChange={(e) => setToTime(e.target.value)}
            />
          </label>
        </div>

        <label className="block w-32">
          <span className="text-sm text-gray-600">Số lượng</span>
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded border px-3 py-2"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </label>

        <button
          onClick={onCheck}
          disabled={checking}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {checking ? 'Đang kiểm tra…' : 'Kiểm tra khả dụng'}
        </button>

        {label && result && (
          <p className={`font-medium ${TONE_CLASS[label.tone]}`}>
            {label.text}
            {result.bufferMinutes > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                (đã tính buffer kiểm tra {result.bufferMinutes} phút sau khi trả)
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
