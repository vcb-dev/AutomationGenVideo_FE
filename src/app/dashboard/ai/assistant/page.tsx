"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import DynamicDashboard from "@/components/ai-assistant/DynamicDashboard";

interface Message {
    role: "user" | "assistant";
    content: string;
    dashboard?: any;
}

const SUGGESTIONS = [
    "Báo cáo KPI tháng này",
    "Top 5 video nhiều view nhất",
    "So sánh hiệu suất các kênh",
    "Tổng hợp doanh thu theo tuần",
];

export default function VCBAssistantPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async (text?: string) => {
        const msg = (text ?? input).trim();
        if (!msg || loading) return;

        const userMsg: Message = { role: "user", content: msg };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        const history = messages.map((m) => ({ role: m.role, content: m.content }));

        try {
            const { data } = await apiClient.post("/ai/chat", { message: msg, history }, { timeout: 60000 });
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: data.message ?? "Đã xử lý xong.",
                    dashboard: data.dashboard ?? null,
                },
            ]);
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
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const isEmpty = messages.length === 0;

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto px-4">

            {/* Header */}
            <div className="flex items-center gap-3 py-4 border-b border-violet-500/20">
                <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                        <Bot size={20} className="text-white" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0f0f1a]" />
                </div>
                <div>
                    <h1 className="font-bold text-white">VCB Assistant</h1>
                    <p className="text-xs text-violet-400">Powered by DeepSeek AI • Đang hoạt động</p>
                </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto py-6 space-y-6">

                {/* Empty state */}
                {isEmpty && (
                    <div className="flex flex-col items-center justify-center h-full gap-8 text-center">
                        <div>
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-violet-500/30">
                                <Sparkles size={28} className="text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Xin chào! Tôi là VCB Assistant</h2>
                            <p className="text-gray-400 text-sm max-w-sm">
                                Hỏi tôi về báo cáo, KPI, dữ liệu kênh MXH — tôi sẽ hiển thị dashboard trực quan cho bạn.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                            {SUGGESTIONS.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => sendMessage(s)}
                                    className="text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-violet-500/20 border border-white/10 hover:border-violet-500/40 text-sm text-gray-300 hover:text-white transition-all duration-200"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Messages */}
                {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>

                        {msg.role === "assistant" && (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0 mt-1 shadow-md shadow-violet-500/20">
                                <Bot size={15} className="text-white" />
                            </div>
                        )}

                        <div className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end max-w-[75%]" : "items-start max-w-[85%]"}`}>
                            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                                msg.role === "user"
                                    ? "bg-gradient-to-br from-violet-600 to-violet-700 text-white rounded-tr-sm shadow-lg shadow-violet-500/20"
                                    : "bg-[#1e1b2e] text-gray-100 rounded-tl-sm border border-violet-500/20 shadow-md"
                            }`}>
                                {msg.content}
                            </div>
                            {msg.dashboard && <DynamicDashboard dashboard={msg.dashboard} />}
                        </div>

                        {msg.role === "user" && (
                            <div className="w-8 h-8 rounded-lg bg-gray-700/80 flex items-center justify-center shrink-0 mt-1 border border-white/10">
                                <User size={15} className="text-gray-300" />
                            </div>
                        )}
                    </div>
                ))}

                {/* Loading */}
                {loading && (
                    <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0">
                            <Bot size={15} className="text-white" />
                        </div>
                        <div className="bg-[#1e1b2e] border border-violet-500/20 px-5 py-3.5 rounded-2xl rounded-tl-sm shadow-md flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="py-4 border-t border-violet-500/20">
                <div className="flex gap-3 items-end bg-[#1e1b2e] border border-violet-500/30 rounded-2xl px-4 py-3 focus-within:border-violet-500 focus-within:shadow-lg focus-within:shadow-violet-500/10 transition-all duration-200">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Nhập câu hỏi... (Enter để gửi)"
                        rows={1}
                        className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 resize-none outline-none leading-relaxed max-h-32 overflow-y-auto"
                        style={{ minHeight: "24px" }}
                        disabled={loading}
                    />
                    <button
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || loading}
                        className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 transition-all duration-200 shadow-md shadow-violet-500/20"
                    >
                        {loading ? <Loader2 size={15} className="text-white animate-spin" /> : <Send size={15} className="text-white" />}
                    </button>
                </div>
                <p className="text-center text-xs text-gray-600 mt-2">
                    VCB Assistant có thể mắc lỗi. Kiểm tra lại thông tin quan trọng.
                </p>
            </div>
        </div>
    );
}
