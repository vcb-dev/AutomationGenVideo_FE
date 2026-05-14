"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Plus, MessageSquare, Trash2, Loader2, Sparkles, Pencil, Check, X } from "lucide-react";
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
    { icon: "📊", label: "Báo cáo ads tháng này" },
    { icon: "🎬", label: "Top kênh nhiều follower nhất" },
    { icon: "📈", label: "So sánh hiệu suất theo team" },
    { icon: "💬", label: "Phân tích camp quảng cáo" },
    { icon: "🔍", label: "Kênh nào đang kém nhất?" },
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

    // Load danh sách conversations
    const loadConversations = useCallback(async () => {
        try {
            const { data } = await apiClient.get("/chat/conversations");
            setConversations(data);
        } catch { /* ignore */ }
        finally { setLoadingConvs(false); }
    }, []);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    // Load messages khi chọn conversation
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

        // Optimistic user message
        const optimisticUser: Message = { role: "user", content: msg };
        setMessages((prev) => [...prev, optimisticUser]);

        try {
            let convId = activeId;

            // Tạo conversation mới nếu chưa có
            if (!convId) {
                const { data: conv } = await apiClient.post("/chat/conversations", {
                    title: msg.slice(0, 60),
                });
                convId = conv.id;
                setActiveId(convId);
                setConversations((prev) => [conv, ...prev]);
            }

            // Gửi message — BE tự lưu + gọi AI
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

            // Cập nhật updated_at trong sidebar
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
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">

            {/* ── Sidebar ── */}
            <aside className="w-64 shrink-0 flex flex-col bg-[#0f0f17] border-r border-white/5 overflow-hidden">
                <div className="p-3">
                    <button onClick={newConversation}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white text-sm font-medium transition-colors">
                        <Plus size={18} /> Cuộc trò chuyện mới
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 pb-4">
                    {loadingConvs ? (
                        <div className="flex justify-center pt-8"><Loader2 size={16} className="text-gray-600 animate-spin" /></div>
                    ) : conversations.length > 0 ? (
                        <>
                            <p className="text-xs text-gray-600 font-medium px-3 pt-2 pb-1">Lịch sử</p>
                            {conversations.map((conv) => (
                                <div key={conv.id}
                                    onClick={() => selectConversation(conv.id)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm transition-colors group cursor-pointer ${activeId === conv.id ? "bg-violet-600/20 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"}`}>
                                    <MessageSquare size={14} className="shrink-0 opacity-60" />

                                    {editingId === conv.id ? (
                                        <input
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === "Enter") saveTitle(conv.id); if (e.key === "Escape") setEditingId(null); }}
                                            className="flex-1 bg-white/10 rounded px-1 text-xs text-white outline-none"
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span className="truncate flex-1">{conv.title}</span>
                                    )}

                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                                        {editingId === conv.id ? (
                                            <>
                                                <Check size={12} className="text-emerald-400 cursor-pointer" onClick={() => saveTitle(conv.id)} />
                                                <X size={12} className="text-gray-400 cursor-pointer" onClick={() => setEditingId(null)} />
                                            </>
                                        ) : (
                                            <>
                                                <Pencil size={12} className="text-gray-500 cursor-pointer hover:text-gray-200" onClick={() => { setEditingId(conv.id); setEditTitle(conv.title); }} />
                                                <Trash2 size={12} className="text-gray-500 cursor-pointer hover:text-red-400" onClick={(e) => deleteConversation(conv.id, e)} />
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <p className="text-xs text-gray-600 text-center pt-8">Chưa có hội thoại nào</p>
                    )}
                </div>

                <div className="p-3 border-t border-white/5">
                    <div className="flex items-center gap-2.5 px-3 py-2">
                        <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {firstName[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-400 truncate">{user?.full_name ?? "Người dùng"}</span>
                    </div>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#13111f]">

                {/* Loading messages */}
                {loadingMsgs && (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 size={24} className="text-violet-400 animate-spin" />
                    </div>
                )}

                {/* Empty / Welcome state */}
                {!loadingMsgs && isEmpty && (
                    <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
                        <h1 className="text-4xl font-bold mb-2 text-center">
                            <span className="text-gray-200">Xin chào, </span>
                            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">{firstName}!</span>
                        </h1>
                        <p className="text-gray-400 text-lg mb-10">Chúng ta nên bắt đầu từ đâu nhỉ?</p>
                        <div className="w-full max-w-2xl mb-6">
                            <InputBox inputRef={inputRef} value={input} onChange={setInput} onKeyDown={handleKeyDown} onSend={() => sendMessage()} loading={loading} placeholder="Hỏi VCB Assistant..." />
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                            {SUGGESTIONS.map((s) => (
                                <button key={s.label} onClick={() => sendMessage(s.label)}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 hover:bg-violet-500/20 border border-white/10 hover:border-violet-500/40 text-sm text-gray-300 hover:text-white transition-all duration-200">
                                    <span>{s.icon}</span>{s.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Conversation view */}
                {!loadingMsgs && !isEmpty && (
                    <>
                        <div className="flex-1 overflow-y-auto">
                            <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
                                {messages.map((msg, i) => (
                                    <div key={msg.id ?? i} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                        {msg.role === "assistant" && (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-violet-500/20">
                                                <Bot size={15} className="text-white" />
                                            </div>
                                        )}
                                        <div className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end max-w-[80%]" : "items-start flex-1 min-w-0"}`}>
                                            <div className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "px-4 py-3 rounded-2xl rounded-tr-sm bg-[#2a2540] text-gray-100 border border-white/10" : "text-gray-100"}`}>
                                                {msg.content}
                                            </div>
                                            {msg.dashboard && <DynamicDashboard dashboard={msg.dashboard} />}
                                            {msg.suggestions && msg.suggestions.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {msg.suggestions.map((s, si) => (
                                                        <button
                                                            key={si}
                                                            onClick={() => { setInput(s); inputRef.current?.focus(); }}
                                                            className="text-xs px-3 py-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:border-violet-400 transition-colors cursor-pointer"
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {msg.role === "user" && (
                                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-white">
                                                {firstName[0]?.toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {loading && (
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0">
                                            <Bot size={15} className="text-white" />
                                        </div>
                                        <div className="flex items-center gap-1.5 pt-2">
                                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    </div>
                                )}
                                <div ref={bottomRef} />
                            </div>
                        </div>

                        <div className="px-4 py-4">
                            <div className="max-w-2xl mx-auto">
                                <InputBox inputRef={inputRef} value={input} onChange={setInput} onKeyDown={handleKeyDown} onSend={() => sendMessage()} loading={loading} placeholder="Nhập câu hỏi tiếp theo..." />
                                <p className="text-center text-xs text-gray-700 mt-2">VCB Assistant có thể mắc lỗi. Kiểm tra lại thông tin quan trọng.</p>
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
        <div className="flex items-end gap-3 bg-[#1e1b2e] border border-white/10 rounded-2xl px-4 py-3.5 focus-within:border-violet-500/50 focus-within:shadow-lg focus-within:shadow-violet-500/10 transition-all duration-200">
            <textarea ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
                placeholder={placeholder} rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 resize-none outline-none leading-relaxed max-h-40 overflow-y-auto"
                style={{ minHeight: "24px" }} disabled={loading} autoFocus />
            <button onClick={onSend} disabled={!value.trim() || loading}
                className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-all duration-200 shadow-md shadow-violet-500/20">
                {loading ? <Loader2 size={14} className="text-white animate-spin" /> : <Send size={14} className="text-white" />}
            </button>
        </div>
    );
}
