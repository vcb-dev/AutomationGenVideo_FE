'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft, Sparkles, Loader2, CheckCircle, Copy, Check, ArrowRight,
    Scissors, Upload, Film, Download, Trash2, Music, Mic, Play, Pause, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useContentGeneration, GeneratedContent } from '@/hooks/useContentGeneration';
import { toast } from 'react-hot-toast';
import SmartMixVideo from '@/components/SmartMixVideo';
import LanguageSelect from '@/components/content/LanguageSelect';
import { useAuthStore } from '@/store/auth-store';

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8001';
const BE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// ─── Content Type Config ───
interface ContentType {
    id: string;
    name: string;
    description: string;
    color: string;
    examples: string[];
}

const CONTENT_TYPES: ContentType[] = [
    { id: 'A4', name: 'A4 - Conversion (Bán hàng)', description: 'Chuyển đổi trực tiếp - Giới thiệu sản phẩm', color: 'from-green-500 to-emerald-500', examples: ['Top list sản phẩm hot', 'Ngân sách X mua được gì?', 'Combo quà tặng'] },
    { id: 'A5', name: 'A5 - Combined (Tổng hợp)', description: 'Kết hợp A1-A4 - Content đa chiều', color: 'from-yellow-500 to-orange-500', examples: ['Storytelling hoàn chỉnh', 'Từ hook đến CTA', 'Nội dung đa chiều'] },
];


// ─── Default optimal prompt (auto-filled for Regenerate) ───
const DEFAULT_OPTIMAL_PROMPT = `YÊU CẦU NỘI DUNG CHUẨN TỐI ƯU:

1. CẤU TRÚC NỘI DUNG:
   - Mở đầu: Chào hỏi ngắn gọn (1 câu), đi thẳng vào chủ đề không vòng vo.
   - Thân bài: Tập trung vào đúng 3 lợi ích hoặc điểm nhấn chính. Mỗi điểm phải rõ ràng, cụ thể, không trừu tượng.
   - Kết bài: CTA nhẹ nhàng, cảm ơn chân thành. Không ép mua, không tạo áp lực.

2. GIỌNG ĐIỆU & PHONG CÁCH:
   - Chân thật, trầm ấm như người thợ tâm sự với bạn bè.
   - Không khoa trương, không dùng từ "số 1", "tốt nhất", "đỉnh nhất".
   - Dùng câu hỏi tu từ ("...nhỉ?", "...phải không?") để tạo tương tác tự nhiên.

3. TỐI ƯU CHO AI VOICE (TTS):
   - Mỗi câu 10-15 từ, tối đa 20 từ. Câu dài phải chia nhỏ bằng dấu chấm hoặc phẩy.
   - Dùng dấu phẩy sau 5-7 từ để AI biết chỗ nghỉ hơi.
   - Dùng ba chấm (...) cho cảm giác suy tư, chậm lại.
   - Viết liền một khối, không xuống dòng nhiều đoạn.

4. ĐỘ DÀI: 150-180 từ (45-60 giây khi đọc). Loại bỏ chi tiết phụ, giữ cốt lõi.`;

// ─── Mix Video Config ───
const PARTS_LABELS = [
    'Sản phẩm', 'HuyK', 'Chế tác (Above)', 'Chế tác (Below)',
    'Chế tác (Above)', 'HuyK (Above)', 'HuyK (Above)',
    'Chế tác (Below)', 'Sản phẩm HT', 'Outtrol',
];

type Step = 'generate' | 'content' | 'mix-video';
type GenerateMode = 'from-video' | 'translate-only';

export default function GenerateContentPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { generateContent, generatePrompt, isGenerating } = useContentGeneration();
    const { user } = useAuthStore();
    const [isApproving, setIsApproving] = useState(false);
    const [isConverting, setIsConverting] = useState(false);

    // ─── Step control ───
    const [currentStep, setCurrentStep] = useState<Step>('generate');

    // ─── Content generation state ───
    const [videoId, setVideoId] = useState<number | null>(null);
    const [sourceVideoIdRaw, setSourceVideoIdRaw] = useState<string>('');
    const [videoTitle, setVideoTitle] = useState<string>('');
    const [videoDescription, setVideoDescription] = useState<string>('');
    const [videoUrl, setVideoUrl] = useState<string>('');
    const [transcript, setTranscript] = useState<string>('');
    const [detectedLanguage, setDetectedLanguage] = useState<string>('');  // Ngôn ngữ video gốc (từ Whisper)
    const [outputLanguage, setOutputLanguage] = useState<string>('vi');    // Ngôn ngữ generate content
    const [generateMode, setGenerateMode] = useState<GenerateMode>('from-video');
    const [manualSourceContent, setManualSourceContent] = useState<string>('');
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcribeError, setTranscribeError] = useState<string>('');
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
    const [baseVietnameseContent, setBaseVietnameseContent] = useState<GeneratedContent | null>(null);
    const [baseVietnameseMarketLanguage, setBaseVietnameseMarketLanguage] = useState<string | null>(null);
    const [copiedSection, setCopiedSection] = useState<string | null>(null);
    const [productInfo, setProductInfo] = useState({ id: '', name: '', category: '', description: '', price: '', sku: '' });

    // Advanced Prompt state
    const [showAdvancedPrompt, setShowAdvancedPrompt] = useState(false);
    const [advancedPrompt, setAdvancedPrompt] = useState('');

    // ─── Mix Video state ───
    const [baseFolderPath, setBaseFolderPath] = useState(''); // NEW: Folder tổng
    const [isScanning, setIsScanning] = useState(false); // NEW: Scanning state
    const [scannedFolders, setScannedFolders] = useState<any[]>([]); // NEW: Kết quả scan
    const [cacheStats, setCacheStats] = useState<any>(null); // NEW: Cache stats
    const [folderSlots, setFolderSlots] = useState<{ path: string; videoCount: number; scanning: boolean }[]>(
        Array(10).fill(null).map(() => ({ path: '', videoCount: 0, scanning: false }))
    );
    const [audioMode, setAudioMode] = useState<'upload' | 'generate'>('upload');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [voices, setVoices] = useState<any[]>([]);
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
    const [ttsText, setTtsText] = useState<string>('');
    const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const [mixLoading, setMixLoading] = useState(false);
    const [mixProgress, setMixProgress] = useState(0);
    const [mixError, setMixError] = useState('');
    const [mixResult, setMixResult] = useState<{
        output_url?: string; output_filename?: string;
        output_urls?: string[]; output_filenames?: string[];
        num_outputs?: number;
    } | null>(null);

    // ─── Init from URL params (and fallback từ localStorage nếu thiếu dữ liệu) ───
    const isTranslateOnlyEntry = searchParams.get('mode') === 'translate-only';

    useEffect(() => {
        const id = searchParams.get('videoId');
        const mode = searchParams.get('mode');
        if (mode === 'translate-only') {
            setGenerateMode('translate-only');
        }
        setSourceVideoIdRaw(id || '');
        const title = searchParams.get('videoTitle');
        const desc = searchParams.get('videoDescription');
        const url = searchParams.get('videoUrl');
        if (id) setVideoId(parseInt(id));
        if (title) setVideoTitle(decodeURIComponent(title));
        if (desc) setVideoDescription(decodeURIComponent(desc));
        if (url) setVideoUrl(decodeURIComponent(url));

        const urlProduct = {
            id: searchParams.get('productId') || '',
            name: decodeURIComponent(searchParams.get('productName') || ''),
            category: decodeURIComponent(searchParams.get('productCategory') || ''),
            description: decodeURIComponent(searchParams.get('productDescription') || ''),
            price: searchParams.get('productPrice') || '',
            sku: searchParams.get('productSku') || ''
        };

        let finalCategory = urlProduct.category;
        let finalSku = urlProduct.sku;

        // Fallback: nếu category hoặc sku từ URL rỗng, dùng dữ liệu đã lưu khi chọn sản phẩm
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem('selectedProduct');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (!finalCategory && parsed?.category) {
                        finalCategory = parsed.category;
                        console.log('📦 Using product category from localStorage fallback:', parsed.category);
                    }
                    if (!finalSku && parsed?.sku) {
                        finalSku = parsed.sku;
                        console.log('🏷️ Using product SKU from localStorage fallback:', parsed.sku);
                    }
                }
            } catch (e) {
                console.error('Failed to read selectedProduct from localStorage', e);
            }
        }

        setProductInfo({
            ...urlProduct,
            category: finalCategory || '',
            sku: finalSku || ''
        });

        // Debug logging
        console.log('📦 Product info resolved for pipeline:', {
            category_from_url: urlProduct.category,
            category_final: finalCategory || '',
            sku_from_url: urlProduct.sku,
            sku_final: finalSku || ''
        });
    }, [searchParams]);

    // Khi mở từ menu "Dịch content có sẵn", chỉ giữ mode translate-only
    useEffect(() => {
        if (isTranslateOnlyEntry) {
            setGenerateMode('translate-only');
        }
    }, [isTranslateOnlyEntry]);

    // ─── Fetch voices when entering mix step ───
    useEffect(() => {
        if (currentStep === 'mix-video') {
            fetchVoices();
            if (generatedContent?.script) {
                setTtsText(generatedContent.script);
                setAudioMode('generate');
            }
        }
    }, [currentStep]);

    useEffect(() => {
        if (generatedAudioUrl) {
            audioRef.current = new Audio(generatedAudioUrl);
            audioRef.current.onended = () => setIsPlayingAudio(false);
        }
    }, [generatedAudioUrl]);

    // ─── Content Generation Handlers ───

    const handleTranscribe = async () => {
        if (!videoUrl) return;
        setIsTranscribing(true);
        setTranscribeError('');
        try {
            const AI_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8001';
            const resp = await fetch(`${AI_URL}/api/content/transcribe/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ video_url: videoUrl }),
            });
            const data = await resp.json();
            if (data.success && data.transcript) {
                setTranscript(data.transcript);
                // Lưu ngôn ngữ Whisper detect được
                if (data.detected_language) {
                    setDetectedLanguage(data.detected_language);
                    // Nếu video tiếng Anh thì default output language cũng để tiếng Việt
                    // (generate content cho khách hàng VN nên giữ vi)
                }
                toast.success(`✅ Transcribe xong! (${data.char_count} ký tự | ngôn ngữ: ${data.detected_language || 'auto'})`);
            } else {
                const msg = data.error || 'Transcribe thất bại';
                setTranscribeError(msg);
                toast.error(msg);
            }
        } catch (e: any) {
            const msg = e.message || 'Lỗi kết nối';
            setTranscribeError(msg);
            toast.error(msg);
        } finally {
            setIsTranscribing(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedType) return;
        try {
            const sourceText = transcript || videoDescription || videoTitle;
            const baseRequest = {
                video_id: videoId || undefined,
                video_description: sourceText,  // ưu tiên transcript
                video_title: videoTitle,
                content_type: selectedType,
                brand_name: 'Viễn Chí Bảo',
                industry: 'kim hoàn (trang sức vàng bạc)',
                product_id: productInfo.id,
                product_name: productInfo.name,
                product_category: productInfo.category,
                product_description: productInfo.description,
                product_price: productInfo.price,
                product_sku: productInfo.sku
            };

            if (outputLanguage === 'vi') {
                const result = await generateContent({
                    ...baseRequest,
                    output_language: 'vi',
                    target_market_language: 'vi',
                });
                if (!result) {
                    toast.error('Không thể tạo content. Vui lòng thử lại.');
                    return;
                }
                setBaseVietnameseContent(result);
                setBaseVietnameseMarketLanguage('vi');
                setGeneratedContent(result);
                setCurrentStep('content');
                toast.success('Content đã được tạo thành công!');
                return;
            }

            // Nếu chọn ngôn ngữ khác Việt, luôn generate bản Việt trước làm "content nguồn"
            const viResult = await generateContent({
                ...baseRequest,
                output_language: 'vi',
                target_market_language: outputLanguage,
            });
            if (!viResult) {
                toast.error('Không thể tạo content Việt làm nguồn convert.');
                return;
            }
            setBaseVietnameseContent(viResult);
            setBaseVietnameseMarketLanguage(outputLanguage);

            const localizedResult = await generateContent({
                ...baseRequest,
                video_description: viResult.script,
                output_language: outputLanguage,
                target_market_language: outputLanguage,
            });
            if (!localizedResult) {
                toast.error('Không thể convert sang ngôn ngữ đã chọn.');
                return;
            }
            setGeneratedContent(localizedResult);
            setCurrentStep('content');
            toast.success('Đã tạo content Việt và convert sang ngôn ngữ đã chọn!');
        } catch (error) {
            console.error('Generation error:', error);
            toast.error('Có lỗi xảy ra khi tạo content');
        }
    };

    const handleTranslateExistingContent = async () => {
        const contentTypeForTranslate = 'A5';
        const sourceText = manualSourceContent.trim();
        if (!sourceText) {
            toast.error('Vui lòng dán content cần dịch.');
            return;
        }
        try {
            if (outputLanguage === 'vi') {
                const viOnly = await generateContent({
                    video_description: sourceText,
                    video_title: 'Manual content',
                    content_type: contentTypeForTranslate,
                    brand_name: 'Viễn Chí Bảo',
                    industry: 'kim hoàn (trang sức vàng bạc)',
                    output_language: 'vi',
                    target_market_language: 'vi',
                    product_id: productInfo.id,
                    product_name: productInfo.name,
                    product_category: productInfo.category,
                    product_description: productInfo.description,
                    product_price: productInfo.price,
                    product_sku: productInfo.sku,
                });
                if (!viOnly) {
                    toast.error('Không thể xử lý content đã dán.');
                    return;
                }
                setGeneratedContent(viOnly);
                setBaseVietnameseContent(viOnly);
                setBaseVietnameseMarketLanguage('vi');
                setCurrentStep('content');
                toast.success('Đã xử lý content thành công!');
                return;
            }

            const viSource: GeneratedContent = {
                id: -1,
                title: 'Content Việt (nguồn convert)',
                script: sourceText,
                hook: '',
                problem: '',
                solution: '',
                cta: '',
                word_count: sourceText.split(/\s+/).filter(Boolean).length,
                content_type: contentTypeForTranslate,
                content_type_display: 'Combined (Tổng hợp)',
                created_at: new Date().toISOString(),
                verification_rows: []
            };

            const localized = await generateContent({
                video_description: sourceText,
                video_title: 'Manual content',
                content_type: contentTypeForTranslate,
                brand_name: 'Viễn Chí Bảo',
                industry: 'kim hoàn (trang sức vàng bạc)',
                output_language: outputLanguage,
                target_market_language: outputLanguage,
                translation_mode: true,
                product_id: productInfo.id,
                product_name: productInfo.name,
                product_category: productInfo.category,
                product_description: productInfo.description,
                product_price: productInfo.price,
                product_sku: productInfo.sku,
            });
            if (!localized) {
                toast.error('Không thể dịch content đã dán.');
                return;
            }

            setBaseVietnameseContent(viSource);
            setBaseVietnameseMarketLanguage(outputLanguage);
            setGeneratedContent(localized);
            setCurrentStep('content');
            toast.success('Đã dịch content thành công!');
        } catch (error) {
            console.error('Translate existing content error:', error);
            toast.error('Có lỗi xảy ra khi dịch content');
        }
    };

    const copyToClipboard = async (text: string, section: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedSection(section);
            setTimeout(() => setCopiedSection(null), 2000);
            toast.success('Đã copy!');
        } catch (err) {
            console.error('Failed to copy:', err);
            toast.error('Không thể copy');
        }
    };

    const handleAutoGeneratePrompt = async () => {
        if (!selectedType) {
            toast.error('Vui lòng chọn loại content trước tiên');
            return;
        }

        try {
            toast.loading('Đang phân tích video để tạo prompt tối ưu...', { id: 'generating-prompt' });

            const prompt = await generatePrompt({
                video_id: videoId || undefined,
                video_description: videoDescription || videoTitle,
                video_title: videoTitle,
                content_type: selectedType,
                product_id: productInfo.id,
                product_name: productInfo.name,
                product_category: productInfo.category,
                product_description: productInfo.description,
                product_price: productInfo.price,
                product_sku: productInfo.sku
            });

            toast.dismiss('generating-prompt');

            if (prompt) {
                setAdvancedPrompt(prompt);
                setShowAdvancedPrompt(true);
                toast.success('Đã tạo prompt tối ưu từ AI!');
            } else {
                setAdvancedPrompt(DEFAULT_OPTIMAL_PROMPT);
                setShowAdvancedPrompt(true);
                toast.error('Không thể tạo prompt AI, đã dùng prompt mặc định.');
            }
        } catch (error) {
            toast.dismiss('generating-prompt');
            console.error('Auto generate prompt error:', error);
            setAdvancedPrompt(DEFAULT_OPTIMAL_PROMPT);
            setShowAdvancedPrompt(true);
            toast.error('Lỗi khi tạo prompt, đã dùng prompt mặc định.');
        }
    };

    const handleAdvancedGenerate = async () => {
        if (!selectedType || !advancedPrompt.trim()) {
            toast.error('Vui lòng nhập prompt nâng cao');
            return;
        }

        try {
            const result = await generateContent({
                video_id: videoId || undefined,
                video_description: videoDescription || videoTitle,
                video_title: videoTitle,
                content_type: selectedType,
                brand_name: 'Viễn Chí Bảo',
                industry: 'kim hoàn (trang sức vàng bạc)',
                product_id: productInfo.id,
                product_name: productInfo.name,
                product_category: productInfo.category,
                product_description: productInfo.description,
                product_price: productInfo.price,
                product_sku: productInfo.sku,
                custom_prompt: advancedPrompt
            });

            if (result) {
                setGeneratedContent(result);
                setShowAdvancedPrompt(false);
                setAdvancedPrompt('');
                toast.success('Content đã được tạo lại với prompt nâng cao!');
            } else {
                toast.error('Không thể tạo content. Vui lòng thử lại.');
            }
        } catch (error) {
            console.error('Advanced generation error:', error);
            toast.error('Có lỗi xảy ra khi tạo content');
        }
    };

    // ─── Approve (Duyệt) Handler ───
    const handleApprove = async () => {
        if (!generatedContent) return;
        setIsApproving(true);
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${BE_API_URL}/approved-content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    script: generatedContent.script,
                    content_type: generatedContent.content_type,
                    content_type_display: generatedContent.content_type_display,
                    word_count: generatedContent.word_count,
                    source_video_id: sourceVideoIdRaw || (videoId != null ? String(videoId) : undefined),
                    source_video_title: videoTitle || '',
                    source_video_desc: videoDescription || '',
                    source_video_url: videoUrl || '',
                    product_id: productInfo.id || undefined,
                    product_name: productInfo.name || undefined,
                    product_category: productInfo.category || undefined,
                    product_sku: productInfo.sku || undefined,
                }),
            });

            if (res.ok) {
                toast.success('Content đã được duyệt và lưu vào Bộ sưu tập!');
                router.push('/dashboard/video-library?tab=content');
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.message || 'Không thể duyệt content. Vui lòng thử lại.');
            }
        } catch (error) {
            console.error('Approve content error:', error);
            toast.error('Có lỗi xảy ra khi duyệt content');
        } finally {
            setIsApproving(false);
        }
    };

    // ─── Language Convert Handler ───
    const handleLanguageChange = async (newLang: string) => {
        if (newLang === outputLanguage || !generatedContent || !selectedType) return;
        setOutputLanguage(newLang);
        setIsConverting(true);
        try {
            let baseVi = baseVietnameseContent;
            const shouldRebuildBaseVi = newLang !== 'vi' && (
                !baseVi || baseVietnameseMarketLanguage !== newLang
            );
            if (shouldRebuildBaseVi) {
                const sourceForVi = transcript || videoDescription || videoTitle;
                const viResult = await generateContent({
                    video_id: videoId || undefined,
                    video_description: sourceForVi,
                    video_title: videoTitle,
                    content_type: selectedType,
                    brand_name: 'Viễn Chí Bảo',
                    industry: 'kim hoàn (trang sức vàng bạc)',
                    output_language: 'vi',
                    target_market_language: newLang,
                    product_id: productInfo.id,
                    product_name: productInfo.name,
                    product_category: productInfo.category,
                    product_description: productInfo.description,
                    product_price: productInfo.price,
                    product_sku: productInfo.sku,
                });
                if (!viResult) {
                    toast.error('Không thể tạo bản tiếng Việt nguồn để convert.');
                    return;
                }
                baseVi = viResult;
                setBaseVietnameseContent(viResult);
                setBaseVietnameseMarketLanguage(newLang);
            }

            if (newLang === 'vi') {
                if (baseVi) {
                    setGeneratedContent(baseVi);
                }
                toast.success('Đã chuyển về bản tiếng Việt.');
                return;
            }
            if (!baseVi) {
                toast.error('Không có bản tiếng Việt nguồn để convert.');
                return;
            }

            const result = await generateContent({
                video_id: videoId || undefined,
                video_description: baseVi.script,
                video_title: videoTitle,
                content_type: selectedType,
                brand_name: 'Viễn Chí Bảo',
                industry: 'kim hoàn (trang sức vàng bạc)',
                output_language: newLang,
                target_market_language: newLang,
                product_id: productInfo.id,
                product_name: productInfo.name,
                product_category: productInfo.category,
                product_description: productInfo.description,
                product_price: productInfo.price,
                product_sku: productInfo.sku,
            });
            if (result) {
                setGeneratedContent(result);
                toast.success('Đã chuyển đổi ngôn ngữ thành công!');
            } else {
                toast.error('Không thể chuyển đổi ngôn ngữ. Thử lại.');
            }
        } catch (error) {
            console.error('Language convert error:', error);
            toast.error('Có lỗi xảy ra khi chuyển đổi ngôn ngữ');
        } finally {
            setIsConverting(false);
        }
    };

    // ─── Mix Video Handlers ───
    const fetchVoices = async () => {
        try {
            const response = await fetch(`${AI_SERVICE_URL}/api/heygen/voices`);
            const data = await response.json();
            if (data.success) {
                setVoices(data.data.voices);
                if (data.data.voices.length > 0 && !selectedVoiceId) {
                    setSelectedVoiceId(data.data.voices[0].voice_id);
                }
            }
        } catch (e) {
            console.error("Failed to fetch voices", e);
        }
    };

    const handleGenerateAudio = async () => {
        if (!ttsText || !selectedVoiceId) return;
        setIsGeneratingAudio(true);
        setMixError('');
        try {
            const response = await fetch(`${AI_SERVICE_URL}/api/heygen/generate-audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: ttsText, voice_id: selectedVoiceId }),
            });
            const data = await response.json();
            if (data.success) {
                setGeneratedAudioUrl(data.data.audio_url);
                const audioRes = await fetch(data.data.audio_url);
                const blob = await audioRes.blob();
                setAudioFile(new File([blob], "generated_audio.mp3", { type: "audio/mpeg" }));
                toast.success("Đã tạo audio thành công!");
            } else {
                setMixError(data.error || "Không thể tạo audio.");
            }
        } catch (e: any) {
            setMixError(e.message || "Lỗi kết nối.");
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const toggleAudioPreview = () => {
        if (!audioRef.current) return;
        if (isPlayingAudio) { audioRef.current.pause(); setIsPlayingAudio(false); }
        else { audioRef.current.play(); setIsPlayingAudio(true); }
    };

    const updateSlotPath = (index: number, path: string) => {
        setFolderSlots(prev => { const n = [...prev]; n[index] = { ...n[index], path }; return n; });
    };

    // NEW: Scan base folder (tự động tìm subfolder)
    const handleScanBaseFolder = async () => {
        const path = baseFolderPath.trim();
        if (!path) {
            setMixError('Vui lòng nhập đường dẫn folder tổng');
            return;
        }

        setIsScanning(true);
        setMixError('');
        setScannedFolders([]);
        setCacheStats(null);

        try {
            const res = await fetch(`${AI_SERVICE_URL}/api/videos/scan-folder/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path,
                    use_cache: true,
                    recursive: true
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Lỗi scan folder');
            }

            const data = await res.json();

            if (data.success) {
                const folders = data.subfolders || [];
                setScannedFolders(folders);
                setCacheStats(data.cache_stats);

                // Auto-fill 10 folders vào slots
                const newSlots = [...folderSlots];
                folders.slice(0, 10).forEach((folder: any, i: number) => {
                    newSlots[i] = {
                        path: folder.path,
                        videoCount: folder.video_count,
                        scanning: false
                    };
                });
                setFolderSlots(newSlots);

                const totalVideos = data.total_video_count || 0;
                const hitRate = data.cache_stats?.hit_rate || 0;

                toast.success(
                    `✅ Tìm thấy ${folders.length} folders với ${totalVideos} videos!\n` +
                    `📊 Cache hit rate: ${hitRate}% (Scan rất nhanh!)`
                );
            } else {
                throw new Error(data.error || 'Scan failed');
            }
        } catch (error: any) {
            setMixError(error.message || 'Lỗi khi scan folder');
            toast.error(error.message || 'Lỗi khi scan folder');
        } finally {
            setIsScanning(false);
        }
    };

    // OLD: Scan single slot (keep for manual edit)
    const scanSlot = async (index: number) => {
        const path = folderSlots[index].path.trim();
        if (!path) return;
        setFolderSlots(prev => { const n = [...prev]; n[index] = { ...n[index], scanning: true }; return n; });
        try {
            const res = await fetch(`${AI_SERVICE_URL}/api/videos/scan-folder/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, use_cache: true, recursive: true }),
            });
            const data = await res.json();
            const totalVideos = data.total_video_count || 0;
            setFolderSlots(prev => { const n = [...prev]; n[index] = { ...n[index], videoCount: totalVideos, scanning: false }; return n; });
        } catch {
            setFolderSlots(prev => { const n = [...prev]; n[index] = { ...n[index], videoCount: 0, scanning: false }; return n; });
        }
    };

    const clearSlot = (index: number) => {
        setFolderSlots(prev => { const n = [...prev]; n[index] = { path: '', videoCount: 0, scanning: false }; return n; });
    };

    const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        if (!/\.(mp3|wav|m4a|aac|ogg)$/i.test(selected.name)) { setMixError('Định dạng audio không hợp lệ.'); return; }
        setAudioFile(selected);
        setGeneratedAudioUrl(null);
        setMixError('');
        setMixResult(null);
        e.target.value = '';
    };

    // NEW: Auto mix - chỉ cần base folder (CALL BE, BE orchestrates)
    const handleAutoMix = async () => {
        if (!baseFolderPath.trim()) {
            setMixError('Vui lòng nhập đường dẫn folder tổng');
            return;
        }
        if (!audioFile) {
            setMixError('Vui lòng chọn hoặc tạo audio trước');
            return;
        }

        setMixLoading(true);
        setMixProgress(0);
        setMixError('');
        setMixResult(null);

        try {
            const formData = new FormData();
            formData.append('base_folder_path', baseFolderPath.trim());
            formData.append('audio', audioFile);
            formData.append('width', '720');
            formData.append('height', '1280');
            formData.append('num_outputs', '5');

            // Call BE (NestJS) - BE will orchestrate:
            // 1. Read subfolders
            // 2. Call AI Service to scan metadata (with cache)
            // 3. Select best 10 folders
            // 4. Call AI Service to mix
            const response = await fetch(`${BE_API_URL}/ai/mix-video-auto`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                setMixError(data.error || 'Có lỗi khi ghép video.');
                toast.error(data.error || 'Có lỗi khi ghép video.');
                return;
            }

            const progressId = data.progress_id;

            // Show info về folders được chọn
            if (data.selected_folders) {
                toast.success(
                    `✅ BE đã tự động chọn ${data.selected_folders.length} folders!\n` +
                    `📹 Tổng ${data.total_videos} videos\n` +
                    `⚡ Cache hit: ${data.cache_stats?.hit_rate}%`
                );
            }

            if (!progressId) {
                setMixError('Server không trả progress_id.');
                return;
            }

            await new Promise<void>((resolve) => {
                const poll = async () => {
                    // Poll status through BE
                    const statusRes = await fetch(`${BE_API_URL}/ai/mix-video/status/${progressId}`);
                    const statusData = await statusRes.json().catch(() => ({}));
                    if (!statusRes.ok) {
                        setMixError(statusData.error || 'Lỗi khi lấy trạng thái.');
                        resolve();
                        return;
                    }
                    if (statusData.percent != null) setMixProgress(statusData.percent);
                    if (statusData.status === 'done') {
                        setMixResult({
                            output_url: statusData.output_url,
                            output_filename: statusData.output_filename,
                            output_urls: statusData.output_urls,
                            output_filenames: statusData.output_filenames,
                            num_outputs: statusData.num_outputs,
                        });
                        toast.success(`🎉 Hoàn thành ${statusData.num_outputs} videos!`);
                        resolve();
                        return;
                    }
                    if (statusData.status === 'error') {
                        setMixError(statusData.error || 'Lỗi khi ghép video.');
                        resolve();
                        return;
                    }
                    setTimeout(poll, 2000);
                };
                poll();
            });
        } catch (error: any) {
            setMixError(error.message || 'Lỗi kết nối.');
            toast.error(error.message || 'Lỗi kết nối.');
        } finally {
            setMixLoading(false);
        }
    };

    // OLD: Manual mix (giữ lại để backward compatible)
    const handleMix = async () => {
        const hasFolder = folderSlots.some(s => s.path.trim() !== '');
        if (!hasFolder) { setMixError('Vui lòng nhập đường dẫn cho ít nhất 1 folder video.'); return; }
        if (!audioFile) { setMixError('Vui lòng chọn hoặc tạo audio trước.'); return; }

        setMixLoading(true);
        setMixProgress(0);
        setMixError('');
        setMixResult(null);
        try {
            const formData = new FormData();
            formData.append('audio', audioFile);
            folderSlots.forEach((slot, i) => {
                formData.append(`folder_paths_${i}`, slot.path.trim());
            });
            formData.append('width', '720');
            formData.append('height', '1280');

            const response = await fetch(`${AI_SERVICE_URL}/api/videos/mix/`, { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok) { setMixError(data.error || 'Có lỗi khi ghép video.'); return; }

            const progressId = data.progress_id;
            if (!progressId) { setMixError('Server không trả progress_id.'); return; }

            await new Promise<void>((resolve) => {
                const poll = async () => {
                    const statusRes = await fetch(`${AI_SERVICE_URL}/api/videos/mix/status/${progressId}/`);
                    const statusData = await statusRes.json().catch(() => ({}));
                    if (!statusRes.ok) { setMixError(statusData.error || 'Lỗi khi lấy trạng thái.'); resolve(); return; }
                    if (statusData.percent != null) setMixProgress(statusData.percent);
                    if (statusData.status === 'done') {
                        setMixResult({
                            output_url: statusData.output_url, output_filename: statusData.output_filename,
                            output_urls: statusData.output_urls, output_filenames: statusData.output_filenames,
                            num_outputs: statusData.num_outputs,
                        });
                        resolve(); return;
                    }
                    if (statusData.status === 'error') { setMixError(statusData.error || 'Lỗi khi ghép video.'); resolve(); return; }
                    setTimeout(poll, 500);
                };
                poll();
            });
        } catch (err: any) {
            setMixError(err.message || 'Lỗi kết nối tới server.');
        } finally {
            setMixLoading(false);
            setMixProgress(0);
        }
    };

    const getDownloadUrl = (urlPath: string) => `${AI_SERVICE_URL}/${urlPath.replace(/^\//, '')}`;

    const contentSections = generatedContent ? [
        { key: 'hook', label: 'Hook (Mở đầu)', text: generatedContent.hook, color: 'from-red-500 to-pink-500' },
        { key: 'problem', label: 'Problem (Vấn đề)', text: generatedContent.problem, color: 'from-orange-500 to-yellow-500' },
        { key: 'solution', label: 'Solution (Giải pháp)', text: generatedContent.solution, color: 'from-green-500 to-emerald-500' },
        { key: 'cta', label: 'CTA (Kêu gọi hành động)', text: generatedContent.cta, color: 'from-blue-500 to-purple-500' },
    ] : [];

    // ─── Step Indicator ───
    const steps = [
        { key: 'generate', label: '1. Tạo nội dung', icon: Sparkles },
        { key: 'content', label: '2. Xem kịch bản', icon: CheckCircle },
        { key: 'mix-video', label: '3. Mix Video', icon: Scissors },
    ];

    return (
        <div className="min-h-[calc(100vh-80px)] bg-[#0a0a0a] text-gray-200 p-6 md:p-10 font-sans -m-6">
            <div className="max-w-6xl mx-auto py-6">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <button onClick={() => {
                        if (currentStep === 'mix-video') setCurrentStep('content');
                        else if (currentStep === 'content') { setGeneratedContent(null); setBaseVietnameseContent(null); setBaseVietnameseMarketLanguage(null); setManualSourceContent(''); setCurrentStep('generate'); }
                        else router.back();
                    }} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        Quay lại
                    </button>

                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl shadow-lg shadow-purple-900/30">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-white bg-clip-text text-transparent">
                                    Content & Mix Video Pipeline
                                </h1>
                                <p className="text-gray-500 mt-1 max-w-xl truncate text-sm">{videoTitle}</p>
                            </div>
                        </div>
                        {productInfo.name && (
                            <div className="hidden md:block">
                                <div className="bg-[#141414] px-4 py-2 rounded-xl shadow-lg border border-gray-800 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20">
                                        <CheckCircle className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Sản phẩm</p>
                                        <p className="font-bold text-gray-200 max-w-[200px] truncate text-sm">{productInfo.name}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step Indicator */}
                    <div className="flex items-center gap-2 mt-6 bg-[#141414] rounded-xl p-3 border border-gray-800">
                        {steps.map((step, idx) => {
                            const isActive = step.key === currentStep;
                            const isDone = steps.findIndex(s => s.key === currentStep) > idx;
                            return (
                                <React.Fragment key={step.key}>
                                    {idx > 0 && <div className={`flex-1 h-0.5 rounded ${isDone ? 'bg-purple-500' : 'bg-gray-800'}`} />}
                                    <button
                                        onClick={() => {
                                            if (isDone) setCurrentStep(step.key as Step);
                                        }}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                                            ${isActive ? 'bg-purple-600/20 text-purple-400 ring-1 ring-purple-500/50' : isDone ? 'text-emerald-400 cursor-pointer hover:bg-gray-800' : 'text-gray-600 cursor-default'}`}
                                    >
                                        {isDone ? <Check className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                                        {step.label}
                                    </button>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </motion.div>

                <AnimatePresence mode="wait">
                    {/* ═══════════ STEP 1: GENERATE ═══════════ */}
                    {currentStep === 'generate' && (
                        <motion.div key="step-generate" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">

                            <div className="bg-[#141414] rounded-2xl border border-gray-800 p-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                {!isTranslateOnlyEntry && (
                                    <button
                                        onClick={() => setGenerateMode('from-video')}
                                        className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${generateMode === 'from-video'
                                            ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                                            : 'bg-[#1a1a1a] text-gray-400 border border-gray-800 hover:text-gray-200'}`}
                                    >
                                        Generate content từ video nguồn
                                    </button>
                                )}
                                <button
                                    onClick={() => setGenerateMode('translate-only')}
                                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${generateMode === 'translate-only'
                                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                                        : 'bg-[#1a1a1a] text-gray-400 border border-gray-800 hover:text-gray-200'}`}
                                >
                                    Dịch content có sẵn
                                </button>
                            </div>

                            {/* ━ PANEL: Nội dung video gốc ━ */}
                            {generateMode === 'from-video' && (videoTitle || videoDescription) && (
                                <div className="bg-[#141414] rounded-2xl border border-amber-500/20 shadow-xl">
                                    {/* Header */}
                                    <div className="flex items-center gap-3 px-6 py-4 border-b border-amber-500/10 bg-amber-500/5 rounded-t-2xl">
                                        <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 flex-shrink-0">
                                            <span className="text-lg">🎬</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-base font-bold text-amber-300">Nội dung video gốc</h2>
                                            <p className="text-xs text-amber-500/70 mt-0.5">AI sẽ phân tích toàn bộ nội dung này để tạo kịch bản</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {/* Nút Transcribe — chỉ hiện khi có videoUrl */}
                                            {videoUrl && (
                                                <button
                                                    onClick={handleTranscribe}
                                                    disabled={isTranscribing}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-600 hover:to-pink-600 text-white text-xs font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow"
                                                >
                                                    {isTranscribing ? (
                                                        <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang transcribe...</>
                                                    ) : transcript ? (
                                                        <><RefreshCw className="w-3.5 h-3.5" />Transcribe lại</>
                                                    ) : (
                                                        <><Mic className="w-3.5 h-3.5" />Transcribe Video</>
                                                    )}
                                                </button>
                                            )}
                                            <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                                                NGUỒN
                                            </div>
                                        </div>
                                    </div>

                                    {/* Nội dung */}
                                    <div className="px-6 py-5 space-y-4">
                                        {videoTitle && (
                                            <div className="space-y-1.5">
                                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Tiêu đề video</p>
                                                <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl px-4 py-3">
                                                    <p className="text-gray-200 font-semibold text-base leading-relaxed whitespace-pre-wrap break-words">{videoTitle}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Caption / Description */}
                                        <div className="space-y-1.5">
                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Caption / Hashtag</p>
                                            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl px-4 py-3 min-h-[60px]">
                                                {videoDescription ? (
                                                    <p className="text-gray-400 text-sm leading-loose whitespace-pre-wrap break-words">{videoDescription}</p>
                                                ) : (
                                                    <p className="text-gray-600 text-sm italic">Không có caption.</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Transcript — hiện sau khi transcribe */}
                                        {(transcript || isTranscribing || transcribeError) && (
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs text-purple-400 uppercase tracking-wider font-semibold">
                                                        🎙 Nội dung lời nói (Transcription)
                                                    </p>
                                                    {transcript && (
                                                        <span className="text-xs text-gray-600">— {transcript.length} ký tự</span>
                                                    )}
                                                </div>
                                                <div className={`rounded-xl px-4 py-4 min-h-[100px] border transition-colors ${transcript
                                                    ? 'bg-purple-950/20 border-purple-500/30'
                                                    : transcribeError
                                                        ? 'bg-red-950/20 border-red-500/30'
                                                        : 'bg-[#1a1a1a] border-gray-800'
                                                    }`}>
                                                    {isTranscribing && (
                                                        <div className="flex items-center gap-3 text-gray-400">
                                                            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                                                            <div>
                                                                <p className="text-sm font-medium text-purple-300">Đang transcribe video...</p>
                                                                <p className="text-xs text-gray-500 mt-0.5">Download → Trích audio → Whisper AI → Text</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {!isTranscribing && transcript && (
                                                        <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words">{transcript}</p>
                                                    )}
                                                    {!isTranscribing && !transcript && transcribeError && (
                                                        <p className="text-red-400 text-sm">{transcribeError}</p>
                                                    )}
                                                </div>
                                                {!videoUrl && (
                                                    <p className="text-xs text-gray-600 italic">
                                                        ⚠ Không có URL video. Bấm "Generate Content" trực tiếp từ trang kết quả tìm kiếm để kích hoạt tính năng này.
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Hint khi chưa transcribe */}
                                        {videoUrl && !transcript && !isTranscribing && !transcribeError && (
                                            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-purple-500/5 border border-purple-500/15 text-xs text-purple-400/70">
                                                <Mic className="w-4 h-4 flex-shrink-0" />
                                                <span>Nhấn <strong>Transcribe Video</strong> để chuyển giọng nói trong video thành text — AI sẽ phân tích nội dung chính xác hơn.</span>
                                            </div>
                                        )}

                                        {/* ── Dropdown chọn ngôn ngữ output (chọn trước khi generate) ── */}
                                        <div className="pt-2 border-t border-gray-800">
                                            <div className="flex items-center justify-between flex-wrap gap-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">🌐 Ngôn ngữ nội dung generate</span>
                                                    {detectedLanguage && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400">
                                                            Video gốc: <strong>{detectedLanguage}</strong>
                                                        </span>
                                                    )}
                                                </div>
                                                <LanguageSelect
                                                    value={outputLanguage}
                                                    onChange={setOutputLanguage}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-600 mt-2">
                                                Chọn ngôn ngữ trước khi bấm Generate Content. Tiếng Việt sẽ tạo khoảng 300 từ, ngôn ngữ khác sẽ tạo dài hơn.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {generateMode === 'translate-only' && (
                                <div className="bg-[#141414] rounded-2xl border border-blue-500/20 shadow-xl">
                                    <div className="px-6 py-4 border-b border-blue-500/10 bg-blue-500/5 rounded-t-2xl">
                                        <h2 className="text-base font-bold text-blue-300">Dịch content có sẵn</h2>
                                        <p className="text-xs text-blue-500/70 mt-0.5">Dán content của bạn để AI chuyển sang ngôn ngữ đã chọn</p>
                                    </div>
                                    <div className="p-5 space-y-4">
                                        <textarea
                                            value={manualSourceContent}
                                            onChange={(e) => setManualSourceContent(e.target.value)}
                                            placeholder="Dán content cần dịch vào đây..."
                                            className="w-full min-h-[180px] bg-[#1a1a1a] border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                        />
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <span className="text-xs text-gray-500">Số ký tự: {manualSourceContent.length}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-gray-400 whitespace-nowrap">Ngôn ngữ sẽ chuyển thành</span>
                                                <div className="w-[240px]">
                                                    <LanguageSelect value={outputLanguage} onChange={setOutputLanguage} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}



                            {/* ━ PANEL: Chọn loại content ━ */}
                            {generateMode === 'from-video' && (
                                <div className="bg-[#141414] rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
                                    <div className="px-6 py-4 border-b border-gray-800/60 bg-[#0d0d0d] flex items-center gap-3">
                                        <div className="p-1.5 bg-purple-500/15 rounded-lg border border-purple-500/20">
                                            <Sparkles className="w-4 h-4 text-purple-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-bold text-white">Chọn loại content</h2>
                                            <p className="text-xs text-gray-500 mt-0.5">AI sẽ tạo kịch bản theo phong cách phù hợp</p>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {CONTENT_TYPES.map((type) => (
                                                <button key={type.id} onClick={() => setSelectedType(type.id)} disabled={isGenerating}
                                                    className={`text-left p-5 rounded-xl border transition-all duration-200
                                                ${selectedType === type.id ? 'border-purple-500 bg-purple-900/20 shadow-[0_0_15px_rgba(168,85,247,0.15)] scale-[1.02]' : 'border-gray-800 bg-[#1a1a1a] hover:border-gray-600 hover:bg-[#202020] hover:shadow-lg'}
                                                ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                    <div className="flex items-start gap-3 mb-3">
                                                        <div className={`p-2 rounded-lg bg-gradient-to-br ${type.color} shadow-lg`}><div className="w-6 h-6 bg-white/20 rounded" /></div>
                                                        <div className="flex-1">
                                                            <h3 className={`font-bold ${selectedType === type.id ? 'text-white' : 'text-gray-200'}`}>{type.name}</h3>
                                                            <p className="text-gray-500 text-xs mt-1">{type.description}</p>
                                                        </div>
                                                        {selectedType === type.id && <CheckCircle className="w-6 h-6 text-purple-400" />}
                                                    </div>
                                                    <div className="space-y-1 mt-4 pt-4 border-t border-gray-800/50">
                                                        {type.examples.map((ex, idx) => (
                                                            <div key={idx} className="flex items-start gap-2 text-xs text-gray-500">
                                                                <span className="text-purple-500 mt-0.5">•</span><span>{ex}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Generate Button */}
                                    <div className="px-5 pb-5">
                                        <button
                                            onClick={handleGenerate}
                                            disabled={!selectedType || isGenerating}
                                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30">
                                            {isGenerating ? (
                                                <><Loader2 className="w-5 h-5 animate-spin" />Đang xử lý AI...</>
                                            ) : (
                                                <><Sparkles className="w-5 h-5" />Generate Content</>
                                            )}
                                        </button>
                                        {!selectedType && (
                                            <p className="text-center text-xs text-gray-600 mt-2">← Chọn loại content để tiếp tục</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {generateMode === 'translate-only' && (
                                <div className="bg-[#141414] rounded-2xl border border-gray-800 p-5">
                                    <button
                                        onClick={handleTranslateExistingContent}
                                        disabled={isGenerating || !manualSourceContent.trim()}
                                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30"
                                    >
                                        {isGenerating ? (<><Loader2 className="w-5 h-5 animate-spin" />Đang dịch content...</>) : (<><Sparkles className="w-5 h-5" />Dịch Content</>)}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ═══════════ STEP 2: VIEW CONTENT ═══════════ */}
                    {currentStep === 'content' && generatedContent && (
                        <motion.div key="step-content" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">

                            {/* Header generated */}
                            <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-xl shadow-purple-900/20 border border-purple-500/20">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-24 translate-x-24 pointer-events-none" />
                                <div className="relative flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{generatedContent.title}</h2>
                                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                                            <span className="text-white/80 text-sm bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                                                {generatedContent.content_type_display}
                                            </span>
                                            <span className="text-white/70 text-xs bg-white/10 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                                📝 {generatedContent.word_count} từ
                                            </span>
                                            <span className="text-white/70 text-xs bg-white/10 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                                🎙 ~{Math.round(generatedContent.word_count / 2.5)}s
                                            </span>
                                        </div>
                                    </div>
                                    <CheckCircle className="w-12 h-12 text-white/40 flex-shrink-0" />
                                </div>
                            </div>

                            {/* ━ SO SÁNH HAI BÊN: Video gốc vs Nội dung mới ━ */}
                            {(videoTitle || videoDescription) && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {/* Cột trái: Video gốc */}
                                    <div className="bg-[#141414] rounded-2xl border border-amber-500/20 flex flex-col overflow-hidden">
                                        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-amber-500/10 bg-amber-500/5">
                                            <span className="text-base">&#127916;</span>
                                            <h3 className="font-bold text-amber-300 text-sm">
                                                {outputLanguage === 'vi' ? 'Content gốc (nguồn cảm hứng)' : 'Content Việt (nguồn cảm hứng)'}
                                            </h3>
                                            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">GỐC</span>
                                        </div>
                                        <div className="px-5 py-4 space-y-3 flex-1">
                                            {outputLanguage !== 'vi' && baseVietnameseContent?.script ? (
                                                <div>
                                                    <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Nội dung Việt đã generate (nguồn convert)</p>
                                                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{baseVietnameseContent.script}</p>
                                                </div>
                                            ) : transcript ? (
                                                <div>
                                                    <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Nội dung transcribe từ video</p>
                                                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    {videoTitle && (
                                                        <>
                                                            <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Tiêu đề</p>
                                                            <p className="text-gray-300 font-medium text-sm leading-relaxed">{videoTitle}</p>
                                                        </>
                                                    )}
                                                    {videoDescription && (
                                                        <>
                                                            <p className="text-xs text-gray-600 uppercase font-semibold mt-3 mb-1">Caption / Mô tả</p>
                                                            <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">{videoDescription}</p>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Cột phải: Kịch bản mới */}
                                    <div className="bg-[#141414] rounded-2xl border border-purple-500/20 flex flex-col overflow-hidden relative">
                                        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-purple-500/10 bg-purple-500/5">
                                            <Sparkles className="w-4 h-4 text-purple-400" />
                                            <h3 className="font-bold text-purple-300 text-sm">Kịch bản đã generate</h3>
                                            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">MỚI</span>
                                        </div>
                                        {isConverting && (
                                            <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                                                    <span className="text-sm text-purple-300 font-medium">Đang chuyển đổi ngôn ngữ...</span>
                                                </div>
                                            </div>
                                        )}
                                        <div className="px-5 py-4 flex-1 relative">
                                            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{generatedContent.script}</p>
                                            <button onClick={() => copyToClipboard(generatedContent.script, 'compare')}
                                                className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#202020] hover:bg-[#2a2a2a] text-gray-400 hover:text-white border border-gray-700 transition-colors">
                                                {copiedSection === 'compare' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Full Script — hiển riêng nếu không có video gốc */}
                            {!videoTitle && !videoDescription && (
                                <div className="bg-[#141414] rounded-2xl p-6 shadow-xl border border-gray-800">
                                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <div className="w-1 h-6 bg-purple-500 rounded-full" />Kịch bản đầy đủ
                                        </h3>
                                        <button onClick={() => copyToClipboard(generatedContent.script, 'full')}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#202020] hover:bg-[#2a2a2a] text-gray-300 transition-colors border border-gray-700">
                                            {copiedSection === 'full' ? (<><Check className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">Đã copy!</span></>) : (<><Copy className="w-4 h-4" />Copy</>)}
                                        </button>
                                    </div>
                                    <p className="text-gray-300 whitespace-pre-wrap leading-relaxed font-sans text-base">{generatedContent.script}</p>
                                </div>
                            )}

                            {/* Copy full — hiển khi có view 2 cột */}
                            {(videoTitle || videoDescription) && (
                                <div className="bg-[#141414] rounded-2xl p-4 border border-gray-800 flex items-center justify-between">
                                    <p className="text-xs text-gray-500">Kịch bản đầy đủ ({generatedContent.word_count} từ)</p>
                                    <button onClick={() => copyToClipboard(generatedContent.script, 'full')}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#202020] hover:bg-[#2a2a2a] text-gray-300 transition-colors border border-gray-700 text-sm">
                                        {copiedSection === 'full' ? (<><Check className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400">Đã copy!</span></>) : (<><Copy className="w-4 h-4" />Copy kịch bản</>)}
                                    </button>
                                </div>
                            )}

                            {/* ── Bảng đối chiếu (chỉ cho ngôn ngữ khác tiếng Việt) ── */}
                            {outputLanguage !== 'vi' && (generatedContent.verification_rows?.length || 0) > 0 && (
                                <div className="bg-[#141414] rounded-2xl border border-gray-800 overflow-hidden">
                                    <div className="px-5 py-3 border-b border-gray-800 bg-[#0f0f0f]">
                                        <h3 className="text-sm font-semibold text-white">Bảng đối chiếu để recheck và ghép video</h3>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Mỗi dòng là một đoạn ngắn: Phiên âm - Bản ngữ - Tiếng Việt.
                                        </p>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[720px] text-sm table-fixed">
                                            <colgroup>
                                                <col className="w-[32%]" />
                                                <col className="w-[34%]" />
                                                <col className="w-[34%]" />
                                            </colgroup>
                                            <thead className="bg-[#171717] border-b border-gray-800">
                                                <tr>
                                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-300 uppercase tracking-wide">Phiên âm</th>
                                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-300 uppercase tracking-wide">Bản ngữ</th>
                                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-300 uppercase tracking-wide">Tiếng Việt</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {generatedContent.verification_rows?.map((row, idx) => (
                                                    row.row_type === 'section' ? (
                                                        <tr key={idx} className="bg-blue-500/15 border-b border-blue-400/20">
                                                            <td colSpan={3} className="px-4 py-2.5 text-blue-200 font-semibold text-xs uppercase tracking-wide">
                                                                — {row.section_title || 'Đầu mục'} —
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        <tr key={idx} className="border-b border-gray-800/60 hover:bg-white/[0.02]">
                                                            <td className="px-4 py-3 text-gray-300 align-top leading-relaxed break-words whitespace-pre-wrap">{row.phonetic}</td>
                                                            <td className="px-4 py-3 text-gray-200 align-top leading-relaxed break-words whitespace-pre-wrap">{row.native}</td>
                                                            <td className="px-4 py-3 text-gray-300 align-top leading-relaxed break-words whitespace-pre-wrap">{row.vietnamese}</td>
                                                        </tr>
                                                    )
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ── Language Convert Section ── */}
                            <div className="bg-[#141414] rounded-2xl border border-gray-800 overflow-hidden">
                                <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">🌐 Ngôn ngữ nội dung</span>
                                        {detectedLanguage && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400">
                                                Video gốc: <strong>{detectedLanguage}</strong>
                                            </span>
                                        )}
                                        {isConverting && (
                                            <span className="flex items-center gap-1.5 text-xs text-amber-400">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                Đang chuyển đổi...
                                            </span>
                                        )}
                                    </div>
                                    <LanguageSelect
                                        value={outputLanguage}
                                        onChange={handleLanguageChange}
                                    />
                                </div>
                                <div className="px-5 pb-3">
                                    <p className="text-xs text-gray-600">
                                        Chọn ngôn ngữ khác để AI tự động chuyển đổi toàn bộ kịch bản sang ngôn ngữ đó.
                                    </p>
                                </div>
                            </div>

                            {/* Advanced Prompt Section */}
                            <div className="bg-[#141414] rounded-2xl border border-gray-800 overflow-hidden">
                                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800/60 bg-[#0d0d0d]">
                                    <div className="p-1.5 bg-purple-500/15 rounded-lg border border-purple-500/20">
                                        <Sparkles className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold text-white">Không hài lòng với kịch bản này?</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">AI tạo prompt tối ưu rồi generate lại theo ý bạn</p>
                                    </div>
                                    <button
                                        onClick={handleAutoGeneratePrompt}
                                        disabled={isGenerating}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow"
                                    >
                                        {isGenerating ? (
                                            <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang tạo...</>
                                        ) : (
                                            <><Sparkles className="w-3.5 h-3.5" />Generate lại với AI Prompt</>
                                        )}
                                    </button>
                                </div>
                                <div className="px-5 py-3 flex items-center gap-2 text-xs text-gray-600">
                                    <span>💡</span>
                                    <span>AI sẽ phân tích video gốc → tạo prompt style “Kể chuyện đơn khách” → generate kịch bản mới chất lượng hơn</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-between items-center pt-2 gap-3">
                                <button onClick={() => { setGeneratedContent(null); setBaseVietnameseContent(null); setBaseVietnameseMarketLanguage(null); setManualSourceContent(''); setCurrentStep('generate'); }}
                                    className="px-5 py-2.5 rounded-xl bg-[#1a1a1a] text-gray-400 text-sm font-medium hover:bg-[#222] hover:text-white transition-colors border border-gray-800 flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4" />Tạo lại
                                </button>
                                <button onClick={handleApprove} disabled={isApproving}
                                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold hover:from-emerald-700 hover:to-green-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/40 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isApproving ? (<><Loader2 className="w-5 h-5 animate-spin" />Đang duyệt...</>) : (<><CheckCircle className="w-5 h-5" />Duyệt</>)}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ═══════════ STEP 3: SMART MIX VIDEO (20-30x FASTER!) ═══════════ */}
                    {currentStep === 'mix-video' && (
                        <motion.div key="step-mix" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                            <SmartMixVideo
                                generatedScript={generatedContent?.script}
                                contentType={selectedType || undefined}
                                productId={productInfo.id}
                                productSku={productInfo.sku}
                                productCategory={productInfo.category}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Advanced Prompt Modal */}
                {showAdvancedPrompt && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-[#141414] rounded-2xl border border-gray-800 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-800 bg-gradient-to-r from-purple-600/10 to-pink-600/10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
                                            <Sparkles className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-white">Prompt Nâng cao</h3>
                                            <p className="text-gray-400 text-sm mt-1">Hệ thống đã điền sẵn prompt chuẩn tối ưu - bạn chỉ cần đọc và Regenerate</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setShowAdvancedPrompt(false); setAdvancedPrompt(''); }}
                                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 flex-1 overflow-y-auto">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                                            Prompt chuẩn (đã điền sẵn)
                                        </label>
                                        <textarea
                                            value={advancedPrompt}
                                            onChange={(e) => setAdvancedPrompt(e.target.value)}
                                            placeholder="..."
                                            readOnly
                                            className="w-full h-64 px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-xl text-gray-200 placeholder-gray-600 resize-none cursor-default text-sm leading-relaxed"
                                        />
                                        <p className="text-xs text-gray-500 mt-2">
                                            Hệ thống đã chọn prompt tối ưu để tạo nội dung văn bản chất lượng cao. Nhấn Regenerate để tạo lại.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-800 bg-[#0a0a0a] flex gap-3">
                                <button
                                    onClick={() => { setShowAdvancedPrompt(false); setAdvancedPrompt(''); }}
                                    className="flex-1 px-6 py-3 rounded-xl bg-[#202020] text-gray-400 font-semibold hover:bg-[#2a2a2a] hover:text-white transition-colors border border-gray-800"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleAdvancedGenerate}
                                    disabled={!advancedPrompt.trim() || isGenerating}
                                    className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Đang tạo...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            Regenerate
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
}
