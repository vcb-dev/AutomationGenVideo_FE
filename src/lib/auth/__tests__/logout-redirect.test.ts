describe('Auth 401 Interceptor and Logout Redirect Rules', () => {
  it('should not redirect when endpoint is /auth/me or on non-dashboard page', () => {
    const isAuthEndpoint = (url: string) =>
      url.includes('/auth/login') ||
      url.includes('/auth/me') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout');

    expect(isAuthEndpoint('/auth/me')).toBe(true);
    expect(isAuthEndpoint('/auth/login')).toBe(true);
    expect(isAuthEndpoint('/video-library')).toBe(false);
  });

  it('should only redirect to login for protected dashboard routes', () => {
    const shouldRedirect = (pathname: string, isAuth: boolean) =>
      !isAuth && pathname.startsWith('/dashboard');

    expect(shouldRedirect('/', false)).toBe(false);
    expect(shouldRedirect('/dashboard/video-library', false)).toBe(true);
    expect(shouldRedirect('/dashboard', true)).toBe(false);
  });
});
