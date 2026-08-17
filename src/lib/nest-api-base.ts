/**
 * Base URL NestJS (`…/api`) cho Route Handler trên server.
 * Không dùng `NEXT_PUBLIC_API_URL=/api` ở đây — fetch tương đối sẽ loop về chính Next.
 */
export function nestApiBase(): string {
  const fromProxy = (process.env.API_PROXY_TARGET || process.env.BE_API_URL || '')
    .trim()
    .replace(/\/$/, '')
    .replace(/\/api$/i, '');
  if (fromProxy) {
    return `${fromProxy}/api`;
  }
  if (process.env.VERCEL) {
    return 'https://automationgenvideo-be-production-9770.up.railway.app/api';
  }
  const pub = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
  if (pub.startsWith('http://') || pub.startsWith('https://')) return pub;
  return 'http://localhost:3000/api';
}
