'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
    Users,
    Search,
    Edit2,
    Trash2,
    UserCheck,
    UserX,
    Loader2,
    Save,
    X,
    Activity,
    LayoutGrid,
    Facebook,
    Instagram,
    Music2,
    Music,
    BookOpen,
    Settings,
    CheckSquare,
    Eye,
    FileText
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import Badge from '@/components/ui/Badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';

interface User {
    id: string;
    email: string;
    full_name: string;
    roles: UserRole[];
    is_active: boolean;
    team: string | null;
    created_at: string;
    updated_at: string;
}

const MENU_ITEMS = [
    { id: 'performance', label: 'Hiệu suất (Activity)', icon: Activity },
    { id: 'activity_performance', label: '↳ Hiệu suất (Tab)', icon: Activity, isSub: true },
    { id: 'activity_dashboard', label: '↳ Tổng quan (Tab)', icon: LayoutGrid, isSub: true },
    { id: 'activity_ranking', label: '↳ Bảng xếp hạng (Tab)', icon: Eye, isSub: true },
    { id: 'activity_personal', label: '↳ Tiến độ (Tab)', icon: Eye, isSub: true },
    { id: 'activity_report', label: '↳ Báo cáo (Tab)', icon: FileText, isSub: true },
    { id: 'activity_checklist', label: '↳ Checklist (Tab)', icon: CheckSquare, isSub: true },
    { id: 'dashboard', label: 'Dashboard Tổng', icon: LayoutGrid },
    { id: 'editors', label: 'Quản lý Thành viên', icon: Users },
    { id: 'facebook', label: 'Kênh Facebook', icon: Facebook },
    { id: 'instagram', label: 'Kênh Instagram', icon: Instagram },
    { id: 'tiktok', label: 'Kênh TikTok', icon: Music2 },
    { id: 'douyin', label: 'Kênh Douyin', icon: Music },
    { id: 'xiaohongshu', label: 'Kênh Xiaohongshu', icon: BookOpen },
    { id: 'settings', label: 'Cài đặt hệ thống', icon: Settings },
];

export default function AccountManagement() {
    const { user: currentUser, token } = useAuthStore();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState<{
        full_name: string;
        roles: UserRole[];
        is_active: boolean;
        team: string;
    }>({
        full_name: '',
        roles: [],
        is_active: true,
        team: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    useEffect(() => {
        fetchUsers();
    }, [token]);

    const fetchUsers = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();
            setUsers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (user: User) => {
        setSelectedUser(user);
        setEditForm({
            full_name: user.full_name,
            roles: [...user.roles],
            is_active: user.is_active,
            team: user.team || ''
        });
        setIsEditModalOpen(true);
    };

    const handleRoleToggle = (role: UserRole) => {
        setEditForm(prev => {
            if (prev.roles.includes(role)) {
                return { ...prev, roles: prev.roles.filter(r => r !== role) };
            } else {
                return { ...prev, roles: [...prev.roles, role] };
            }
        });
    };

    const handleUpdateUser = async () => {
        if (!selectedUser || !token) return;
        try {
            setIsSaving(true);
            // team là field phái sinh từ Đội nhóm (Team/TeamMember) — chỉ gửi khi admin thực sự
            // sửa ô team, để việc đổi role/tên không vô tình ghi đè/xoá team hiện có (gửi chuỗi
            // rỗng sẽ gỡ user khỏi TOÀN BỘ team phía backend).
            const { team, ...rest } = editForm;
            const payload: Record<string, unknown> = { ...rest };
            if (team.trim() !== (selectedUser.team || '').trim()) {
                payload.team = team.trim();
            }
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${selectedUser.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('Failed to update user');

            // Refresh list
            await fetchUsers();
            setIsEditModalOpen(false);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (user: User) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete || !token) return;
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to delete user');

            setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
            setIsDeleteModalOpen(false);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const filteredUsers = users.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRoleBadgeColor = (role: UserRole) => {
        switch (role) {
            case UserRole.ADMIN: return 'bg-red-500/10 text-red-500 border-red-500/20';
            case UserRole.MANAGER: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case UserRole.MEMBER: return 'bg-green-500/10 text-green-500 border-green-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-slate-500">Đang tải danh sách tài khoản...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header controls */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center px-1">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                    <Input
                        placeholder="Tìm theo tên hoặc email..."
                        className="pl-10 h-10 bg-slate-800 border-slate-700 text-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Users className="w-4 h-4" />
                    <span>Tổng số: {filteredUsers.length} tài khoản</span>
                </div>
            </div>

            {/* User List */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-800/50 border-b border-slate-700">
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Người dùng</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Quyền hạn</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Trạng thái</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ngày tạo</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Team</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                            <span className="text-sm font-bold text-slate-300">
                                                {user.full_name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-white">{user.full_name}</div>
                                            <div className="text-xs text-slate-500">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {user.roles.map(role => (
                                            <Badge key={role} variant="default" className={getRoleBadgeColor(role)}>
                                                {role}
                                            </Badge>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {user.is_active ? (
                                        <span className="flex items-center gap-1.5 text-xs font-medium text-green-500">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                            Hoạt động
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                            Đã khóa
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                                    {new Date(user.created_at).toLocaleDateString('vi-VN')}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                                    {user.team || '---'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {currentUser?.id !== user.id && (
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                                onClick={() => handleEditClick(user)}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                onClick={() => handleDeleteClick(user)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Edit2 className="w-5 h-5 text-blue-500" />
                            Chỉnh sửa tài khoản & Phân quyền riêng
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-8 py-6">
                        {/* Cột 1: Thông tin cơ bản */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Họ và tên</label>
                                <Input
                                    value={editForm.full_name}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Team</label>
                                <Input
                                    value={editForm.team}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, team: e.target.value }))}
                                    className="bg-slate-800 border-slate-700 text-white"
                                    placeholder="Ví dụ: Team Marketing"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Vai trò chính (Roles)</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.values(UserRole).map(role => (
                                        <button
                                            key={role}
                                            onClick={() => handleRoleToggle(role)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${editForm.roles.includes(role)
                                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                                }`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                <div className="flex items-center gap-3">
                                    {editForm.is_active ? <UserCheck className="w-5 h-5 text-green-500" /> : <UserX className="w-5 h-5 text-red-500" />}
                                    <div>
                                        <div className="text-sm font-bold">Trạng thái hoạt động</div>
                                        <div className="text-[10px] text-slate-500">Cho phép truy cập hệ thống</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEditForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors ${editForm.is_active ? 'bg-green-600' : 'bg-slate-600'}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${editForm.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>

                    </div>

                    <DialogFooter className="flex gap-2 border-t border-slate-800 pt-6">
                        <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Hủy bỏ</Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                            onClick={handleUpdateUser}
                            isLoading={isSaving}
                        >
                            Cập nhật tài khoản
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-500">
                            <Trash2 className="w-5 h-5" />
                            Xác nhận xóa
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-slate-300">
                        Bạn có chắc chắn muốn xóa tài khoản <span className="text-white font-bold">{userToDelete?.full_name}</span>? Hành động này không thể hoàn tác.
                    </div>
                    <DialogFooter className="flex gap-2">
                        <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Hủy</Button>
                        <Button
                            variant="danger"
                            onClick={handleConfirmDelete}
                        >
                            Xóa vĩnh viễn
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
            `}</style>
        </div>
    );
}

