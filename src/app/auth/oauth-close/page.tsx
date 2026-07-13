'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function OAuthCloseInner() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const type    = searchParams.get('type') ?? '';
        const platform = searchParams.get('platform') ?? '';
        const error   = searchParams.get('error') ?? undefined;
        const payload = { type, platform, error };

        // 1. BroadcastChannel — reliable nhất, không phụ thuộc opener
        try {
            const bc = new BroadcastChannel('vcb-oauth');
            bc.postMessage(payload);
            bc.close();
        } catch { /* browser không hỗ trợ */ }

        // 2. postMessage về opener (fallback)
        if (window.opener) {
            try { window.opener.postMessage(payload, '*'); } catch { }
        }

        // Đóng popup sau 300ms để đảm bảo message được gửi
        setTimeout(() => window.close(), 300);
    }, [searchParams]);

    return null;
}

export default function OAuthClosePage() {
    return (
        <Suspense fallback={null}>
            <OAuthCloseInner />
        </Suspense>
    );
}
