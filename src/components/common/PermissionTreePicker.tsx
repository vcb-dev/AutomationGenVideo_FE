'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Check,
  Minus,
  Search,
  CheckCheck,
  X,
  Sparkles,
  Shield,
  Layers,
  ChevronsUpDown,
  SlidersHorizontal,
} from 'lucide-react';
import {
  PERMISSION_TREE,
  PermissionNode,
  getLeafIds,
  getAllLeafPermissions,
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

  // Toggle mở/gập node
  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Mở rộng tất cả hoặc thu gọn tất cả
  const toggleExpandAll = () => {
    const shouldExpand = Object.values(expandedNodes).some((v) => !v);
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
          className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
            isDark ? 'bg-slate-800 text-slate-400' : 'bg-white border border-slate-200 text-slate-500'
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
            title="Mở rộng hoặc thu gọn tất cả nhánh"
          >
            <ChevronsUpDown className="w-3 h-3 text-slate-400" />
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

      {/* 3. Danh sách cây quyền */}
      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
        {PERMISSION_TREE.map((group) => {
          const visibleNodes = group.nodes.filter(matchesSearch);
          if (visibleNodes.length === 0) return null;

          // Đếm số quyền đã chọn trong group này
          const groupLeafIds = group.nodes.flatMap((n) => getLeafIds(n));
          const groupSelectedCount = groupLeafIds.filter((id) => selectedSet.has(id)).length;

          return (
            <div
              key={group.id}
              className={`rounded-xl border overflow-hidden transition-all ${
                isDark
                  ? 'bg-slate-950/40 border-slate-800/70'
                  : 'bg-white border-slate-200/90 shadow-2xs'
              }`}
            >
              <div
                className={`px-3.5 py-2 border-b flex items-center justify-between ${
                  isDark ? 'bg-slate-800/60 border-slate-800/70' : 'bg-slate-100/70 border-slate-200/80'
                }`}
              >
                <span
                  className={`text-xs font-semibold flex items-center gap-2 ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  <Layers className={`w-3.5 h-3.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  {group.name}
                </span>
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

              <div className="p-2 space-y-0.5">
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
            </div>
          );
        })}
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
  // Khi đang tìm kiếm, chỉ giữ lại nhánh con khớp từ khoá — nếu không thì gõ "TikTok" vẫn
  // hiện nguyên cả 11 nền tảng vì node cha khớp gián tiếp qua con.
  const visibleChildren = node.children?.filter(matchesSearch) ?? [];
  const hasChildren = visibleChildren.length > 0;
  // Nếu đang search thì tự động mở rộng để thấy kết quả
  const isExpanded = searchTerm ? true : expandedNodes[node.id] ?? level === 0;
  const state = getNodeState(node);

  return (
    <div className="flex flex-col">
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors group ${
          isDark
            ? 'hover:bg-slate-800/60 text-slate-300'
            : 'hover:bg-slate-100/70 text-slate-700'
        } ${level > 0 ? (isDark ? 'ml-4 pl-2 border-l border-slate-800' : 'ml-4 pl-2 border-l border-slate-200') : ''}`}
      >
        {/* Nút mở rộng/thu gọn */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleExpand(node.id)}
            className={`w-4 h-4 flex items-center justify-center rounded transition-colors ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Checkbox đa tầng */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onToggleCheck(node)}
          className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
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

        {/* Tên quyền & mô tả */}
        <div
          onClick={() => onToggleCheck(node)}
          className="flex-1 cursor-pointer select-none text-xs flex flex-col justify-center py-0.5"
        >
          <span
            className={`${
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
            <span className={`text-[10.5px] leading-tight ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {node.description}
            </span>
          )}
        </div>
      </div>

      {/* Render children nếu có */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col">
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

