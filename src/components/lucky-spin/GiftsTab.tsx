'use client';

import { useMemo, useState } from 'react';
import { Gift as GiftIcon, PackageOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { LuckySpinStore } from '@/hooks/useLuckySpin';
import { apiErrorMessage } from '@/lib/lucky-spin/api';
import { isImportError, parseGiftRows } from '@/lib/lucky-spin/import-rows';
import { SheetRow } from '@/lib/lucky-spin/sheet-io';
import { giftImportConfirm } from '@/lib/lucky-spin/import-confirm';
import { Gift } from '@/types/lucky-spin';
import { ActionButton } from '@/components/lucky-spin/ActionButton';
import { BulkImportPanel } from '@/components/lucky-spin/BulkImportPanel';
import { EmptyRow } from '@/components/lucky-spin/EmptyRow';
import { PanelCard } from '@/components/lucky-spin/PanelCard';
import { RowActionButton } from '@/components/lucky-spin/RowActionButton';
import { useConfirmDialog } from '@/components/lucky-spin/useConfirmDialog';
import { fieldLabelClass, inputClass, monoCellClass, tdClass, thClass, trClass } from '@/components/lucky-spin/styles';

export function GiftsTab({ store }: { store: LuckySpinStore }) {
  const { state, actions } = store;
  const [newGiftName, setNewGiftName] = useState('');
  const [newGiftQty, setNewGiftQty] = useState('1');
  const [filterName, setFilterName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', remaining: '0', total: '0' });
  const { confirm, dialog } = useConfirmDialog();

  const addGift = async () => {
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
    try {
      await actions.addGift(name, qty);
      setNewGiftName('');
      setNewGiftQty('1');
      toast.success('Đã thêm quà.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không thêm được quà.'));
    }
  };

  const importRows = async (rows: SheetRow[]) => {
    const parsed = parseGiftRows(rows);
    if (isImportError(parsed)) {
      toast.error(parsed.error);
      return;
    }
    if (parsed.rows.length === 0) {
      toast.error('Không có dòng nào hợp lệ để nhập.');
      return;
    }

    // Nhập là THAY danh sách quà, không cộng dồn — xem ghi chú cùng loại ở MembersTab.
    const canHoi = giftImportConfirm(state.gifts.length, parsed.rows.length);
    if (canHoi && !(await confirm(canHoi))) return;

    try {
      const res = await actions.bulkAddGifts(parsed.rows);
      const { createdGifts, deletedGifts } = (res as any).data;
      const parts = [`Đã nhập ${createdGifts} quà`];
      if (deletedGifts > 0) parts.push(`thay cho ${deletedGifts} quà cũ`);
      if (parsed.skipped > 0) parts.push(`bỏ qua ${parsed.skipped} dòng thiếu dữ liệu`);
      toast.success(parts.join(', ') + '.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không nhập được danh sách quà.'));
    }
  };

  const startEdit = (gift: Gift) => {
    setEditingId(gift.id);
    setDraft({ name: gift.name, remaining: String(gift.remaining), total: String(gift.total) });
  };

  const saveEdit = async (id: string) => {
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

    try {
      await actions.editGift(id, { name, total, remaining });
      setEditingId(null);
      toast.success('Đã cập nhật quà tặng.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không cập nhật được quà.'));
    }
  };

  const removeGift = async (gift: Gift) => {
    const ok = await confirm({
      title: `Xóa quà "${gift.name}"?`,
      description: 'Món quà bị xóa khỏi vòng quay. Lịch sử các phần đã trao vẫn được giữ nguyên.',
      confirmLabel: 'Xóa quà',
      danger: true,
    });
    if (!ok) return;
    try {
      await actions.removeGift(gift.id);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không xóa được quà.'));
    }
  };

  const filtered = useMemo(() => {
    const q = filterName.trim().toLowerCase();
    return state.gifts.filter((g) => !q || g.name.toLowerCase().includes(q));
  }, [state.gifts, filterName]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      {dialog}
      <div className="space-y-6">
        <PanelCard title="Thêm quà tặng">
          <input
            className={`${inputClass} mb-4`}
            placeholder="Tên quà, ví dụ: Voucher 500k"
            value={newGiftName}
            onChange={(e) => setNewGiftName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addGift()}
          />
          <label className={fieldLabelClass}>Số lượng</label>
          <input
            type="number"
            min={1}
            className={`${inputClass} mb-4`}
            value={newGiftQty}
            onChange={(e) => setNewGiftQty(e.target.value)}
          />
          <ActionButton className="w-full" onClick={addGift}>
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
          className={`${inputClass} mb-5`}
          placeholder="Tìm theo tên quà..."
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
        />

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
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
                <EmptyRow colSpan={4} icon={GiftIcon}>Chưa có quà nào. Thêm ở khung bên trái hoặc nhập từ file Excel.</EmptyRow>
              ) : filtered.length === 0 ? (
                <EmptyRow colSpan={4} icon={PackageOpen}>Không có món quà nào khớp từ khoá tìm kiếm.</EmptyRow>
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
                    <tr key={g.id} className={trClass}>
                      <td className={tdClass}>{g.name}</td>
                      <td className={tdClass}>
                        <span
                          className={
                            g.remaining > 0
                              ? 'inline-flex items-center rounded-full bg-[#22C55E]/10 px-2.5 py-1 text-[13px] font-semibold tabular-nums text-[#16A34A]'
                              : 'inline-flex items-center rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[13px] font-medium text-[#6B7280] dark:bg-white/[0.06]'
                          }
                        >
                          {g.remaining > 0 ? g.remaining : 'Hết'}
                        </span>
                      </td>
                      <td className={monoCellClass}>{g.total}</td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        <RowActionButton action="edit" title="Sửa quà" onClick={() => startEdit(g)} />
                        <RowActionButton
                          action="delete"
                          title="Xóa quà"
                          onClick={() => removeGift(g)}
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
