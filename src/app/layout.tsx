import React, { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
// Roboto tự host: next/font/google làm build Vercel sập khi Google trả link font không đuôi (vercel/next.js#99114).
import './fonts/roboto.css';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import AuthHydration from '@/components/AuthHydration';
import ChunkErrorReload from '@/components/ChunkErrorReload';
import QueryProvider from '@/components/QueryProvider';
import InstallPwaPrompt from '@/components/InstallPwaPrompt';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/SocialLanguageContext';

export const metadata: Metadata = {
  title: 'Video Production System',
  description: 'Automated video production management system',
  // Dấu nhận biết cho extension VCB Video Downloader: content script thấy thẻ này thì
  // tự lưu origin hiện tại làm địa chỉ hệ thống, người dùng khỏi phải nhập tay trong
  // trang Cài đặt (địa chỉ đổi liên tục vì chạy qua Cloudflare Tunnel).
  other: {
    'vcb-app': '1',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VCB Task',
  },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="font-sans antialiased">
        <AuthHydration />
        <ChunkErrorReload />
        <ThemeProvider>
          <LanguageProvider>
            <QueryProvider>{children}</QueryProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Toaster
          position="top-right" 
          toastOptions={{
            duration: 3000,
            style: {
              fontSize: '1.05rem',
              fontWeight: '600',
              padding: '16px 24px',
              borderRadius: '16px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            }
          }}
        />
        <InstallPwaPrompt />
      </body>
    </html>
  );
}
