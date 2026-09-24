export function proxyImg(url: string, w?: number, h?: number): string {
  if (!url) return '';
  const isMeta = url.includes('cdninstagram.com') || url.includes('fbcdn.net');
  const isGoogle = url.includes('googleusercontent.com') || url.includes('drive.google.com');
  if (isMeta || isGoogle) {
    const sizeParams = w && h ? `&w=${w}&h=${h}&fit=cover` : '';
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}${sizeParams}`;
  }
  return url;
}

export function isTransientError(msg?: string | null): boolean {
  if (!msg) return false;
  const lower = msg.toLowerCase();
  return (
    lower.includes('status code 502') ||
    lower.includes('status code 503') ||
    lower.includes('status code 504') ||
    lower.includes('status code 429') ||
    lower.includes('too many requests') ||
    lower.includes('econnrefused') ||
    lower.includes('etimedout') ||
    lower.includes('timedout') ||
    lower.includes('timeout') ||
    lower.includes('econnreset') ||
    lower.includes('enotfound') ||
    lower.includes('network error') ||
    lower.includes('nameresolutionerror') ||
    lower.includes('connectionpool') ||
    lower.includes('max retries exceeded') ||
    lower.includes('temporary failure in name resolution') ||
    lower.includes('getaddrinfo') ||
    lower.includes('socket hang up') ||
    lower.includes('aborted')
  );
}
