describe('Standard DatePicker and DateTimePicker UI logic', () => {
  it('should format date string in DD/MM/YYYY format', () => {
    const isoDate = '2026-08-21';
    const [y, m, d] = isoDate.split('-');
    expect(`${d}/${m}/${y}`).toBe('21/08/2026');
  });

  it('should validate dateTime range correctly', () => {
    const fromTime = '2026-08-21T09:00';
    const toTime = '2026-08-21T17:00';
    expect(new Date(toTime) > new Date(fromTime)).toBe(true);
  });
});
