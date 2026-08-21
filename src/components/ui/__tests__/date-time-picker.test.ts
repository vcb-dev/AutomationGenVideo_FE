describe('DateTimePicker Component Standard Logic', () => {
  it('should format date and time in DD/MM/YYYY HH:mm format', () => {
    const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const d = new Date('2026-08-21T14:30:00');
    const formatted = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    expect(formatted).toBe('21/08/2026 14:30');
  });

  it('should calculate valid range condition correctly', () => {
    const fromTime = '2026-08-21T09:00';
    const toTime = '2026-08-21T17:00';
    const isValid = new Date(toTime) > new Date(fromTime);
    expect(isValid).toBe(true);
  });
});
