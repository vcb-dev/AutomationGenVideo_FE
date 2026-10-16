'use client'

import { useQuery } from '@tanstack/react-query'
import { CustomSelect } from '@/components/task-auto/DarkInput'
import { getContentLinkedProducts, getEditorContentLinkedProducts, getTeamContentLinkedProducts } from '@/lib/api/task-auto'

export type ContentProductScope =
  | { kind: 'global'; brandType?: string }
  | { kind: 'team'; teamId: string; brandType?: string }
  | { kind: 'personal'; userId: string; brandType?: string }

interface ContentProductFilterProps {
  scope: ContentProductScope
  value: string
  onChange: (sku: string) => void
  className?: string
}

// Sản phẩm lấy từ các task đã dùng content trong kho này — chỉ liệt kê sản phẩm có ít nhất 1 content.
export function ContentProductFilter({ scope, value, onChange, className = 'min-w-[200px] max-w-[300px]' }: ContentProductFilterProps) {
  const scopeId = scope.kind === 'team' ? scope.teamId : scope.kind === 'personal' ? scope.userId : ''
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['task-auto', 'content-linked-products', scope.kind, scopeId, scope.brandType ?? ''],
    queryFn: () => scope.kind === 'team'
      ? getTeamContentLinkedProducts(scope.teamId, scope.brandType)
      : scope.kind === 'personal'
        ? getEditorContentLinkedProducts(scope.userId, scope.brandType)
        : getContentLinkedProducts(scope.brandType),
    enabled: scope.kind === 'global' || !!scopeId,
    staleTime: 60_000,
  })

  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      options={[
        { value: '', label: products.length || isLoading ? 'Tất cả sản phẩm' : 'Chưa có content gắn sản phẩm' },
        ...products.map(p => ({ value: p.sku, label: `${p.name ?? p.sku} — ${p.sku} (${p.content_count})` })),
      ]}
      searchable
      loading={isLoading}
      className={className}
    />
  )
}
