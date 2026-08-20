describe('Extension Propose Auth Header and Cookie Support', () => {
  it('should accept authorization from header or cookie', () => {
    const cookieHeader = 'vcbi_at=my_jwt_token; other=123';
    const match = cookieHeader.match(/(?:^|;\s*)(?:vcbi_at|access_token|token)=([^;]+)/);
    expect(match).not.toBeNull();
    expect(decodeURIComponent(match![1])).toBe('my_jwt_token');
  });

  it('should handle missing cookie safely', () => {
    const cookieHeader = 'other=123';
    const match = cookieHeader.match(/(?:^|;\s*)(?:vcbi_at|access_token|token)=([^;]+)/);
    expect(match).toBeNull();
  });
});
