import { ReactNode } from 'react';

interface Props {
  colSpan: number;
  children: ReactNode;
}

export function EmptyRow({ colSpan, children }: Props) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-2.5 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
        {children}
      </td>
    </tr>
  );
}
