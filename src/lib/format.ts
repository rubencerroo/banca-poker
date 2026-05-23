export const formatEuros = (cents: number): string => {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const c = abs % 100;
  return `${sign}${euros},${c.toString().padStart(2, '0')} €`;
};

export const uid = () => Math.random().toString(36).slice(2, 10);
