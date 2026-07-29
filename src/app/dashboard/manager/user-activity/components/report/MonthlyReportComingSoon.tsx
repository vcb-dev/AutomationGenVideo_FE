import { BarChart3, Calendar, CheckCircle2, Clock, User } from "lucide-react";

export const MonthlyReportComingSoon = () => {
    const features = [
        { icon: BarChart3,   label: "Thống kê KPI tháng",       desc: "Tổng hợp hiệu suất từng thành viên theo tháng" },
        { icon: Calendar,    label: "Lịch sử theo tuần",         desc: "Phân tích xu hướng theo từng tuần trong tháng" },
        { icon: CheckCircle2,label: "Đánh giá hoàn thành mục tiêu", desc: "So sánh mục tiêu đặt ra vs kết quả thực tế" },
        { icon: User,        label: "Xếp hạng cá nhân tháng",    desc: "Top thành viên xuất sắc theo tháng" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Hero banner */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 shadow-2xl">
                {/* Background blobs */}
                <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center text-center px-8 py-16 gap-6">
                    {/* Badge */}
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-black uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                        Đang phát triển
                    </span>

                    {/* Icon */}
                    <div className="relative">
                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                            <Calendar className="w-12 h-12 text-white" strokeWidth={1.5} />
                        </div>
                        {/* Ping ring */}
                        <span className="absolute -top-1 -right-1 flex h-5 w-5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-40" />
                            <span className="relative inline-flex rounded-full h-5 w-5 bg-indigo-500 items-center justify-center">
                                <Clock className="w-3 h-3 text-white" strokeWidth={3} />
                            </span>
                        </span>
                    </div>

                    <div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tight">
                            Báo cáo tháng
                        </h2>
                        <p className="text-indigo-300 font-medium mt-2 max-w-md leading-relaxed">
                            Tính năng đang được xây dựng. Chúng tôi sẽ sớm ra mắt bảng báo cáo tổng hợp theo tháng với đầy đủ số liệu phân tích.
                        </p>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full max-w-xs">
                        <div className="flex items-center justify-between text-xs font-bold mb-2">
                            <span className="text-slate-400 uppercase tracking-widest">Tiến độ phát triển</span>
                            <span className="text-indigo-400">35%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-1000"
                                style={{ width: "35%" }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Feature cards */}
            <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 px-1 mb-4">
                    Tính năng dự kiến
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {features.map(({ icon: Icon, label, desc }, i) => (
                        <div
                            key={i}
                            className="flex items-start gap-4 bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm opacity-60"
                            style={{ animationDelay: `${i * 80}ms` }}
                        >
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                <Icon className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-700">{label}</p>
                                <p className="text-xs text-slate-400 font-medium mt-0.5 leading-relaxed">{desc}</p>
                            </div>
                            <div className="ml-auto shrink-0 mt-0.5">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wide">
                                    Sớm
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};