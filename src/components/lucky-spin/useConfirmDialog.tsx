'use client';

import { ReactElement, useCallback, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/lucky-spin/ConfirmDialog';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
}

/**
 * Hỏi lại trước thao tác không hoàn tác được, dùng như một hàm async.
 *
 *   if (await confirm({ ... })) await xoa();
 *
 * Gom vào hook để mọi chỗ xóa đều hỏi theo cùng một kiểu — trước đây mỗi tab tự lo nên có chỗ
 * hỏi, có chỗ xóa thẳng.
 */
export function useConfirmDialog(): { confirm: (o: ConfirmOptions) => Promise<boolean>; dialog: ReactElement } {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOptions(o);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const settle = (ok: boolean) => {
    setOptions(null);
    resolveRef.current?.(ok);
    resolveRef.current = null;
  };

  const dialog = (
    <ConfirmDialog
      open={!!options}
      title={options?.title ?? ''}
      description={options?.description ?? ''}
      confirmLabel={options?.confirmLabel ?? 'Xác nhận'}
      danger={options?.danger}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return { confirm, dialog };
}
