'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import ChecklistSection, { CHECKLIST_ITEMS } from './ChecklistSection';
import DetailSection, { DETAIL_ITEMS } from './DetailSection';
import LeaderEvaluationSection, { LEADER_QUESTIONS } from './LeaderEvaluationSection';
import TrafficReportSection, { TrafficData, initialTrafficData, initialTrafficChannels } from './TrafficReportSection';
import { Send, AlertCircle, Calendar, ChevronDown, Check, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';
import { toast } from 'react-hot-toast';

const initialChecks = () => Array(CHECKLIST_ITEMS.length).fill(false);
const initialDetails = () => Array(DETAIL_ITEMS.length).fill('');
const initialLeaderAnswers = () => Array(LEADER_QUESTIONS.length).fill('');

/** Ngày theo lịch máy dạng YYYY-MM-DD (không dùng toLocaleDateString('en-CA') để so sánh — iOS Safari có thể trả M/D/YYYY và làm sai chuỗi). */
function localCalendarYMD(d: Date = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Deadline báo cáo: 10:00 sáng. Đã bỏ logic khoá. */
function isPastDailyDeadline(): boolean {
    return false;
}

const ChecklistDatePicker = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const date = new Date(value);
    const [viewDate, setViewDate] = useState(new Date(date));
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();

    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + offset);
        // Không cho navigate sang tháng tương lai
        if (newDate.getFullYear() > todayYear || (newDate.getFullYear() === todayYear && newDate.getMonth() > todayMonth)) {
            return;
        }
        setViewDate(newDate);
    };

    const days = [];
    const totalDays = daysInMonth(currentYear, currentMonth);
    const startDay = firstDayOfMonth(currentYear, currentMonth);

    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);

    const isToday = (day: number) => {
        const today = new Date();
        return today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
    };

    const isSelected = (day: number) => {
        return date.getDate() === day && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    };

    const isFutureDay = (day: number) => {
        if (currentYear > todayYear) return true;
        if (currentYear === todayYear && currentMonth > todayMonth) return true;
        if (currentYear === todayYear && currentMonth === todayMonth && day > todayDay) return true;
        return false;
    };

    const handleDateSelect = (day: number) => {
        if (isFutureDay(day)) return; // Block future dates
        const year = currentYear;
        const month = String(currentMonth + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        onChange(`${year}-${month}-${d}`);
        setIsOpen(false);
    };

    const formatDateDisplay = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full sm:w-72 h-14 pl-14 pr-12 rounded-2xl border border-blue-500 bg-blue-600 text-white font-black transition-all outline-none flex items-center shadow-lg shadow-blue-200/50 hover:bg-blue-700 hover:shadow-blue-300/50 group"
            >
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-500/30 rounded-lg flex items-center justify-center pointer-events-none group-focus-within:bg-blue-400/40 transition-colors">
                    <Calendar className="w-4 h-4 text-white" />
                </div>
                <span>{formatDateDisplay(value)}</span>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-100 pointer-events-none group-hover:text-white transition-colors">
                    <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full mt-2 right-0 w-[320px] bg-slate-950 rounded-[2rem] shadow-2xl border border-slate-800 p-6 z-[1000]"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="text-sm font-black text-white uppercase tracking-widest leading-none">
                                Tháng {currentMonth + 1} Năm {currentYear}
                            </div>
                            <button onClick={() => changeMonth(1)} disabled={currentYear === todayYear && currentMonth === todayMonth} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day) => (
                                <div key={day} className="text-center text-[10px] font-black text-slate-600 uppercase tracking-tighter h-8 flex items-center justify-center">{day}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {days.map((day, idx) => (
                                <div key={idx} className="aspect-square flex items-center justify-center">
                                    {day ? (
                                        <button
                                            type="button"
                                            disabled={isFutureDay(day)}
                                            onClick={() => handleDateSelect(day)}
                                            className={`w-10 h-10 flex items-center justify-center text-xs font-bold rounded-xl transition-all
                                                ${isFutureDay(day)
                                                    ? 'text-slate-700 cursor-not-allowed'
                                                    : isSelected(day)
                                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                        : isToday(day)
                                                            ? 'bg-slate-800 text-blue-400 ring-1 ring-blue-500/30'
                                                            : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    ) : <div className="w-10 h-10" />}
                                </div>
                            ))}
                        </div>

                        <div className="mt-6">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="w-full py-4 text-xs font-black text-white bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 hover:border-slate-700 transition-all uppercase tracking-[0.2em] shadow-inner"
                            >
                                Hoàn tất
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ChecklistContainer = ({
    mode,
    showOnlyTraffic = false,
    showOnlyWork = false,
    onSuccess
}: {
    mode?: 'member' | 'leader',
    showOnlyTraffic?: boolean,
    showOnlyWork?: boolean,
    onSuccess?: () => void
}) => {
    const { user } = useAuthStore();
    const [checks, setChecks] = useState<boolean[]>(initialChecks);
    const [details, setDetails] = useState<string[]>(initialDetails);
    const [leaderAnswers, setLeaderAnswers] = useState<string[]>(initialLeaderAnswers);
    const [traffic, setTraffic] = useState<TrafficData>(initialTrafficData());
    const [trafficChannels, setTrafficChannels] = useState<TrafficData>(initialTrafficChannels());
    const [entryDetails, setEntryDetails] = useState<Record<string, any>>({});
    const [platformEvidences, setPlatformEvidences] = useState<Record<string, string[]>>({});

    const [reportDate, setReportDate] = useState<string>(() => localCalendarYMD());
    const [submitCount, setSubmitCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [larkRole, setLarkRole] = useState<string | null>(null);
    const [availableChannels, setAvailableChannels] = useState<any[]>([]);
    const [selectedTeam, setSelectedTeam] = useState('');
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [historicalEvidences, setHistoricalEvidences] = useState<Record<string, { url: string; name: string; token: string }[]>>({} as any);
    const [hasFetchedReport, setHasFetchedReport] = useState(false);   // đã fetch xong chưa?
    const [hasReportData, setHasReportData] = useState(false);          // có dữ liệu báo cáo chưa?

    // Deadline 10h: khoá toàn bộ form nếu đã qua 10h sáng hôm nay (chỉ áp dụng cho ngày hôm nay)
    const [isDeadlinePassed, setIsDeadlinePassed] = useState<boolean>(() => isPastDailyDeadline());
    useEffect(() => {
        setIsDeadlinePassed(isPastDailyDeadline());
        // Re-check mỗi phút để UI tự khoá khi đến 10h
        const timer = setInterval(() => setIsDeadlinePassed(isPastDailyDeadline()), 60_000);
        return () => clearInterval(timer);
    }, []);
    // Chỉ khoá deadline nếu đang xem ngày hôm nay (ngày quá khứ đã khoá bởi isPastDate rồi)
    const isDeadlineLockedToday = isDeadlinePassed && reportDate === localCalendarYMD();

    // Fetch Lark Permission Role on mount
    useEffect(() => {
        const fetchLarkRole = async () => {
            if (!user?.email) return;

            try {
                const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
                const base = apiBase.replace(/\/$/, '');
                const url = base.endsWith('/api')
                    ? `${base}/lark/user-permission?email=${encodeURIComponent(user.email)}`
                    : `${base}/api/lark/user-permission?email=${encodeURIComponent(user.email)}`;

                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.role) {
                        setLarkRole(data.role); // e.g., 'Leader', 'Admin'
                    }
                }
            } catch (err) {
                console.error('Failed to fetch Lark role:', err);
            }
        };

        fetchLarkRole();
    }, [user?.email]);

    // Fetch historical report for checking read-only status
    useEffect(() => {
        const fetchReportDetails = async () => {
            if (!user?.email || !reportDate) return;

            // Reset current form before fetching
            setHasFetchedReport(false);
            setHasReportData(false);
            setIsReadOnly(false);
            setChecks(initialChecks());
            setDetails(initialDetails());
            setLeaderAnswers(initialLeaderAnswers());
            setTraffic(initialTrafficData());
            setTrafficChannels(initialTrafficChannels());
            setEntryDetails({});
            setHistoricalEvidences({} as any);

            try {
                const beBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
                const url = `${beBaseUrl}/lark/user-report-details?email=${encodeURIComponent(user.email)}&date=${reportDate}&_t=${Date.now()}`;

                const response = await fetch(url, { cache: 'no-store' });
                if (response.ok) {
                    const data = await response.json();
                    
                    // Logic: Nếu ngày chọn < ngày hiện tại -> Luôn ReadOnly
                    const todayStr = localCalendarYMD();
                    const isPastDate = reportDate < todayStr;

                    if (isPastDate) {
                        setIsReadOnly(true);
                    } else if (data && (data.report || data.traffic)) {
                        let shouldBeReadOnly = false;
                        if (showOnlyTraffic) {
                            shouldBeReadOnly = !!data.traffic;
                        } else if (showOnlyWork) {
                            shouldBeReadOnly = !!data.report;
                        } else {
                            // If showing both, base it on whether either exists, but allow submission of the missing part
                            shouldBeReadOnly = !!data.report && !!data.traffic;
                        }
                        setIsReadOnly(shouldBeReadOnly);
                    } else {
                        // Nếu không có dữ liệu và không phải ngày quá khứ thì reset
                        if (!isPastDate) setIsReadOnly(false);
                    }

                    if (data && (data.report || data.traffic)) {
                        setHasReportData(true);
                        if (data.report) {
                            const answers = (data.report.answers || {}) as Record<string, any>;

                            // Restore checklist
                            const newChecks = CHECKLIST_ITEMS.map(label => !!answers[label]);
                            setChecks(newChecks);

                            // Restore details
                            const newDetails = DETAIL_ITEMS.map(item => String(answers[item.question] || ''));
                            setDetails(newDetails);

                            // Restore leader answers
                            const newLeaderAnswers = LEADER_QUESTIONS.map(item => String(answers[item.question] || ''));
                            setLeaderAnswers(newLeaderAnswers);
                        }

                        if (data.traffic) {
                            const newTraffic = initialTrafficData();
                            const newChannels = initialTrafficChannels();
                            const newEvidences: Record<string, { url: string; name: string; token: string }[]> = {};

                            const platforms = ['fb', 'ig', 'tiktok', 'yt', 'thread', 'lemon8', 'zalo', 'twitter'];

                            // Check for evidence_files fallback for older/synced records
                            let sharedEvidences: any[] = [];
                            if (data.traffic.evidence_files) {
                                try {
                                    sharedEvidences = JSON.parse(data.traffic.evidence_files);
                                    if (!Array.isArray(sharedEvidences)) sharedEvidences = [];
                                } catch (e) {
                                    if (data.traffic.evidence_files) sharedEvidences = [data.traffic.evidence_files];
                                }
                            }

                            platforms.forEach(p => {
                                // Traffic values
                                const trafficKey = `traffic_${p}` as keyof any;
                                if (data.traffic[trafficKey] !== undefined && data.traffic[trafficKey] !== null) {
                                    newTraffic[p as keyof TrafficData] = String(data.traffic[trafficKey]);
                                }

                                // Channel names
                                const channelKey = `channel_${p}` as keyof any;
                                if (data.traffic[channelKey] !== undefined && data.traffic[channelKey] !== null) {
                                    newChannels[p as keyof TrafficData] = data.traffic[channelKey];
                                }

                                // Evidence URLs
                                const evidenceKey = `evidence_${p}` as keyof any;
                                const rawEvidence = data.traffic[evidenceKey];
                                if (rawEvidence) {
                                    try {
                                        let evidenceData = [];
                                        if (typeof rawEvidence === 'string' && (rawEvidence.startsWith('[') || rawEvidence.startsWith('{'))) {
                                            evidenceData = JSON.parse(rawEvidence);
                                        } else {
                                            evidenceData = rawEvidence;
                                        }

                                        if (Array.isArray(evidenceData)) {
                                            newEvidences[p] = evidenceData.map((ev: any) => ({
                                                url: typeof ev === 'string' ? ev : (ev.url || ''),
                                                name: typeof ev === 'string' ? 'Minh chứng' : (ev.name || 'Minh chứng'),
                                                token: typeof ev === 'string' ? '' : (ev.token || '')
                                            }));
                                        } else if (typeof evidenceData === 'string' && evidenceData.length > 0) {
                                            newEvidences[p] = [{ url: evidenceData, name: 'Minh chứng', token: '' }];
                                        }
                                    } catch (e) {
                                        if (typeof rawEvidence === 'string' && rawEvidence.length > 0) {
                                            newEvidences[p] = [{ url: rawEvidence, name: 'Minh chứng', token: '' }];
                                        }
                                    }
                                } else if (sharedEvidences.length > 0 && newTraffic[p as keyof TrafficData] && Number(newTraffic[p as keyof TrafficData]) > 0) {
                                    // Fallback to shared evidences if platform-specific is missing but traffic > 0
                                    newEvidences[p] = sharedEvidences.map((ev: any) => ({
                                        url: typeof ev === 'string' ? ev : (ev.url || ''),
                                        name: typeof ev === 'string' ? 'Minh chứng' : (ev.name || 'Minh chứng'),
                                        token: typeof ev === 'string' ? '' : (ev.token || '')
                                    }));
                                }
                            });

                            setTraffic(newTraffic);
                            setTrafficChannels(newChannels);
                            setHistoricalEvidences(newEvidences);
                            if (data.traffic.details) {
                                let rawDetails = (data.traffic.details as any).breakdown || data.traffic.details;
                                if (Array.isArray(rawDetails)) {
                                    // Group array by platform for the frontend's Record<string, TrafficEntry[]> requirement
                                    const grouped = rawDetails.reduce((acc: any, item: any) => {
                                        const pid = item.platform || 'unknown';
                                        if (!acc[pid]) acc[pid] = [];
                                        acc[pid].push({
                                            ...item,
                                            id: item.id || `hist_${pid}_${acc[pid].length}_${Math.random().toString(36).substr(2, 4)}`,
                                            value: String(item.value || '')
                                        });
                                        return acc;
                                    }, {} as Record<string, any[]>);
                                    setEntryDetails(grouped);
                                } else {
                                    setEntryDetails(rawDetails);
                                }
                            }
                        }


                    }
                }
            } catch (err) {
                console.error('Failed to fetch report details:', err);
            } finally {
                setHasFetchedReport(true);
            }
        };

        fetchReportDetails();
    }, [user?.email, reportDate]);

    // Parse user teams for multi-team selector
    const userTeams = React.useMemo(() => {
        if (!user?.team) return [];
        return user.team.split(',').map((t: string) => t.trim()).filter(Boolean);
    }, [user?.team]);

    // Fetch user channels (re-fetch when selectedTeam changes)
    useEffect(() => {
        const fetchChannels = async () => {
            if (!user?.email && !user?.full_name) return;
            try {
                const beBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
                const url = new URL(`${beBaseUrl}/lark/channel`, window.location.origin);

                // Send both email and owner so the backend can match channels by EITHER field.
                // This ensures correct results even if the channel.email enrichment was incomplete.
                if (user.email) {
                    url.searchParams.append('email', user.email);
                }
                if (user.full_name) {
                    url.searchParams.append('owner', user.full_name);
                }
                if (selectedTeam) {
                    url.searchParams.append('team', selectedTeam);
                }

                const res = await fetch(url.toString());
                if (res.ok) {
                    const data = await res.json();
                    setAvailableChannels(data);
                }
            } catch (err) {
                console.error('Failed to fetch channels:', err);
            }
        };
        fetchChannels();
    }, [user?.email, user?.full_name, selectedTeam]);

    const roles = user?.roles || [];
    const isAdmin = roles.includes(UserRole.ADMIN) || roles.includes(UserRole.MANAGER) || larkRole?.toLowerCase() === 'admin';
    const isLeader = roles.includes(UserRole.LEADER) || larkRole?.toLowerCase() === 'leader';
    const isStaff = roles.includes(UserRole.EDITOR) || roles.includes(UserRole.CONTENT) || roles.includes(UserRole.MEMBER);

    const showForm12 = mode ? mode === 'member' : (isAdmin || isStaff);
    const showForm3 = mode ? mode === 'leader' : (isAdmin || isLeader);

    const handleCheckChange = useCallback((index: number, checked: boolean) => {
        if (isReadOnly) return;
        setChecks((prev) => {
            const next = [...prev];
            next[index] = checked;
            return next;
        });
    }, [isReadOnly]);

    const handleDetailChange = useCallback((index: number, value: string) => {
        if (isReadOnly) return;
        setDetails((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    }, [isReadOnly]);

    const handleLeaderAnswerChange = useCallback((index: number, value: string) => {
        if (isReadOnly) return;
        setLeaderAnswers((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    }, [isReadOnly]);

    const handleTrafficChange = useCallback((platformId: keyof TrafficData, value: string) => {
        if (isReadOnly) return;
        setTraffic((prev) => ({ ...prev, [platformId]: value }));
    }, [isReadOnly]);

    const handleChannelChange = useCallback((platformId: keyof TrafficData, value: string) => {
        if (isReadOnly) return;
        setTrafficChannels((prev) => ({ ...prev, [platformId]: value }));
    }, [isReadOnly]);

    const buildPayload = useCallback((): Record<string, boolean | string> => {
        const payload: Record<string, boolean | string> = {
            isLate: false,
            reportDate: reportDate,
        };
        CHECKLIST_ITEMS.forEach((label, i) => {
            payload[label] = checks[i] ?? false;
        });
        DETAIL_ITEMS.forEach((item, i) => {
            payload[item.question] = (details[i] ?? '').trim() || '';
        });

        // Add Leader answers only if user is authorized as leader
        if (showForm3) {
            LEADER_QUESTIONS.forEach((item, i) => {
                payload[item.question] = (leaderAnswers[i] ?? '').trim() || '';
            });
        }

        return payload;
    }, [checks, details, leaderAnswers, showForm3]);

    const handleSubmit = async () => {
        // Khoá tuyệt đối nếu đã quá 10h và đang báo cáo ngày hôm nay
        if (isDeadlineLockedToday) {
            toast.error('⏰ Đã qua 10:00 sáng — Báo cáo hôm nay đã bị khoá. Liên hệ quản lý nếu cần ghi nhận muộn.');
            return;
        }
        if (!user) {
            toast.error('Vui lòng đăng nhập để gửi báo cáo.');
            return;
        }

        // Validate Traffic
        if ((showForm12 || showForm3) && !showOnlyWork) {
            // Validate Date for Traffic Report
            if (showOnlyTraffic && !reportDate) {
                toast.error('Vui lòng chọn ngày báo cáo');
                return;
            }

            const hasTrafficData = Object.values(traffic).some(val => val !== '');
            if (!hasTrafficData) {
                toast.error('Vui lòng nhập số liệu báo cáo Traffic tối thiểu 1 nền tảng (nếu không có hãy nhập số 0).');
                return;
            }

            // #region agent log
            if (typeof window !== 'undefined') {
                const platforms = ['fb', 'ig', 'tiktok', 'yt', 'thread', 'lemon8', 'zalo', 'twitter'];
                const evidenceCounts = platforms.reduce((acc: any, k) => {
                    acc[k] = (platformEvidences?.[k] || []).length;
                    return acc;
                }, {} as Record<string, number>);
                const positiveTrafficPlatforms = platforms.filter((k) => {
                    const v = traffic?.[k as keyof TrafficData];
                    return v && Number(v) > 0;
                });
                fetch('http://127.0.0.1:7242/ingest/50a1c944-63a6-4094-af64-9a73a105402a', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        location: 'ChecklistContainer.tsx:handleSubmit',
                        message: 'traffic submit precheck (evidence optional)',
                        data: {
                            hasTrafficData,
                            showOnlyWork,
                            showOnlyTraffic,
                            positiveTrafficPlatforms,
                            evidenceCounts,
                        },
                        timestamp: Date.now(),
                        hypothesisId: 'H1',
                        runId: 'post-fix',
                    }),
                }).catch(() => {});
            }
            // #endregion

            // Evidence is optional: do not block submission when missing.
            // (Backend already accepts empty evidences and will store evidence_* only when provided.)

            /*
            // Validate Evidence for each platform with traffic > 0 (REMOVED)
            const platforms = [
                { id: 'fb', label: 'FB' },
                { id: 'ig', label: 'IG' },
                { id: 'tiktok', label: 'Tiktok' },
                { id: 'yt', label: 'YT' },
                { id: 'thread', label: 'Thread' },
                { id: 'lemon8', label: 'Lemon 8' },
                { id: 'zalo', label: 'Zalo' },
                { id: 'twitter', label: 'Twitter' },
            ];

            for (const p of platforms) {
                const val = traffic[p.id as keyof TrafficData];
                if (val && Number(val) > 0) {
                    const evs = platformEvidences[p.id] || [];
                    if (evs.length === 0) {
                        toast.error(`Vui lòng tải ảnh minh chứng cho Traffic ${p.label}`);
                        return;
                    }
                }
            }
            */
        }

        // Validate Form Chi Tiết (Member)
        if (showForm12 && !showOnlyTraffic) {
            // Kiểm tra các item xem có bị bỏ trống hay bấm "Có" mà không nhập nội dung
            const hasEmptyDetails = details.some(d => d.trim() === '');
            if (hasEmptyDetails) {
                toast.error('Vui lòng điền đủ báo cáo');
                return;
            }
        }

        // Validate Form Đánh Giá (Leader)
        if (showForm3 && !showOnlyTraffic) {
            const hasEmptyLeader = leaderAnswers.some(l => l.trim() === '');
            if (hasEmptyLeader) {
                toast.error('Vui lòng điền đủ báo cáo');
                return;
            }
        }

        setLoading(true);
        try {
            if (!showOnlyTraffic) {
                const payload = buildPayload();
                // Thêm thông tin user vào payload
                const fullPayload = {
                    ...payload,
                    userEmail: user.email,
                    userName: user.full_name,
                    userTeam: user.team,
                    userRoles: user.roles,
                    reportDate: reportDate,
                };

                // Checklist API được chuyển sang NestJS BE (NEXT_PUBLIC_API_URL) thay vì Django AI
                // NestJS ghi thẳng vào lüc_reports qua Prisma → đúng DB server luôn
                const beBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
                const url = `${beBaseUrl}/lark/checklist-report`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(fullPayload),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok || data.success === false) {
                    const errMsg = typeof data.message === 'string' ? data.message :
                        typeof data.error === 'string' ? data.error : 'Gửi báo cáo thất bại.';
                    toast.error(errMsg);
                    setLoading(false);
                    return;
                }
                toast.success(data.message || 'Báo cáo thành công');
                
                setIsReadOnly(true); // Khóa form ngay lập tức sau khi gửi thành công

            }

            // Gửi báo cáo traffic tới AutomationGenVideo_BE nếu có nhập dữ liệu traffic
            const hasTrafficData = Object.values(traffic).some(val => val !== '');
            if (hasTrafficData && !showOnlyWork) {
                const beBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
                const trafficRes = await fetch(`${beBaseUrl}/lark/traffic-report`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: user.email,
                        name: user.full_name,
                        roles: user.roles,
                        traffic: traffic,
                        channels: trafficChannels,
                        platformEvidences: platformEvidences,
                        trafficDetails: {
                            breakdown: Object.keys(entryDetails).reduce((acc, platformId) => {
                                acc[platformId] = (entryDetails[platformId] || []).map((entry: any) => ({
                                    ...entry,
                                    evidences: (entry.evidences || []).map((ev: any) => ({
                                        url: ev.url,
                                        name: ev.name
                                    }))
                                }));
                                return acc;
                            }, {} as Record<string, any>),
                            evidences: platformEvidences
                        },
                        reportDate: reportDate, // Send custom date
                    })


                });

                if (showOnlyTraffic) {
                    if (trafficRes.ok) {
                        toast.success('Báo cáo Traffic thành công');
                    } else {
                        const errData = await trafficRes.json().catch(() => ({}));
                        toast.error(errData.message || 'Gửi báo cáo traffic thất bại');
                        setLoading(false);
                        return;
                    }
                }

                setTraffic(initialTrafficData());
                setTrafficChannels(initialTrafficChannels());
                setPlatformEvidences({});
                setIsReadOnly(true); // Khóa traffic sau khi gửi thành công
                setSubmitCount(prev => prev + 1);
                if (onSuccess) onSuccess();
            } else {
                if (!showOnlyWork) toast.success('Báo cáo thành công');
                setIsReadOnly(true);
                setSubmitCount(prev => prev + 1);
                if (onSuccess) onSuccess();
            }

        } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            const isNetwork = err.message?.includes('fetch') || err.name === 'TypeError';
            toast.error(isNetwork
                ? 'Không kết nối được backend. Kiểm tra Django đã chạy (ví dụ http://localhost:8000) và CORS.'
                : (err.message || 'Lỗi kết nối. Kiểm tra backend và CORS.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-3 pb-6">
            {/* Header with Date Picker */}
            <div className="relative z-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-blue-50/80 backdrop-blur-xl p-3 rounded-2xl border-2 border-blue-500/50 shadow-xl shadow-blue-500/10">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-400/30">
                        <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-blue-900 uppercase tracking-tight">Ngày báo cáo</h2>
                        <p className="text-sm text-blue-600/60 font-medium italic">Chọn thời điểm thực hiện báo cáo</p>
                    </div>
                </div>
                <div className="w-full sm:w-auto">
                    <ChecklistDatePicker value={reportDate} onChange={setReportDate} />
                </div>
            </div>

            {(reportDate < localCalendarYMD()) && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl mb-6 flex items-center gap-3 animate-in slide-in-from-top duration-500">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
                    <p className="text-sm font-semibold">
                        {`Ngày ${reportDate.split('-').reverse().join('/')} đã qua (theo lịch). Chỉ xem dữ liệu đã gửi — không gửi hay sửa thêm cho ngày này.`}
                    </p>
                </div>
            )}


            {/* Chỉ hiện form khi CHƯA khoá deadline hôm nay (isDeadlineLockedToday = false)
                 Ngày quá khứ: vẫn hiện form nhưng readOnly — để user xem lại dữ liệu đã gửi
                 Đã khoá 10h hôm nay mà chưa gửi: ẩn form hoàn toàn, chỉ hiện banner đỏ */}
            {!isDeadlineLockedToday && (
                <div className="grid grid-cols-1 gap-4 items-stretch">

                    {/* Nếu đã fetch xong mà chưa có báo cáo và không phải ngày quá khứ - hiện badge "Chưa báo cáo" */}
                    {hasFetchedReport && !hasReportData && !isReadOnly && reportDate >= localCalendarYMD() && !showOnlyTraffic && (
                        <div className="flex items-center gap-3 bg-orange-50 border-2 border-orange-200 rounded-2xl px-5 py-4 animate-in slide-in-from-top duration-300">
                            <span className="text-2xl">📋</span>
                            <div>
                                <p className="text-sm font-black text-orange-700 uppercase tracking-tight">Chưa báo cáo</p>
                                <p className="text-xs text-orange-500 font-medium">Bạn chưa gửi báo cáo công việc hôm nay. Hãy điền vào form bên dưới nhé!</p>
                            </div>
                        </div>
                    )}

                    {/* Số liệu traffic chưa báo cáo */}
                    {hasFetchedReport && !hasReportData && !isReadOnly && reportDate >= localCalendarYMD() && showOnlyTraffic && (
                        <div className="flex items-center gap-3 bg-purple-50 border-2 border-purple-200 rounded-2xl px-5 py-4 animate-in slide-in-from-top duration-300">
                            <span className="text-2xl">📊</span>
                            <div>
                                <p className="text-sm font-black text-purple-700 uppercase tracking-tight">Chưa báo cáo traffic</p>
                                <p className="text-xs text-purple-500 font-medium">Bạn chưa gửi số liệu traffic hôm nay. Hãy nhập số liệu vào form bên dưới!</p>
                            </div>
                        </div>
                    )}

                    {/* Always show Checklist Section for both Member and Leader - Hide if only traffic */}
                    {(showForm12 || showForm3) && !showOnlyTraffic && (
                        <div className="bg-slate-50/50 backdrop-blur-sm rounded-2xl p-3 shadow-lg shadow-blue-500/5 border-2 border-blue-500/30">
                            <ChecklistSection
                                values={checks}
                                onChange={handleCheckChange}
                                readOnly={isReadOnly}
                            />
                        </div>
                    )}

                    {/* Show Detail Section for Member/Staff - Hide if only traffic */}
                    {showForm12 && !showOnlyTraffic && (
                        <div className="bg-slate-50/50 backdrop-blur-sm rounded-2xl p-3 shadow-lg shadow-blue-500/5 border-2 border-blue-500/30">
                            <DetailSection
                                values={details}
                                onChange={handleDetailChange}
                                readOnly={isReadOnly}
                            />
                        </div>
                    )}

                    {/* Leader Section - Show for Leader mode - Hide if only traffic */}
                    {showForm3 && !showOnlyTraffic && (
                        <div className="bg-slate-50/50 backdrop-blur-sm rounded-2xl p-3 shadow-lg shadow-blue-500/5 border-2 border-blue-500/30">
                            <LeaderEvaluationSection
                                values={leaderAnswers}
                                onChange={handleLeaderAnswerChange}
                                readOnly={isReadOnly}
                            />
                        </div>
                    )}

                    {/* Traffic Section - Show for both Member and Leader if needed - Hide if only work */}
                    {(showForm12 || showForm3) && !showOnlyWork && (
                        <div className="bg-slate-50/50 backdrop-blur-sm rounded-2xl p-3 shadow-lg shadow-blue-500/5 lg:col-span-2 border-2 border-blue-500/30">
                            {userTeams.length > 1 && (
                                <div className="flex flex-wrap items-center gap-3 mb-5 px-1 py-3 bg-blue-50/60 rounded-xl border border-blue-100">
                                    <div className="flex items-center gap-2 px-2">
                                        <Layers className="w-5 h-5 text-blue-500" />
                                        <span className="text-sm font-black text-slate-700 uppercase tracking-widest">Chọn Team</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-100 flex-wrap">
                                        <button
                                            onClick={() => setSelectedTeam('')}
                                            className={`px-5 py-2 text-sm font-black rounded-lg transition-all whitespace-nowrap ${
                                                !selectedTeam
                                                    ? 'bg-blue-600 text-white shadow-md'
                                                    : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                                            }`}
                                        >
                                            Tất cả
                                        </button>
                                        {userTeams.map((team: string) => (
                                            <button
                                                key={team}
                                                onClick={() => setSelectedTeam(team)}
                                                className={`px-5 py-2 text-sm font-black rounded-lg transition-all whitespace-nowrap ${
                                                    selectedTeam === team
                                                        ? 'bg-blue-600 text-white shadow-md'
                                                        : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                                                }`}
                                            >
                                                {team}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <TrafficReportSection
                                key={`${submitCount}-${reportDate}`}
                                values={traffic}
                                channels={trafficChannels}
                                availableChannels={availableChannels}
                                onChange={handleTrafficChange}
                                onChannelChange={handleChannelChange}
                                onPlatformEvidenceChange={(evMap) => setPlatformEvidences(evMap)}
                                onEntriesChange={setEntryDetails}
                                readOnly={isReadOnly}
                                initialEvidences={historicalEvidences}
                                initialEntries={entryDetails}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Nút submit — ẩn khi đã khoá deadline hôm nay */}
            {!isDeadlineLockedToday && !(showOnlyTraffic && availableChannels.length === 0) && (
                <div className="flex justify-center pt-8 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || isReadOnly}
                        className="flex items-center gap-2 bg-[#dbeafe] text-blue-600 px-8 py-4 rounded-full font-bold uppercase tracking-wider hover:bg-blue-200 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <Send className="w-4 h-4" />
                        {loading ? 'Đang gửi...' : isReadOnly ? (reportDate < localCalendarYMD() ? 'CHỈ XEM (NGÀY ĐÃ QUA)' : 'ĐÃ BÁO CÁO XONG') : 'GỬI BÁO CÁO'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ChecklistContainer;
