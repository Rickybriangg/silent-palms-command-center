// Lightweight, app-wide currency formatting. Choice is stored client-side
// (localStorage) so every page formats amounts consistently. Default: KES.
const SYMBOLS: Record<string, string> = {
  KES: 'KSh', USD: '$', EUR: '€', GBP: '£', TZS: 'TSh', UGX: 'USh', ZAR: 'R',
};

export const CURRENCIES = [
  { code: 'KES', label: 'Kenyan Shilling (KSh)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'TZS', label: 'Tanzanian Shilling (TSh)' },
  { code: 'UGX', label: 'Ugandan Shilling (USh)' },
  { code: 'ZAR', label: 'South African Rand (R)' },
];

const KEY = 'sp_currency';

export function getCurrency(): string {
  if (typeof window === 'undefined') return 'KES';
  return localStorage.getItem(KEY) || 'KES';
}
export function setCurrency(code: string) {
  if (typeof window !== 'undefined') localStorage.setItem(KEY, code);
}
export function currencySymbol(code?: string): string {
  const c = code || getCurrency();
  return SYMBOLS[c] ?? c;
}
// Format a number as money in the active currency, e.g. "KSh 12,500".
export function formatMoney(n: number | string | null | undefined, code?: string): string {
  const v = Number(n ?? 0);
  return `${currencySymbol(code)} ${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
