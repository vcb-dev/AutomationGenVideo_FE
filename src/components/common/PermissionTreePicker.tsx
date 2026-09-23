'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Check,
  Minus,
  Search,
  X,
  Sparkles,
  Layers,
  ChevronsUpDown,
} from 'lucide-react';
import {
  PERMISSION_TREE,
  PermissionNode,
  getLeafIds,
  getAllLeafPermissions,
  getDefaultPermissionsForRole,
} from '@/config/permission-tree';

interface PermissionTreePickerProps {
  selectedPermissions?: string[];
  onChange: (newPermissions: string[]) => void;
  disabled?: boolean;
  theme?: 'light' | 'dark';
}

export default function PermissionTreePicker({
  selectedPermissions = [],
  onChange,
  disabled = false,
  theme = 'light',
}: PermissionTreePickerProps) {
  const isDark = theme === 'dark';
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'social': true,
    'social:external': true,
    'portal': true,
  });

  // Đảm bảo selectedPermissions luôn là mảng an toàn, không bao giờ null hay undefined
  const safePermissions = useMemo(
    () => (Array.isArray(selectedPermissions) ? selectedPermissions : []),
    [selectedPermissions],
  );

  const selectedSet = useMemo(() => new Set(safePermissions), [safePermissions]);

  // Kiểm tra trạng thái của một node: 'all' | 'some' | 'none'
  const getNodeState = useCallback(
    (node: PermissionNode): 'all' | 'some' | 'none' => {
      if (!node.children || node.children.length === 0) {
        return selectedSet.has(node.id) ? 'all' : 'none';
      }

      const allLeafIds = getLeafIds(node);
      const selectedCount = allLeafIds.filter((id) => selectedSet.has(id)).length;

      if (selectedCount === 0) return 'none';
      if (selectedCount === allLeafIds.length) return 'all';
      return 'some';
    },
    [selectedSet],
  );

  // Toggle chọn hoặc bỏ chọn một node
  const handleToggleNode = useCallback(
    (node: PermissionNode) => {
      if (disabled) return;

      const currentState = getNodeState(node);
      // Chỉ thao tác trên quyền lá — id của node nhóm không phải mã quyền hợp lệ.
      const allIds = getLeafIds(node);
      const newSet = new Set(safePermissions);

      if (currentState === 'all') {
        // Bỏ chọn toàn bộ node con
        allIds.forEach((id) => newSet.delete(id));
      } else {
        // Chọn toàn bộ node con
        allIds.forEach((id) => newSet.add(id));
      }

      onChange(Array.from(newSet));
    },
    [disabled, getNodeState, safePermissions, onChange],
  );

  // Toggle mở/gập node con
  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Toggle mở/gập phân hệ lớn (Group Accordion)
  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Mở rộng tất cả hoặc thu gọn tất cả (đồng bộ cả Group lớn lẫn Node con)
  const toggleExpandAll = () => {
    // Kiểm tra xem có đang có node hoặc group nào bị đóng không
    const hasAnyCollapsedGroup = Object.values(collapsedGroups).some((v) => v);
    const hasAnyCollapsedNode = Object.values(expandedNodes).some((v) => !v);
    const shouldExpand = hasAnyCollapsedGroup || hasAnyCollapsedNode || Object.keys(expandedNodes).length === 0;

    // Cập nhật trạng thái mở cho tất cả group
    const newCollapsedGroups: Record<string, boolean> = {};
    PERMISSION_TREE.forEach((g) => {
      newCollapsedGroups[g.id] = !shouldExpand;
    });
    setCollapsedGroups(newCollapsedGroups);

    // Cập nhật trạng thái mở cho tất cả node có con
    const newExpanded: Record<string, boolean> = {};
    const collectIds = (nodes: PermissionNode[]) => {
      for (const n of nodes) {
        if (n.children && n.children.length > 0) {
          newExpanded[n.id] = shouldExpand;
          collectIds(n.children);
        }
      }
    };
    PERMISSION_TREE.forEach((g) => collectIds(g.nodes));
    setExpandedNodes(newExpanded);
  };

  // Chọn tất cả / Bỏ chọn tất cả
  const handleSelectAll = () => {
    if (disabled) return;
    onChange(getAllLeafPermissions());
  };

  const handleDeselectAll = () => {
    if (disabled) return;
    onChange([]);
  };

  // Lọc theo search
  const matchesSearch = useCallback(
    (node: PermissionNode): boolean => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      if (node.label.toLowerCase().includes(term) || node.id.toLowerCase().includes(term)) {
        return true;
      }
      return !!node.children?.some(matchesSearch);
    },
    [searchTerm],
  );

  // Đếm tổng số nhóm khớp tìm kiếm
  const totalVisibleGroups = useMemo(() => {
    return PERMISSION_TREE.filter((group) => group.nodes.some(matchesSearch)).length;
  }, [matchesSearch]);

  return (
    <div
      className={`flex flex-col gap-3.5 rounded-2xl border transition-all ${
        isDark
          ? 'bg-slate-900/80 border-slate-800 text-slate-200'
          : 'bg-slate-50/70 border-slate-200/90 text-slate-800 shadow-xs'
      } p-4`}
    >
      {/* 1. Header — cây quyền đã tự tick theo Vai trò chọn ở trên, không còn hàng preset riêng */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
            Tinh chỉnh quyền chi tiết
          </span>
        </div>
        <span
          className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium transition-all ${
            isDark ? 'bg-slate-800 text-slate-400' : 'bg-white border border-slate-200 text-slate-500 shadow-2xs'
          }`}
        >
          Đã chọn: <strong className="text-blue-600 font-bold">{safePermissions.length}</strong> quyền
        </span>
      </div>

      {/* 2. Thanh công cụ: Tìm kiếm & Thao tác nhanh */}
      <div
        className={`flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center pt-2.5 border-t ${
          isDark ? 'border-slate-800' : 'border-slate-200/80'
        }`}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm quyền (ví dụ: TikTok, Cào tay, Báo cáo...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={disabled}
            className={`w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border transition-all focus:outline-none focus:ring-2 ${
              isDark
                ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/20'
                : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-blue-500/15 shadow-2xs'
            }`}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            disabled={disabled}
            onClick={toggleExpandAll}
            className={`px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 shadow-2xs'
            }`}
            title="Mở rộng hoặc thu gọn tất cả phân hệ và nhánh"
          >
            <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>Mở/Đóng</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={handleSelectAll}
            className={`px-2.5 py-1.5 rounded-lg border transition-colors font-medium ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 shadow-2xs'
            }`}
          >
            Chọn tất cả
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={handleDeselectAll}
            className={`px-2.5 py-1.5 rounded-lg border transition-colors ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 shadow-2xs'
            }`}
          >
            Bỏ chọn
          </button>
        </div>
      </div>

      {/* 2.5. Nạp nhanh quyền chuẩn theo vai trò */}
      <div className={`flex flex-wrap items-center gap-1.5 pt-1 text-xs border-t ${
        isDark ? 'border-slate-800/60' : 'border-slate-200/60'
      }`}>
        <span className={`text-[11px] font-medium mr-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Nạp quyền chuẩn theo vai trò:
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(getDefaultPermissionsForRole('MEMBER'))}
          className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
            isDark
              ? 'bg-slate-800/80 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 shadow-2xs'
          }`}
          title="Nạp bộ quyền chuẩn cho Nhân viên (Member)"
        >
          Nhân viên (Member)
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(getDefaultPermissionsForRole('LEADER'))}
          className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
            isDark
              ? 'bg-slate-800/80 border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
              : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 shadow-2xs'
          }`}
          title="Nạp bộ quyền chuẩn cho Trưởng nhóm (Leader)"
        >
          Trưởng nhóm (Leader)
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(getDefaultPermissionsForRole('MANAGER'))}
          className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
            isDark
              ? 'bg-slate-800/80 border-blue-500/30 text-blue-400 hover:bg-blue-500/10'
              : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 shadow-2xs'
          }`}
          title="Nạp bộ quyền chuẩn cho Quản lý (Manager)"
        >
          Quản lý (Manager)
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(getDefaultPermissionsForRole('ADMIN'))}
          className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
            isDark
              ? 'bg-slate-800/80 border-purple-500/30 text-purple-400 hover:bg-purple-500/10'
              : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 shadow-2xs'
          }`}
          title="Nạp toàn bộ quyền (Admin)"
        >
          Toàn quyền (Admin)
        </button>
      </div>

      {/* 3. Danh sách cây quyền theo phân hệ (Collapsible Group Cards với Sticky Header) */}
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {totalVisibleGroups === 0 ? (
          <div className={`p-6 text-center text-xs rounded-xl border border-dashed ${
            isDark ? 'border-slate-800 text-slate-500' : 'border-slate-300 text-slate-400'
          }`}>
            Không tìm thấy quyền nào khớp với từ khóa &ldquo;<strong>{searchTerm}</strong>&rdquo;
          </div>
        ) : (
          PERMISSION_TREE.map((group) => {
            const visibleNodes = group.nodes.filter(matchesSearch);
            if (visibleNodes.length === 0) return null;

            // Đếm số quyền đã chọn trong group này
            const groupLeafIds = group.nodes.flatMap((n) => getLeafIds(n));
            const groupSelectedCount = groupLeafIds.filter((id) => selectedSet.has(id)).length;
            // Khi đang search thì luôn bung group để thấy kết quả
            const isGroupCollapsed = searchTerm ? false : !!collapsedGroups[group.id];

            return (
              <div
                key={group.id}
                className={`rounded-xl border transition-all ${
                  isDark
                    ? 'bg-slate-950/40 border-slate-800/70'
                    : 'bg-white border-slate-200/90 shadow-2xs'
                }`}
              >
                {/* Header nhóm: Có thể bấm vào để thu gọn/mở rộng, ghim dính khi cuộn */}
                <div
                  onClick={() => toggleGroupCollapse(group.id)}
                  className={`sticky top-0 z-10 px-3.5 py-2.5 flex items-center justify-between cursor-pointer select-none rounded-t-xl transition-colors backdrop-blur-md ${
                    isGroupCollapsed ? 'rounded-b-xl' : 'border-b'
                  } ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-800/70 hover:bg-slate-800'
                      : 'bg-slate-100/90 border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isGroupCollapsed ? '-rotate-90 text-slate-400' : 'text-blue-600'
                      }`}
                    />
                    <span
                      className={`text-xs font-semibold flex items-center gap-2 ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      <Layers className={`w-3.5 h-3.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                      {group.name}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      groupSelectedCount > 0
                        ? isDark
                          ? 'bg-blue-900/40 text-blue-300 border border-blue-800'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                        : isDark
                        ? 'text-slate-500'
                        : 'text-slate-400'
                    }`}
                  >
                    {groupSelectedCount} đã chọn
                  </span>
                </div>

                {/* Danh sách các node quyền trong nhóm (ẩn khi group bị gập) */}
                {!isGroupCollapsed && (
                  <div className="p-2 space-y-1">
                    {visibleNodes.map((node) => (
                      <TreeNodeItem
                        key={node.id}
                        node={node}
                        level={0}
                        expandedNodes={expandedNodes}
                        onToggleExpand={toggleExpand}
                        onToggleCheck={handleToggleNode}
                        getNodeState={getNodeState}
                        matchesSearch={matchesSearch}
                        disabled={disabled}
                        searchTerm={searchTerm}
                        isDark={isDark}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

interface TreeNodeItemProps {
  node: PermissionNode;
  level: number;
  expandedNodes: Record<string, boolean>;
  onToggleExpand: (id: string) => void;
  onToggleCheck: (node: PermissionNode) => void;
  getNodeState: (node: PermissionNode) => 'all' | 'some' | 'none';
  matchesSearch: (node: PermissionNode) => boolean;
  disabled: boolean;
  searchTerm: string;
  isDark: boolean;
}

function TreeNodeItem({
  node,
  level,
  expandedNodes,
  onToggleExpand,
  onToggleCheck,
  getNodeState,
  matchesSearch,
  disabled,
  searchTerm,
  isDark,
}: TreeNodeItemProps) {
  // Khi đang tìm kiếm, chỉ giữ lại nhánh con khớp từ khoá
  const visibleChildren = node.children?.filter(matchesSearch) ?? [];
  const hasChildren = visibleChildren.length > 0;
  // Nếu đang search thì tự động mở rộng để thấy kết quả
  const isExpanded = searchTerm ? true : expandedNodes[node.id] ?? level === 0;
  const state = getNodeState(node);

  return (
    <div className="flex flex-col relative">
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors group relative ${
          isDark
            ? 'hover:bg-slate-800/60 text-slate-300'
            : 'hover:bg-slate-100/70 text-slate-700'
        }`}
      >
        {/* Đường nhánh ngang chữ L nối từ trục dọc vào node con (cho level > 0) */}
        {level > 0 && (
          <div
            className={`absolute -left-3.5 top-1/2 -translate-y-1/2 w-3 h-px pointer-events-none ${
              isDark ? 'bg-slate-700/80' : 'bg-slate-300'
            }`}
          />
        )}

        {/* Nút mở rộng/thu gọn nhánh con */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleExpand(node.id)}
            className={`w-4 h-4 flex items-center justify-center rounded transition-colors shrink-0 ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
            }`}
            title={isExpanded ? 'Thu gọn nhánh' : 'Mở rộng nhánh'}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {/* Checkbox đa tầng (Checked / Indeterminate / Unchecked) */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onToggleCheck(node)}
          className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
            state === 'all'
              ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
              : state === 'some'
              ? 'bg-blue-500 border-blue-500 text-white shadow-2xs'
              : isDark
              ? 'bg-slate-900 border-slate-700 hover:border-slate-500 text-transparent'
              : 'bg-white border-slate-300 hover:border-blue-500 text-transparent'
          }`}
        >
          {state === 'all' && <Check className="w-3 h-3 stroke-[3]" />}
          {state === 'some' && <Minus className="w-3 h-3 stroke-[3]" />}
        </button>

        {/* Tên quyền & mô tả chi tiết */}
        <div
          onClick={() => onToggleCheck(node)}
          className="flex-1 cursor-pointer select-none text-xs flex flex-col justify-center py-0.5 min-w-0"
        >
          <span
            className={`truncate ${
              state !== 'none'
                ? isDark
                  ? 'text-white font-semibold'
                  : 'text-slate-900 font-semibold'
                : isDark
                ? 'text-slate-400 group-hover:text-slate-300'
                : 'text-slate-600 group-hover:text-slate-800'
            }`}
          >
            {node.label}
          </span>
          {node.description && (
            <span className={`text-[10.5px] leading-tight line-clamp-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {node.description}
            </span>
          )}
        </div>
      </div>

      {/* Render các node con: Container có đường kẻ trục dọc thẳng mượt mà, không bo cong méo mó */}
      {hasChildren && isExpanded && (
        <div
          className={`flex flex-col relative ml-4 pl-3.5 border-l ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          } space-y-0.5 mt-0.5`}
        >
          {visibleChildren.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
              onToggleCheck={onToggleCheck}
              getNodeState={getNodeState}
              matchesSearch={matchesSearch}
              disabled={disabled}
              searchTerm={searchTerm}
              isDark={isDark}
            />
          ))}
        </div>
      )}
    </div>
  );
}


