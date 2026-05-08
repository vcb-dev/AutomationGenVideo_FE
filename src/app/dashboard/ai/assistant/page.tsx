"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Plus, MessageSquare, Trash2, Loader2, Mic } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import DynamicDashboard from "@/components/ai-assistant/DynamicDashboard";

interface Message {
    role: "user" | "assistant";
    content: string;
    dashboard?: any;
}

interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    createdAt: Date;
}

const SUGGESTIONS = [
    { icon: "📊", label: "Báo cáo KPI tháng này" },
    { icon: "🎬", label: "Top video nhiều view nhất" },
    { icon: "📈", label: "So sánh hiệu suất kênh" },
    { icon: "💬", label: "Viết content cho TikTok" },
    { icon: "🔍", label: "Phân tích đối thủ cạnh tranh" },
];

function genId() {
    return Math.random().toString(36).slice(2, 10);
}

export default function VCBAssistantPage() {
    const user = useAuthStore((s) => s.user);
    const firstName = user?.full_name?.split(" ").pop() ?? "bạn";

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const activeConv = conversations.find((c) => c.id === activeId) ?? null;
    const messages = activeConv?.messages ?? [];

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const newConversation = () => {
        setActiveId(null);
        setInput("");
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const deleteConversation = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeId === id) setActiveId(null);
    };

    const sendMessage = async (text?: string) => {
        const msg = (text ?? input).trim();
        if (!msg || loading) return;
        setInput("");
        setLoading(true);

        let convId = activeId;
        const userMsg: Message = { role: "user", content: msg };

        if (!convId) {
            convId = genId();
            const newConv: Conversation = {
                id: convId,
                title: msg.slice(0, 48),
                messages: [userMsg],
                createdAt: new Date(),
            };
            setConversations((prev) => [newConv, ...prev]);
            setActiveId(convId);
        } else {
            setConversations((prev) =>
                prev.map((c) => c.id === convId ? { ...c, messages: [...c.messages, userMsg] } : c)
            );
        }

        const history = (activeConv?.messages ?? []).map((m) => ({ role: m.role, content: m.content }));

        try {
            const { data } = await apiClient.post("/ai/chat", { message: msg, history }, { timeout: 60000 });
            const assistantMsg: Message = {
                role: "assistant",
                content: data.message ?? "Đã xử lý xong.",
                dashboard: data.dashboard ?? null,
            };
            setConversations((prev) =>
                prev.map((c) => c.id === convId ? { ...c, messages: [...c.messages, assistantMsg] } : c)
            );
        } catch {
            setConversations((prev) =>
                prev.map((c) => c.id === convId
                    ? { ...c, messages: [...c.messages, { role: "assistant", content: "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại." }] }
                    : c)
            );
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    const isEmpty = messages.length === 0;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">

            {/* ── Sidebar ── */}
            <aside className="w-64 shrink-0 flex flex-col bg-[#0f0f17] border-r border-white/5 overflow-hidden">
                <div className="p-3">
                    <button
                        onClick={newConversation}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white text-sm font-medium transition-colors"
                    >
                        <Plus size={18} />
                        Cuộc trò chuyện mới
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 pb-4">
                    {conversations.length > 0 && (
                        <>
                            <p className="text-xs text-gray-600 font-medium px-3 pt-2 pb-1">Lịch sử</p>
                            {conversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => setActiveId(conv.id)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm transition-colors group ${
                                        activeId === conv.id
                                            ? "bg-violet-600/20 text-white"
                                            : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                                    }`}
                                >
                                    <MessageSquare size={14} className="shrink-0 opacity-60" />
                                    <span className="truncate flex-1">{conv.title}</span>
                                    <Trash2
                                        size={13}
                                        className="shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 text-gray-400 transition-opacity"
                                        onClick={(e) => deleteConversation(conv.id, e)}
                                    />
                                </button>
                            ))}
                        </>
                    )}
                </div>

                <div className="p-3 border-t border-white/5">
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl">
                        <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {firstName[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-400 truncate">{user?.full_name ?? "Người dùng"}</span>
                    </div>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#13111f]">

                {/* Empty / Welcome state */}
                {isEmpty && (
                    <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
                        <h1 className="text-4xl font-bold mb-2 text-center">
                            <span className="text-gray-200">Xin chào, </span>
                            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">{firstName}!</span>
                        </h1>
                        <p className="text-gray-400 text-lg mb-10">Chúng ta nên bắt đầu từ đâu nhỉ?</p>

                        {/* Input centered */}
                        <div className="w-full max-w-2xl mb-6">
                            <InputBox
                                inputRef={inputRef}
                                value={input}
                                onChange={setInput}
                                onKeyDown={handleKeyDown}
                                onSend={() => sendMessage()}
                                loading={loading}
                                placeholder="Hỏi VCB Assistant..."
                            />
                        </div>

                        {/* Suggestion chips */}
                        <div className="flex flex-wrap justify-center gap-2">
                            {SUGGESTIONS.map((s) => (
                                <button
                                    key={s.label}
                                    onClick={() => sendMessage(s.label)}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 hover:bg-violet-500/20 border border-white/10 hover:border-violet-500/40 text-sm text-gray-300 hover:text-white transition-all duration-200"
                                >
                                    <span>{s.icon}</span>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Conversation view */}
                {!isEmpty && (
                    <>
                        <div className="flex-1 overflow-y-auto">
                            <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                        {msg.role === "assistant" && (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-violet-500/20">
                                                <Bot size={15} className="text-white" />
                                            </div>
                                        )}
                                        <div className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end max-w-[80%]" : "items-start flex-1 min-w-0"}`}>
                                            <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
                                                msg.role === "user"
                                                    ? "px-4 py-3 rounded-2xl rounded-tr-sm bg-[#2a2540] text-gray-100 border border-white/10"
                                                    : "text-gray-100"
                                            }`}>
                                                {msg.content}
                                            </div>
                                            {msg.dashboard && <DynamicDashboard dashboard={msg.dashboard} />}
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

                        {/* Input bottom */}
                        <div className="px-4 py-4">
                            <div className="max-w-2xl mx-auto">
                                <InputBox
                                    inputRef={inputRef}
                                    value={input}
                                    onChange={setInput}
                                    onKeyDown={handleKeyDown}
                                    onSend={() => sendMessage()}
                                    loading={loading}
                                    placeholder="Nhập câu hỏi tiếp theo..."
                                />
                                <p className="text-center text-xs text-gray-700 mt-2">
                                    VCB Assistant có thể mắc lỗi. Kiểm tra lại thông tin quan trọng.
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

function InputBox({
    inputRef, value, onChange, onKeyDown, onSend, loading, placeholder,
}: {
    inputRef: React.RefObject<HTMLTextAreaElement>;
    value: string;
    onChange: (v: string) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onSend: () => void;
    loading: boolean;
    placeholder: string;
}) {
    return (
        <div className="flex items-end gap-3 bg-[#1e1b2e] border border-white/10 rounded-2xl px-4 py-3.5 focus-within:border-violet-500/50 focus-within:shadow-lg focus-within:shadow-violet-500/10 transition-all duration-200">
            <textarea
                ref={inputRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 resize-none outline-none leading-relaxed max-h-40 overflow-y-auto"
                style={{ minHeight: "24px" }}
                disabled={loading}
                autoFocus
            />
            <div className="flex items-center gap-1.5 shrink-0">
                <button className="w-8 h-8 rounded-xl hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors">
                    <Mic size={16} />
                </button>
                <button
                    onClick={onSend}
                    disabled={!value.trim() || loading}
                    className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 shadow-md shadow-violet-500/20"
                >
                    {loading
                        ? <Loader2 size={14} className="text-white animate-spin" />
                        : <Send size={14} className="text-white" />
                    }
                </button>
            </div>
        </div>
    );
}
