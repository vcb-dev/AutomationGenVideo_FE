'use client';

import { useEffect, useRef, useCallback } from 'react';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
}

declare global {
  interface Window {
    gapi: any;
    google: any;
    gapiInited: boolean;
    gisInited: boolean;
  }
}

const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
const PICKER_API = 'picker';

export function useGoogleDrivePicker(
  onFilesSelected: (files: DriveFile[], accessToken: string) => void,
  onError?: (msg: string) => void,
) {
  const tokenClientRef = useRef<any>(null);
  const accessTokenRef = useRef<string>('');

  const loadScript = (src: string, id: string): Promise<void> =>
    new Promise((resolve) => {
      if (document.getElementById(id)) { resolve(); return; }
      const script = document.createElement('script');
      script.src = src;
      script.id = id;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });

  const createPicker = useCallback(() => {
    const token = accessTokenRef.current;
    if (!token || !window.google?.picker) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
    // Developer key không bắt buộc cho Picker nếu đã có OAuth token
    const view = new window.google.picker.DocsView()
      .setIncludeFolders(false)
      .setMimeTypes([
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
      ].join(','));

    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const files: DriveFile[] = data.docs.map((doc: any) => ({
            id: doc.id,
            name: doc.name,
            mimeType: doc.mimeType,
            url: doc.url,
          }));
          onFilesSelected(files, token);
        }
      })
      .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
      .build();

    picker.setVisible(true);
  }, [onFilesSelected]);

  const openPicker = useCallback(async () => {
    await Promise.all([
      loadScript('https://apis.google.com/js/api.js', 'gapi-script'),
      loadScript('https://accounts.google.com/gsi/client', 'gis-script'),
    ]);

    // Init gapi picker
    await new Promise<void>((resolve) => {
      window.gapi.load(PICKER_API, resolve);
    });

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;

    if (!tokenClientRef.current) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (resp: any) => {
          if (resp.error) {
            const msg = resp.error === 'access_denied'
              ? 'Bạn chưa cấp quyền truy cập Google Drive'
              : `Lỗi xác thực Google: ${resp.error}`;
            onError?.(msg);
            return;
          }
          accessTokenRef.current = resp.access_token;
          createPicker();
        },
        error_callback: (err: any) => {
          onError?.(`Không thể mở đăng nhập Google: ${err?.type || 'unknown'}`);
        },
      });
    }

    if (accessTokenRef.current) {
      createPicker();
    } else {
      tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
    }
  }, [createPicker]);

  return { openPicker };
}
