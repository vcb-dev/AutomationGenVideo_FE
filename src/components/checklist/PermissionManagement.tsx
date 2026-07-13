'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
    Shield,
    CheckSquare,
    Square,
    Save,
    Loader2,
    Lock,
    Eye,
    LayoutGrid,
    Activity,
    Users,
    Facebook,
    Instagram,
    Music2,
    Music,
    BookOpen,
    Settings,
    FileText
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import Button from '@/components/ui/button';

interface RolePermission {
    role: UserRole;
    menu_ids: string[];
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

export default function PermissionManagement() {
    const { token } = useAuthStore();
    const [permissions, setPermissions] = useState<RolePermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<UserRole | null>(null);

    useEffect(() => {
        fetchPermissions();
    }, [token]);

    const fetchPermissions = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/role-permissions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch permissions');
            const data = await response.json();
            setPermissions(data);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = (role: UserRole, menuId: string) => {
        setPermissions(prev => {
            const hasRole = prev.find(p => p.role === role);
            if (!hasRole) {
                // If role not found in state, add it with the initial menuId
                return [...prev, { role, menu_ids: [menuId] }];
            }

            return prev.map(p => {
                if (p.role === role) {
                    const isEnabled = p.menu_ids.includes(menuId);
                    return {
                        ...p,
                        menu_ids: isEnabled
                            ? p.menu_ids.filter(id => id !== menuId)
                            : [...p.menu_ids, menuId]
                    };
                }
                return p;
            });
        });
    };

    const handleSave = async (role: UserRole) => {
        const rolePermission = permissions.find(p => p.role === role);
        if (!rolePermission || !token) return;

        try {
            setSaving(role);

            // Strip extra fields (id, created_at, etc.) as the backend uses forbidNonWhitelisted: true
            const payload = {
                role: rolePermission.role,
                menu_ids: rolePermission.menu_ids
            };

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/role-permissions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('Failed to save');
            toast.success(`Đã lưu phân quyền cho ${role}`);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-2xl">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-slate-400">Đang tải phân quyền...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                    <h4 className="text-blue-400 font-bold text-sm">Quản lý hiển thị Tab</h4>
                    <p className="text-slate-400 text-xs mt-1">
                        Cấu hình này cho phép Admin lựa chọn các ứng dụng và chức năng nào được hiển thị cho từng loại tài khoản.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {Object.values(UserRole).filter(role => ![UserRole.ADMIN, UserRole.EDITOR, UserRole.CONTENT].includes(role)).map(role => {
                    const rolePerm = permissions.find(p => p.role === role) || { role, menu_ids: [] };
                    return (
                        <div key={role} className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                            <div className="p-5 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
                                        <Lock className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{role}</h3>
                                        <p className="text-slate-500 text-xs">Quyền truy cập các tab chức năng</p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700"
                                    onClick={() => handleSave(role)}
                                    isLoading={saving === role}
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Lưu phân quyền
                                </Button>
                            </div>

                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {MENU_ITEMS.map((item) => {
                                    const isEnabled = rolePerm.menu_ids.includes(item.id);
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => togglePermission(role, item.id)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${(item as any).isSub ? 'ml-8 scale-[0.93]' : ''} ${isEnabled
                                                ? 'bg-blue-600/10 border-blue-500/50 text-white'
                                                : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${isEnabled
                                                ? 'bg-blue-600 border-blue-500 text-white'
                                                : 'bg-slate-800 border-slate-700 text-slate-600'
                                                }`}>
                                                <item.icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-semibold">{item.label}</div>
                                                <div className="text-[10px] opacity-70">
                                                    {isEnabled ? 'Đang hiển thị' : 'Đang ẩn'}
                                                </div>
                                            </div>
                                            {isEnabled ? (
                                                <CheckSquare className="w-5 h-5 text-blue-500" />
                                            ) : (
                                                <Square className="w-5 h-5 text-slate-700 group-hover:text-slate-600" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
