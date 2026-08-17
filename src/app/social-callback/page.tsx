'use client';
import { useEffect, useState } from 'react';

export default function SocialCallbackPage() {
  // Popup này nằm ngoài SocialLanguageProvider → đọc thẳng ngôn ngữ đã lưu.
  // Mặc định EN cho tới khi hydrate xong để không nháy chữ tiếng Việt.
  const [label, setLabel] = useState('Completing connection...');

  useEffect(() => {
    try {
      if (localStorage.getItem('social_lang') === 'vi') setLabel('Đang hoàn tất kết nối...');
    } catch {}
  }, []);

  useEffect(() => {
    if (window.opener) {
      try {
        const params = new URLSearchParams(window.location.search);
        const type    = params.get('type')     || 'oauth-success';
        const platform = params.get('platform') || '';
        const error   = params.get('error')    || '';
        const msg = { type, platform, error };
        // Fast-path: postMessage to opener
        window.opener.postMessage(msg, window.location.origin);
        // Fallback for same-origin BroadcastChannel
        try {
          const bc = new BroadcastChannel('vcb-oauth');
          bc.postMessage(msg);
          bc.close();
        } catch {}
      } catch {}
      window.close();
    } else {
      window.location.href = '/dashboard/social/channels';
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600">{label}</p>
      </div>
    </div>
  );
}
