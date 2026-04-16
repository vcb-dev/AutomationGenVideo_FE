import { useState } from 'react';
import axios from 'axios';

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8001';

export interface GeneratedContent {
    id: number;
    title: string;
    script: string;
    hook: string;
    problem: string;
    solution: string;
    cta: string;
    word_count: number;
    content_type: string;
    content_type_display: string;
    created_at: string;
    verification_rows?: Array<{
        row_type?: 'section' | 'row';
        section_title?: string;
        phonetic: string;
        native: string;
        vietnamese: string;
    }>;
}

export interface GenerateContentRequest {
    video_id?: number;
    video_description?: string;
    video_title?: string;
    content_type: string;
    brand_name?: string;
    industry?: string;
    additional_context?: string;
    output_language?: string;   // 'vi' | 'en' | 'zh' | ... — ngôn ngữ generate content output
    target_market_language?: string; // giữ văn hóa thị trường đích ngay cả khi output là tiếng Việt
    // Product info
    product_id?: string;
    product_name?: string;
    product_category?: string;
    product_description?: string;
    product_price?: string;
    product_sku?: string;
    // Advanced prompt
    custom_prompt?: string;
    translation_mode?: boolean;
}

/** When the model puts "romaji || JP || VI" entirely in phonetic, split for correct table columns. */
function normalizeVerificationRows(
    rows: GeneratedContent['verification_rows']
): GeneratedContent['verification_rows'] {
    if (!rows?.length) return rows;
    return rows.map((row) => {
        if (row.row_type === 'section') return row;
        let phonetic = row.phonetic ?? '';
        let native = row.native ?? '';
        let vietnamese = row.vietnamese ?? '';
        if (!native && !vietnamese) {
            let p = phonetic.replace(/\uFF5C\uFF5C/g, '||').replace(/\uFF5C/g, '|');
            let parts: string[] = [];
            if (p.includes('||')) {
                parts = p.split('||').map((s) => s.trim().replace(/^[—–\-]\s*/, '')).filter(Boolean);
            } else if ((p.match(/\|/g) || []).length >= 2) {
                parts = p.split(/\s*\|\s*/).map((s) => s.trim().replace(/^[—–\-]\s*/, '')).filter(Boolean);
            }
            if (parts.length >= 3) {
                return {
                    ...row,
                    phonetic: parts[0],
                    native: parts[1],
                    vietnamese: parts.slice(2).join(' || '),
                };
            }
        }
        return { ...row, phonetic, native, vietnamese };
    });
}

export function useContentGeneration() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateContent = async (request: GenerateContentRequest): Promise<GeneratedContent | null> => {
        setIsGenerating(true);
        setError(null);

        try {
            const response = await axios.post<{
                success: boolean;
                content_id: number;
                title: string;
                script: string;
                hook: string;
                problem: string;
                solution: string;
                cta: string;
                word_count: number;
                verification_rows?: Array<{
                    row_type?: 'section' | 'row';
                    section_title?: string;
                    phonetic: string;
                    native: string;
                    vietnamese: string;
                }>;
                content_type: string;
                created_at: string;
            }>(`${AI_SERVICE_URL}/api/content/generate/`, request);

            if (response.data.success) {
                // Map content_type to display name
                const contentTypeMap: Record<string, string> = {
                    'A1': 'Traffic (Viral)',
                    'A2': 'Knowledge (Giáo dục)',
                    'A3': 'Credibility (Uy tín)',
                    'A4': 'Conversion (Bán hàng)',
                    'A5': 'Combined (Tổng hợp)'
                };

                return {
                    id: response.data.content_id,
                    title: response.data.title,
                    script: response.data.script,
                    hook: response.data.hook,
                    problem: response.data.problem,
                    solution: response.data.solution,
                    cta: response.data.cta,
                    word_count: response.data.word_count,
                    content_type: response.data.content_type,
                    content_type_display: contentTypeMap[response.data.content_type] || response.data.content_type,
                    created_at: response.data.created_at,
                    verification_rows: request.output_language === 'vi'
                        ? []
                        : normalizeVerificationRows(response.data.verification_rows || [])
                };
            }

            throw new Error('Generation failed');
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Failed to generate content';
            setError(errorMessage);
            console.error('Content generation error:', err);
            return null;
        } finally {
            setIsGenerating(false);
        }
    };

    const getGeneratedContents = async (videoId: number): Promise<GeneratedContent[]> => {
        try {
            const response = await axios.get<{
                success: boolean;
                contents: Array<{
                    id: number;
                    content_type: string;
                    content_type_display: string;
                    title: string;
                    script: string;
                    hook: string;
                    problem: string;
                    solution: string;
                    cta: string;
                    word_count: number;
                    is_approved: boolean;
                    created_at: string;
                }>;
            }>(`${AI_SERVICE_URL}/api/content/video/${videoId}/`);

            if (response.data.success) {
                return response.data.contents.map(c => ({
                    id: c.id,
                    title: c.title,
                    script: c.script,
                    hook: c.hook,
                    problem: c.problem,
                    solution: c.solution,
                    cta: c.cta,
                    word_count: c.word_count,
                    content_type: c.content_type,
                    content_type_display: c.content_type_display,
                    created_at: c.created_at
                }));
            }

            return [];
        } catch (err) {
            console.error('Failed to fetch generated contents:', err);
            return [];
        }
    };

    const generatePrompt = async (request: GenerateContentRequest): Promise<string | null> => {
        setIsGenerating(true);
        setError(null);
        try {
            const response = await axios.post<{
                success: boolean;
                prompt: string;
            }>(`${AI_SERVICE_URL}/api/content/generate-prompt/`, request);

            if (response.data.success) {
                return response.data.prompt;
            }
            throw new Error('Failed to generate prompt');
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Failed to generate prompt';
            setError(errorMessage);
            console.error('Prompt generation error:', err);
            return null;
        } finally {
            setIsGenerating(false);
        }
    };

    return {
        generateContent,
        getGeneratedContents,
        generatePrompt,
        isGenerating,
        error
    };
}
