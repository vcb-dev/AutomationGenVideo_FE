import React, { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import AuthHydration from '@/components/AuthHydration';
import QueryProvider from '@/components/QueryProvider';

const roboto = Roboto({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Video Production System',
  description: 'Automated video production management system',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={`${roboto.className} antialiased`}>
        <AuthHydration />
        <QueryProvider>{children}</QueryProvider>
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
      </body>
    </html>
  );
}
