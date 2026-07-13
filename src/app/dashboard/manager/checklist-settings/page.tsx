'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import AccountManagement from '@/components/checklist/AccountManagement';
import {
    Settings,
    Users,
    Clock,
    ShieldCheck,
    Loader2,
    Shield
} from 'lucide-react';

interface DaySchedule {
    start: string;
    end: string;
    enabled: boolean;
}

interface ReportSettings {
    schedule: {
        [key: string]: DaySchedule;
    };
    one_report_per_day: boolean;
    timezone: string;
    is_random: boolean;
    random_minutes: number;
    updated_at?: string | null;
    updated_by?: string;
}

const DAYS = [
    { key: 'monday', label: 'Thứ 2' },
    { key: 'tuesday', label: 'Thứ 3' },
    { key: 'wednesday', label: 'Thứ 4' },
    { key: 'thursday', label: 'Thứ 5' },
    { key: 'friday', label: 'Thứ 6' },
    { key: 'saturday', label: 'Thứ 7' },
    { key: 'sunday', label: 'Chủ nhật' },
];

export default function ChecklistSettingsPage() {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'checklist' | 'accounts'>('accounts');
    const [settings, setSettings] = useState<ReportSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [settingsError, setSettingsError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const isAdmin = user?.roles?.includes(UserRole.ADMIN) || user?.roles?.includes(UserRole.MANAGER);

    // Only load settings when checklist tab is active
    useEffect(() => {
        if (activeTab === 'checklist') {
            fetchSettings();
        }
    }, [activeTab]);

    const fetchSettings = async () => {
        try {
            setSettingsError(false);
            const baseUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8001';
            const response = await fetch(`${baseUrl}/api/checklist/settings/`);
            if (!response.ok) throw new Error('Failed to fetch settings');
            const data = await response.json();
            setSettings(data);
        } catch (error) {
            console.error('Error fetching settings:', error);
            setSettingsError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleTimeChange = (day: string, field: 'start' | 'end', value: string) => {
        if (!settings) return;
        setSettings({
            ...settings,
            schedule: {
                ...settings.schedule,
                [day]: {
                    ...settings.schedule[day],
                    [field]: value,
                },
            },
        });
    };

    const handleToggleDay = (day: string) => {
        if (!settings) return;
        setSettings({
            ...settings,
            schedule: {
                ...settings.schedule,
                [day]: {
                    ...settings.schedule[day],
                    enabled: !settings.schedule[day].enabled,
                },
            },
        });
    };

    const handleSave = async () => {
        if (!settings || !user) return;
        setSaving(true);
        setMessage(null);

        try {
            const baseUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8001';
            const response = await fetch(`${baseUrl}/api/checklist/settings/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...settings,
                    updated_by: user.email,
                }),
            });

            if (!response.ok) throw new Error('Failed to save settings');

            const data = await response.json();
            setMessage({ type: 'success', text: data.message || 'Lưu cấu hình thành công' });

            // Reload settings
            await fetchSettings();
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage({ type: 'error', text: 'Không thể lưu cấu hình' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-73px)] bg-[#0f172a] p-6 -m-6">
            <style dangerouslySetInnerHTML={{
                __html: `
                header { background-color: #0f172a !important; border-bottom-color: #1e293b !important; }
                header p { color: #f8fafc !important; }
                body { background-color: #0f172a !important; }
                main { background-color: #0f172a !important; }
                .bg-gray-50 { background-color: #0f172a !important; }
                .bg-white { background-color: #0f172a !important; }
            `}} />
            <div className="max-w-6xl mx-auto space-y-8 pt-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Settings className="w-8 h-8 text-blue-500" />
                            Cài đặt hệ thống
                        </h1>
                        <p className="text-slate-400 mt-1">Quản lý cấu hình checklist và tài khoản người dùng</p>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('checklist')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'checklist'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                    >
                        <Clock className="w-4 h-4" />
                        Giờ báo cáo
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setActiveTab('accounts')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'accounts'
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            Quản lý tài khoản
                        </button>
                    )}
                </div>

                {/* Tab Content */}
                <div className="animate-in fade-in duration-500">
                    {activeTab === 'checklist' && (
                        <div className="space-y-6">
                            {/* Message */}
                            {message && (
                                <div className={`p-4 rounded-xl border ${message.type === 'success'
                                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                                    } flex items-center gap-3`}>
                                    <div className={`w-2 h-2 rounded-full ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                                    {message.text}
                                </div>
                            )}

                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800">
                                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                                    <p className="text-slate-400">Đang tải cấu hình...</p>
                                </div>
                            ) : settingsError || !settings ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800 text-center px-6">
                                    <ShieldCheck className="w-12 h-12 text-slate-700 mb-4" />
                                    <p className="text-slate-400 max-w-md">
                                        Tính năng cấu hình giờ báo cáo đang được phát triển. Vui lòng sử dụng tab &quot;Quản lý tài khoản&quot;.
                                    </p>
                                    <button
                                        onClick={fetchSettings}
                                        className="mt-4 px-6 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                                    >
                                        Thử lại
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Checklist Main Config */}
                                    <div className="lg:col-span-2 space-y-4">
                                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                                            <div className="p-6 border-b border-slate-800 bg-slate-800/30">
                                                <h3 className="font-bold text-white flex items-center gap-2">
                                                    <Clock className="w-5 h-5 text-blue-500" />
                                                    Khung giờ báo cáo theo ngày
                                                </h3>
                                            </div>
                                            <div className="p-6 space-y-3">
                                                {DAYS.map(({ key, label }) => {
                                                    const daySchedule = settings.schedule[key];
                                                    if (!daySchedule) return null;

                                                    return (
                                                        <div key={key} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${daySchedule.enabled ? 'bg-slate-800/50 border-blue-500/30' : 'bg-slate-900 border-slate-800'
                                                            }`}>
                                                            <div className="flex items-center gap-4">
                                                                <button
                                                                    onClick={() => handleToggleDay(key)}
                                                                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${daySchedule.enabled ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'
                                                                        }`}
                                                                >
                                                                    {daySchedule.enabled ? '✓' : '✗'}
                                                                </button>
                                                                <span className={`font-bold ${daySchedule.enabled ? 'text-white' : 'text-slate-500'}`}>
                                                                    {label}
                                                                </span>
                                                            </div>

                                                            {daySchedule.enabled ? (
                                                                <div className="flex items-center gap-3">
                                                                    <input
                                                                        type="time"
                                                                        value={daySchedule.start}
                                                                        onChange={(e) => handleTimeChange(key, 'start', e.target.value)}
                                                                        className="bg-slate-800 border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                                    />
                                                                    <span className="text-slate-600">→</span>
                                                                    <input
                                                                        type="time"
                                                                        value={daySchedule.end}
                                                                        onChange={(e) => handleTimeChange(key, 'end', e.target.value)}
                                                                        className="bg-slate-800 border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-slate-600 italic">Nghỉ báo cáo</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sidebar Config / Summary */}
                                    <div className="space-y-6">
                                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl shadow-blue-900/20">
                                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                                <ShieldCheck className="w-5 h-5" />
                                                Quy tắc chung
                                            </h3>
                                            <p className="text-blue-100 text-sm mb-6">Áp dụng cho toàn bộ nhân viên tham gia báo cáo checklist.</p>

                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                                                    <span className="text-sm font-medium">Chỉ báo cáo 1 lần/ngày</span>
                                                    <button
                                                        onClick={() => setSettings({ ...settings, one_report_per_day: !settings.one_report_per_day })}
                                                        className={`w-10 h-5 rounded-full p-1 transition-colors ${settings.one_report_per_day ? 'bg-green-400' : 'bg-white/20'}`}
                                                    >
                                                        <div className={`w-3 h-3 rounded-full bg-slate-900 transition-transform ${settings.one_report_per_day ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                                                    <span className="text-sm font-medium">Báo cáo ngẫu nhiên</span>
                                                    <button
                                                        onClick={() => setSettings({ ...settings, is_random: !settings.is_random })}
                                                        className={`w-10 h-5 rounded-full p-1 transition-colors ${settings.is_random ? 'bg-amber-400' : 'bg-white/20'}`}
                                                    >
                                                        <div className={`w-3 h-3 rounded-full bg-slate-900 transition-transform ${settings.is_random ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>

                                                {settings.is_random && (
                                                    <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                                                        <div className="text-[10px] uppercase tracking-wider text-blue-200 mb-2 opacity-70">Số phút ngẫu nhiên mỗi ngày</div>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="range"
                                                                min="5"
                                                                max="120"
                                                                step="5"
                                                                value={settings.random_minutes}
                                                                onChange={(e) => setSettings({ ...settings, random_minutes: parseInt(e.target.value) })}
                                                                className="flex-1 accent-white"
                                                            />
                                                            <span className="text-sm font-bold w-12 text-right">{settings.random_minutes}m</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                                                    <div className="text-[10px] uppercase tracking-wider text-blue-200 mb-1 opacity-70">Múi giờ hệ thống</div>
                                                    <div className="text-sm font-bold tracking-tight">{settings.timezone}</div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleSave}
                                                disabled={saving}
                                                className="w-full mt-8 py-3 bg-white text-blue-700 font-bold rounded-xl shadow-lg hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Lưu tất cả cấu hình'}
                                            </button>

                                            {settings.updated_by && (
                                                <div className="mt-4 text-[10px] text-blue-200 text-center opacity-70 italic">
                                                    Cập nhật bởi: {settings.updated_by}
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-left">
                                            <h4 className="text-white font-bold mb-3 text-sm">Hướng dẫn</h4>
                                            <ul className="space-y-2 text-xs text-slate-400">
                                                <li className="flex gap-2">
                                                    <span className="text-blue-500 font-bold">●</span>
                                                    <span>Nhân viên chỉ có thể submit báo cáo trong khung giờ đã bật.</span>
                                                </li>
                                                <li className="flex gap-2">
                                                    <span className="text-blue-500 font-bold">●</span>
                                                    <span>Nên để dư 5-10 phút so với giờ làm việc thực tế.</span>
                                                </li>
                                                <li className="flex gap-2">
                                                    <span className="text-blue-500 font-bold">●</span>
                                                    <span>Số phút ngẫu nhiên: Thời gian mở form sẽ thay đổi ngẫu nhiên từng ngày trong khung giờ đã định.</span>
                                                </li>
                                                <li className="flex gap-2">
                                                    <span className="text-blue-500 font-bold">●</span>
                                                    <span>Cấu hình này áp dụng tức thì cho màn hình Report.</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'accounts' && isAdmin && (
                        <div className="animate-in fade-in duration-500">
                            <AccountManagement />
                        </div>
                    )}


                </div>
            </div>
        </div>
    );
}
