'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { LuckySpinStore } from '@/hooks/useLuckySpin';
import { importGiftsFromRows, isImportError } from '@/lib/lucky-spin/import-rows';
import { SheetRow } from '@/lib/lucky-spin/sheet-io';
import { uid } from '@/lib/lucky-spin/storage';
import { Gift } from '@/types/lucky-spin';
import { ActionButton } from '@/components/lucky-spin/ActionButton';
import { BulkImportPanel } from '@/components/lucky-spin/BulkImportPanel';
import { EmptyRow } from '@/components/lucky-spin/EmptyRow';
import { PanelCard } from '@/components/lucky-spin/PanelCard';
import { RowActionButton } from '@/components/lucky-spin/RowActionButton';
import { fieldLabelClass, inputClass, monoCellClass, tdClass, thClass } from '@/components/lucky-spin/styles';

export function GiftsTab({ store }: { store: LuckySpinStore }) {
  const { state, patchState } = store;
  const [newGiftName, setNewGiftName] = useState('');
  const [newGiftQty, setNewGiftQty] = useState('1');
  const [filterName, setFilterName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', remaining: '0', total: '0' });

  const addGift = () => {
    const name = newGiftName.trim();
    const qty = parseInt(newGiftQty, 10);
    if (!name) {
      toast.error('Nhập tên quà.');
      return;
    }
    if (!qty || qty < 1) {
      toast.error('Số lượng phải lớn hơn 0.');
      return;
    }
    patchState((prev) => ({ gifts: [...prev.gifts, { id: uid(), name, total: qty, remaining: qty }] }));
    setNewGiftName('');
    setNewGiftQty('1');
    toast.success('Đã thêm quà.');
  };

  const importRows = (rows: SheetRow[]) => {
    const result = importGiftsFromRows(rows);
    if (isImportError(result)) {
      toast.error(result.error);
      return;
    }

    patchState((prev) => ({ gifts: [...prev.gifts, ...result.gifts] }));

    const parts = [`Đã nhập ${result.gifts.length} quà`];
    if (result.skipped > 0) parts.push(`bỏ qua ${result.skipped} dòng thiếu dữ liệu`);
    toast.success(parts.join(', ') + '.');
  };

  const startEdit = (gift: Gift) => {
    setEditingId(gift.id);
    setDraft({ name: gift.name, remaining: String(gift.remaining), total: String(gift.total) });
  };

  const saveEdit = (id: string) => {
    const name = draft.name.trim();
    const total = parseInt(draft.total, 10);
    let remaining = parseInt(draft.remaining, 10);
    if (!name) {
      toast.error('Tên quà không được để trống.');
      return;
    }
    if (!Number.isInteger(total) || total < 0) {
      toast.error('Tổng số lượng không hợp lệ.');
      return;
    }
    if (!Number.isInteger(remaining) || remaining < 0) {
      toast.error('Số lượng còn lại không hợp lệ.');
      return;
    }
    if (remaining > total) remaining = total;

    patchState((prev) => ({ gifts: prev.gifts.map((g) => (g.id === id ? { ...g, name, total, remaining } : g)) }));
    setEditingId(null);
    toast.success('Đã cập nhật quà tặng.');
  };

  const filtered = useMemo(() => {
    const q = filterName.trim().toLowerCase();
    return state.gifts.filter((g) => !q || g.name.toLowerCase().includes(q));
  }, [state.gifts, filterName]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="space-y-5">
        <PanelCard title="Thêm quà tặng">
          <input
            className={`${inputClass} mb-3`}
            placeholder="Tên quà, ví dụ: Voucher 500k"
            value={newGiftName}
            onChange={(e) => setNewGiftName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addGift()}
          />
          <label className={fieldLabelClass}>Số lượng</label>
          <input
            type="number"
            min={1}
            className={`${inputClass} mb-3`}
            value={newGiftQty}
            onChange={(e) => setNewGiftQty(e.target.value)}
          />
          <ActionButton accent="teal" className="w-full" onClick={addGift}>
            Thêm quà
          </ActionButton>
        </PanelCard>

        <BulkImportPanel
          title="Nhập quà từ Excel"
          onRows={importRows}
          hint={
            <>
              File cần có dòng tiêu đề với cột <b>Tên quà</b> và <b>Số lượng</b>.
            </>
          }
        />
      </div>

      <PanelCard title="Danh sách quà tặng">
        <input
          className={`${inputClass} mb-3.5`}
          placeholder="Tìm theo tên quà..."
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={thClass}>Tên quà</th>
                <th className={thClass}>Còn lại</th>
                <th className={thClass}>Tổng</th>
                <th className={thClass} />
              </tr>
            </thead>
            <tbody>
              {state.gifts.length === 0 ? (
                <EmptyRow colSpan={4}>Chưa có quà nào. Thêm quà ở bên trái.</EmptyRow>
              ) : filtered.length === 0 ? (
                <EmptyRow colSpan={4}>Không tìm thấy quà phù hợp.</EmptyRow>
              ) : (
                filtered.map((g) =>
                  editingId === g.id ? (
                    <tr key={g.id}>
                      <td className={tdClass}>
                        <input
                          className={inputClass}
                          value={draft.name}
                          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        />
                      </td>
                      <td className={tdClass}>
                        <input
                          type="number"
                          min={0}
                          className={inputClass}
                          value={draft.remaining}
                          onChange={(e) => setDraft({ ...draft, remaining: e.target.value })}
                        />
                      </td>
                      <td className={tdClass}>
                        <input
                          type="number"
                          min={0}
                          className={inputClass}
                          value={draft.total}
                          onChange={(e) => setDraft({ ...draft, total: e.target.value })}
                        />
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        <RowActionButton action="save" title="Lưu" onClick={() => saveEdit(g.id)} />
                        <RowActionButton action="cancel" title="Hủy" onClick={() => setEditingId(null)} />
                      </td>
                    </tr>
                  ) : (
                    <tr key={g.id}>
                      <td className={tdClass}>{g.name}</td>
                      <td className={`${tdClass} ${g.remaining > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {g.remaining}
                      </td>
                      <td className={monoCellClass}>{g.total}</td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        <RowActionButton action="edit" title="Sửa quà" onClick={() => startEdit(g)} />
                        <RowActionButton
                          action="delete"
                          title="Xóa quà"
                          onClick={() => patchState((prev) => ({ gifts: prev.gifts.filter((x) => x.id !== g.id) }))}
                        />
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  );
}
