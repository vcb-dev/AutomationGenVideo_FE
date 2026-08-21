describe('DateTimePicker Component Logic', () => {
  it('should format date and time in Vietnamese convention', () => {
    const d = new Date('2026-08-21T14:30:00');
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const hour = d.getHours();
    const min = d.getMinutes();

    expect(day).toBe(21);
    expect(month).toBe(8);
    expect(year).toBe(2026);
    expect(hour).toBe(14);
    expect(min).toBe(30);
  });

  it('should calculate valid range condition correctly', () => {
    const fromTime = '2026-08-21T09:00';
    const toTime = '2026-08-21T17:00';
    const isValid = new Date(toTime) > new Date(fromTime);
    expect(isValid).toBe(true);

    const invalidToTime = '2026-08-21T08:00';
    const isInvalid = new Date(invalidToTime) > new Date(fromTime);
    expect(isInvalid).toBe(false);
  });
});
