"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Send, Plus, MessageSquare, Trash2, Loader2, Pencil, Check, X, Sparkles, BarChart2, TrendingUp, Users, Zap } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import DynamicDashboard from "@/components/ai-assistant/DynamicDashboard";

interface Message {
    id?: string;
    role: "user" | "assistant";
    content: string;
    dashboard?: any;
    suggestions?: string[];
}

interface Conversation {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    _count?: { messages: number };
}

const SUGGESTIONS = [
    { icon: BarChart2, label: "Báo cáo ads tháng này", color: "text-violet-600" },
    { icon: Users, label: "Top kênh nhiều follower nhất", color: "text-blue-600" },
    { icon: TrendingUp, label: "So sánh hiệu suất theo team", color: "text-emerald-600" },
    { icon: Zap, label: "Phân tích camp quảng cáo", color: "text-amber-600" },
    { icon: Sparkles, label: "Kênh nào đang kém nhất?", color: "text-rose-600" },
];

export default function VCBAssistantPage() {
    const user = useAuthStore((s) => s.user);
    const firstName = user?.full_name?.split(" ").pop() ?? "bạn";

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const loadConversations = useCallback(async () => {
        try {
            const { data } = await apiClient.get("/chat/conversations");
            setConversations(data);
        } catch { /* ignore */ }
        finally { setLoadingConvs(false); }
    }, []);

    useEffect(() => { loadConversations(); }, [loadConversations]);
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

    const selectConversation = async (id: string) => {
        if (id === activeId) return;
        setActiveId(id);
        setMessages([]);
        setLoadingMsgs(true);
        try {
            const { data } = await apiClient.get(`/chat/conversations/${id}/messages`);
            setMessages(data);
        } catch { setMessages([]); }
        finally { setLoadingMsgs(false); }
    };

    const newConversation = () => {
        setActiveId(null);
        setMessages([]);
        setInput("");
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const deleteConversation = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await apiClient.delete(`/chat/conversations/${id}`).catch(() => {});
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeId === id) { setActiveId(null); setMessages([]); }
    };

    const saveTitle = async (id: string) => {
        if (!editTitle.trim()) { setEditingId(null); return; }
        await apiClient.patch(`/chat/conversations/${id}/title`, { title: editTitle }).catch(() => {});
        setConversations((prev) => prev.map((c) => c.id === id ? { ...c, title: editTitle } : c));
        setEditingId(null);
    };

    const sendMessage = async (text?: string) => {
        const msg = (text ?? input).trim();
        if (!msg || loading) return;
        setInput("");
        setLoading(true);

        const optimisticUser: Message = { role: "user", content: msg };
        setMessages((prev) => [...prev, optimisticUser]);

        try {
            let convId = activeId;
            if (!convId) {
                const { data: conv } = await apiClient.post("/chat/conversations", { title: msg.slice(0, 60) });
                convId = conv.id;
                setActiveId(convId);
                setConversations((prev) => [conv, ...prev]);
            }

            const { data } = await apiClient.post(
                `/chat/conversations/${convId}/messages`,
                { message: msg },
                { timeout: 60000 },
            );

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: data.message ?? "",
                    dashboard: data.dashboard ?? null,
                    suggestions: data.suggestions ?? [],
                },
            ]);

            setConversations((prev) =>
                prev.map((c) => c.id === convId ? { ...c, updated_at: new Date().toISOString() } : c)
                    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            );
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại." },
            ]);
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    const isEmpty = messages.length === 0 && !loadingMsgs;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">

            {/* ── Sidebar ── */}
            <aside className="w-64 shrink-0 flex flex-col bg-white border-r border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-100">
                    <button onClick={newConversation}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-sm font-medium transition-colors border border-violet-100">
                        <Plus size={16} /> Cuộc trò chuyện mới
                    </button>
                </div>

                {/* Conversation list */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
                    {loadingConvs ? (
                        <div className="flex justify-center pt-8">
                            <Loader2 size={16} className="text-gray-400 animate-spin" />
                        </div>
                    ) : conversations.length > 0 ? (
                        <>
                            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider px-2 pb-2">Lịch sử</p>
                            {conversations.map((conv) => (
                                <div key={conv.id}
                                    onClick={() => selectConversation(conv.id)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors group cursor-pointer ${activeId === conv.id
                                        ? "bg-violet-50 text-violet-700 border border-violet-200"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    }`}>
                                    <MessageSquare size={13} className="shrink-0 opacity-50" />

                                    {editingId === conv.id ? (
                                        <input
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === "Enter") saveTitle(conv.id); if (e.key === "Escape") setEditingId(null); }}
                                            className="flex-1 bg-white border border-violet-300 rounded px-1.5 text-xs text-gray-800 outline-none"
                                            autoFocus onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span className="truncate flex-1 text-xs">{conv.title}</span>
                                    )}

                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                                        {editingId === conv.id ? (
                                            <>
                                                <Check size={12} className="text-emerald-500 cursor-pointer" onClick={() => saveTitle(conv.id)} />
                                                <X size={12} className="text-gray-400 cursor-pointer" onClick={() => setEditingId(null)} />
                                            </>
                                        ) : (
                                            <>
                                                <Pencil size={11} className="text-gray-400 cursor-pointer hover:text-gray-600" onClick={() => { setEditingId(conv.id); setEditTitle(conv.title); }} />
                                                <Trash2 size={11} className="text-gray-400 cursor-pointer hover:text-red-500" onClick={(e) => deleteConversation(conv.id, e)} />
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <p className="text-xs text-gray-400 text-center pt-8">Chưa có hội thoại nào</p>
                    )}
                </div>

                {/* User footer */}
                <div className="p-3 border-t border-gray-100">
                    <div className="flex items-center gap-2.5 px-2 py-1.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {firstName[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-700 truncate">{user?.full_name ?? "Người dùng"}</p>
                            <p className="text-[10px] text-gray-400">VCB Studio</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="flex-1 flex flex-col min-w-0 bg-gray-50">

                {/* Loading state */}
                {loadingMsgs && (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 size={24} className="text-violet-500 animate-spin" />
                    </div>
                )}

                {/* Welcome / Empty state */}
                {!loadingMsgs && isEmpty && (
                    <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
                        {/* Avatar */}
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-5 shadow-lg shadow-amber-100 overflow-hidden">
                            <Image src="/images/ai-avatar.png" alt="VCB AI" width={56} height={56} className="object-contain" />
                        </div>

                        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
                            Xin chào, <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">{firstName}!</span>
                        </h1>
                        <p className="text-gray-500 text-base mb-10">Tôi có thể giúp bạn phân tích dữ liệu VCB Studio</p>

                        <div className="w-full max-w-2xl mb-6">
                            <InputBox inputRef={inputRef} value={input} onChange={setInput} onKeyDown={handleKeyDown} onSend={() => sendMessage()} loading={loading} placeholder="Hỏi VCB Assistant..." />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full max-w-2xl">
                            {SUGGESTIONS.map((s) => {
                                const Icon = s.icon;
                                return (
                                    <button key={s.label} onClick={() => sendMessage(s.label)}
                                        className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 hover:border-violet-300 hover:shadow-sm text-sm text-gray-700 hover:text-gray-900 transition-all duration-200 text-left group">
                                        <Icon size={18} className={`${s.color} shrink-0 group-hover:scale-110 transition-transform`} />
                                        <span className="font-medium leading-snug">{s.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Chat view */}
                {!loadingMsgs && !isEmpty && (
                    <>
                        <div className="flex-1 overflow-y-auto">
                            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                                {messages.map((msg, i) => (
                                    <div key={msg.id ?? i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>

                                        {msg.role === "assistant" && (
                                            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 mt-0.5 shadow-sm overflow-hidden">
                                                <Image src="/images/ai-avatar.png" alt="AI" width={28} height={28} className="object-contain" />
                                            </div>
                                        )}

                                        <div className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end max-w-[75%]" : "items-start flex-1 min-w-0"}`}>
                                            {msg.role === "user" ? (
                                                <div className="px-4 py-3 rounded-2xl rounded-tr-sm bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white text-sm leading-relaxed shadow-sm">
                                                    {msg.content}
                                                </div>
                                            ) : (
                                                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm w-full">
                                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                                </div>
                                            )}

                                            {msg.dashboard && (
                                                <div className="w-full">
                                                    <DynamicDashboard dashboard={msg.dashboard} />
                                                </div>
                                            )}

                                            {msg.suggestions && msg.suggestions.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {msg.suggestions.map((s, si) => (
                                                        <button key={si}
                                                            onClick={() => { setInput(s); inputRef.current?.focus(); }}
                                                            className="text-xs px-3 py-1.5 rounded-full bg-violet-50 hover:bg-violet-100 border border-violet-200 hover:border-violet-400 text-violet-700 transition-colors font-medium">
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {msg.role === "user" && (
                                            <div className="w-8 h-8 rounded-xl bg-gray-200 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-gray-600">
                                                {firstName[0]?.toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {loading && (
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                                            <Image src="/images/ai-avatar.png" alt="AI" width={28} height={28} className="object-contain" />
                                        </div>
                                        <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-sm">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={bottomRef} />
                            </div>
                        </div>

                        <div className="border-t border-gray-200 bg-white px-4 py-4">
                            <div className="max-w-3xl mx-auto">
                                <InputBox inputRef={inputRef} value={input} onChange={setInput} onKeyDown={handleKeyDown} onSend={() => sendMessage()} loading={loading} placeholder="Nhập câu hỏi tiếp theo..." />
                                <p className="text-center text-xs text-gray-400 mt-2">VCB Assistant có thể mắc lỗi. Kiểm tra lại thông tin quan trọng.</p>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

function InputBox({ inputRef, value, onChange, onKeyDown, onSend, loading, placeholder }: {
    inputRef: React.RefObject<HTMLTextAreaElement>;
    value: string; onChange: (v: string) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onSend: () => void; loading: boolean; placeholder: string;
}) {
    return (
        <div className="flex items-end gap-3 bg-white border border-gray-300 rounded-2xl px-4 py-3 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all duration-200 shadow-sm">
            <textarea
                ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown} placeholder={placeholder} rows={1}
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none leading-relaxed max-h-40 overflow-y-auto"
                style={{ minHeight: "24px" }} disabled={loading} autoFocus
            />
            <button onClick={onSend} disabled={!value.trim() || loading}
                className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-all duration-200 shadow-sm">
                {loading ? <Loader2 size={14} className="text-white animate-spin" /> : <Send size={14} className="text-white" />}
            </button>
        </div>
    );
}
