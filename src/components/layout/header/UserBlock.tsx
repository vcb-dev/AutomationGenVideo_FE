import { User } from "@/types/auth";
import { useRoleLabels } from "./use-role-labels";

interface UserBlockProps {
    user: User;
    userInitial: string;
    className?: string;
}

export default function UserBlock({ user, userInitial, className = "" }: UserBlockProps) {
    const roleLabels = useRoleLabels();
    const roleLabel = user?.roles?.[0] ? (roleLabels[user.roles[0]] ?? user.roles[0]) : "";

    return (
        <div className={`flex items-center gap-2.5 ${className}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md ring-1 ring-white/10">
                <span className="text-xs font-bold text-white leading-none">{userInitial}</span>
            </div>
            <div className="hidden md:block leading-none">
                <p className="text-sm font-semibold text-slate-200 leading-tight truncate max-w-[140px]">
                    {user?.full_name}
                </p>
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-tight mt-0.5">
                    {roleLabel}
                </p>
            </div>
        </div>
    );
}
